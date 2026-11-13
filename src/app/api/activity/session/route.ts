import { NextRequest } from "next/server";
import {
  agentSettings,
  getActivitySettings,
  getOpenSession,
  hasConsent,
  json,
  requireUser,
} from "@/lib/activityTrackingServer";

// GET /api/activity/session
// Used by the CRM header and by the desktop app to know whether to track.
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const [session, settings] = await Promise.all([getOpenSession(auth.user.id), getActivitySettings()]);
  const consented = await hasConsent(auth.user.id, settings.policy_version);

  return json({
    session,
    settings: agentSettings(settings),
    consent: { policy_version: settings.policy_version, accepted: consented },
    server_time: new Date().toISOString(),
  });
}
