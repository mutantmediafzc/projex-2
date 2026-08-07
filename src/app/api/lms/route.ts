import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const LEAD_STATUSES = [
  "campaign_leads", "outreach", "audit", "qualified", "call_booked",
  "proposal_sent", "for_invoicing", "won", "lost",
] as const;

const TASK_TYPES = ["todo", "email", "call", "meeting", "lunch", "deadline", "linkedin"] as const;
const TASK_PRIORITIES = ["low", "medium", "high"] as const;
const TASK_STATUSES = ["in_progress", "completed"] as const;

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
      .select("id, submission_id, from_status, to_status, event_type, assigned_user_id, assigned_user_name, changed_by_email, changed_at")
      .order("changed_at", { ascending: false }),
  ]);

  if (leadsResult.error || usersResult.error || historyResult.error) {
    console.error("Unable to load LMS data", { leads: leadsResult.error, users: usersResult.error, history: historyResult.error });
    return NextResponse.json({ error: "Unable to load leads" }, { status: 500 });
  }
  const leadIds = leadsResult.data.map((lead) => lead.id);
  const tasksResult = leadIds.length
    ? await supabaseAdmin
      .from("tasks")
      .select("id, lead_submission_id, name, content, status, priority, type, activity_date, reminder_enabled, created_at, created_by_name, assigned_user_id, assigned_user_name")
      .in("lead_submission_id", leadIds)
      .order("activity_date", { ascending: true })
    : { data: [], error: null };

  if (tasksResult.error) {
    console.error("Unable to load LMS tasks", tasksResult.error);
    return NextResponse.json({ error: "Unable to load lead tasks" }, { status: 500 });
  }

  const taskIds = (tasksResult.data || []).map((task) => task.id);
  const taskHistoryResult = taskIds.length
    ? await supabaseAdmin
      .from("task_history")
      .select("id, task_id, action_type, field_name, old_value, new_value, changed_by_name, created_at")
      .in("task_id", taskIds)
      .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (taskHistoryResult.error) {
    console.error("Unable to load LMS task history", taskHistoryResult.error);
    return NextResponse.json({ error: "Unable to load lead task history" }, { status: 500 });
  }

  const tasks = (tasksResult.data || []).map((task) => ({
    ...task,
    history: (taskHistoryResult.data || []).filter((entry) => entry.task_id === task.id),
  }));
  const leads = leadsResult.data.map((lead) => ({
    ...lead,
    status_history: historyResult.data.filter((entry) => entry.submission_id === lead.id),
    tasks: tasks.filter((task) => task.lead_submission_id === lead.id),
  }));
  return NextResponse.json({ leads, users: usersResult.data });
}

export async function POST(request: NextRequest) {
  const currentUser = await authenticate(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    leadId?: unknown;
    taskType?: unknown;
    status?: unknown;
    name?: unknown;
    dueDate?: unknown;
    dueTime?: unknown;
    priority?: unknown;
    notes?: unknown;
    assignedUserId?: unknown;
    reminder?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.leadId !== "string" || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "A lead and task name are required" }, { status: 422 });
  }
  if (body.taskType !== undefined && !TASK_TYPES.includes(body.taskType as (typeof TASK_TYPES)[number])) {
    return NextResponse.json({ error: "A valid task type is required" }, { status: 422 });
  }
  if (body.priority !== undefined && !TASK_PRIORITIES.includes(body.priority as (typeof TASK_PRIORITIES)[number])) {
    return NextResponse.json({ error: "A valid task priority is required" }, { status: 422 });
  }
  if (body.status !== undefined && !TASK_STATUSES.includes(body.status as (typeof TASK_STATUSES)[number])) {
    return NextResponse.json({ error: "A valid task status is required" }, { status: 422 });
  }
  if (body.dueDate !== undefined && body.dueDate !== "" && typeof body.dueDate !== "string") {
    return NextResponse.json({ error: "A valid due date is required" }, { status: 422 });
  }
  if (body.assignedUserId !== undefined && body.assignedUserId !== null && typeof body.assignedUserId !== "string") {
    return NextResponse.json({ error: "A valid assigned user is required" }, { status: 422 });
  }

  const { data: lead } = await supabaseAdmin
    .from("campaign_form_submissions")
    .select("id")
    .eq("id", body.leadId)
    .maybeSingle();
  if (!lead) return NextResponse.json({ error: "Lead was not found" }, { status: 404 });

  let assignedUserName: string | null = null;
  if (typeof body.assignedUserId === "string") {
    const { data: assignee } = await supabaseAdmin
      .from("users")
      .select("id, full_name, email")
      .eq("id", body.assignedUserId)
      .maybeSingle();
    if (!assignee) return NextResponse.json({ error: "Assigned user was not found" }, { status: 422 });
    assignedUserName = assignee.full_name || assignee.email;
  }

  let activityDate: string | null = null;
  if (typeof body.dueDate === "string" && body.dueDate) {
    const dueTime = typeof body.dueTime === "string" && body.dueTime ? body.dueTime : "09:00";
    const parsed = new Date(`${body.dueDate}T${dueTime}:00`);
    if (Number.isNaN(parsed.getTime())) return NextResponse.json({ error: "A valid due date is required" }, { status: 422 });
    activityDate = parsed.toISOString();
  }

  const { data: task, error } = await supabaseAdmin
    .from("tasks")
    .insert({
      patient_id: null,
      lead_submission_id: body.leadId,
      name: body.name.trim(),
      content: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
      status: body.status || "in_progress",
      priority: body.priority || "medium",
      type: body.taskType || "todo",
      activity_date: activityDate,
      reminder_enabled: body.reminder === true,
      created_by_user_id: currentUser.id,
      created_by_name: currentUser.email || "Unknown",
      assigned_user_id: typeof body.assignedUserId === "string" ? body.assignedUserId : null,
      assigned_user_name: assignedUserName,
      source: "operations",
    })
    .select("id, lead_submission_id, name, content, status, priority, type, activity_date, reminder_enabled, created_at, created_by_name, assigned_user_id, assigned_user_name")
    .single();

  if (error || !task) {
    console.error("Unable to create LMS task", error);
    return NextResponse.json({ error: "Unable to create task" }, { status: 500 });
  }

  const { error: historyError } = await supabaseAdmin.from("task_history").insert({
    task_id: task.id,
    action_type: "created",
    new_value: task.name,
    changed_by_user_id: currentUser.id,
    changed_by_name: currentUser.email || "Unknown",
  });
  if (historyError) console.error("Unable to record LMS task history", historyError);

  return NextResponse.json({ task: { ...task, history: [] } }, { status: 201 });
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
  let previousAssignedUserId: string | null = null;
  let assignedUserName: string | null = null;
  if (body.status !== undefined || body.assignedUserId !== undefined) {
    const { data, error: existingLeadError } = await supabaseAdmin
      .from("campaign_form_submissions")
      .select("lead_status, assigned_user_id")
      .eq("id", body.id)
      .maybeSingle();
    if (existingLeadError || !data) return NextResponse.json({ error: "Lead was not found" }, { status: 404 });
    previousStatus = data.lead_status;
    previousAssignedUserId = data.assigned_user_id;
  }
  if (body.status !== undefined) {
    if (!LEAD_STATUSES.includes(body.status as LeadStatus)) {
      return NextResponse.json({ error: "A valid lead status is required" }, { status: 422 });
    }
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
      const { data: assignee } = await supabaseAdmin.from("users").select("id, full_name, email").eq("id", body.assignedUserId).maybeSingle();
      if (!assignee) return NextResponse.json({ error: "Assigned user was not found" }, { status: 422 });
      assignedUserName = assignee.full_name || assignee.email;
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
      event_type: "status_changed",
    }).select("id, submission_id, from_status, to_status, event_type, assigned_user_id, assigned_user_name, changed_by_email, changed_at").single();
    if (historyError) console.error("Unable to record LMS status history", historyError);
    history = historyData;
  }
  const assignmentChanged = body.assignedUserId !== undefined && previousAssignedUserId !== (body.assignedUserId as string | null);
  if (assignmentChanged) {
    const currentStatus = (body.status as string | undefined) || previousStatus || "campaign_leads";
    const { data: assignmentHistory, error: assignmentHistoryError } = await supabaseAdmin.from("campaign_lead_status_history").insert({
      submission_id: body.id,
      from_status: currentStatus,
      to_status: currentStatus,
      event_type: "assignment_changed",
      assigned_user_id: body.assignedUserId as string | null,
      assigned_user_name: assignedUserName,
      changed_by_id: currentUser.id,
      changed_by_email: currentUser.email ?? null,
    }).select("id, submission_id, from_status, to_status, event_type, assigned_user_id, assigned_user_name, changed_by_email, changed_at").single();
    if (assignmentHistoryError) console.error("Unable to record LMS assignment history", assignmentHistoryError);
    if (assignmentHistory) history = assignmentHistory;
  }
  return NextResponse.json({ lead: data, history });
}
