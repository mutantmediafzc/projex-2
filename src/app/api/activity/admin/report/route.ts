import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SCREENSHOT_BUCKET, SESSION_COLUMNS, json, requireActivityAdmin } from "@/lib/activityTrackingServer";
import {
  GST_OFFSET_MS,
  gstDateString,
  gstDayRange,
  type ActivityReport,
  type AppUsage,
  type ReportScreenshot,
  type ReportSegment,
  type WorkSession,
} from "@/lib/activityTracking";

const PAGE = 1000;
const MAX_TIMELINE = 3000;
// Adjacent segments of the same window closer than this are merged for display.
const MERGE_GAP_MS = 15 * 1000;

// GET /api/activity/admin/report?userId=<uuid>&date=YYYY-MM-DD  (date in GST)
export async function GET(request: NextRequest) {
  const auth = await requireActivityAdmin(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const date = searchParams.get("date") || gstDateString();
  if (!userId) return json({ error: "userId is required" }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "date must be YYYY-MM-DD" }, 400);

  const { start, end } = gstDayRange(date);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, full_name, email, designation")
    .eq("id", userId)
    .maybeSingle();
  if (!user) return json({ error: "User not found" }, 404);

  const { data: sessionData, error: sessionError } = await supabaseAdmin
    .from("work_sessions")
    .select(SESSION_COLUMNS)
    .eq("user_id", userId)
    .lt("checked_in_at", endIso)
    .or(`checked_out_at.is.null,checked_out_at.gte.${startIso}`)
    .order("checked_in_at");
  if (sessionError) {
    console.error("Failed to load sessions for report", sessionError);
    return json({ error: "Could not load sessions" }, 500);
  }
  const sessions = (sessionData ?? []) as WorkSession[];

  // Segments, paged past Supabase's 1000-row limit.
  const segments: ReportSegment[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from("activity_segments")
      .select("started_at, ended_at, duration_seconds, app_name, window_title, url_domain, is_idle")
      .eq("user_id", userId)
      .gte("started_at", startIso)
      .lt("started_at", endIso)
      .order("started_at")
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("Failed to load activity segments", error);
      return json({ error: "Could not load activity" }, 500);
    }
    segments.push(...((data ?? []) as ReportSegment[]));
    if (!data || data.length < PAGE) break;
  }

  // Totals
  const now = Date.now();
  const worked = sessions.reduce((sum, s) => {
    const a = Math.max(new Date(s.checked_in_at).getTime(), start.getTime());
    const b = Math.min(s.checked_out_at ? new Date(s.checked_out_at).getTime() : now, end.getTime());
    return sum + Math.max(0, (b - a) / 1000);
  }, 0);
  let active = 0;
  let idle = 0;
  for (const seg of segments) {
    if (seg.is_idle) idle += seg.duration_seconds;
    else active += seg.duration_seconds;
  }

  // App and website usage (active time only)
  const appMap = new Map<string, { seconds: number; titles: Map<string, number> }>();
  const domainMap = new Map<string, number>();
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, active_seconds: 0, idle_seconds: 0 }));
  for (const seg of segments) {
    const hour = new Date(new Date(seg.started_at).getTime() + GST_OFFSET_MS).getUTCHours();
    if (seg.is_idle) {
      hourly[hour].idle_seconds += seg.duration_seconds;
      continue;
    }
    hourly[hour].active_seconds += seg.duration_seconds;
    const app = appMap.get(seg.app_name) ?? { seconds: 0, titles: new Map<string, number>() };
    app.seconds += seg.duration_seconds;
    if (seg.window_title) app.titles.set(seg.window_title, (app.titles.get(seg.window_title) ?? 0) + seg.duration_seconds);
    appMap.set(seg.app_name, app);
    if (seg.url_domain) domainMap.set(seg.url_domain, (domainMap.get(seg.url_domain) ?? 0) + seg.duration_seconds);
  }
  const apps: AppUsage[] = Array.from(appMap.entries())
    .map(([app_name, v]) => ({
      app_name,
      seconds: v.seconds,
      top_titles: Array.from(v.titles.entries())
        .map(([title, seconds]) => ({ title, seconds }))
        .sort((a, b) => b.seconds - a.seconds)
        .slice(0, 5),
    }))
    .sort((a, b) => b.seconds - a.seconds);
  const domains = Array.from(domainMap.entries())
    .map(([domain, seconds]) => ({ domain, seconds }))
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 20);

  // Timeline: merge consecutive segments of the same window.
  const timeline: ReportSegment[] = [];
  for (const seg of segments) {
    const last = timeline[timeline.length - 1];
    if (
      last &&
      last.app_name === seg.app_name &&
      last.window_title === seg.window_title &&
      last.is_idle === seg.is_idle &&
      new Date(seg.started_at).getTime() - new Date(last.ended_at).getTime() <= MERGE_GAP_MS
    ) {
      last.ended_at = seg.ended_at;
      last.duration_seconds += seg.duration_seconds;
    } else {
      timeline.push({ ...seg });
    }
  }

  // Screenshots with short-lived signed URLs
  const { data: shotRows } = await supabaseAdmin
    .from("activity_screenshots")
    .select("id, captured_at, storage_path, app_name, window_title, is_blurred")
    .eq("user_id", userId)
    .gte("captured_at", startIso)
    .lt("captured_at", endIso)
    .order("captured_at")
    .limit(500);
  let screenshots: ReportScreenshot[] = [];
  if (shotRows?.length) {
    const { data: signed } = await supabaseAdmin.storage
      .from(SCREENSHOT_BUCKET)
      .createSignedUrls(shotRows.map((s) => s.storage_path), 60 * 60);
    const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
    screenshots = shotRows.map((s) => ({
      id: s.id,
      captured_at: s.captured_at,
      app_name: s.app_name,
      window_title: s.window_title,
      is_blurred: s.is_blurred,
      url: urlByPath.get(s.storage_path) ?? null,
    }));
  }

  const report: ActivityReport = {
    user: {
      id: user.id,
      full_name: user.full_name?.trim() || user.email || "Unnamed user",
      email: user.email ?? null,
      designation: user.designation ?? null,
    },
    date,
    sessions,
    totals: {
      worked_seconds: Math.round(worked),
      active_seconds: active,
      idle_seconds: idle,
      untracked_seconds: Math.max(0, Math.round(worked - active - idle)),
    },
    apps,
    domains,
    timeline: timeline.slice(-MAX_TIMELINE).reverse(),
    hourly,
    screenshots,
  };
  return json(report);
}
