import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SESSION_COLUMNS, getOpenSession, json, requireUser } from "@/lib/activityTrackingServer";

// POST /api/activity/check-out  { source?: "crm" | "agent" }
export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as { source?: string };
  const reason = body.source === "agent" ? "agent" : "manual";

  const open = await getOpenSession(auth.user.id);
  if (!open) return json({ session: null, already_checked_out: true });

  const { data, error } = await supabaseAdmin
    .from("work_sessions")
    .update({ checked_out_at: new Date().toISOString(), checkout_reason: reason })
    .eq("id", open.id)
    .is("checked_out_at", null)
    .select(SESSION_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("Failed to check out", error);
    return json({ error: "Could not check out. Please try again." }, 500);
  }

  return json({ session: data ?? null, already_checked_out: !data });
}
