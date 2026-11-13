import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  SCREENSHOT_BUCKET,
  clampText,
  getActivitySettings,
  getOpenSession,
  hasConsent,
  json,
  parseDate,
  requireUser,
} from "@/lib/activityTrackingServer";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);

// POST /api/activity/screenshot  (multipart/form-data)
// Fields: file, captured_at, app_name?, window_title?, blurred?
// Only accepted while screenshots are enabled and the user is checked in.
export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;
  const userId = auth.user.id;

  const settings = await getActivitySettings();
  if (!settings.screenshots_enabled) return json({ error: "Screenshots are turned off" }, 409);
  if (!(await hasConsent(userId, settings.policy_version))) return json({ error: "Consent required" }, 403);

  const session = await getOpenSession(userId);
  if (!session) return json({ error: "Not checked in" }, 409);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof Blob)) return json({ error: "Missing screenshot file" }, 400);
  if (!ALLOWED_TYPES.has(file.type)) return json({ error: "Screenshot must be JPEG or PNG" }, 400);
  if (file.size > MAX_BYTES) return json({ error: "Screenshot is too large" }, 413);

  const capturedAt = parseDate(form.get("captured_at")) ?? new Date();
  if (Math.abs(capturedAt.getTime() - Date.now()) > 10 * 60 * 1000) {
    return json({ error: "Screenshot timestamp is out of range" }, 400);
  }

  const ext = file.type === "image/png" ? "png" : "jpg";
  const path = `${userId}/${session.id}/${capturedAt.getTime()}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(SCREENSHOT_BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: true });
  if (uploadError) {
    console.error("Failed to upload screenshot", uploadError);
    return json({ error: "Could not store screenshot" }, 500);
  }

  const { error } = await supabaseAdmin.from("activity_screenshots").upsert(
    {
      session_id: session.id,
      user_id: userId,
      captured_at: capturedAt.toISOString(),
      storage_path: path,
      app_name: clampText(form.get("app_name"), 200),
      window_title: settings.capture_window_titles ? clampText(form.get("window_title"), 500) : null,
      is_blurred: form.get("blurred") !== "false",
    },
    { onConflict: "session_id,captured_at", ignoreDuplicates: true },
  );
  if (error) {
    console.error("Failed to record screenshot", error);
    return json({ error: "Could not store screenshot" }, 500);
  }

  return json({ stored: true });
}
