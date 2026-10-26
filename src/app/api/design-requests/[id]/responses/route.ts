import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidDeliverableUrl } from "@/lib/creativeRequests";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

// GET /api/design-requests/[id]/responses — list all responses
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await authenticate(request);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("creative_request_responses")
    .select("id, request_id, user_id, user_name, comment, deliverable_url, created_at, updated_at")
    .eq("request_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return json({ error: "Unable to load responses" }, 500);
  }

  return json({ responses: data || [] });
}

// POST /api/design-requests/[id]/responses — add a comment / deliverable link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await authenticate(request);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const comment =
    typeof body.comment === "string" ? body.comment.trim() : null;
  const deliverableUrl =
    typeof body.deliverable_url === "string" ? body.deliverable_url.trim() : null;

  if (!comment && !deliverableUrl) {
    return json({ error: "Provide a comment or deliverable link" }, 400);
  }

  if (deliverableUrl && !isValidDeliverableUrl(deliverableUrl)) {
    return json(
      {
        error:
          "Deliverable link must be a valid HTTPS URL from Dropbox, Google Drive, Google Sheets, OneDrive, SharePoint, WeTransfer, or Box.",
      },
      400,
    );
  }

  // Verify the request exists
  const { data: req } = await supabaseAdmin
    .from("creative_requests")
    .select("id")
    .eq("id", id)
    .single();
  if (!req) return json({ error: "Request not found" }, 404);

  // Resolve the user's name
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();
  const userName = userRow?.full_name ?? user.email ?? "Unknown";

  const { data, error } = await supabaseAdmin
    .from("creative_request_responses")
    .insert({
      request_id: id,
      user_id: user.id,
      user_name: userName,
      comment,
      deliverable_url: deliverableUrl,
    })
    .select("id, request_id, user_id, user_name, comment, deliverable_url, created_at, updated_at")
    .single();

  if (error || !data) {
    console.error("Failed to save response", error);
    return json({ error: "Unable to save response" }, 500);
  }

  return json({ ok: true, response: data }, 201);
}
