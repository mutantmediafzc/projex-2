"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  QA_TASK_REVIEW_COLORS,
  QA_TASK_REVIEW_LABELS,
  type QaTaskSummary,
  type QaUser,
} from "@/lib/qaTracking";
import QaShell, { Badge, qaButton, qaInput } from "@/components/qa/QaShell";
import MemberPicker from "@/components/qa/MemberPicker";
import Modal from "@/components/qa/Modal";
import { formatQaDate, useQaAccess } from "@/components/qa/useQaAccess";

type Project = { id: string; name: string; created_at: string; members: QaUser[] };

export default function QaProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { loading: accessLoading, allowed, authFetch } = useQaAccess();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<QaTaskSummary[]>([]);
  const [users, setUsers] = useState<QaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const [generateFor, setGenerateFor] = useState<QaUser | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [newLink, setNewLink] = useState("");

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editMembers, setEditMembers] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`/api/qa/projects/${id}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Unable to load project");
      setProject(payload.project);
      setTasks(payload.tasks || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load project");
    } finally {
      setLoading(false);
    }
  }, [authFetch, id]);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  const linkFor = (token: string) => `${window.location.origin}/public/qa/${token}`;

  function copyLink(task: { id: string; public_token: string }) {
    navigator.clipboard.writeText(linkFor(task.public_token)).then(() => {
      setCopied(task.id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  async function generateTask() {
    if (!generateFor) return;
    setBusy(true);
    setFormError("");
    try {
      const res = await authFetch(`/api/qa/projects/${id}/tasks`, {
        method: "POST",
        body: JSON.stringify({ assignee_id: generateFor.id, title: taskTitle, description: taskDescription }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Unable to generate link");
      setNewLink(linkFor(payload.public_token));
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Unable to generate link");
    } finally {
      setBusy(false);
    }
  }

  function closeGenerate() {
    setGenerateFor(null);
    setTaskTitle("");
    setTaskDescription("");
    setNewLink("");
    setFormError("");
  }

  async function openEdit() {
    if (!project) return;
    setEditName(project.name);
    setEditMembers(project.members.map((m) => m.id));
    setEditing(true);
    if (users.length === 0) {
      const res = await authFetch("/api/qa/users");
      const payload = await res.json();
      setUsers(payload.users || []);
    }
  }

  async function saveProject() {
    setBusy(true);
    setFormError("");
    try {
      const res = await authFetch(`/api/qa/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editName, member_ids: editMembers }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Unable to save project");
      setEditing(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Unable to save project");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProject() {
    if (!project) return;
    if (!window.confirm(`Delete "${project.name}" with all its tasks, test cases and history? This cannot be undone.`)) return;
    const res = await authFetch(`/api/qa/projects/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/qa");
    else setError("Unable to delete project");
  }

  async function deleteTask(task: QaTaskSummary) {
    if (!window.confirm(`Delete the task link "${task.title || "Untitled"}" for ${task.assignee_name}? Its test cases and history will be removed.`)) return;
    const res = await authFetch(`/api/qa/tasks/${task.id}`, { method: "DELETE" });
    if (res.ok) await load();
    else setError("Unable to delete task");
  }

  const visibleTasks = useMemo(
    () => (memberFilter ? tasks.filter((t) => t.assignee_id === memberFilter) : tasks),
    [tasks, memberFilter],
  );

  const memberStats = useMemo(() => {
    const map = new Map<string, { total: number; submitted: number; awaiting: number }>();
    for (const t of tasks) {
      const s = map.get(t.assignee_id) ?? { total: 0, submitted: 0, awaiting: 0 };
      s.total += 1;
      if (t.status === "submitted") s.submitted += 1;
      if (t.status === "submitted" && t.review_status === "pending") s.awaiting += 1;
      map.set(t.assignee_id, s);
    }
    return map;
  }, [tasks]);

  return (
    <QaShell
      loading={accessLoading}
      allowed={allowed}
      title={project?.name || "QA project"}
      subtitle={
        <Link href="/qa" className="hover:text-emerald-700">
          &larr; All QA projects
        </Link>
      }
      actions={
        project && (
          <>
            <button type="button" className={qaButton.secondary} onClick={openEdit}>Edit project</button>
            <button type="button" className={qaButton.danger} onClick={deleteProject}>Delete</button>
          </>
        )
      }
    >
      {error && <p className="rounded-lg bg-rose-50 p-3 text-[13px] text-rose-700">{error}</p>}
      {loading && !project ? (
        <div className="h-60 animate-pulse rounded-2xl bg-slate-100" />
      ) : project ? (
        <>
          <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-slate-500">Team</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {project.members.map((m) => {
                const s = memberStats.get(m.id);
                return (
                  <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-slate-800">{m.full_name || m.email}</p>
                      <p className="text-[11px] text-slate-500">
                        {s?.total ?? 0} task{s?.total === 1 ? "" : "s"} · {s?.submitted ?? 0} submitted
                        {s?.awaiting ? ` · ${s.awaiting} to review` : ""}
                      </p>
                    </div>
                    <button type="button" className={qaButton.secondary} onClick={() => setGenerateFor(m)}>
                      + Task link
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">Task links ({visibleTasks.length})</h2>
              <select className={`${qaInput} w-auto`} value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)}>
                <option value="">All members</option>
                {project.members.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
                ))}
              </select>
            </div>
            {visibleTasks.length === 0 ? (
              <p className="p-6 text-center text-[13px] text-slate-500">No task links yet. Use &quot;+ Task link&quot; next to a team member.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-[13px]">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2">Member</th>
                      <th className="px-4 py-2">Task</th>
                      <th className="px-4 py-2">Cases</th>
                      <th className="px-4 py-2">Submitted</th>
                      <th className="px-4 py-2">Review</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleTasks.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-medium text-slate-800">{t.assignee_name}</td>
                        <td className="px-4 py-3">
                          <Link href={`/qa/tasks/${t.id}`} className="font-medium text-slate-900 hover:text-emerald-700">
                            {t.title || <span className="italic text-slate-400">Untitled</span>}
                          </Link>
                          {t.pr_url && (
                            <a href={t.pr_url} target="_blank" rel="noreferrer" className="block truncate text-[11px] text-sky-600 hover:underline max-w-[260px]">
                              {t.pr_url}
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {t.case_total}
                          {t.case_total > 0 && (
                            <span className="ml-1 text-[11px]">
                              (<span className="text-emerald-600">{t.case_passed}✓</span>
                              {t.case_failed > 0 && <span className="text-rose-600"> {t.case_failed}✗</span>}
                              {t.case_blocked > 0 && <span className="text-amber-600"> {t.case_blocked} blocked</span>})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {t.status === "submitted" ? (
                            formatQaDate(t.submitted_at)
                          ) : (
                            <Badge className="bg-sky-50 text-sky-700 ring-sky-200">Draft</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {t.status === "submitted" ? (
                            <Badge className={QA_TASK_REVIEW_COLORS[t.review_status]}>{QA_TASK_REVIEW_LABELS[t.review_status]}</Badge>
                          ) : (
                            <span className="text-[11px] text-slate-400">Waiting for submission</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button type="button" className={qaButton.secondary} onClick={() => copyLink(t)}>
                              {copied === t.id ? "Copied" : "Copy link"}
                            </button>
                            <Link href={`/qa/tasks/${t.id}`} className={qaButton.secondary}>
                              {t.status === "submitted" ? "Review" : "Open"}
                            </Link>
                            <button type="button" className={qaButton.danger} onClick={() => deleteTask(t)} aria-label="Delete task">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}

      {generateFor && (
        <Modal title={`New task link for ${generateFor.full_name || generateFor.email}`} onClose={closeGenerate}>
          {newLink ? (
            <div className="space-y-4">
              <p className="text-[13px] text-slate-600">Share this private link with {generateFor.full_name || "the team member"}. They will fill in the task, breakdown and every test case, then submit.</p>
              <div className="flex gap-2">
                <input readOnly className={qaInput} value={newLink} onFocus={(e) => e.currentTarget.select()} />
                <button type="button" className={qaButton.primary} onClick={() => navigator.clipboard.writeText(newLink)}>Copy</button>
              </div>
              <div className="flex justify-end">
                <button type="button" className={qaButton.secondary} onClick={closeGenerate}>Done</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[12px] text-slate-500">You own the task title and description. The team member sees them read-only and fills in the PR link, breakdown and test cases.</p>
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-slate-700">Task title<span className="text-rose-500">*</span></label>
                <input className={qaInput} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="e.g. Add invoice export to CSV" />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-slate-700">Description<span className="text-rose-500">*</span></label>
                <textarea className={`${qaInput} min-h-[90px]`} value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} />
              </div>
              {formError && <p className="text-[12px] text-rose-600">{formError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" className={qaButton.secondary} onClick={closeGenerate}>Cancel</button>
                <button type="button" className={qaButton.primary} disabled={busy || !taskTitle.trim() || !taskDescription.trim()} onClick={generateTask}>
                  {busy ? "Generating..." : "Generate link"}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {editing && (
        <Modal title="Edit QA project" onClose={() => setEditing(false)}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-slate-700">Project name</label>
              <input className={qaInput} value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-slate-700">Team</label>
              <MemberPicker users={users} selected={editMembers} onChange={setEditMembers} />
              <p className="mt-1 text-[11px] text-slate-500">Removing a member keeps their existing task links and history.</p>
            </div>
            {formError && <p className="text-[12px] text-rose-600">{formError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className={qaButton.secondary} onClick={() => setEditing(false)}>Cancel</button>
              <button type="button" className={qaButton.primary} disabled={busy || !editName.trim() || editMembers.length === 0} onClick={saveProject}>
                {busy ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </QaShell>
  );
}
