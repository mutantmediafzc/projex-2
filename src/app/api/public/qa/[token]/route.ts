import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sanitizeBreakdown, sanitizeCases, userDisplayName, validateSubmission } from "@/lib/qaTracking";
import { json, logQaEvent } from "@/lib/qaTrackingServer";

type Params = { params: Promise<{ token: string }> };

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,100}$/;

async function loadTask(token: string) {
  return supabaseAdmin
    .from("qa_tasks")
    .select(
      "id, assignee_id, title, description, pr_url, breakdown, status, submitted_at, submitted_by_name, review_status, review_notes, reviewed_at, created_at, project:qa_projects(name), assignee:users!qa_tasks_assignee_id_fkey(full_name, email)",
    )
    .eq("public_token", token)
    .maybeSingle();
}

// GET /api/public/qa/[token] — the team member's task page.
export async function GET(_request: NextRequest, { params }: Params) {
  const { token } = await params;
  if (!TOKEN_PATTERN.test(token)) return json({ error: "This QA link is not valid" }, 404);

  const { data: task, error } = await loadTask(token);
  if (error) {
    console.error("Failed to load public QA task", error);
    return json({ error: "Unable to load this task" }, 500);
  }
  if (!task) return json({ error: "This QA link is not valid or has been removed" }, 404);

  const { data: cases } = await supabaseAdmin
    .from("qa_test_cases")
    .select("id, position, title, steps, expected_result, status, comment, review_status, review_comment")
    .eq("task_id", task.id)
    .order("position", { ascending: true });

  const project = task.project as unknown as { name: string } | null;
  const assignee = task.assignee as unknown as { full_name: string | null; email: string | null } | null;
  const memberName = userDisplayName(assignee);

  // Record the first time the member opens the link.
  if (task.status === "draft") {
    const { count } = await supabaseAdmin
      .from("qa_task_events")
      .select("id", { count: "exact", head: true })
      .eq("task_id", task.id)
      .eq("event_type", "opened");
    if (!count) {
      await logQaEvent({ taskId: task.id, eventType: "opened", actorId: task.assignee_id, actorName: memberName });
    }
  }

  const submitted = task.status === "submitted";
  return json({
    project_name: project?.name ?? null,
    member_name: memberName,
    title: task.title,
    description: task.description,
    pr_url: task.pr_url,
    breakdown: Array.isArray(task.breakdown) ? task.breakdown : [],
    status: task.status,
    submitted_at: task.submitted_at,
    submitted_by_name: task.submitted_by_name,
    // Review feedback is only shared once the work is locked.
    review_status: submitted ? task.review_status : "pending",
    review_notes: submitted ? task.review_notes : null,
    reviewed_at: submitted ? task.reviewed_at : null,
    cases: (cases ?? []).map((c) => ({
      ...c,
      review_status: submitted ? c.review_status : "pending",
      review_comment: submitted ? c.review_comment : null,
    })),
  });
}

async function save(request: NextRequest, token: string, submit: boolean) {
  if (!TOKEN_PATTERN.test(token)) return json({ error: "This QA link is not valid" }, 404);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 500) : "";
  const description = typeof body.description === "string" ? body.description.slice(0, 20000) : "";
  const prUrl = typeof body.pr_url === "string" ? body.pr_url.trim().slice(0, 2000) : "";
  const breakdown = sanitizeBreakdown(body.breakdown);
  const cases = sanitizeCases(body.cases);

  if (submit) {
    const problem = validateSubmission({ title, description, pr_url: prUrl, breakdown, cases });
    if (problem) return json({ error: problem }, 400);
  }

  const { error } = await supabaseAdmin.rpc("qa_save_task", {
    p_token: token,
    p_title: title,
    p_description: description,
    p_pr_url: prUrl,
    p_breakdown: breakdown,
    p_cases: cases,
    p_submit: submit,
  });

  if (error) {
    if (error.code === "P0002") return json({ error: "This QA link is not valid or has been removed" }, 404);
    if (error.code === "P0001") return json({ error: "This task has already been submitted and can no longer be changed" }, 409);
    if (error.code === "22023") return json({ error: error.message }, 400);
    console.error("Failed to save public QA task", error);
    return json({ error: "Unable to save your work, please try again" }, 500);
  }

  return json({ ok: true, submitted: submit });
}

// PUT /api/public/qa/[token] — save draft (can be repeated until submitted).
export async function PUT(request: NextRequest, { params }: Params) {
  const { token } = await params;
  return save(request, token, false);
}

// POST /api/public/qa/[token] — final submit. Locks the task permanently.
export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;
  return save(request, token, true);
}
