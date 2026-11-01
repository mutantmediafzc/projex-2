import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { json, mapTaskSummary, requireQaAdmin, TASK_SUMMARY_SELECT } from "@/lib/qaTrackingServer";

// GET /api/qa/tasks — every QA task across projects (reports + history).
// Optional filters: project_id, assignee_id, from (YYYY-MM-DD), to (YYYY-MM-DD)
export async function GET(request: NextRequest) {
  const auth = await requireQaAdmin(request);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const projectId = url.searchParams.get("project_id")?.trim();
  const assigneeId = url.searchParams.get("assignee_id")?.trim();
  const from = url.searchParams.get("from")?.trim();
  const to = url.searchParams.get("to")?.trim();
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  let query = supabaseAdmin
    .from("qa_tasks")
    .select(TASK_SUMMARY_SELECT)
    .order("created_at", { ascending: false });

  if (projectId) query = query.eq("project_id", projectId);
  if (assigneeId) query = query.eq("assignee_id", assigneeId);
  if (from && datePattern.test(from)) query = query.gte("created_at", `${from}T00:00:00+04:00`);
  if (to && datePattern.test(to)) query = query.lte("created_at", `${to}T23:59:59.999+04:00`);

  const { data, error } = await query;
  if (error) {
    console.error("Failed to load QA tasks", error);
    return json({ error: "Unable to load QA tasks" }, 500);
  }

  return json({ tasks: (data ?? []).map(mapTaskSummary) });
}
