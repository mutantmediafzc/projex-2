// QA Tracking module: shared types, constants and helpers.
// Standalone feature. Only depends on the public.users table.

// Emails with full QA lead access (projects, links, reviews, reports, history).
export const QA_ADMIN_EMAILS = ["majd@mutant.ae"] as const;

export function isQaAdminEmail(email: string | null | undefined): boolean {
  const normalised = email?.trim().toLowerCase() ?? "";
  return (QA_ADMIN_EMAILS as readonly string[]).includes(normalised);
}

export const QA_CASE_STATUSES = ["not_run", "passed", "failed", "blocked"] as const;
export type QaCaseStatus = (typeof QA_CASE_STATUSES)[number];

export const QA_CASE_STATUS_LABELS: Record<QaCaseStatus, string> = {
  not_run: "Not run",
  passed: "Passed",
  failed: "Failed",
  blocked: "Blocked",
};

export const QA_CASE_STATUS_COLORS: Record<QaCaseStatus, string> = {
  not_run: "bg-slate-100 text-slate-600 ring-slate-200",
  passed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  failed: "bg-rose-50 text-rose-700 ring-rose-200",
  blocked: "bg-amber-50 text-amber-700 ring-amber-200",
};

export const QA_CASE_REVIEW_STATUSES = ["pending", "verified", "bug"] as const;
export type QaCaseReviewStatus = (typeof QA_CASE_REVIEW_STATUSES)[number];

export const QA_CASE_REVIEW_LABELS: Record<QaCaseReviewStatus, string> = {
  pending: "Not reviewed",
  verified: "Verified",
  bug: "Bug found",
};

export const QA_TASK_REVIEW_STATUSES = ["pending", "passed", "bugs_found"] as const;
export type QaTaskReviewStatus = (typeof QA_TASK_REVIEW_STATUSES)[number];

export const QA_TASK_REVIEW_LABELS: Record<QaTaskReviewStatus, string> = {
  pending: "Awaiting review",
  passed: "Passed",
  bugs_found: "Bugs found",
};

export const QA_TASK_REVIEW_COLORS: Record<QaTaskReviewStatus, string> = {
  pending: "bg-slate-100 text-slate-600 ring-slate-200",
  passed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  bugs_found: "bg-rose-50 text-rose-700 ring-rose-200",
};

export type QaTaskStatus = "draft" | "submitted";

export type QaUser = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export type QaTestCase = {
  id?: string;
  position?: number;
  title: string;
  steps: string;
  expected_result: string;
  status: QaCaseStatus;
  comment: string;
  review_status?: QaCaseReviewStatus;
  review_comment?: string | null;
  reviewed_at?: string | null;
};

export type QaTaskSummary = {
  id: string;
  project_id: string;
  project_name: string | null;
  assignee_id: string;
  assignee_name: string | null;
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
  case_total: number;
  case_passed: number;
  case_failed: number;
  case_blocked: number;
  case_not_run: number;
  case_bugs: number;
  case_verified: number;
};

export type QaTaskEvent = {
  id: string;
  event_type: string;
  actor_name: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export const QA_EVENT_LABELS: Record<string, string> = {
  created: "Task link generated",
  opened: "Opened by team member",
  submitted: "Submitted by team member",
  reviewed: "Review updated",
  link_regenerated: "Link regenerated",
};

export function isQaCaseStatus(value: unknown): value is QaCaseStatus {
  return typeof value === "string" && (QA_CASE_STATUSES as readonly string[]).includes(value);
}

export function isQaCaseReviewStatus(value: unknown): value is QaCaseReviewStatus {
  return typeof value === "string" && (QA_CASE_REVIEW_STATUSES as readonly string[]).includes(value);
}

export function isQaTaskReviewStatus(value: unknown): value is QaTaskReviewStatus {
  return typeof value === "string" && (QA_TASK_REVIEW_STATUSES as readonly string[]).includes(value);
}

export function generateQaToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const MAX_TEXT = 10000;
const MAX_CASES = 300;
const MAX_BREAKDOWN = 100;

function cleanText(value: unknown, max = MAX_TEXT): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

export function sanitizeBreakdown(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanText(item, 1000).trim())
    .filter(Boolean)
    .slice(0, MAX_BREAKDOWN);
}

export function sanitizeCases(value: unknown): QaTestCase[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      title: cleanText(item.title, 500).trim(),
      steps: cleanText(item.steps),
      expected_result: cleanText(item.expected_result),
      status: isQaCaseStatus(item.status) ? item.status : "not_run",
      comment: cleanText(item.comment),
    }))
    .filter((item) => item.title.length > 0)
    .slice(0, MAX_CASES);
}

// Mirrors the database submit validation so the member gets a clear message
// before the request is sent.
export function validateSubmission(input: {
  title: string;
  description: string;
  pr_url: string;
  breakdown: string[];
  cases: QaTestCase[];
}): string | null {
  if (!input.title.trim()) return "Task title is required";
  if (!input.description.trim()) return "Task description is required";
  if (!input.pr_url.trim()) return "PR link is required";
  if (!isValidHttpUrl(input.pr_url.trim())) return "PR link must be a valid URL";
  if (input.breakdown.length === 0) return "Add at least one breakdown item";
  if (input.cases.length === 0) return "Add at least one test case";
  const notRun = input.cases.findIndex((c) => c.status === "not_run");
  if (notRun >= 0) return `Test case ${notRun + 1} needs a result (passed, failed or blocked)`;
  const missingComment = input.cases.findIndex(
    (c) => (c.status === "failed" || c.status === "blocked") && !c.comment.trim(),
  );
  if (missingComment >= 0) return `Test case ${missingComment + 1} is ${input.cases[missingComment].status}, add a comment explaining why`;
  return null;
}

export function userDisplayName(user: { full_name?: string | null; email?: string | null } | null | undefined): string {
  return user?.full_name?.trim() || user?.email || "Team member";
}
