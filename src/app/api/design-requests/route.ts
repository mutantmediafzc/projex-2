import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isDesignRequestStatus,
  isRequestType,
  generatePublicToken,
  sanitizeAnswers,
  type CreativeRequestRow,
} from "@/lib/creativeRequests";

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

// GET /api/design-requests — list all requests (internal, authenticated).
export async function GET(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() || "";
  const status = url.searchParams.get("status")?.trim() || "";
  const assignedTo = url.searchParams.get("assigned_to")?.trim() || "";
  const sortBy = url.searchParams.get("sort")?.trim() || "created_at";

  let query = supabaseAdmin
    .from("creative_requests")
    .select(
      "id, company_id, request_type, requested_by, assigned_to, status, submission_source, public_token, answers, deadline, deadline_notes, internal_notes, created_at, updated_at, submitted_at, company:companies(id, name), requested_by_user:users!creative_requests_requested_by_fkey(id, full_name), assigned_to_user:users!creative_requests_assigned_to_fkey(id, full_name)",
    )
    .order(sortBy === "deadline" ? "deadline" : "created_at", {
      ascending: sortBy === "deadline",
      nullsFirst: false,
    });

  if (status && isDesignRequestStatus(status)) {
    query = query.eq("status", status);
  }
  if (assignedTo) {
    query = query.eq("assigned_to", assignedTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load creative requests", error);
    return json({ error: "Unable to load requests" }, 500);
  }

  let rows = (data || []) as unknown as Array<{
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
  }>;

  // Client-side search filter (company name or request type)
  if (search) {
    const term = search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.company?.name?.toLowerCase().includes(term) ||
        r.request_type?.toLowerCase().includes(term),
    );
  }

  const mapped: CreativeRequestRow[] = rows.map((r) => ({
    id: r.id,
    company_id: r.company_id,
    company_name: r.company?.name ?? null,
    request_type: r.request_type,
    requested_by: r.requested_by,
    requested_by_name: r.requested_by_user?.full_name ?? null,
    assigned_to: r.assigned_to,
    assigned_to_name: r.assigned_to_user?.full_name ?? null,
    status: r.status as CreativeRequestRow["status"],
    submission_source: r.submission_source as CreativeRequestRow["submission_source"],
    public_token: r.public_token,
    answers: r.answers as CreativeRequestRow["answers"],
    deadline: r.deadline,
    deadline_notes: r.deadline_notes,
    internal_notes: r.internal_notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
    submitted_at: r.submitted_at,
  }));

  return json({ requests: mapped });
}

// POST /api/design-requests — create a new request (internal, authenticated).
export async function POST(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return json({ error: "Unauthorized" }, 401);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const companyId = typeof body.company_id === "string" ? body.company_id.trim() : "";
  if (!companyId) return json({ error: "Client / Brand is required" }, 400);

  const requestType = typeof body.request_type === "string" ? body.request_type.trim() : "";
  if (!requestType) return json({ error: "Request Type is required" }, 400);
  if (!isRequestType(requestType) && requestType !== "Other") {
    return json({ error: "Invalid Request Type" }, 400);
  }

  // Verify the company exists
  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select("id, name")
    .eq("id", companyId)
    .single();
  if (companyError || !company) {
    return json({ error: "Selected Client / Brand does not exist" }, 400);
  }

  // Assigned To — optional, must be a valid internal user if provided
  let assignedTo: string | null = null;
  if (typeof body.assigned_to === "string" && body.assigned_to.trim()) {
    assignedTo = body.assigned_to.trim();
    const { data: assignee } = await supabaseAdmin
      .from("users")
      .select("id, full_name")
      .eq("id", assignedTo)
      .single();
    if (!assignee) return json({ error: "Assigned To user not found" }, 400);
  }

  // Resolve the requesting user's name for the request_owner prefill
  const { data: requestingUser } = await supabaseAdmin
    .from("users")
    .select("id, full_name")
    .eq("id", user.id)
    .single();
  const requestedByName = requestingUser?.full_name ?? user.email ?? "Unknown";

  const shareWithClient = body.share_with_client === true;
  const fillInternally = body.fill_internally === true;

  if (!shareWithClient && !fillInternally) {
    return json({ error: "Choose Fill Internally or Share With Client" }, 400);
  }

  const deadline = typeof body.deadline === "string" && body.deadline.trim() ? body.deadline.trim() : null;
  const deadlineNotes = typeof body.deadline_notes === "string" ? body.deadline_notes.trim() : null;

  // Initial answers with prefilled fields
  const initialAnswers: Record<string, unknown> = {
    client_brand: company.name,
    request_type: requestType,
    request_owner: requestedByName,
  };
  if (deadline) initialAnswers.deadline = deadline;

  const publicToken = shareWithClient ? generatePublicToken() : null;
  const submissionSource = shareWithClient ? "public" : "internal";
  // If sharing with client, the request waits for the brief.
  // If filling internally, the answers come in the same call.
  const status = shareWithClient ? "waiting_for_brief" : "in_queue";

  let answers = initialAnswers;
  let submittedAt: string | null = null;

  if (fillInternally) {
    const sanitized = sanitizeAnswers(body.answers);
    answers = { ...initialAnswers, ...sanitized };
    submittedAt = new Date().toISOString();
  }

  const insertPayload = {
    company_id: companyId,
    request_type: requestType,
    requested_by: user.id,
    assigned_to: assignedTo,
    status,
    submission_source: submissionSource,
    public_token: publicToken,
    answers,
    deadline,
    deadline_notes: deadlineNotes,
    internal_notes: null,
    submitted_at: submittedAt,
  };

  const { data, error } = await supabaseAdmin
    .from("creative_requests")
    .insert(insertPayload)
    .select("id, public_token, created_at")
    .single();

  if (error || !data) {
    console.error("Failed to create creative request", error);
    return json({ error: "Unable to create request" }, 500);
  }

  // Create assignment notification if assigned
  if (assignedTo) {
    await supabaseAdmin
      .from("creative_request_notifications")
      .upsert(
        { request_id: data.id, user_id: assignedTo },
        { onConflict: "request_id, user_id" },
      );
  }

  return json(
    {
      ok: true,
      id: data.id,
      public_token: data.public_token,
      created_at: data.created_at,
    },
    201,
  );
}
