// Mutant CRM Tracker: main process.
//
// Lives in the system tray. Once the user signs in with their CRM account and
// accepts the monitoring notice, it records the active window and idle state
// every few seconds, but ONLY while the user is checked in on the CRM.

import { app, BrowserWindow, Menu, Tray, desktopCapturer, dialog, ipcMain, nativeImage, powerMonitor, safeStorage, shell } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { ActivityBuffer, domainFromUrl } from "./activityBuffer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.join(__dirname, "..");

const TICK_SECONDS = 5;
const SYNC_INTERVAL_MS = 30 * 1000;
const MAX_SEGMENTS_PER_UPLOAD = 400;
const MAX_PENDING_SEGMENTS = 20000;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
function loadConfig() {
  const file = path.join(APP_ROOT, "config.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const config = {
    crmUrl: String(process.env.TRACKER_CRM_URL || raw.crmUrl || "").replace(/\/+$/, ""),
    supabaseUrl: String(process.env.TRACKER_SUPABASE_URL || raw.supabaseUrl || ""),
    supabaseAnonKey: String(process.env.TRACKER_SUPABASE_ANON_KEY || raw.supabaseAnonKey || ""),
  };
  const missing = Object.entries(config).filter(([, v]) => !v || v.includes("YOUR-")).map(([k]) => k);
  if (missing.length) throw new Error(`config.json is missing: ${missing.join(", ")}`);
  return config;
}

// ---------------------------------------------------------------------------
// Encrypted storage for the login session (OS keychain via safeStorage)
// ---------------------------------------------------------------------------
function createSecureStorage() {
  const file = path.join(app.getPath("userData"), "session.bin");
  let cache = {};
  try {
    const buf = fs.readFileSync(file);
    const text = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buf) : buf.toString("utf8");
    cache = JSON.parse(text);
  } catch {
    cache = {};
  }
  const persist = () => {
    const text = JSON.stringify(cache);
    const data = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(text) : Buffer.from(text, "utf8");
    fs.writeFileSync(file, data, { mode: 0o600 });
  };
  return {
    getItem: (key) => (key in cache ? cache[key] : null),
    setItem: (key, value) => {
      cache[key] = value;
      persist();
    },
    removeItem: (key) => {
      delete cache[key];
      persist();
    },
  };
}

// Segments that could not be uploaded yet survive restarts.
const pendingFile = () => path.join(app.getPath("userData"), "pending.json");

function loadPending() {
  try {
    const data = JSON.parse(fs.readFileSync(pendingFile(), "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function savePending() {
  try {
    fs.writeFileSync(pendingFile(), JSON.stringify(state.pending));
  } catch (err) {
    console.error("Could not save pending activity", err);
  }
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  config: null,
  supabase: null,
  user: null, // { id, email }
  sessionId: null, // open CRM work session id
  checkedInAt: null,
  tracking: false,
  consentAccepted: false,
  policyVersion: null,
  settings: {
    idle_threshold_seconds: 300,
    capture_window_titles: true,
    screenshots_enabled: false,
    screenshot_interval_minutes: 10,
    screenshot_blur: true,
  },
  current: null, // latest sample
  buffer: new ActivityBuffer(TICK_SECONDS),
  bufferSessionId: null,
  /** @type {Array<object & {session_id: string}>} */
  pending: [],
  lastError: null,
  lastSyncOk: null,
  nextScreenshotAt: 0,
  syncing: false,
  lastConsentPrompt: 0,
};

let tray = null;
let authWindow = null;
let tickTimer = null;
let syncTimer = null;
let activeWindowFn = null;

// ---------------------------------------------------------------------------
// CRM API
// ---------------------------------------------------------------------------
async function accessToken() {
  const { data } = await state.supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function crm(pathname, { method = "GET", body, form } = {}) {
  const token = await accessToken();
  if (!token) throw Object.assign(new Error("Signed out"), { status: 401 });
  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${state.config.crmUrl}${pathname}`, {
    method,
    headers,
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
  return data;
}

function deviceInfo() {
  const platform = { win32: "Windows", darwin: "macOS", linux: "Linux" }[process.platform] ?? process.platform;
  return { name: os.hostname(), os: `${platform} ${os.release()}`, version: app.getVersion() };
}

// ---------------------------------------------------------------------------
// Sampling
// ---------------------------------------------------------------------------
async function readActiveWindow() {
  try {
    if (!activeWindowFn) ({ activeWindow: activeWindowFn } = await import("get-windows"));
    const win = await activeWindowFn({ accessibilityPermission: true, screenRecordingPermission: true });
    if (!win) return { app_name: "Desktop", window_title: null, url_domain: null };
    return {
      app_name: win.owner?.name || "Unknown",
      window_title: win.title || null,
      url_domain: domainFromUrl(win.url),
    };
  } catch (err) {
    console.error("Could not read active window", err);
    return { app_name: "Unknown", window_title: null, url_domain: null };
  }
}

async function tick() {
  if (!state.tracking) return;
  const now = Date.now();
  const threshold = state.settings.idle_threshold_seconds;
  const idleSeconds = powerMonitor.getSystemIdleTime();
  const idleState = powerMonitor.getSystemIdleState(threshold);
  const isIdle = idleState === "locked" || idleState === "idle" || idleSeconds >= threshold;

  const win = isIdle && idleState === "locked" ? { app_name: "Screen locked", window_title: null, url_domain: null } : await readActiveWindow();
  const sample = {
    t: now,
    app_name: win.app_name,
    window_title: state.settings.capture_window_titles ? win.window_title : null,
    url_domain: win.url_domain,
    is_idle: isIdle,
  };
  state.buffer.addTick(sample);
  if (isIdle) state.buffer.markIdleSince(now - idleSeconds * 1000);
  state.current = sample;

  if (!isIdle && state.settings.screenshots_enabled && now >= state.nextScreenshotAt) {
    scheduleNextScreenshot(now);
    captureScreenshot(sample).catch((err) => console.error("Screenshot failed", err));
  }
}

function scheduleNextScreenshot(from = Date.now()) {
  // Random point in the second half of each interval, so timing is not predictable.
  const intervalMs = state.settings.screenshot_interval_minutes * 60 * 1000;
  state.nextScreenshotAt = from + intervalMs * (0.5 + Math.random() * 0.5);
}

async function captureScreenshot(sample) {
  const sources = await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: { width: 1600, height: 900 } });
  if (!sources.length) return;
  let image = sources[0].thumbnail;
  if (image.isEmpty()) return;
  const width = 1280;
  if (state.settings.screenshot_blur) {
    // Downscale hard, then upscale: layout stays visible, text becomes unreadable.
    image = image.resize({ width: 96, quality: "good" }).resize({ width, quality: "good" });
  } else {
    image = image.resize({ width, quality: "good" });
  }
  const jpeg = image.toJPEG(60);
  const form = new FormData();
  form.append("file", new Blob([jpeg], { type: "image/jpeg" }), "screenshot.jpg");
  form.append("captured_at", new Date().toISOString());
  form.append("app_name", sample.app_name || "");
  if (sample.window_title) form.append("window_title", sample.window_title);
  form.append("blurred", state.settings.screenshot_blur ? "true" : "false");
  await crm("/api/activity/screenshot", { method: "POST", form });
}

// Move finished samples from the buffer into the upload queue.
function drainBuffer(all = false) {
  if (!state.bufferSessionId) return;
  const cutoff = all ? Infinity : Date.now() - (state.settings.idle_threshold_seconds + TICK_SECONDS * 2) * 1000;
  const segments = state.buffer.takeSegments(cutoff);
  for (const seg of segments) state.pending.push({ ...seg, session_id: state.bufferSessionId });
  if (state.pending.length > MAX_PENDING_SEGMENTS) state.pending.splice(0, state.pending.length - MAX_PENDING_SEGMENTS);
  if (segments.length) savePending();
}

// ---------------------------------------------------------------------------
// Sync with the CRM
// ---------------------------------------------------------------------------
async function sync() {
  if (!state.user || state.syncing) return;
  state.syncing = true;
  try {
    drainBuffer(false);

    // Upload the oldest session's queued segments first.
    const sessionId = state.pending[0]?.session_id ?? state.sessionId;
    const batch = state.pending.filter((s) => s.session_id === sessionId).slice(0, MAX_SEGMENTS_PER_UPLOAD);
    const res = await crm("/api/activity/heartbeat", {
      method: "POST",
      body: {
        session_id: sessionId,
        device: deviceInfo(),
        current: state.tracking && state.current
          ? {
              app_name: state.current.app_name,
              window_title: state.current.window_title,
              url_domain: state.current.url_domain,
              is_idle: state.current.is_idle,
            }
          : null,
        segments: batch.map(({ session_id: _s, ...seg }) => seg),
      },
    });

    if (batch.length) {
      const sent = new Set(batch);
      state.pending = state.pending.filter((s) => !sent.has(s));
      savePending();
    }

    applyServerState(res);
    state.lastSyncOk = Date.now();
    state.lastError = null;

    // More queued? Keep going on the next tick quickly.
    if (state.pending.length) setTimeout(sync, 2000);
  } catch (err) {
    state.lastError = err.message;
    if (err.status === 401) {
      // Token could not be refreshed: ask the user to sign in again.
      await signOut(false);
    }
  } finally {
    state.syncing = false;
    refreshTray();
  }
}

function applyServerState(res) {
  if (res.settings) {
    const screenshotsWereOff = !state.settings.screenshots_enabled;
    state.settings = { ...state.settings, ...res.settings };
    if (screenshotsWereOff && state.settings.screenshots_enabled) scheduleNextScreenshot();
  }
  if (res.consent) {
    state.consentAccepted = Boolean(res.consent.accepted);
    state.policyVersion = res.consent.policy_version;
  }

  const newSessionId = res.session?.id ?? null;
  const shouldTrack = Boolean(newSessionId) && state.consentAccepted;

  if (state.tracking && (!shouldTrack || newSessionId !== state.bufferSessionId)) {
    // Checked out (or a new session started): close off what we have.
    drainBuffer(true);
    state.tracking = false;
    state.current = null;
  }

  state.sessionId = newSessionId;
  state.checkedInAt = res.session?.checked_in_at ?? null;

  if (shouldTrack && !state.tracking) {
    state.bufferSessionId = newSessionId;
    state.tracking = true;
    scheduleNextScreenshot();
  }

  // Checked in but notice not accepted: remind at most every 10 minutes.
  if (newSessionId && !state.consentAccepted && Date.now() - state.lastConsentPrompt > 10 * 60 * 1000) {
    state.lastConsentPrompt = Date.now();
    showAuthWindow("consent");
  }
}

function startLoops() {
  stopLoops();
  tickTimer = setInterval(() => tick().catch((err) => console.error(err)), TICK_SECONDS * 1000);
  syncTimer = setInterval(sync, SYNC_INTERVAL_MS);
  sync();
}

function stopLoops() {
  if (tickTimer) clearInterval(tickTimer);
  if (syncTimer) clearInterval(syncTimer);
  tickTimer = syncTimer = null;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
async function signIn(email, password) {
  const { data, error } = await state.supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
  state.user = { id: data.user.id, email: data.user.email };
  startLoops();
  return { email: data.user.email };
}

async function signOut(manual = true) {
  if (state.tracking) drainBuffer(true);
  stopLoops();
  state.tracking = false;
  state.user = null;
  state.sessionId = null;
  state.current = null;
  await state.supabase.auth.signOut({ scope: "local" }).catch(() => {});
  refreshTray();
  if (manual) showAuthWindow("login");
  else showAuthWindow("login", "Your sign-in expired. Please sign in again.");
}

// ---------------------------------------------------------------------------
// Monitoring notice text
// ---------------------------------------------------------------------------
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function noticeText() {
  const s = state.settings;
  const items = [
    "The name of the app in front of you" + (s.capture_window_titles ? ", and its window title (for example a browser tab title or file name)" : ""),
    "Website addresses (domain only) for supported browsers",
    `Whether you are active or idle (no keyboard or mouse input for ${plural(Math.round(s.idle_threshold_seconds / 60), "minute")}). Key presses and mouse movements themselves are never recorded`,
  ];
  if (s.screenshots_enabled) {
    items.push(
      `A screenshot of your screen about every ${plural(s.screenshot_interval_minutes, "minute")} while you are active` +
        (s.screenshot_blur ? ", blurred on this PC before upload so text cannot be read" : ""),
    );
  }
  return {
    policyVersion: state.policyVersion,
    items,
    when: "Only between your CRM check-in and check-out. Nothing is recorded when you are checked out.",
    who: "Visible to CRM admins only, and used to understand working time and workload.",
    retention: "Deleted automatically after the retention period set by the company.",
  };
}

// ---------------------------------------------------------------------------
// Windows and tray
// ---------------------------------------------------------------------------
function showAuthWindow(view, message) {
  if (authWindow && !authWindow.isDestroyed()) {
    authWindow.webContents.send("view", { view, message });
    authWindow.show();
    authWindow.focus();
    return;
  }
  authWindow = new BrowserWindow({
    width: 440,
    height: 600,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: "Mutant CRM Tracker",
    icon: path.join(APP_ROOT, "assets", "icon.png"),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  authWindow.setMenu(null);
  authWindow.loadFile(path.join(__dirname, "ui", "index.html"), { query: { view, message: message ?? "" } });
  authWindow.once("ready-to-show", () => authWindow.show());
  authWindow.on("closed", () => {
    authWindow = null;
  });
}

function statusLabel() {
  if (!state.user) return "Signed out";
  if (state.sessionId && !state.consentAccepted) return "Waiting: accept the monitoring notice";
  if (state.tracking) {
    const mins = state.checkedInAt ? Math.floor((Date.now() - new Date(state.checkedInAt).getTime()) / 60000) : 0;
    return `Checked in · ${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m · recording`;
  }
  if (state.lastError && !state.lastSyncOk) return `Cannot reach CRM: ${state.lastError}`;
  return "Checked out · not recording";
}

function refreshTray() {
  if (!tray) return;
  tray.setToolTip(`Mutant CRM Tracker\n${statusLabel()}`);
  const template = [
    { label: statusLabel(), enabled: false },
    { label: state.user ? state.user.email : "", enabled: false, visible: Boolean(state.user) },
    { type: "separator" },
  ];
  if (state.user) {
    template.push(
      state.sessionId
        ? { label: "Check out", click: () => checkInOut("check-out") }
        : { label: "Check in", click: () => checkInOut("check-in") },
      { label: "Open CRM", click: () => shell.openExternal(state.config.crmUrl) },
      { label: "What is recorded", click: () => showAuthWindow("notice") },
      { type: "separator" },
      { label: "Sign out", click: () => signOut(true) },
    );
  } else {
    template.push({ label: "Sign in", click: () => showAuthWindow("login") });
  }
  template.push({ label: "Quit", click: () => app.quit() });
  tray.setContextMenu(Menu.buildFromTemplate(template));
}

async function checkInOut(action) {
  try {
    await crm(`/api/activity/${action}`, { method: "POST", body: { source: "agent" } });
    await sync();
  } catch (err) {
    dialog.showErrorBox("Mutant CRM Tracker", err.message);
  }
}

// ---------------------------------------------------------------------------
// IPC from the sign-in / notice window
// ---------------------------------------------------------------------------
ipcMain.handle("auth:login", async (_e, { email, password }) => {
  const result = await signIn(String(email || "").trim(), String(password || ""));
  // Fetch settings and consent status before deciding what to show next.
  try {
    applyServerState(await crm("/api/activity/session"));
  } catch {
    // The sync loop will retry.
  }
  refreshTray();
  return { ...result, consentAccepted: state.consentAccepted };
});

ipcMain.handle("notice:get", async () => {
  if (state.user && !state.policyVersion) {
    try {
      applyServerState(await crm("/api/activity/session"));
    } catch {
      // Show what we have.
    }
  }
  return { ...noticeText(), accepted: state.consentAccepted, email: state.user?.email ?? null };
});

ipcMain.handle("notice:accept", async () => {
  await crm("/api/activity/consent", {
    method: "POST",
    body: { policy_version: state.policyVersion, device_name: os.hostname() },
  });
  state.consentAccepted = true;
  await sync();
  return { ok: true };
});

ipcMain.handle("auth:signout", async () => {
  await signOut(true);
  return { ok: true };
});

ipcMain.handle("window:close", () => {
  authWindow?.close();
});

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => showAuthWindow(state.user ? "notice" : "login"));

  app.whenReady().then(async () => {
    if (process.platform === "darwin") app.dock?.hide();

    try {
      state.config = loadConfig();
    } catch (err) {
      dialog.showErrorBox("Mutant CRM Tracker", `This copy of the tracker is not configured.\n\n${err.message}`);
      app.quit();
      return;
    }

    // Start with the computer, so tracking resumes without anyone remembering.
    if (app.isPackaged && process.platform !== "linux") {
      app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });
    }

    state.pending = loadPending();
    state.supabase = createClient(state.config.supabaseUrl, state.config.supabaseAnonKey, {
      auth: {
        storage: createSecureStorage(),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });

    const iconPath = path.join(APP_ROOT, "assets", "icon.png");
    const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 });
    tray = new Tray(trayIcon);
    tray.on("click", () => tray.popUpContextMenu());
    refreshTray();
    setInterval(refreshTray, 60 * 1000);

    const { data } = await state.supabase.auth.getSession();
    if (data.session?.user) {
      state.user = { id: data.session.user.id, email: data.session.user.email };
      startLoops();
    } else {
      showAuthWindow("login");
    }

    // Laptop lid closed / PC asleep: close off what was recorded so far.
    powerMonitor.on("suspend", () => {
      if (state.tracking) drainBuffer(true);
    });
    powerMonitor.on("resume", () => sync());
  });

  // Keep running in the tray when the window is closed.
  app.on("window-all-closed", () => {});

  let quitting = false;
  app.on("before-quit", (event) => {
    if (quitting || !state.user) return;
    quitting = true;
    event.preventDefault();
    if (state.tracking) drainBuffer(true);
    savePending();
    // One last upload attempt, but never block quitting for long.
    Promise.race([sync(), new Promise((r) => setTimeout(r, 4000))]).finally(() => app.quit());
  });
}
