import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  QUESTIONNAIRE_FIELDS,
  sanitizeAnswers,
  stripPrefilledFields,
  type QuestionnaireAnswers,
} from "@/lib/creativeRequests";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  Vary: "Origin",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// GET /api/forms/design-request/[token] — public form config (no auth)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!token || token.length < 16) {
    return json({ error: "Invalid form link" }, 400);
  }

  const { data, error } = await supabaseAdmin
    .from("creative_requests")
    .select(
      "id, company_id, request_type, status, public_token, answers, requested_by, requested_by_user:users!creative_requests_requested_by_fkey(full_name)",
    )
    .eq("public_token", token)
    .single();

  if (error || !data) {
    return json({ error: "Form not found or link is invalid" }, 404);
  }

  const row = data as unknown as {
    id: string;
    company_id: string;
    request_type: string;
    status: string;
    public_token: string;
    answers: Record<string, unknown>;
    requested_by: string;
    requested_by_user: { full_name: string | null } | null;
  };

  if (row.status === "completed") {
    return json({ error: "This form has already been submitted and is now closed." }, 410);
  }

  // Fetch the company name for the read-only Client / Brand display
  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("name")
    .eq("id", row.company_id)
    .single();

  const prefilledAnswers: QuestionnaireAnswers = {
    client_brand: company?.name ?? "",
    request_type: row.request_type,
    request_owner: row.requested_by_user?.full_name ?? "",
  };

  return json({
    request_id: row.id,
    request_type: row.request_type,
    company_name: company?.name ?? "",
    prefilled_answers: prefilledAnswers,
    fields: QUESTIONNAIRE_FIELDS,
    already_submitted: row.status !== "waiting_for_brief",
  });
}

// POST /api/forms/design-request/[token] — public submission (no auth)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!token || token.length < 16) {
    return json({ error: "Invalid form link" }, 400);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // Look up the request by token (server-side validation)
  const { data: req, error: reqError } = await supabaseAdmin
    .from("creative_requests")
    .select("id, company_id, request_type, status, public_token, requested_by, requested_by_user:users!creative_requests_requested_by_fkey(full_name)")
    .eq("public_token", token)
    .single();

  if (reqError || !req) {
    return json({ error: "Form not found or link is invalid" }, 404);
  }

  const row = req as unknown as {
    id: string;
    company_id: string;
    request_type: string;
    status: string;
    public_token: string;
    requested_by: string;
    requested_by_user: { full_name: string | null } | null;
  };

  if (row.status === "completed") {
    return json({ error: "This form has already been submitted." }, 409);
  }

  // Fetch the company name for prefilled fields
  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("name")
    .eq("id", row.company_id)
    .single();

  // Sanitize and strip prefilled fields — public users cannot change them.
  const sanitized = sanitizeAnswers(body.answers);
  const clientAnswers = stripPrefilledFields(sanitized);

  // Re-apply the authoritative prefilled values from the server.
  const prefilledAnswers: QuestionnaireAnswers = {
    client_brand: company?.name ?? "",
    request_type: row.request_type,
    request_owner: row.requested_by_user?.full_name ?? "",
  };

  const finalAnswers = { ...prefilledAnswers, ...clientAnswers };

  const nowIso = new Date().toISOString();

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("creative_requests")
    .update({
      answers: finalAnswers,
      status: "in_queue",
      submitted_at: nowIso,
      submission_source: "public",
    })
    .eq("id", row.id)
    .select("id, assigned_to")
    .single();

  if (updateError || !updated) {
    console.error("Failed to save public submission", updateError);
    return json({ error: "Unable to save submission" }, 500);
  }

  // Notify the assigned team member
  const assignedTo = (updated as { assigned_to: string | null }).assigned_to;
  if (assignedTo) {
    await supabaseAdmin
      .from("creative_request_notifications")
      .upsert(
        { request_id: row.id, user_id: assignedTo },
        { onConflict: "request_id, user_id" },
      );
  }

  return json({ ok: true, request_id: row.id }, 201);
}
