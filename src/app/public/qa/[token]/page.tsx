"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  QA_CASE_REVIEW_LABELS,
  QA_CASE_STATUS_COLORS,
  QA_CASE_STATUS_LABELS,
  QA_TASK_REVIEW_COLORS,
  QA_TASK_REVIEW_LABELS,
  validateSubmission,
  type QaCaseReviewStatus,
  type QaCaseStatus,
  type QaTaskReviewStatus,
} from "@/lib/qaTracking";

type CaseDraft = {
  key: number;
  title: string;
  steps: string;
  expected_result: string;
  status: QaCaseStatus;
  comment: string;
  review_status?: QaCaseReviewStatus;
  review_comment?: string | null;
};

type TaskPayload = {
  project_name: string | null;
  member_name: string;
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
  cases: Array<Omit<CaseDraft, "key">>;
};

const input =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[14px] text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-600";

const RESULT_BUTTON: Record<Exclude<QaCaseStatus, "not_run">, string> = {
  passed: "border-emerald-500 bg-emerald-500 text-white",
  failed: "border-rose-500 bg-rose-500 text-white",
  blocked: "border-amber-500 bg-amber-500 text-white",
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function PublicQaTaskPage() {
  const { token } = useParams<{ token: string }>();
  const keyRef = useRef(0);

  const [task, setTask] = useState<TaskPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [prUrl, setPrUrl] = useState("");
  const [breakdown, setBreakdown] = useState<string[]>([""]);
  const [cases, setCases] = useState<CaseDraft[]>([]);

  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  const emptyCase = useCallback((): CaseDraft => ({ key: ++keyRef.current, title: "", steps: "", expected_result: "", status: "not_run", comment: "" }), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/qa/${token}`, { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Unable to load this task");
      const data = payload as TaskPayload;
      setTask(data);
      setPrUrl(data.pr_url || "");
      setBreakdown(data.breakdown.length ? data.breakdown : [""]);
      setCases(data.cases.length ? data.cases.map((c) => ({ ...c, key: ++keyRef.current })) : [emptyCase()]);
      setDirty(false);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Unable to load this task");
    } finally {
      setLoading(false);
    }
  }, [token, emptyCase]);

  useEffect(() => {
    void load();
  }, [load]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const locked = task?.status === "submitted";

  function touch() {
    setDirty(true);
    setNotice(null);
  }

  function updateCase(key: number, patch: Partial<CaseDraft>) {
    touch();
    setCases((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }

  function moveCase(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= cases.length) return;
    touch();
    setCases((prev) => {
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  function buildBody() {
    return {
      pr_url: prUrl.trim(),
      breakdown: breakdown.map((b) => b.trim()).filter(Boolean),
      cases: cases
        .filter((c) => c.title.trim())
        .map((c) => ({ title: c.title.trim(), steps: c.steps, expected_result: c.expected_result, status: c.status, comment: c.comment })),
    };
  }

  async function send(mode: "draft" | "submit") {
    const body = buildBody();
    if (mode === "submit") {
      const problem = validateSubmission(body);
      if (problem) {
        setConfirmOpen(false);
        setNotice({ tone: "error", text: problem });
        return;
      }
    }
    setSaving(mode);
    setNotice(null);
    try {
      const res = await fetch(`/api/public/qa/${token}`, {
        method: mode === "submit" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Unable to save");
      setDirty(false);
      if (mode === "submit") {
        setConfirmOpen(false);
        await load();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setNotice({ tone: "ok", text: "Draft saved. You can come back to this link and continue." });
      }
    } catch (e) {
      setConfirmOpen(false);
      setNotice({ tone: "error", text: e instanceof Error ? e.message : "Unable to save" });
    } finally {
      setSaving(null);
    }
  }

  if (loading && !task) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading your QA task...</div>;
  }

  if (loadError || !task) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Link not available</h1>
          <p className="mt-2 text-sm text-slate-500">{loadError || "This QA link is not valid."}</p>
        </div>
      </div>
    );
  }

  const passed = cases.filter((c) => c.status === "passed").length;
  const failed = cases.filter((c) => c.status === "failed").length;
  const blocked = cases.filter((c) => c.status === "blocked").length;
  const notRun = cases.filter((c) => c.title.trim() && c.status === "not_run").length;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ecfdf5,_#f8fafc_45%,_#f1f5f9)] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-emerald-600">QA Testing Report{task.project_name ? ` · ${task.project_name}` : ""}</p>
          <h1 className="text-2xl font-semibold text-slate-900">Hi {task.member_name.split(" ")[0]}, document your PR testing</h1>
          {!locked && (
            <p className="text-[14px] text-slate-600">
              Write <b>every</b> case you tested for this PR: happy paths, edge cases, empty and invalid inputs, permissions, mobile and error states.
              Mark each one Passed, Failed or Blocked. You can save a draft and return to this link. <b>Once you submit, nothing can be changed.</b>
            </p>
          )}
        </header>

        {locked && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-[15px] font-semibold text-emerald-800">Submitted and locked</p>
            <p className="mt-1 text-[13px] text-emerald-700">
              Submitted by <b>{task.submitted_by_name}</b> on <b>{formatDate(task.submitted_at)}</b>. This report can no longer be edited.
            </p>
            {task.review_status !== "pending" && (
              <div className="mt-3 rounded-xl bg-white p-3">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${QA_TASK_REVIEW_COLORS[task.review_status]}`}>
                  QA review: {QA_TASK_REVIEW_LABELS[task.review_status]}
                </span>
                {task.review_notes && <p className="mt-2 whitespace-pre-wrap text-[13px] text-slate-700">{task.review_notes}</p>}
                <p className="mt-1 text-[11px] text-slate-500">Reviewed {formatDate(task.reviewed_at)}</p>
              </div>
            )}
          </section>
        )}

        {/* Task */}
        <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">1. Task</h2>
          <div>
            <p className="mb-1 text-[12px] font-semibold text-slate-700">Task title</p>
            <p className="text-[16px] font-semibold text-slate-900">{task.title || <span className="font-normal italic text-slate-400">No title set yet</span>}</p>
          </div>
          <div>
            <p className="mb-1 text-[12px] font-semibold text-slate-700">Description</p>
            <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-[14px] text-slate-700">{task.description || <span className="italic text-slate-400">No description</span>}</p>
          </div>
          {!locked && <p className="text-[11px] text-slate-400">Title and description are set by your QA lead.</p>}
          <Field label="PR link" required>
            {locked ? (
              <a href={prUrl} target="_blank" rel="noreferrer" className="block break-all text-[14px] text-sky-600 hover:underline">{prUrl}</a>
            ) : (
              <input className={input} type="url" value={prUrl} onChange={(e) => { touch(); setPrUrl(e.target.value); }} placeholder="https://github.com/org/repo/pull/123" />
            )}
          </Field>
        </section>

        {/* Breakdown */}
        <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">2. Task breakdown</h2>
          {!locked && <p className="text-[12px] text-slate-500">List each piece of work inside this PR.</p>}
          <ol className="space-y-2">
            {breakdown.map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-6 text-right text-[12px] font-semibold text-slate-400">{i + 1}.</span>
                {locked ? (
                  <span className="text-[14px] text-slate-800">{item}</span>
                ) : (
                  <>
                    <input
                      className={input}
                      value={item}
                      onChange={(e) => { touch(); setBreakdown((prev) => prev.map((b, idx) => (idx === i ? e.target.value : b))); }}
                      placeholder="e.g. Add API endpoint for export"
                    />
                    <button
                      type="button"
                      className="rounded-full p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                      disabled={breakdown.length === 1}
                      onClick={() => { touch(); setBreakdown((prev) => prev.filter((_, idx) => idx !== i)); }}
                      aria-label="Remove item"
                    >
                      ✕
                    </button>
                  </>
                )}
              </li>
            ))}
          </ol>
          {!locked && (
            <button type="button" className="text-[13px] font-medium text-emerald-700 hover:underline" onClick={() => { touch(); setBreakdown((prev) => [...prev, ""]); }}>
              + Add breakdown item
            </button>
          )}
        </section>

        {/* Test cases */}
        <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">3. Test cases ({cases.filter((c) => c.title.trim()).length})</h2>
            <p className="text-[12px] text-slate-500">
              <span className="text-emerald-600">{passed} passed</span> · <span className="text-rose-600">{failed} failed</span> · <span className="text-amber-600">{blocked} blocked</span>
              {notRun > 0 && <> · {notRun} without result</>}
            </p>
          </div>

          {cases.map((c, index) => (
            <article key={c.key} className="space-y-3 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">{index + 1}</span>
                {locked ? (
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${QA_CASE_STATUS_COLORS[c.status]}`}>{QA_CASE_STATUS_LABELS[c.status]}</span>
                ) : (
                  <div className="flex items-center gap-1 text-slate-400">
                    <button type="button" className="rounded p-1 hover:bg-slate-100 disabled:opacity-30" disabled={index === 0} onClick={() => moveCase(index, -1)} aria-label="Move up">↑</button>
                    <button type="button" className="rounded p-1 hover:bg-slate-100 disabled:opacity-30" disabled={index === cases.length - 1} onClick={() => moveCase(index, 1)} aria-label="Move down">↓</button>
                    <button
                      type="button"
                      className="rounded p-1 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                      disabled={cases.length === 1}
                      onClick={() => { touch(); setCases((prev) => prev.filter((x) => x.key !== c.key)); }}
                      aria-label="Remove case"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              <Field label="Test case" required>
                <input className={input} disabled={locked} value={c.title} onChange={(e) => updateCase(c.key, { title: e.target.value })} placeholder="e.g. Export with 0 invoices shows empty state" />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Steps">
                  <textarea className={`${input} min-h-[70px]`} disabled={locked} value={c.steps} onChange={(e) => updateCase(c.key, { steps: e.target.value })} placeholder="1. Open... 2. Click..." />
                </Field>
                <Field label="Expected result">
                  <textarea className={`${input} min-h-[70px]`} disabled={locked} value={c.expected_result} onChange={(e) => updateCase(c.key, { expected_result: e.target.value })} />
                </Field>
              </div>
              {!locked && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-semibold text-slate-700">Result<span className="text-rose-500">*</span></span>
                  {(["passed", "failed", "blocked"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateCase(c.key, { status: c.status === s ? "not_run" : s })}
                      className={`rounded-full border px-3 py-1 text-[12px] font-medium transition ${c.status === s ? RESULT_BUTTON[s] : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      {QA_CASE_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              )}
              <Field label="Comment" required={c.status === "failed" || c.status === "blocked"}>
                <textarea
                  className={`${input} min-h-[56px]`}
                  disabled={locked}
                  value={c.comment}
                  onChange={(e) => updateCase(c.key, { comment: e.target.value })}
                  placeholder={c.status === "failed" || c.status === "blocked" ? "What went wrong? Is it fixed, or what is blocking it?" : "Optional notes"}
                />
              </Field>
              {locked && c.review_status && c.review_status !== "pending" && (
                <div className={`rounded-lg p-2 text-[12px] ${c.review_status === "bug" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                  <b>QA review: {QA_CASE_REVIEW_LABELS[c.review_status]}</b>
                  {c.review_comment && <p className="mt-0.5 whitespace-pre-wrap">{c.review_comment}</p>}
                </div>
              )}
            </article>
          ))}

          {!locked && (
            <button
              type="button"
              className="w-full rounded-xl border-2 border-dashed border-slate-200 py-3 text-[13px] font-medium text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50"
              onClick={() => { touch(); setCases((prev) => [...prev, emptyCase()]); }}
            >
              + Add test case
            </button>
          )}
        </section>

        {notice && (
          <p className={`rounded-xl p-3 text-[13px] ${notice.tone === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{notice.text}</p>
        )}

        {!locked && (
          <div className="sticky bottom-4 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            {dirty && <span className="mr-auto text-[12px] text-amber-600">Unsaved changes</span>}
            <button
              type="button"
              disabled={saving !== null}
              onClick={() => send("draft")}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {saving === "draft" ? "Saving..." : "Save draft"}
            </button>
            <button
              type="button"
              disabled={saving !== null}
              onClick={() => setConfirmOpen(true)}
              className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-[13px] font-semibold text-white shadow-lg shadow-emerald-500/25 disabled:opacity-50"
            >
              Submit final report
            </button>
          </div>
        )}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setConfirmOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-slate-900">Submit and lock this report?</h2>
            <p className="mt-2 text-[13px] text-slate-600">
              You are submitting <b>{cases.filter((c) => c.title.trim()).length} test cases</b> as <b>{task.member_name}</b>.
              After submitting you <b>cannot</b> add, edit or remove any case. Make sure you covered every case for this PR.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50" onClick={() => setConfirmOpen(false)}>
                Keep editing
              </button>
              <button
                type="button"
                disabled={saving !== null}
                onClick={() => send("submit")}
                className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {saving === "submit" ? "Submitting..." : "Yes, submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-slate-700">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}
