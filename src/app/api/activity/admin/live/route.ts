import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SESSION_COLUMNS, closeStaleSessions, json, requireActivityAdmin } from "@/lib/activityTrackingServer";
import {
  gstDateString,
  gstDayRange,
  isTrackerOnline,
  type LiveRow,
  type LiveState,
  type WorkSession,
} from "@/lib/activityTracking";

// GET /api/activity/admin/live
// Every CRM user with their current state and today's active / idle totals.
export async function GET(request: NextRequest) {
  const auth = await requireActivityAdmin(request);
  if (auth.error) return auth.error;

  await closeStaleSessions();

  const { start, end } = gstDayRange(gstDateString());

  const [usersRes, todayRes, openRes] = await Promise.all([
    supabaseAdmin.from("users").select("id, full_name, email, designation, avatar_url").order("full_name"),
    supabaseAdmin
      .from("work_sessions")
      .select(SESSION_COLUMNS)
      .gte("checked_in_at", start.toISOString())
      .lt("checked_in_at", end.toISOString())
      .order("checked_in_at", { ascending: false }),
    supabaseAdmin.from("work_sessions").select(SESSION_COLUMNS).is("checked_out_at", null),
  ]);

  if (usersRes.error) {
    console.error("Failed to load users for activity monitor", usersRes.error);
    return json({ error: "Could not load team members" }, 500);
  }

  const todayByUser = new Map<string, WorkSession[]>();
  for (const s of (todayRes.data ?? []) as WorkSession[]) {
    const list = todayByUser.get(s.user_id) ?? [];
    list.push(s);
    todayByUser.set(s.user_id, list);
  }
  const openByUser = new Map(((openRes.data ?? []) as WorkSession[]).map((s) => [s.user_id, s]));

  const now = Date.now();
  const rows: LiveRow[] = (usersRes.data ?? []).map((u) => {
    const open = openByUser.get(u.id) ?? null;
    const today = todayByUser.get(u.id) ?? [];
    // Include an open session that started before today (e.g. after midnight).
    const counted = open && !today.some((s) => s.id === open.id) ? [...today, open] : today;

    let state: LiveState = "checked_out";
    if (open) {
      if (!isTrackerOnline(open, now)) state = "tracker_offline";
      else state = open.current_is_idle ? "idle" : "active";
    }

    const lastClosed = today.find((s) => s.checked_out_at);
    return {
      user_id: u.id,
      full_name: u.full_name?.trim() || u.email || "Unnamed user",
      email: u.email ?? null,
      designation: u.designation ?? null,
      avatar_url: u.avatar_url ?? null,
      state,
      session: open,
      today_active_seconds: counted.reduce((sum, s) => sum + (s.active_seconds ?? 0), 0),
      today_idle_seconds: counted.reduce((sum, s) => sum + (s.idle_seconds ?? 0), 0),
      last_checkout_at: lastClosed?.checked_out_at ?? null,
    };
  });

  const order: Record<LiveState, number> = { active: 0, idle: 1, tracker_offline: 2, checked_out: 3 };
  rows.sort((a, b) => order[a.state] - order[b.state] || a.full_name.localeCompare(b.full_name));

  return json({ rows, date: gstDateString(), server_time: new Date().toISOString() });
}
