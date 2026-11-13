import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getActivitySettings, json, requireActivityAdmin } from "@/lib/activityTrackingServer";

// GET /api/activity/admin/settings
export async function GET(request: NextRequest) {
  const auth = await requireActivityAdmin(request);
  if (auth.error) return auth.error;
  return json({ settings: await getActivitySettings() });
}

function intInRange(value: unknown, min: number, max: number): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, Math.round(n)));
}

// PUT /api/activity/admin/settings
// Body: any of idle_threshold_seconds, capture_window_titles, screenshots_enabled,
// screenshot_interval_minutes, screenshot_blur, retention_days, bump_policy_version.
export async function PUT(request: NextRequest) {
  const auth = await requireActivityAdmin(request);
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const update: Record<string, unknown> = {
    updated_by: auth.user.id,
    updated_at: new Date().toISOString(),
  };

  const idle = intInRange(body.idle_threshold_seconds, 60, 3600);
  if (idle !== undefined) update.idle_threshold_seconds = idle;
  const interval = intInRange(body.screenshot_interval_minutes, 1, 120);
  if (interval !== undefined) update.screenshot_interval_minutes = interval;
  const retention = intInRange(body.retention_days, 7, 730);
  if (retention !== undefined) update.retention_days = retention;
  for (const key of ["capture_window_titles", "screenshots_enabled", "screenshot_blur"] as const) {
    if (typeof body[key] === "boolean") update[key] = body[key];
  }

  const current = await getActivitySettings();
  // Turning screenshots on, or switching off blur / turning on window titles,
  // collects more than staff agreed to, so everyone must accept a new notice.
  const expandsCollection =
    (update.screenshots_enabled === true && !current.screenshots_enabled) ||
    (update.screenshot_blur === false && current.screenshot_blur) ||
    (update.capture_window_titles === true && !current.capture_window_titles);
  if (expandsCollection || body.bump_policy_version === true) {
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
    update.policy_version = `v${stamp}`;
  }

  const { error } = await supabaseAdmin.from("activity_settings").upsert({ id: 1, ...update });
  if (error) {
    console.error("Failed to save activity settings", error);
    return json({ error: "Could not save settings" }, 500);
  }
  return json({ settings: await getActivitySettings() });
}
