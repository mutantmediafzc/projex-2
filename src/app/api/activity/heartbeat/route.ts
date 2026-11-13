import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  agentSettings,
  clampText,
  getActivitySettings,
  getOpenSession,
  hasConsent,
  json,
  parseDate,
  requireUser,
} from "@/lib/activityTrackingServer";

const MAX_SEGMENTS_PER_REQUEST = 500;
const MAX_SEGMENT_SECONDS = 3600;
const CLOCK_SKEW_MS = 60 * 1000;

type IncomingSegment = {
  started_at?: string;
  ended_at?: string;
  app_name?: string;
  window_title?: string;
  url_domain?: string;
  is_idle?: boolean;
};

type HeartbeatBody = {
  session_id?: string;
  device?: { name?: string; os?: string; version?: string };
  current?: { app_name?: string; window_title?: string; url_domain?: string; is_idle?: boolean } | null;
  segments?: IncomingSegment[];
};

// POST /api/activity/heartbeat
// Sent by the desktop app every ~60 seconds while the user is checked in.
// Stores finished activity segments and the user's live state, and tells the
// app whether it should keep tracking.
export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const userId = auth.user.id;

  const body = (await request.json().catch(() => null)) as HeartbeatBody | null;
  if (!body || typeof body !== "object") return json({ error: "Invalid request body" }, 400);

  const settings = await getActivitySettings();
  const consented = await hasConsent(userId, settings.policy_version);
  const openSession = await getOpenSession(userId);

  const respond = (accepted: number) =>
    json({
      tracking: Boolean(openSession) && consented,
      session: openSession ? { id: openSession.id, checked_in_at: openSession.checked_in_at } : null,
      settings: agentSettings(settings),
      consent: { policy_version: settings.policy_version, accepted: consented },
      accepted_segments: accepted,
      server_time: new Date().toISOString(),
    });

  // Without consent for the current notice nothing is stored.
  if (!consented) return respond(0);

  let accepted = 0;
  const segments = Array.isArray(body.segments) ? body.segments.slice(0, MAX_SEGMENTS_PER_REQUEST) : [];

  if (segments.length && typeof body.session_id === "string") {
    const { data: target } = await supabaseAdmin
      .from("work_sessions")
      .select("id, user_id, checked_in_at, checked_out_at")
      .eq("id", body.session_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (target) {
      const windowStart = new Date(target.checked_in_at).getTime();
      const windowEnd = Math.min(
        Date.now() + CLOCK_SKEW_MS,
        target.checked_out_at ? new Date(target.checked_out_at).getTime() : Number.POSITIVE_INFINITY,
      );

      const rows = segments
        .map((seg) => {
          const started = parseDate(seg.started_at);
          const ended = parseDate(seg.ended_at);
          if (!started || !ended) return null;
          const start = Math.max(started.getTime(), windowStart);
          const end = Math.min(ended.getTime(), windowEnd, start + MAX_SEGMENT_SECONDS * 1000);
          const duration = Math.round((end - start) / 1000);
          if (duration <= 0) return null;
          return {
            session_id: target.id,
            user_id: userId,
            started_at: new Date(start).toISOString(),
            ended_at: new Date(end).toISOString(),
            duration_seconds: duration,
            app_name: clampText(seg.app_name, 200) ?? "Unknown",
            window_title: settings.capture_window_titles ? clampText(seg.window_title, 500) : null,
            url_domain: clampText(seg.url_domain, 255),
            is_idle: seg.is_idle === true,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      // Drop duplicates inside the same batch (same start time).
      const unique = Array.from(new Map(rows.map((r) => [r.started_at, r])).values());

      if (unique.length) {
        const { error } = await supabaseAdmin
          .from("activity_segments")
          .upsert(unique, { onConflict: "session_id,started_at", ignoreDuplicates: true });
        if (error) {
          console.error("Failed to store activity segments", error);
          return json({ error: "Could not store activity. The app will retry." }, 500);
        }
        accepted = unique.length;
      }
    }
    // Segments for a session that no longer exists (deleted or purged) are
    // acknowledged and dropped so the app does not retry them forever.
  }

  if (openSession) {
    const current = body.current ?? null;
    const { error } = await supabaseAdmin
      .from("work_sessions")
      .update({
        last_heartbeat_at: new Date().toISOString(),
        current_app: current ? clampText(current.app_name, 200) : null,
        current_title: current && settings.capture_window_titles ? clampText(current.window_title, 500) : null,
        current_domain: current ? clampText(current.url_domain, 255) : null,
        current_is_idle: current ? current.is_idle === true : null,
        agent_device: clampText(body.device?.name, 200),
        agent_os: clampText(body.device?.os, 100),
        agent_version: clampText(body.device?.version, 50),
      })
      .eq("id", openSession.id);
    if (error) console.error("Failed to update live session state", error);
  }

  return respond(accepted);
}
