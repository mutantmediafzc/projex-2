import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const LEAD_STATUSES = [
  "new_lead", "contacted_initially", "follow_up", "qualified", "call_booked",
  "proposal_sent", "for_invoicing", "won", "lost",
] as const;

type LeadStatus = (typeof LEAD_STATUSES)[number];

async function authenticate(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : data.user;
}

export async function GET(request: NextRequest) {
  if (!(await authenticate(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [leadsResult, usersResult, historyResult] = await Promise.all([
    supabaseAdmin
      .from("campaign_form_submissions")
      .select("id, form_slug, source_url, website, email, questionnaire, metadata, created_at, lead_status, lead_status_updated_at, assigned_user_id, assigned_at")
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("users").select("id, full_name, email").order("full_name"),
    supabaseAdmin
      .from("campaign_lead_status_history")
      .select("id, submission_id, from_status, to_status, changed_by_email, changed_at")
      .order("changed_at", { ascending: false }),
  ]);

  if (leadsResult.error || usersResult.error || historyResult.error) {
    console.error("Unable to load LMS data", { leads: leadsResult.error, users: usersResult.error, history: historyResult.error });
    return NextResponse.json({ error: "Unable to load leads" }, { status: 500 });
  }
  const leads = leadsResult.data.map((lead) => ({
    ...lead,
    status_history: historyResult.data.filter((entry) => entry.submission_id === lead.id),
  }));
  return NextResponse.json({ leads, users: usersResult.data });
}

export async function PATCH(request: NextRequest) {
  const currentUser = await authenticate(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: unknown; status?: unknown; assignedUserId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.id !== "string") {
    return NextResponse.json({ error: "A valid lead id is required" }, { status: 422 });
  }

  const update: Record<string, string | null> = {};
  let previousStatus: string | null = null;
  if (body.status !== undefined) {
    if (!LEAD_STATUSES.includes(body.status as LeadStatus)) {
      return NextResponse.json({ error: "A valid lead status is required" }, { status: 422 });
    }
    const { data: existingLead, error: existingLeadError } = await supabaseAdmin
      .from("campaign_form_submissions").select("lead_status").eq("id", body.id).maybeSingle();
    if (existingLeadError || !existingLead) {
      return NextResponse.json({ error: "Lead was not found" }, { status: 404 });
    }
    previousStatus = existingLead.lead_status;
    if (previousStatus !== body.status) {
      update.lead_status = body.status as string;
      update.lead_status_updated_at = new Date().toISOString();
    }
  }
  if (body.assignedUserId !== undefined) {
    if (body.assignedUserId !== null && typeof body.assignedUserId !== "string") {
      return NextResponse.json({ error: "A valid assigned user is required" }, { status: 422 });
    }
    if (typeof body.assignedUserId === "string") {
      const { data: assignee } = await supabaseAdmin.from("users").select("id").eq("id", body.assignedUserId).maybeSingle();
      if (!assignee) return NextResponse.json({ error: "Assigned user was not found" }, { status: 422 });
    }
    update.assigned_user_id = body.assignedUserId as string | null;
    update.assigned_at = body.assignedUserId ? new Date().toISOString() : null;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ lead: { id: body.id, lead_status: previousStatus } });
  }

  const { data, error } = await supabaseAdmin
    .from("campaign_form_submissions")
    .update(update)
    .eq("id", body.id)
    .select("id, lead_status, lead_status_updated_at, assigned_user_id, assigned_at")
    .single();

  if (error) {
    console.error("Unable to update LMS lead", error);
    return NextResponse.json({ error: "Unable to update lead" }, { status: 500 });
  }

  let history = null;
  if (body.status !== undefined && previousStatus !== body.status) {
    const { data: historyData, error: historyError } = await supabaseAdmin.from("campaign_lead_status_history").insert({
      submission_id: body.id,
      from_status: previousStatus,
      to_status: body.status,
      changed_by_id: currentUser.id,
      changed_by_email: currentUser.email ?? null,
    }).select("id, submission_id, from_status, to_status, changed_by_email, changed_at").single();
    if (historyError) console.error("Unable to record LMS status history", historyError);
    history = historyData;
  }
  return NextResponse.json({ lead: data, history });
}
