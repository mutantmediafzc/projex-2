import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { clampText, getActivitySettings, json, requireUser } from "@/lib/activityTrackingServer";

// POST /api/activity/consent  { policy_version, device_name? }
// Records that the user read and accepted the monitoring notice.
export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as { policy_version?: string; device_name?: string };
  const settings = await getActivitySettings();
  if (body.policy_version !== settings.policy_version) {
    return json({ error: "The monitoring notice has changed. Please review the latest version." }, 409);
  }

  const { error } = await supabaseAdmin.from("activity_consents").upsert(
    {
      user_id: auth.user.id,
      policy_version: settings.policy_version,
      device_name: clampText(body.device_name, 200),
    },
    { onConflict: "user_id,policy_version", ignoreDuplicates: true },
  );
  if (error) {
    console.error("Failed to record activity consent", error);
    return json({ error: "Could not save your acceptance. Please try again." }, 500);
  }
  return json({ accepted: true, policy_version: settings.policy_version });
}
