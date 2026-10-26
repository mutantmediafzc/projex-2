import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  Vary: "Origin",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

async function authenticate(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : data.user;
}

// GET /api/design-requests/notifications — list current user's notifications
export async function GET(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const { data, error } = await supabaseAdmin
    .from("creative_request_notifications")
    .select(
      "id, request_id, user_id, read_at, created_at, request:creative_requests(id, company_id, request_type, status, company:companies(name))",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return json({ error: "Unable to load notifications" }, 500);
  }

  return json({ notifications: data || [] });
}

// PATCH /api/design-requests/notifications — mark one or all as read
export async function PATCH(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return json({ error: "Unauthorized" }, 401);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const nowIso = new Date().toISOString();

  if (body.mark_all === true) {
    const { error } = await supabaseAdmin
      .from("creative_request_notifications")
      .update({ read_at: nowIso })
      .eq("user_id", user.id)
      .is("read_at", null);
    if (error) return json({ error: "Unable to mark notifications read" }, 500);
    return json({ ok: true });
  }

  const notificationId = typeof body.notification_id === "string" ? body.notification_id.trim() : "";
  if (!notificationId) return json({ error: "notification_id required" }, 400);

  const { error } = await supabaseAdmin
    .from("creative_request_notifications")
    .update({ read_at: nowIso })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .is("read_at", null);
  if (error) return json({ error: "Unable to mark notification read" }, 500);

  return json({ ok: true });
}
