import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { ActivitySettings, WorkSession } from "@/lib/activityTracking";

export const SCREENSHOT_BUCKET = "activity-screenshots";

// Sessions with no heartbeat (or check-in) for this long are closed automatically.
const STALE_SESSION_MINUTES = 12 * 60;

export const SESSION_COLUMNS =
  "id, user_id, checked_in_at, checked_out_at, checkin_source, checkout_reason, active_seconds, idle_seconds, last_heartbeat_at, current_app, current_title, current_domain, current_is_idle, agent_device, agent_os, agent_version";

const DEFAULT_SETTINGS: ActivitySettings = {
  idle_threshold_seconds: 300,
  capture_window_titles: true,
  screenshots_enabled: false,
  screenshot_interval_minutes: 10,
  screenshot_blur: true,
  retention_days: 90,
  policy_version: "2026-11-v1",
};

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

type AuthResult = { user: User; error?: never } | { user?: never; error: NextResponse };

// Returns the signed-in user from the "Authorization: Bearer <token>" header.
export async function requireUser(request: NextRequest): Promise<AuthResult> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { error: json({ error: "Unauthorized" }, 401) };
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { error: json({ error: "Unauthorized" }, 401) };
  return { user: data.user };
}

// Same admin rule as useUserRole: "admin" (or legacy "expense") in auth
// metadata or in public.users.role.
export async function requireActivityAdmin(request: NextRequest): Promise<AuthResult> {
  const auth = await requireUser(request);
  if (auth.error) return auth;
  const metaRole = String(auth.user.user_metadata?.role ?? "").toLowerCase();
  if (metaRole === "admin" || metaRole === "expense") return auth;
  const { data } = await supabaseAdmin.from("users").select("role").eq("id", auth.user.id).maybeSingle();
  const dbRole = String(data?.role ?? "").toLowerCase();
  if (dbRole === "admin" || dbRole === "expense") return auth;
  return { error: json({ error: "You do not have access to the Activity Monitor" }, 403) };
}

export async function getActivitySettings(): Promise<ActivitySettings & { last_purged_at: string | null }> {
  const { data, error } = await supabaseAdmin.from("activity_settings").select("*").eq("id", 1).maybeSingle();
  if (error) console.error("Failed to load activity settings", error);
  return { ...DEFAULT_SETTINGS, last_purged_at: null, ...(data ?? {}) };
}

// The subset of settings the desktop app needs.
export function agentSettings(settings: ActivitySettings) {
  return {
    idle_threshold_seconds: settings.idle_threshold_seconds,
    capture_window_titles: settings.capture_window_titles,
    screenshots_enabled: settings.screenshots_enabled,
    screenshot_interval_minutes: settings.screenshot_interval_minutes,
    screenshot_blur: settings.screenshot_blur,
    policy_version: settings.policy_version,
  };
}

export async function closeStaleSessions() {
  const { error } = await supabaseAdmin.rpc("activity_close_stale_sessions", {
    p_stale_minutes: STALE_SESSION_MINUTES,
  });
  if (error) console.error("Failed to close stale work sessions", error);
}

export async function getOpenSession(userId: string): Promise<WorkSession | null> {
  const { data, error } = await supabaseAdmin
    .from("work_sessions")
    .select(SESSION_COLUMNS)
    .eq("user_id", userId)
    .is("checked_out_at", null)
    .maybeSingle();
  if (error) console.error("Failed to load open work session", error);
  return (data as WorkSession | null) ?? null;
}

export async function hasConsent(userId: string, policyVersion: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("activity_consents")
    .select("id")
    .eq("user_id", userId)
    .eq("policy_version", policyVersion)
    .maybeSingle();
  return Boolean(data);
}

// Deletes activity data older than the retention period. Runs at most once a
// day, triggered lazily from check-in so no cron job is required.
export async function purgeExpiredActivityIfDue() {
  const settings = await getActivitySettings();
  const dayMs = 24 * 60 * 60 * 1000;
  if (settings.last_purged_at && Date.now() - new Date(settings.last_purged_at).getTime() < dayMs) return;

  // Claim the purge first so concurrent check-ins do not all run it.
  await supabaseAdmin.from("activity_settings").update({ last_purged_at: new Date().toISOString() }).eq("id", 1);

  const cutoff = new Date(Date.now() - settings.retention_days * dayMs).toISOString();

  // Screenshots: remove files from storage, then the rows.
  for (let i = 0; i < 50; i++) {
    const { data: shots } = await supabaseAdmin
      .from("activity_screenshots")
      .select("id, storage_path")
      .lt("captured_at", cutoff)
      .limit(500);
    if (!shots?.length) break;
    const { error: removeError } = await supabaseAdmin.storage
      .from(SCREENSHOT_BUCKET)
      .remove(shots.map((s) => s.storage_path));
    if (removeError) {
      console.error("Failed to remove expired screenshots", removeError);
      break;
    }
    await supabaseAdmin.from("activity_screenshots").delete().in("id", shots.map((s) => s.id));
  }

  // Closed sessions older than the cutoff take their segments with them.
  const { error: sessionError } = await supabaseAdmin
    .from("work_sessions")
    .delete()
    .lt("checked_in_at", cutoff)
    .not("checked_out_at", "is", null);
  if (sessionError) console.error("Failed to purge expired work sessions", sessionError);

  const { error: segmentError } = await supabaseAdmin.from("activity_segments").delete().lt("started_at", cutoff);
  if (segmentError) console.error("Failed to purge expired activity segments", segmentError);
}

export function clampText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

export function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
