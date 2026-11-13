import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOpenSession, json, requireActivityAdmin } from "@/lib/activityTrackingServer";

// POST /api/activity/admin/check-out  { user_id }
// Lets an admin close a session a team member forgot to check out of.
export async function POST(request: NextRequest) {
  const auth = await requireActivityAdmin(request);
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as { user_id?: string };
  if (typeof body.user_id !== "string") return json({ error: "user_id is required" }, 400);

  const open = await getOpenSession(body.user_id);
  if (!open) return json({ checked_out: false });

  // Close at the last moment the tracker was heard from, so time after the
  // person walked away is not counted.
  const closeAt = open.last_heartbeat_at ?? new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("work_sessions")
    .update({ checked_out_at: closeAt, checkout_reason: "admin" })
    .eq("id", open.id)
    .is("checked_out_at", null);

  if (error) {
    console.error("Admin check-out failed", error);
    return json({ error: "Could not check this user out" }, 500);
  }
  return json({ checked_out: true });
}
