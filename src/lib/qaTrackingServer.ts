import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isQaAdminEmail, type QaTaskSummary, type QaTaskReviewStatus, type QaTaskStatus } from "@/lib/qaTracking";

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

// Returns the signed-in QA admin, or a ready-made error response.
export async function requireQaAdmin(
  request: NextRequest,
): Promise<{ user: User; error?: never } | { user?: never; error: NextResponse }> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { error: json({ error: "Unauthorized" }, 401) };
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { error: json({ error: "Unauthorized" }, 401) };
  if (!isQaAdminEmail(data.user.email)) {
    return { error: json({ error: "You do not have access to QA Tracking" }, 403) };
  }
  return { user: data.user };
}

export async function getActorName(userId: string, fallback?: string | null): Promise<string> {
  const { data } = await supabaseAdmin
    .from("users")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();
  return data?.full_name?.trim() || data?.email || fallback || "QA lead";
}

export async function logQaEvent(params: {
  taskId: string;
  eventType: string;
  actorId?: string | null;
  actorName?: string | null;
  details?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from("qa_task_events").insert({
    task_id: params.taskId,
    event_type: params.eventType,
    actor_id: params.actorId ?? null,
    actor_name: params.actorName ?? null,
    details: params.details ?? {},
  });
  if (error) console.error("Failed to log QA event", error);
}

type TaskRow = {
  id: string;
  project_id: string;
  assignee_id: string;
  public_token: string;
  title: string;
  pr_url: string;
  status: QaTaskStatus;
  submitted_at: string | null;
  submitted_by_name: string | null;
  review_status: QaTaskReviewStatus;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  project: { name: string } | null;
  assignee: { full_name: string | null; email: string | null } | null;
  cases: Array<{ status: string; review_status: string }> | null;
};

export const TASK_SUMMARY_SELECT =
  "id, project_id, assignee_id, public_token, title, pr_url, status, submitted_at, submitted_by_name, review_status, reviewed_at, created_at, updated_at, project:qa_projects(name), assignee:users!qa_tasks_assignee_id_fkey(full_name, email), cases:qa_test_cases(status, review_status)";

export function mapTaskSummary(raw: unknown): QaTaskSummary {
  const row = raw as TaskRow;
  const cases = row.cases ?? [];
  const count = (fn: (c: { status: string; review_status: string }) => boolean) => cases.filter(fn).length;
  return {
    id: row.id,
    project_id: row.project_id,
    project_name: row.project?.name ?? null,
    assignee_id: row.assignee_id,
    assignee_name: row.assignee?.full_name?.trim() || row.assignee?.email || null,
    public_token: row.public_token,
    title: row.title,
    pr_url: row.pr_url,
    status: row.status,
    submitted_at: row.submitted_at,
    submitted_by_name: row.submitted_by_name,
    review_status: row.review_status,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    case_total: cases.length,
    case_passed: count((c) => c.status === "passed"),
    case_failed: count((c) => c.status === "failed"),
    case_blocked: count((c) => c.status === "blocked"),
    case_not_run: count((c) => c.status === "not_run"),
    case_bugs: count((c) => c.review_status === "bug"),
    case_verified: count((c) => c.review_status === "verified"),
  };
}
