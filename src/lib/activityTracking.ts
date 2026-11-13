// Shared types and helpers for the Activity Monitor module (safe for browser).

export type ActivitySettings = {
  idle_threshold_seconds: number;
  capture_window_titles: boolean;
  screenshots_enabled: boolean;
  screenshot_interval_minutes: number;
  screenshot_blur: boolean;
  retention_days: number;
  policy_version: string;
  updated_at?: string;
};

export type WorkSession = {
  id: string;
  user_id: string;
  checked_in_at: string;
  checked_out_at: string | null;
  checkin_source: "crm" | "agent";
  checkout_reason: "manual" | "agent" | "auto_stale" | "admin" | null;
  active_seconds: number;
  idle_seconds: number;
  last_heartbeat_at: string | null;
  current_app: string | null;
  current_title: string | null;
  current_domain: string | null;
  current_is_idle: boolean | null;
  agent_device: string | null;
  agent_os: string | null;
  agent_version: string | null;
};

export type LiveState = "active" | "idle" | "tracker_offline" | "checked_out";

export type LiveRow = {
  user_id: string;
  full_name: string;
  email: string | null;
  designation: string | null;
  avatar_url: string | null;
  state: LiveState;
  session: WorkSession | null;
  today_active_seconds: number;
  today_idle_seconds: number;
  last_checkout_at: string | null;
};

export type ReportSegment = {
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  app_name: string;
  window_title: string | null;
  url_domain: string | null;
  is_idle: boolean;
};

export type ReportScreenshot = {
  id: string;
  captured_at: string;
  app_name: string | null;
  window_title: string | null;
  is_blurred: boolean;
  url: string | null;
};

export type AppUsage = {
  app_name: string;
  seconds: number;
  top_titles: Array<{ title: string; seconds: number }>;
};

export type ActivityReport = {
  user: { id: string; full_name: string; email: string | null; designation: string | null };
  date: string;
  sessions: WorkSession[];
  totals: { worked_seconds: number; active_seconds: number; idle_seconds: number; untracked_seconds: number };
  apps: AppUsage[];
  domains: Array<{ domain: string; seconds: number }>;
  timeline: ReportSegment[];
  hourly: Array<{ hour: number; active_seconds: number; idle_seconds: number }>;
  screenshots: ReportScreenshot[];
};

// The desktop app sends a heartbeat every 60 seconds. If none arrives for this
// long, the tracker is shown as offline.
export const TRACKER_OFFLINE_AFTER_MS = 3 * 60 * 1000;

export const GST_OFFSET_MS = 4 * 60 * 60 * 1000;

// Returns YYYY-MM-DD for the given instant in Gulf Standard Time.
export function gstDateString(date: Date = new Date()): string {
  return new Date(date.getTime() + GST_OFFSET_MS).toISOString().slice(0, 10);
}

// UTC range [start, end) covering a GST calendar day.
export function gstDayRange(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  start.setTime(start.getTime() - GST_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

export function isTrackerOnline(session: Pick<WorkSession, "last_heartbeat_at"> | null, now = Date.now()): boolean {
  if (!session?.last_heartbeat_at) return false;
  return now - new Date(session.last_heartbeat_at).getTime() < TRACKER_OFFLINE_AFTER_MS;
}
