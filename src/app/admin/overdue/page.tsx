"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";
import { useUserRole } from "@/app/profile/hooks/useUserRole";
import TaskDetailModal from "@/components/TaskDetailModal";

interface OverdueTask {
  id: string;
  name: string;
  status: string;
  priority: string | null;
  activity_date: string | null;
  assigneeName: string;
  assigneeId: string;
  projectId: string | null;
  projectName: string | null;
  source: string | null;
  daysOverdue: number;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-rose-100 text-rose-700 border border-rose-200",
  medium: "bg-amber-100 text-amber-700 border border-amber-200",
  low: "bg-slate-100 text-slate-600 border border-slate-200",
};

const STATUS_COLORS: Record<string, string> = {
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-sky-100 text-sky-700",
  completed: "bg-emerald-100 text-emerald-700",
};

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Done",
};

const PAGE_SIZE = 12;

const AVATAR_COLORS = [
  "bg-sky-500","bg-violet-500","bg-amber-500","bg-rose-500",
  "bg-emerald-500","bg-pink-500","bg-indigo-500","bg-orange-500",
  "bg-teal-500","bg-cyan-500","bg-lime-500","bg-fuchsia-500",
];

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function safeParseDateStr(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  // If already a full ISO timestamp (contains T or Z or +), parse directly
  if (dateStr.includes("T") || dateStr.includes("Z") || dateStr.includes("+")) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  // Plain YYYY-MM-DD — append noon UTC to avoid timezone-shift to previous day
  const d = new Date(dateStr + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = safeParseDateStr(dateStr);
  if (!d) return "Invalid Date";
  return d.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function daysOverdue(dateStr: string | null): number {
  if (!dateStr) return 0;
  const d = safeParseDateStr(dateStr);
  if (!d) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - d.getTime()) / 86400000));
}

export default function OverdueTasksPage() {
  const { role } = useUserRole();
  const isAdmin = role === "admin" || role === "hr";

  const [tasks, setTasks] = useState<OverdueTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"date_asc" | "date_desc" | "priority" | "name">("date_asc");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data: usersData } = await supabaseClient.from("users").select("id, full_name");
        const usersMap = new Map<string, string>();
        (usersData || []).forEach((u: any) => { if (u.id) usersMap.set(u.id, u.full_name || "Unknown"); });

        const { data: projectsData } = await supabaseClient.from("projects").select("id, name");
        const projectsMap = new Map<string, string>();
        (projectsData || []).forEach((p: any) => { if (p.id) projectsMap.set(p.id, p.name || "Unnamed"); });

        const todayStr = new Date().toISOString().slice(0, 10);

        const { data: rawTasks } = await supabaseClient
          .from("tasks")
          .select("id, name, status, priority, activity_date, assigned_user_id, assigned_user_name, project_id, source")
          .lt("activity_date", todayStr)
          .neq("status", "completed")
          .not("activity_date", "is", null)
          .order("activity_date", { ascending: true });

        const mapped: OverdueTask[] = (rawTasks || []).map((t: any) => ({
          id: t.id,
          name: t.name || "Untitled",
          status: t.status || "not_started",
          priority: t.priority || null,
          activity_date: t.activity_date || null,
          assigneeId: t.assigned_user_id || "",
          assigneeName: usersMap.get(t.assigned_user_id) || t.assigned_user_name || "Unassigned",
          projectId: t.project_id || null,
          projectName: t.project_id ? (projectsMap.get(t.project_id) || null) : null,
          source: t.source || null,
          daysOverdue: daysOverdue(t.activity_date),
        }));

        setTasks(mapped);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    void load();

    // Real-time: reload whenever any task row changes
    const channel = supabaseClient
      .channel("overdue-tasks-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        void load();
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  // Unique filter options derived from data
  const uniqueUsers = useMemo(() => Array.from(new Set(tasks.map(t => t.assigneeName))).sort(), [tasks]);
  const uniqueProjects = useMemo(() => Array.from(new Set(tasks.map(t => t.projectName).filter(Boolean))).sort() as string[], [tasks]);
  const uniqueSources = useMemo(() => Array.from(new Set(tasks.map(t => t.source).filter(Boolean))).sort() as string[], [tasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => {
      if (search) {
        const q = search.toLowerCase();
        if (!t.name.toLowerCase().includes(q) && !t.assigneeName.toLowerCase().includes(q) && !(t.projectName || "").toLowerCase().includes(q)) return false;
      }
      if (userFilter !== "all" && t.assigneeName !== userFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (sourceFilter !== "all" && t.source !== sourceFilter) return false;
      if (projectFilter !== "all" && t.projectName !== projectFilter) return false;
      return true;
    });

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === "date_asc") return (a.activity_date || "").localeCompare(b.activity_date || "");
      if (sortBy === "date_desc") return (b.activity_date || "").localeCompare(a.activity_date || "");
      if (sortBy === "priority") {
        const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
        return (order[a.priority || "low"] ?? 2) - (order[b.priority || "low"] ?? 2);
      }
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });

    return result;
  }, [tasks, search, userFilter, statusFilter, priorityFilter, sourceFilter, projectFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedTasks = filteredTasks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const hasActiveFilters = search || userFilter !== "all" || statusFilter !== "all" || priorityFilter !== "all" || sourceFilter !== "all" || projectFilter !== "all";
  const resetFilters = () => { setSearch(""); setUserFilter("all"); setStatusFilter("all"); setPriorityFilter("all"); setSourceFilter("all"); setProjectFilter("all"); setPage(1); };

  async function runBackfill() {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await fetch("/api/admin/backfill-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json.success) {
        setBackfillResult(`✓ ${json.message}`);
      } else {
        setBackfillResult(`Error: ${json.error || "unknown"}`);
      }
    } catch {
      setBackfillResult("Failed to run migration");
    } finally {
      setBackfilling(false);
    }
  }

  // Summary stats
  const highCount = tasks.filter(t => t.priority === "high").length;
  const inProgressCount = tasks.filter(t => t.status === "in_progress").length;
  const maxDays = tasks.length > 0 ? Math.max(...tasks.map(t => t.daysOverdue)) : 0;

  if (!isAdmin && role !== null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-3">🔒</div>
          <p className="text-slate-600 font-medium">Access restricted to admins.</p>
          <Link href="/" className="mt-4 inline-block text-sky-600 hover:underline text-sm">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/" className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors">← Dashboard</Link>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-100">
              <svg className="h-4 w-4 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            </span>
            Overdue Tasks
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">All overdue tasks across the entire workforce</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-bold text-rose-700">{tasks.length} overdue</span>
            <button
              onClick={runBackfill}
              disabled={backfilling}
              title="Fix existing tasks missing assignee name or due date"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 shadow-sm transition-colors"
            >
              {backfilling ? (
                <><div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />Running…</>
              ) : (
                <><svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Fix Missing Data</>
              )}
            </button>
          </div>
          {backfillResult && (
            <p className={`text-[11px] font-medium ${backfillResult.startsWith("✓") ? "text-emerald-600" : "text-rose-600"}`}>
              {backfillResult}
            </p>
          )}
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-rose-200/60 bg-gradient-to-br from-rose-50 to-pink-50/40 p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-rose-600 uppercase tracking-wide mb-1">Total Overdue</p>
          <p className="text-3xl font-bold text-rose-600">{tasks.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">tasks pending</p>
        </div>
        <div className="rounded-2xl border border-orange-200/60 bg-gradient-to-br from-orange-50 to-amber-50/40 p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide mb-1">High Priority</p>
          <p className="text-3xl font-bold text-orange-600">{highCount}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">urgent tasks</p>
        </div>
        <div className="rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50 to-blue-50/40 p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-sky-600 uppercase tracking-wide mb-1">In Progress</p>
          <p className="text-3xl font-bold text-sky-600">{inProgressCount}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">being worked on</p>
        </div>
        <div className="rounded-2xl border border-purple-200/60 bg-gradient-to-br from-purple-50 to-violet-50/40 p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide mb-1">Most Overdue</p>
          <p className="text-3xl font-bold text-purple-600">{maxDays}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">days behind</p>
        </div>
      </div>

      {/* Main task table */}
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.06)] overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-slate-100 px-5 py-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              All Overdue Tasks
              <span className="text-[11px] font-normal text-slate-400">({filteredTasks.length}{hasActiveFilters ? ` of ${tasks.length}` : ""})</span>
            </h2>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="text-[11px] text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1 self-start">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                Clear all filters
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              type="text"
              placeholder="Search by task name, person, or project…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-black placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap gap-2">
            <select value={userFilter} onChange={e => { setUserFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-3 text-[12px] text-black focus:border-sky-400 focus:outline-none">
              <option value="all">All Members</option>
              {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>

            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-3 text-[12px] text-black focus:border-sky-400 focus:outline-none">
              <option value="all">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Done</option>
            </select>

            <select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-3 text-[12px] text-black focus:border-sky-400 focus:outline-none">
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {uniqueProjects.length > 0 && (
              <select value={projectFilter} onChange={e => { setProjectFilter(e.target.value); setPage(1); }}
                className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-3 text-[12px] text-black focus:border-sky-400 focus:outline-none">
                <option value="all">All Projects</option>
                {uniqueProjects.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}

            {uniqueSources.length > 0 && (
              <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
                className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-3 text-[12px] text-black focus:border-sky-400 focus:outline-none">
                <option value="all">All Sources</option>
                <option value="operations">Operations</option>
                <option value="social_workflow">Social Media</option>
                {uniqueSources.filter(s => s !== "operations" && s !== "social_workflow").map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}

            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-3 text-[12px] text-black focus:border-sky-400 focus:outline-none ml-auto">
              <option value="date_asc">Oldest first</option>
              <option value="date_desc">Newest first</option>
              <option value="priority">By priority</option>
              <option value="name">A → Z</option>
            </select>
          </div>
        </div>

        {/* Task list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-rose-500" />
          </div>
        ) : pagedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 mb-4">
              <svg className="h-7 w-7 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            </div>
            <p className="text-base font-semibold text-slate-700">{hasActiveFilters ? "No tasks match your filters" : "No overdue tasks!"}</p>
            <p className="text-sm text-slate-400 mt-1">{hasActiveFilters ? "" : "The team is all caught up. Great work!"}</p>
            {hasActiveFilters && <button onClick={resetFilters} className="mt-3 text-sm text-sky-600 hover:underline font-medium">Clear filters</button>}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {pagedTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => setSelectedTaskId(task.id)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-rose-50/30 transition-colors group"
              >
                {/* Avatar */}
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white ${avatarColor(task.assigneeName)}`}>
                  {task.assigneeName.charAt(0).toUpperCase()}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 truncate group-hover:text-slate-900">{task.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-slate-600 font-medium">{task.assigneeName}</span>
                    {task.projectName && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-[11px] text-indigo-500 font-medium truncate max-w-[150px]">{task.projectName}</span>
                      </>
                    )}
                    {task.source && (
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500 font-medium">
                        {task.source === "social_workflow" ? "Social" : task.source}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: date + days overdue + badges */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-2">
                    {task.priority && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${PRIORITY_COLORS[task.priority] || "bg-slate-100 text-slate-500"}`}>
                        {task.priority}
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[task.status] || "bg-slate-100 text-slate-500"}`}>
                      {STATUS_LABELS[task.status] || task.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.activity_date && (
                      <span className="text-[11px] text-slate-400">{formatDate(task.activity_date)}</span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      task.daysOverdue >= 14 ? "bg-rose-600 text-white" :
                      task.daysOverdue >= 7 ? "bg-rose-400 text-white" :
                      "bg-rose-100 text-rose-700"
                    }`}>
                      {task.daysOverdue}d overdue
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <span className="text-[11px] text-slate-500">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredTasks.length)} of {filteredTasks.length} tasks
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >← Prev</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
                const p = start + i;
                if (p > totalPages) return null;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`rounded-lg w-7 h-7 text-[11px] font-semibold transition-colors ${p === safePage ? "bg-rose-500 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >Next →</button>
            </div>
          </div>
        )}
      </div>

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onStatusChange={() => {
            setTasks(prev => prev.filter(t => t.id !== selectedTaskId));
            setSelectedTaskId(null);
          }}
        />
      )}
    </div>
  );
}
