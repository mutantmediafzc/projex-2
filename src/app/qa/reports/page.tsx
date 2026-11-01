"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  QA_TASK_REVIEW_COLORS,
  QA_TASK_REVIEW_LABELS,
  type QaTaskSummary,
} from "@/lib/qaTracking";
import QaShell, { Badge, qaButton, qaInput } from "@/components/qa/QaShell";
import { formatQaDate, useQaAccess } from "@/components/qa/useQaAccess";

type MemberReport = {
  id: string;
  name: string;
  tasks: number;
  submitted: number;
  drafts: number;
  cases: number;
  memberFailed: number;
  verified: number;
  bugs: number;
  passed: number;
  bugsFound: number;
  awaiting: number;
};

function pct(value: number, total: number) {
  return total > 0 ? `${Math.round((value / total) * 100)}%` : "-";
}

export default function QaReportsPage() {
  const { loading: accessLoading, allowed, authFetch } = useQaAccess();
  const [tasks, setTasks] = useState<QaTaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await authFetch(`/api/qa/tasks?${params}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Unable to load reports");
      setTasks(payload.tasks || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load reports");
    } finally {
      setLoading(false);
    }
  }, [authFetch, from, to]);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  const projects = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach((t) => map.set(t.project_id, t.project_name || "Untitled"));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [tasks]);

  const members = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach((t) => map.set(t.assignee_id, t.assignee_name || "Team member"));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [tasks]);

  const filtered = useMemo(
    () => tasks.filter((t) => (!projectFilter || t.project_id === projectFilter) && (!memberFilter || t.assignee_id === memberFilter)),
    [tasks, projectFilter, memberFilter],
  );

  const reports = useMemo(() => {
    const map = new Map<string, MemberReport>();
    for (const t of filtered) {
      const r = map.get(t.assignee_id) ?? {
        id: t.assignee_id, name: t.assignee_name || "Team member", tasks: 0, submitted: 0, drafts: 0, cases: 0,
        memberFailed: 0, verified: 0, bugs: 0, passed: 0, bugsFound: 0, awaiting: 0,
      };
      r.tasks += 1;
      if (t.status === "submitted") {
        r.submitted += 1;
        r.cases += t.case_total;
        r.memberFailed += t.case_failed + t.case_blocked;
        r.verified += t.case_verified;
        r.bugs += t.case_bugs;
        if (t.review_status === "passed") r.passed += 1;
        else if (t.review_status === "bugs_found") r.bugsFound += 1;
        else r.awaiting += 1;
      } else {
        r.drafts += 1;
      }
      map.set(t.assignee_id, r);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  const totals = useMemo(() => {
    const submitted = filtered.filter((t) => t.status === "submitted");
    const reviewed = submitted.filter((t) => t.review_status !== "pending");
    return {
      tasks: filtered.length,
      submitted: submitted.length,
      awaiting: submitted.length - reviewed.length,
      passed: reviewed.filter((t) => t.review_status === "passed").length,
      reviewed: reviewed.length,
      cases: submitted.reduce((sum, t) => sum + t.case_total, 0),
      bugs: submitted.reduce((sum, t) => sum + t.case_bugs, 0),
    };
  }, [filtered]);

  function exportCsv() {
    const header = ["Project", "Member", "Task", "PR link", "Status", "Submitted at", "Submitted by", "Cases", "Passed", "Failed", "Blocked", "Lead verified", "Lead bugs", "Verdict", "Reviewed at"];
    const rows = filtered.map((t) => [
      t.project_name, t.assignee_name, t.title, t.pr_url, t.status, t.submitted_at ?? "", t.submitted_by_name ?? "",
      t.case_total, t.case_passed, t.case_failed, t.case_blocked, t.case_verified, t.case_bugs,
      t.status === "submitted" ? QA_TASK_REVIEW_LABELS[t.review_status] : "", t.reviewed_at ?? "",
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `qa-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <QaShell
      loading={accessLoading}
      allowed={allowed}
      title="QA Reports & History"
      subtitle="Testing quality per team member across every QA project"
      actions={<button type="button" className={qaButton.secondary} onClick={exportCsv} disabled={filtered.length === 0}>Export CSV</button>}
    >
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-sm">
        <Field label="Project">
          <select className={qaInput} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="">All projects</option>
            {projects.map(([pid, name]) => <option key={pid} value={pid}>{name}</option>)}
          </select>
        </Field>
        <Field label="Member">
          <select className={qaInput} value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)}>
            <option value="">All members</option>
            {members.map(([mid, name]) => <option key={mid} value={mid}>{name}</option>)}
          </select>
        </Field>
        <Field label="Created from">
          <input type="date" className={qaInput} value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="Created to">
          <input type="date" className={qaInput} value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>

      {error && <p className="rounded-lg bg-rose-50 p-3 text-[13px] text-rose-700">{error}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Task links" value={totals.tasks} />
        <Kpi label="Submitted" value={totals.submitted} />
        <Kpi label="Awaiting review" value={totals.awaiting} tone="text-amber-600" />
        <Kpi label="Pass rate" value={pct(totals.passed, totals.reviewed)} tone="text-emerald-600" hint={`${totals.passed} of ${totals.reviewed} reviewed`} />
        <Kpi label="Avg cases / task" value={totals.submitted ? (totals.cases / totals.submitted).toFixed(1) : "-"} />
        <Kpi label="Bugs found by lead" value={totals.bugs} tone="text-rose-600" />
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm">
        <h2 className="border-b border-slate-100 p-4 text-[13px] font-semibold uppercase tracking-wide text-slate-500">Team member quality</h2>
        {loading ? (
          <div className="h-32 animate-pulse bg-slate-50" />
        ) : reports.length === 0 ? (
          <p className="p-6 text-center text-[13px] text-slate-500">No data for these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[13px]">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Member</th>
                  <th className="px-4 py-2">Tasks</th>
                  <th className="px-4 py-2">Submitted</th>
                  <th className="px-4 py-2">Avg cases</th>
                  <th className="px-4 py-2">Self-reported fails</th>
                  <th className="px-4 py-2">Passed</th>
                  <th className="px-4 py-2">Bugs found</th>
                  <th className="px-4 py-2">Awaiting</th>
                  <th className="px-4 py-2">Pass rate</th>
                  <th className="px-4 py-2">Missed bugs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                    <td className="px-4 py-3">{r.tasks}{r.drafts > 0 && <span className="text-[11px] text-slate-400"> ({r.drafts} draft)</span>}</td>
                    <td className="px-4 py-3">{r.submitted}</td>
                    <td className="px-4 py-3">{r.submitted ? (r.cases / r.submitted).toFixed(1) : "-"}</td>
                    <td className="px-4 py-3">{r.memberFailed}</td>
                    <td className="px-4 py-3 text-emerald-600">{r.passed}</td>
                    <td className="px-4 py-3 text-rose-600">{r.bugsFound}</td>
                    <td className="px-4 py-3 text-amber-600">{r.awaiting}</td>
                    <td className="px-4 py-3 font-semibold">{pct(r.passed, r.passed + r.bugsFound)}</td>
                    <td className="px-4 py-3" title="Cases you marked as bug found">{r.bugs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm">
        <h2 className="border-b border-slate-100 p-4 text-[13px] font-semibold uppercase tracking-wide text-slate-500">Task history ({filtered.length})</h2>
        {filtered.length === 0 ? (
          <p className="p-6 text-center text-[13px] text-slate-500">No tasks.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[13px]">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Created</th>
                  <th className="px-4 py-2">Project</th>
                  <th className="px-4 py-2">Member</th>
                  <th className="px-4 py-2">Task</th>
                  <th className="px-4 py-2">Cases</th>
                  <th className="px-4 py-2">Submitted</th>
                  <th className="px-4 py-2">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-500">{formatQaDate(t.created_at, false)}</td>
                    <td className="px-4 py-3">{t.project_name}</td>
                    <td className="px-4 py-3">{t.assignee_name}</td>
                    <td className="px-4 py-3">
                      <Link href={`/qa/tasks/${t.id}`} className="font-medium text-slate-900 hover:text-emerald-700">
                        {t.title || <span className="italic text-slate-400">Untitled</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{t.case_total}{t.case_bugs > 0 && <span className="ml-1 text-[11px] text-rose-600">({t.case_bugs} bug{t.case_bugs === 1 ? "" : "s"})</span>}</td>
                    <td className="px-4 py-3 text-slate-600">{t.status === "submitted" ? formatQaDate(t.submitted_at) : <Badge className="bg-sky-50 text-sky-700 ring-sky-200">Draft</Badge>}</td>
                    <td className="px-4 py-3">{t.status === "submitted" ? <Badge className={QA_TASK_REVIEW_COLORS[t.review_status]}>{QA_TASK_REVIEW_LABELS[t.review_status]}</Badge> : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </QaShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-[160px] flex-1">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Kpi({ label, value, tone = "text-slate-900", hint }: { label: string; value: string | number; tone?: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
      <div className={`text-2xl font-semibold ${tone}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] text-slate-400">{hint}</div>}
    </div>
  );
}
