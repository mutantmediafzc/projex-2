import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  generateQaToken,
  isQaCaseReviewStatus,
  isQaTaskReviewStatus,
  QA_CASE_REVIEW_LABELS,
  QA_TASK_REVIEW_LABELS,
} from "@/lib/qaTracking";
import { getActorName, json, logQaEvent, requireQaAdmin } from "@/lib/qaTrackingServer";

type Params = { params: Promise<{ id: string }> };

// GET /api/qa/tasks/[id] — full task with cases and history.
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireQaAdmin(request);
  if (auth.error) return auth.error;
  const { id } = await params;

  const { data: task, error } = await supabaseAdmin
    .from("qa_tasks")
    .select(
      "id, project_id, assignee_id, public_token, title, description, pr_url, breakdown, status, submitted_at, submitted_by_name, review_status, review_notes, reviewed_at, created_at, updated_at, project:qa_projects(id, name), assignee:users!qa_tasks_assignee_id_fkey(id, full_name, email), reviewer:users!qa_tasks_reviewed_by_fkey(id, full_name, email)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load QA task", error);
    return json({ error: "Unable to load task" }, 500);
  }
  if (!task) return json({ error: "Task not found" }, 404);

  const [{ data: cases, error: casesError }, { data: events, error: eventsError }] = await Promise.all([
    supabaseAdmin
      .from("qa_test_cases")
      .select("id, position, title, steps, expected_result, status, comment, review_status, review_comment, reviewed_at")
      .eq("task_id", id)
      .order("position", { ascending: true }),
    supabaseAdmin
      .from("qa_task_events")
      .select("id, event_type, actor_name, details, created_at")
      .eq("task_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (casesError || eventsError) {
    console.error("Failed to load QA task details", casesError || eventsError);
    return json({ error: "Unable to load task details" }, 500);
  }

  return json({ task, cases: cases ?? [], events: events ?? [] });
}

// PATCH /api/qa/tasks/[id]
// Body (all optional):
//   review_status: pending | passed | bugs_found   (submitted tasks only)
//   review_notes: string
//   cases: [{ id, review_status: pending | verified | bug, review_comment }]
//   title, description          (draft tasks only, pre-fill for the member)
//   regenerate_token: true      (draft tasks only)
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireQaAdmin(request);
  if (auth.error) return auth.error;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { data: task, error: loadError } = await supabaseAdmin
    .from("qa_tasks")
    .select("id, status, review_status, review_notes")
    .eq("id", id)
    .maybeSingle();
  if (loadError) return json({ error: "Unable to load task" }, 500);
  if (!task) return json({ error: "Task not found" }, 404);

  const actorName = await getActorName(auth.user.id, auth.user.email);
  const now = new Date().toISOString();

  // Draft-only edits (pre-fill / new link)
  if (body.title !== undefined || body.description !== undefined || body.regenerate_token === true) {
    if (task.status !== "draft") {
      return json({ error: "This task has been submitted and is locked" }, 409);
    }
    const update: Record<string, string> = {};
    if (typeof body.title === "string") {
      update.title = body.title.trim().slice(0, 500);
      if (!update.title) return json({ error: "Task title is required" }, 400);
    }
    if (typeof body.description === "string") {
      update.description = body.description.slice(0, 10000);
      if (!update.description.trim()) return json({ error: "Task description is required" }, 400);
    }
    if (body.regenerate_token === true) update.public_token = generateQaToken();
    const { error } = await supabaseAdmin.from("qa_tasks").update(update).eq("id", id);
    if (error) return json({ error: "Unable to update task" }, 500);
    if (update.public_token) {
      await logQaEvent({ taskId: id, eventType: "link_regenerated", actorId: auth.user.id, actorName });
    }
    if (update.title !== undefined || update.description !== undefined) {
      await logQaEvent({ taskId: id, eventType: "details_updated", actorId: auth.user.id, actorName });
    }
  }

  const wantsReview = body.review_status !== undefined || body.review_notes !== undefined || body.cases !== undefined;
  if (!wantsReview) return json({ ok: true });

  if (task.status !== "submitted") {
    return json({ error: "Tasks can only be reviewed after the team member submits them" }, 409);
  }

  const changes: string[] = [];

  if (Array.isArray(body.cases)) {
    const { data: existingCases } = await supabaseAdmin
      .from("qa_test_cases")
      .select("id, position, title, review_status, review_comment")
      .eq("task_id", id);
    const byId = new Map((existingCases ?? []).map((c) => [c.id as string, c]));

    for (const raw of body.cases) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Record<string, unknown>;
      const caseId = typeof item.id === "string" ? item.id : "";
      const existing = byId.get(caseId);
      if (!existing || !isQaCaseReviewStatus(item.review_status)) continue;
      const reviewComment = typeof item.review_comment === "string" ? item.review_comment.slice(0, 10000) : "";
      if (existing.review_status === item.review_status && (existing.review_comment ?? "") === reviewComment) continue;

      const { error } = await supabaseAdmin
        .from("qa_test_cases")
        .update({
          review_status: item.review_status,
          review_comment: reviewComment || null,
          reviewed_at: item.review_status === "pending" ? null : now,
        })
        .eq("id", caseId)
        .eq("task_id", id);
      if (error) {
        console.error("Failed to review QA case", error);
        return json({ error: "Unable to save case review" }, 500);
      }
      if (existing.review_status !== item.review_status) {
        changes.push(`Case ${(existing.position as number) + 1} "${existing.title}": ${QA_CASE_REVIEW_LABELS[item.review_status]}`);
      } else {
        changes.push(`Case ${(existing.position as number) + 1} "${existing.title}": comment updated`);
      }
    }
  }

  const taskUpdate: Record<string, unknown> = {};
  if (body.review_status !== undefined) {
    if (!isQaTaskReviewStatus(body.review_status)) return json({ error: "Invalid review status" }, 400);
    if (body.review_status !== task.review_status) {
      taskUpdate.review_status = body.review_status;
      changes.push(`Task verdict: ${QA_TASK_REVIEW_LABELS[body.review_status]}`);
    }
  }
  if (typeof body.review_notes === "string" && body.review_notes !== (task.review_notes ?? "")) {
    taskUpdate.review_notes = body.review_notes.slice(0, 10000) || null;
    changes.push("Review notes updated");
  }

  if (changes.length) {
    taskUpdate.reviewed_at = now;
    taskUpdate.reviewed_by = auth.user.id;
    const { error } = await supabaseAdmin.from("qa_tasks").update(taskUpdate).eq("id", id);
    if (error) {
      console.error("Failed to review QA task", error);
      return json({ error: "Unable to save review" }, 500);
    }
    await logQaEvent({ taskId: id, eventType: "reviewed", actorId: auth.user.id, actorName, details: { changes } });
  }

  return json({ ok: true, changes });
}

// DELETE /api/qa/tasks/[id]
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireQaAdmin(request);
  if (auth.error) return auth.error;
  const { id } = await params;

  const { error } = await supabaseAdmin.from("qa_tasks").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete QA task", error);
    return json({ error: "Unable to delete task" }, 500);
  }
  return json({ ok: true });
}
