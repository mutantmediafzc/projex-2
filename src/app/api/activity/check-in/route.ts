import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logFirstAttendance } from "@/lib/attendance";
import {
  SESSION_COLUMNS,
  closeStaleSessions,
  getOpenSession,
  json,
  purgeExpiredActivityIfDue,
  requireUser,
} from "@/lib/activityTrackingServer";

// POST /api/activity/check-in  { source?: "crm" | "agent" }
export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const userId = auth.user.id;

  const body = (await request.json().catch(() => ({}))) as { source?: string };
  const source = body.source === "agent" ? "agent" : "crm";

  await closeStaleSessions();

  const existing = await getOpenSession(userId);
  if (existing) return json({ session: existing, already_checked_in: true });

  const now = new Date();
  const { data, error } = await supabaseAdmin
    .from("work_sessions")
    .insert({ user_id: userId, checked_in_at: now.toISOString(), checkin_source: source })
    .select(SESSION_COLUMNS)
    .single();

  if (error) {
    // Unique index violation: another tab checked in at the same moment.
    if (error.code === "23505") {
      const session = await getOpenSession(userId);
      if (session) return json({ session, already_checked_in: true });
    }
    console.error("Failed to check in", error);
    return json({ error: "Could not check in. Please try again." }, 500);
  }

  await logFirstAttendance(userId, now);
  purgeExpiredActivityIfDue().catch((err) => console.error("Activity purge failed", err));

  return json({ session: data, already_checked_in: false });
}
