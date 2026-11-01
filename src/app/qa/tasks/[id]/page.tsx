"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  QA_CASE_REVIEW_LABELS,
  QA_CASE_STATUS_COLORS,
  QA_CASE_STATUS_LABELS,
  QA_EVENT_LABELS,
  QA_TASK_REVIEW_COLORS,
  QA_TASK_REVIEW_LABELS,
  type QaCaseReviewStatus,
  type QaCaseStatus,
  type QaTaskEvent,
  type QaTaskReviewStatus,
} from "@/lib/qaTracking";
import QaShell, { Badge, qaButton, qaInput } from "@/components/qa/QaShell";
import { formatQaDate, useQaAccess } from "@/components/qa/useQaAccess";

type Person = { id: string; full_name: string | null; email: string | null } | null;

type TaskDetail = {
  id: string;
  public_token: string;
  title: string;
  description: string;
  pr_url: string;
  breakdown: string[];
  status: "draft" | "submitted";
  submitted_at: string | null;
  submitted_by_name: string | null;
  review_status: QaTaskReviewStatus;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  project: { id: string; name: string } | null;
  assignee: Person;
  reviewer: Person;
};

type CaseRow = {
  id: string;
  position: number;
  title: string;
  steps: string;
  expected_result: string;
  status: QaCaseStatus;
  comment: string;
  review_status: QaCaseReviewStatus;
  review_comment: string | null;
  reviewed_at: string | null;
};

const CASE_REVIEW_STYLES: Record<QaCaseReviewStatus, string> = {
  pending: "border-slate-200 text-slate-600",
  verified: "border-emerald-500 bg-emerald-500 text-white",
  bug: "border-rose-500 bg-rose-500 text-white",
};

export default function QaTaskReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { loading: accessLoading, allowed, authFetch } = useQaAccess();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [events, setEvents] = useState<QaTaskEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  // Editable review state
  const [verdict, setVerdict] = useState<QaTaskReviewStatus>("pending");
  const [notes, setNotes] = useState("");
  const [caseReviews, setCaseReviews] = useState<Record<string, { review_status: QaCaseReviewStatus; review_comment: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`/api/qa/tasks/${id}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Unable to load task");
      const t = payload.task as TaskDetail;
      setTask(t);
      setCases(payload.cases || []);
      setEvents(payload.events || []);
      setVerdict(t.review_status);
      setNotes(t.review_notes || "");
      const reviews: Record<string, { review_status: QaCaseReviewStatus; review_comment: string }> = {};
      for (const c of (payload.cases || []) as CaseRow[]) {
        reviews[c.id] = { review_status: c.review_status, review_comment: c.review_comment || "" };
      }
      setCaseReviews(reviews);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load task");
    } finally {
      setLoading(false);
    }
  }, [authFetch, id]);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  function setCaseReview(caseId: string, patch: Partial<{ review_status: QaCaseReviewStatus; review_comment: string }>) {
    setCaseReviews((prev) => ({ ...prev, [caseId]: { ...prev[caseId], ...patch } }));
  }

  async function saveReview() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await authFetch(`/api/qa/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          review_status: verdict,
          review_notes: notes,
          cases: Object.entries(caseReviews).map(([caseId, r]) => ({ id: caseId, ...r })),
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Unable to save review");
      setMessage(payload.changes?.length ? "Review saved" : "No changes to save");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save review");
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    if (!task) return;
    navigator.clipboard.writeText(`${window.location.origin}/public/qa/${task.public_token}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const bugCount = Object.values(caseReviews).filter((r) => r.review_status === "bug").length;
  const verifiedCount = Object.values(caseReviews).filter((r) => r.review_status === "verified").length;
  const submitted = task?.status === "submitted";
  const memberName = task?.assignee?.full_name || task?.assignee?.email || "Team member";

  return (
    <QaShell
      loading={accessLoading}
      allowed={allowed}
      title={task?.title || "Untitled task"}
      subtitle={
        task?.project && (
          <Link href={`/qa/projects/${task.project.id}`} className="hover:text-emerald-700">
            &larr; {task.project.name}
          </Link>
        )
      }
      actions={task && <button type="button" className={qaButton.secondary} onClick={copyLink}>{copied ? "Copied" : "Copy member link"}</button>}
    >
      {error && <p className="rounded-lg bg-rose-50 p-3 text-[13px] text-rose-700">{error}</p>}
      {loading && !task ? (
        <div className="h-60 animate-pulse rounded-2xl bg-slate-100" />
      ) : task ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            {/* Task details */}
            <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                {submitted ? (
                  <Badge className={QA_TASK_REVIEW_COLORS[task.review_status]}>{QA_TASK_REVIEW_LABELS[task.review_status]}</Badge>
                ) : (
                  <Badge className="bg-sky-50 text-sky-700 ring-sky-200">Draft, not submitted yet</Badge>
                )}
                <span className="text-[12px] text-slate-500">Assigned to <b className="text-slate-700">{memberName}</b></span>
              </div>
              <dl className="mt-4 grid gap-4 text-[13px] sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">PR link</dt>
                  <dd className="mt-1 break-all">
                    {task.pr_url ? <a href={task.pr_url} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">{task.pr_url}</a> : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Submitted</dt>
                  <dd className="mt-1 text-slate-700">
                    {submitted ? `${formatQaDate(task.submitted_at)} by ${task.submitted_by_name}` : "Not yet"}
                  </dd>
                </div>
              </dl>
              <div className="mt-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Description</h3>
                <p className="mt-1 whitespace-pre-wrap text-[13px] text-slate-700">{task.description || "-"}</p>
              </div>
              <div className="mt-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Task breakdown</h3>
                {task.breakdown?.length ? (
                  <ol className="mt-1 list-decimal space-y-1 pl-5 text-[13px] text-slate-700">
                    {task.breakdown.map((b, i) => <li key={i}>{b}</li>)}
                  </ol>
                ) : (
                  <p className="mt-1 text-[13px] text-slate-400">-</p>
                )}
              </div>
            </section>

            {/* Test cases */}
            <section className="rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
                <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">Test cases ({cases.length})</h2>
                {submitted && (
                  <span className="text-[12px] text-slate-500">
                    {verifiedCount} verified · <span className="text-rose-600">{bugCount} bug{bugCount === 1 ? "" : "s"}</span>
                  </span>
                )}
              </div>
              {cases.length === 0 ? (
                <p className="p-6 text-center text-[13px] text-slate-500">No test cases written yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {cases.map((c) => {
                    const review = caseReviews[c.id] ?? { review_status: "pending" as QaCaseReviewStatus, review_comment: "" };
                    return (
                      <li key={c.id} className="space-y-3 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">{c.position + 1}</span>
                            <p className="text-[14px] font-semibold text-slate-900">{c.title}</p>
                          </div>
                          <Badge className={QA_CASE_STATUS_COLORS[c.status]}>Member: {QA_CASE_STATUS_LABELS[c.status]}</Badge>
                        </div>
                        <div className="grid gap-3 pl-9 text-[12px] sm:grid-cols-2">
                          <div>
                            <p className="font-semibold text-slate-500">Steps</p>
                            <p className="whitespace-pre-wrap text-slate-700">{c.steps || "-"}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-500">Expected result</p>
                            <p className="whitespace-pre-wrap text-slate-700">{c.expected_result || "-"}</p>
                          </div>
                          {c.comment && (
                            <div className="sm:col-span-2">
                              <p className="font-semibold text-slate-500">Member comment</p>
                              <p className="whitespace-pre-wrap text-slate-700">{c.comment}</p>
                            </div>
                          )}
                        </div>
                        {submitted && (
                          <div className="ml-9 space-y-2 rounded-xl bg-slate-50 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Your check</span>
                              {(["verified", "bug", "pending"] as QaCaseReviewStatus[]).map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => setCaseReview(c.id, { review_status: s })}
                                  className={`rounded-full border px-3 py-1 text-[12px] font-medium transition ${review.review_status === s ? CASE_REVIEW_STYLES[s] : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"}`}
                                >
                                  {s === "verified" ? "Passed properly" : s === "bug" ? "Bug found" : QA_CASE_REVIEW_LABELS.pending}
                                </button>
                              ))}
                            </div>
                            <textarea
                              className={`${qaInput} min-h-[56px]`}
                              placeholder={review.review_status === "bug" ? "Describe the bug you found" : "Optional note"}
                              value={review.review_comment}
                              onChange={(e) => setCaseReview(c.id, { review_comment: e.target.value })}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">Task verdict</h2>
              {submitted ? (
                <div className="mt-3 space-y-3">
                  <div className="grid gap-2">
                    {(["passed", "bugs_found", "pending"] as QaTaskReviewStatus[]).map((s) => (
                      <label key={s} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[13px] ${verdict === s ? "border-emerald-400 bg-emerald-50/50" : "border-slate-200"}`}>
                        <input type="radio" name="verdict" className="accent-emerald-600" checked={verdict === s} onChange={() => setVerdict(s)} />
                        {s === "passed" ? "Passed properly" : s === "bugs_found" ? "Bugs found in tested cases" : "Not reviewed yet"}
                      </label>
                    ))}
                  </div>
                  {bugCount > 0 && verdict === "passed" && (
                    <p className="rounded-lg bg-amber-50 p-2 text-[12px] text-amber-700">You marked {bugCount} case{bugCount === 1 ? "" : "s"} as bug found but the verdict is Passed.</p>
                  )}
                  <textarea className={`${qaInput} min-h-[90px]`} placeholder="Overall review notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  <button type="button" className={`${qaButton.primary} w-full justify-center`} disabled={saving} onClick={saveReview}>
                    {saving ? "Saving..." : "Save review"}
                  </button>
                  {message && <p className="text-center text-[12px] text-emerald-600">{message}</p>}
                  {task.reviewed_at && (
                    <p className="text-[11px] text-slate-500">
                      Last reviewed {formatQaDate(task.reviewed_at)}
                      {task.reviewer ? ` by ${task.reviewer.full_name || task.reviewer.email}` : ""}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-[13px] text-slate-500">You can review once {memberName} submits. Submitted work is locked and cannot be changed.</p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">History</h2>
              {events.length === 0 ? (
                <p className="mt-2 text-[13px] text-slate-500">No activity yet.</p>
              ) : (
                <ol className="mt-3 space-y-3 border-l border-slate-200 pl-4">
                  {events.map((ev) => {
                    const changes = Array.isArray(ev.details?.changes) ? (ev.details.changes as string[]) : [];
                    return (
                      <li key={ev.id} className="relative">
                        <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <p className="text-[13px] font-medium text-slate-800">{QA_EVENT_LABELS[ev.event_type] || ev.event_type}</p>
                        <p className="text-[11px] text-slate-500">{formatQaDate(ev.created_at)}{ev.actor_name ? ` · ${ev.actor_name}` : ""}</p>
                        {typeof ev.details?.case_count === "number" && <p className="text-[11px] text-slate-500">{ev.details.case_count} test cases</p>}
                        {changes.length > 0 && (
                          <ul className="mt-1 list-disc pl-4 text-[11px] text-slate-600">
                            {changes.map((ch, i) => <li key={i}>{ch}</li>)}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </aside>
        </div>
      ) : null}
    </QaShell>
  );
}
