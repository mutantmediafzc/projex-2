import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isDesignRequestStatus } from "@/lib/creativeRequests";

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

// GET /api/design-requests/[id] — full request details + responses
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await authenticate(request);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("creative_requests")
    .select(
      "id, company_id, request_type, requested_by, assigned_to, status, submission_source, public_token, answers, deadline, deadline_notes, internal_notes, created_at, updated_at, submitted_at, company:companies(id, name), requested_by_user:users!creative_requests_requested_by_fkey(id, full_name), assigned_to_user:users!creative_requests_assigned_to_fkey(id, full_name)",
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return json({ error: "Request not found" }, 404);
  }

  const row = data as unknown as {
    id: string;
    company_id: string;
    request_type: string;
    requested_by: string;
    assigned_to: string | null;
    status: string;
    submission_source: string;
    public_token: string | null;
    answers: Record<string, unknown>;
    deadline: string | null;
    deadline_notes: string | null;
    internal_notes: string | null;
    created_at: string;
    updated_at: string;
    submitted_at: string | null;
    company: { id: string; name: string } | null;
    requested_by_user: { id: string; full_name: string | null } | null;
    assigned_to_user: { id: string; full_name: string | null } | null;
  };

  // Load responses (comments + deliverable links)
  const { data: responses } = await supabaseAdmin
    .from("creative_request_responses")
    .select("id, request_id, user_id, user_name, comment, deliverable_url, created_at, updated_at")
    .eq("request_id", id)
    .order("created_at", { ascending: true });

  return json({
    request: {
      id: row.id,
      company_id: row.company_id,
      company_name: row.company?.name ?? null,
      request_type: row.request_type,
      requested_by: row.requested_by,
      requested_by_name: row.requested_by_user?.full_name ?? null,
      assigned_to: row.assigned_to,
      assigned_to_name: row.assigned_to_user?.full_name ?? null,
      status: row.status,
      submission_source: row.submission_source,
      public_token: row.public_token,
      answers: row.answers,
      deadline: row.deadline,
      deadline_notes: row.deadline_notes,
      internal_notes: row.internal_notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      submitted_at: row.submitted_at,
    },
    responses: responses || [],
  });
}

// PATCH /api/design-requests/[id] — update status, assignment, internal notes
export async function PATCH(
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

  const update: Record<string, unknown> = {};

  if (typeof body.status === "string" && isDesignRequestStatus(body.status)) {
    update.status = body.status;
  }

  if (typeof body.assigned_to === "string") {
    if (body.assigned_to.trim()) {
      const { data: assignee } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("id", body.assigned_to.trim())
        .single();
      if (!assignee) return json({ error: "Assigned To user not found" }, 400);
      update.assigned_to = body.assigned_to.trim();
    } else {
      update.assigned_to = null;
    }
  }

  if (typeof body.internal_notes === "string") {
    update.internal_notes = body.internal_notes.trim() || null;
  }

  if (typeof body.deadline === "string") {
    update.deadline = body.deadline.trim() || null;
  }

  if (typeof body.deadline_notes === "string") {
    update.deadline_notes = body.deadline_notes.trim() || null;
  }

  if (Object.keys(update).length === 0) {
    return json({ error: "No valid fields to update" }, 400);
  }

  const { data, error } = await supabaseAdmin
    .from("creative_requests")
    .update(update)
    .eq("id", id)
    .select("id, status, assigned_to, updated_at")
    .single();

  if (error || !data) {
    return json({ error: "Request not found or update failed" }, 404);
  }

  // If assignment changed, create/update notification
  if (typeof update.assigned_to === "string" && update.assigned_to) {
    await supabaseAdmin
      .from("creative_request_notifications")
      .upsert(
        { request_id: id, user_id: update.assigned_to },
        { onConflict: "request_id, user_id" },
      );
  }

  return json({ ok: true, request: data });
}
