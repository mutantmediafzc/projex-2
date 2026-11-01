"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { QaUser } from "@/lib/qaTracking";
import QaShell, { qaButton, qaInput } from "@/components/qa/QaShell";
import MemberPicker from "@/components/qa/MemberPicker";
import Modal from "@/components/qa/Modal";
import { formatQaDate, useQaAccess } from "@/components/qa/useQaAccess";

type ProjectListItem = {
  id: string;
  name: string;
  created_at: string;
  members: QaUser[];
  task_total: number;
  task_submitted: number;
  task_passed: number;
  task_bugs: number;
  task_awaiting_review: number;
};

export default function QaProjectsPage() {
  const { loading: accessLoading, allowed, authFetch } = useQaAccess();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [users, setUsers] = useState<QaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [projectsRes, usersRes] = await Promise.all([authFetch("/api/qa/projects"), authFetch("/api/qa/users")]);
      const projectsPayload = await projectsRes.json();
      const usersPayload = await usersRes.json();
      if (!projectsRes.ok) throw new Error(projectsPayload.error || "Unable to load projects");
      setProjects(projectsPayload.projects || []);
      setUsers(usersPayload.users || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load projects");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  async function createProject() {
    setSaving(true);
    setFormError("");
    try {
      const res = await authFetch("/api/qa/projects", {
        method: "POST",
        body: JSON.stringify({ name, member_ids: memberIds }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Unable to create project");
      setShowCreate(false);
      setName("");
      setMemberIds([]);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Unable to create project");
    } finally {
      setSaving(false);
    }
  }

  return (
    <QaShell
      loading={accessLoading}
      allowed={allowed}
      title="QA Tracking"
      subtitle={`${projects.length} QA project${projects.length === 1 ? "" : "s"}`}
      actions={
        <button type="button" className={qaButton.primary} onClick={() => setShowCreate(true)}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
          New QA project
        </button>
      }
    >
      {error && <p className="rounded-lg bg-rose-50 p-3 text-[13px] text-rose-700">{error}</p>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
          <p className="text-sm font-medium text-slate-700">No QA projects yet</p>
          <p className="mt-1 text-[13px] text-slate-500">Create a project, pick the team, then generate a task link for each member.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/qa/projects/${p.id}`}
              className="group rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-[15px] font-semibold text-slate-900 group-hover:text-emerald-700">{p.name}</h2>
                {p.task_awaiting_review > 0 && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    {p.task_awaiting_review} to review
                  </span>
                )}
              </div>
              <p className="mt-1 text-[12px] text-slate-500">Created {formatQaDate(p.created_at, false)}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {p.members.slice(0, 6).map((m) => (
                  <span key={m.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{m.full_name || m.email}</span>
                ))}
                {p.members.length > 6 && <span className="text-[11px] text-slate-400">+{p.members.length - 6}</span>}
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                <Stat label="Tasks" value={p.task_total} />
                <Stat label="Submitted" value={p.task_submitted} />
                <Stat label="Passed" value={p.task_passed} tone="text-emerald-600" />
                <Stat label="Bugs" value={p.task_bugs} tone="text-rose-600" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="New QA project" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-slate-700">Project name</label>
              <input className={qaInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Projex CRM sprint 14" />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-slate-700">Team working on this project</label>
              <MemberPicker users={users} selected={memberIds} onChange={setMemberIds} />
            </div>
            {formError && <p className="text-[12px] text-rose-600">{formError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className={qaButton.secondary} onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="button" className={qaButton.primary} disabled={saving || !name.trim() || memberIds.length === 0} onClick={createProject}>
                {saving ? "Creating..." : "Create project"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </QaShell>
  );
}

function Stat({ label, value, tone = "text-slate-900" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2">
      <div className={`text-base font-semibold ${tone}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
