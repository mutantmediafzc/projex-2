"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";
import { useMessagesUnread } from "@/components/MessagesUnreadContext";
import { useUserRole } from "@/app/profile/hooks/useUserRole";
import DubaiInfoPill from "@/components/DubaiInfoPill";
import TaskDetailModal from "@/components/TaskDetailModal";

type ProjectType = "website" | "mobile_app" | "crm" | "marketing" | "other" | string;
type TaskStatus = "not_started" | "in_progress" | "completed";

interface ProjectStats {
  type: ProjectType;
  count: number;
}

interface WorkflowStats {
  total: number;
  avgCompletion: number;
  completed: number;
}

interface UserTaskStats {
  userId: string;
  userName: string;
  assignedCount: number;
  completedCount: number;
  completedThisWeek: number;
}

interface AdminTeamTask {
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
  isOverdue: boolean;
}

interface DayCompletion {
  label: string; // "Mon", "Tue" etc
  completed: number;
  total: number;
}

const PROJECT_TYPE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  website: { bg: "bg-blue-500", text: "text-blue-600", ring: "ring-blue-200" },
  mobile_app: { bg: "bg-purple-500", text: "text-purple-600", ring: "ring-purple-200" },
  crm: { bg: "bg-emerald-500", text: "text-emerald-600", ring: "ring-emerald-200" },
  marketing: { bg: "bg-amber-500", text: "text-amber-600", ring: "ring-amber-200" },
  other: { bg: "bg-slate-400", text: "text-slate-600", ring: "ring-slate-200" },
};

const PROJECT_TYPE_LABELS: Record<string, string> = {
  website: "Website",
  mobile_app: "Mobile App",
  crm: "CRM",
  marketing: "Marketing",
  other: "Other",
};

export default function Home() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [workflowStats, setWorkflowStats] = useState<WorkflowStats>({ total: 0, avgCompletion: 0, completed: 0 });
  const [userTaskStats, setUserTaskStats] = useState<UserTaskStats[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [userStatsRefreshCount, setUserStatsRefreshCount] = useState(0);

  const { unreadCount } = useMessagesUnread();
  const { role } = useUserRole();
  const isAdmin = role === "admin" || role === "hr";
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Admin state
  const [adminTeamTasks, setAdminTeamTasks] = useState<AdminTeamTask[]>([]);
  const [adminOverdueTasks, setAdminOverdueTasks] = useState<AdminTeamTask[]>([]);
  const [weeklyChart, setWeeklyChart] = useState<DayCompletion[]>([]);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminTaskFilter, setAdminTaskFilter] = useState<"today" | "overdue">("today");
  const [adminRefreshCount, setAdminRefreshCount] = useState(0);
  // Admin filter/search/pagination
  const [adminSearch, setAdminSearch] = useState("");
  const [adminUserFilter, setAdminUserFilter] = useState("all");
  const [adminStatusFilter, setAdminStatusFilter] = useState("all");
  const [adminSourceFilter, setAdminSourceFilter] = useState("all");
  const [adminPage, setAdminPage] = useState(1);
  const ADMIN_PAGE_SIZE = 12;

  // Load tasks function - extracted for reuse
  const loadTasks = useCallback(async (userId: string) => {
    const { data: tasksData } = await supabaseClient
      .from("tasks")
      .select("id, name, content, activity_date, created_at, patient:patients(id, first_name, last_name)")
      .eq("assigned_user_id", userId)
      .neq("status", "completed")
      .order("activity_date", { ascending: true })
      .limit(5);
    return tasksData || [];
  }, []);

  // Load user task stats
  const loadUserStats = useCallback(async () => {
    // Fetch all users for name resolution
    const { data: usersData } = await supabaseClient
      .from("users")
      .select("id, full_name");
    const usersNameMap = new Map<string, string>();
    (usersData || []).forEach((u: any) => {
      if (u.id && u.full_name) usersNameMap.set(u.id, u.full_name);
    });

    // Get all tasks with user info — include updated_at to accurately detect when task was completed
    const { data: allTasks } = await supabaseClient
      .from("tasks")
      .select("id, status, assigned_user_id, assigned_user_name, created_at, updated_at, activity_date");
    
    if (!allTasks) return;
    
    // Calculate week boundaries — Monday start
    const now = new Date();
    const weekStart = new Date(now);
    const dayOfWeek = now.getDay(); // 0=Sun,1=Mon,...6=Sat
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(now.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);
    
    // Group by user
    const userMap = new Map<string, UserTaskStats>();
    allTasks.forEach(task => {
      if (!task.assigned_user_id) return;
      const userId = task.assigned_user_id;
      // Resolve name: users table > assigned_user_name field > skip
      const resolvedName = usersNameMap.get(userId) || task.assigned_user_name || null;
      if (!resolvedName) return; // skip users with no resolvable name
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          userName: resolvedName,
          assignedCount: 0,
          completedCount: 0,
          completedThisWeek: 0,
        });
      }
      const stats = userMap.get(userId)!;
      stats.assignedCount++;
      if (task.status === "completed") {
        stats.completedCount++;
        // Use updated_at as the "completed at" timestamp (most accurate),
        // fall back to activity_date then created_at
        const completedAtStr = task.updated_at || task.activity_date || task.created_at;
        const completedAt = completedAtStr ? new Date(completedAtStr) : null;
        if (completedAt && completedAt >= weekStart) {
          stats.completedThisWeek++;
        }
      }
    });
    
    setUserTaskStats(Array.from(userMap.values()));
    setUserStatsRefreshCount(c => c + 1);
  }, []);

  // Handle task status change - refresh tasks list
  const handleTaskStatusChange = useCallback(async (taskId: string, status: TaskStatus) => {
    if (status === "completed" && currentUserId) {
      // Remove completed task from list and refresh
      setTasks(prev => prev.filter(t => t.id !== taskId));
      // Reload tasks to get fresh data
      const freshTasks = await loadTasks(currentUserId);
      setTasks(freshTasks);
      // Also refresh user stats
      loadUserStats();
    }
  }, [currentUserId, loadTasks, loadUserStats]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        const { data: authData } = await supabaseClient.auth.getUser();
        const user = authData?.user ?? null;

        if (!cancelled) {
          if (user) {
            const meta = (user.user_metadata || {}) as Record<string, unknown>;
            const first = (meta["first_name"] as string) || "";
            const full = first || user.email?.split("@")[0] || null;
            setCurrentUserName(full);
            setCurrentUserId(user.id);
          } else {
            setCurrentUserName(null);
            setCurrentUserId(null);
          }
        }

        const today = new Date();
        const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString();
        const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

        const appointmentsPromise = supabaseClient
          .from("appointments")
          .select("id, start_time, status, reason, patient:patients(id, first_name, last_name)")
          .neq("status", "cancelled")
          .gte("start_time", dayStart)
          .lte("start_time", dayEnd)
          .order("start_time", { ascending: true })
          .limit(3);

        const tasksPromise = user
          ? loadTasks(user.id)
          : Promise.resolve([]);

        const [appointmentsResult, tasksResult] = await Promise.all([appointmentsPromise, tasksPromise]);

        if (cancelled) return;

        setAppointments(!appointmentsResult.error && appointmentsResult.data ? (appointmentsResult.data as any[]) : []);
        setTasks(tasksResult);
      } catch {
        if (cancelled) return;
        setAppointments([]);
        setTasks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function loadCharts() {
      try {
        setChartsLoading(true);
        
        // Load project stats by type (open projects only)
        const { data: projects } = await supabaseClient
          .from("projects")
          .select("id, project_type, status")
          .neq("status", "completed")
          .neq("status", "cancelled");
        
        if (projects) {
          const typeMap = new Map<string, number>();
          projects.forEach(p => {
            const type = p.project_type || "other";
            typeMap.set(type, (typeMap.get(type) || 0) + 1);
          });
          const stats: ProjectStats[] = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));
          setProjectStats(stats);
        }
        
        // Load workflow stats
        const { data: workflows } = await supabaseClient
          .from("project_workflows")
          .select("project_id, workflow_data");
        
        if (workflows) {
          let totalSteps = 0;
          let completedSteps = 0;
          let fullyCompleted = 0;
          
          workflows.forEach(w => {
            const data = w.workflow_data as any;
            if (data?.steps) {
              const steps = data.steps as any[];
              totalSteps += steps.length;
              const done = steps.filter(s => s.status === "completed").length;
              completedSteps += done;
              if (done === steps.length) fullyCompleted++;
            }
          });
          
          setWorkflowStats({
            total: workflows.length,
            avgCompletion: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
            completed: fullyCompleted,
          });
        }
        
        // Load user task stats
        await loadUserStats();
        
      } catch {
        console.error("Failed to load chart data");
      } finally {
        setChartsLoading(false);
      }
    }

    void load();
    void loadCharts();

    return () => { cancelled = true; };
  }, [loadTasks, loadUserStats]);

  // Admin data loading
  useEffect(() => {
    if (!isAdmin) { setAdminLoading(false); return; }

    async function loadAdminData() {
      setAdminLoading(true);
      try {
        // Fetch all users for name resolution
        const { data: usersData } = await supabaseClient.from("users").select("id, full_name");
        const usersMap = new Map<string, string>();
        (usersData || []).forEach((u: any) => { if (u.id) usersMap.set(u.id, u.full_name || "Unknown"); });

        const todayStr = new Date().toISOString().slice(0, 10);

        // Today's team tasks
        const { data: todayTasks } = await supabaseClient
          .from("tasks")
          .select("id, name, status, priority, activity_date, assigned_user_id, assigned_user_name, project_id, source")
          .eq("activity_date", todayStr)
          .neq("status", "completed")
          .order("priority", { ascending: true })
          .limit(50);

        // Overdue tasks — fetch all non-completed with activity_date set, then filter client-side
        // (DB lt filter misses ISO timestamps like "2026-01-15T10:00:00+00:00" vs plain "2026-01-15")
        const { data: allPendingTasks } = await supabaseClient
          .from("tasks")
          .select("id, name, status, priority, activity_date, assigned_user_id, assigned_user_name, project_id, source")
          .neq("status", "completed")
          .not("activity_date", "is", null);

        const todayMidnight = new Date(todayStr + "T00:00:00");
        const overdueTasks = (allPendingTasks || []).filter((t: any) => {
          if (!t.activity_date) return false;
          const raw = String(t.activity_date);
          const d = raw.includes("T") || raw.includes("Z") || raw.includes("+")
            ? new Date(raw)
            : new Date(raw + "T00:00:00");
          return !isNaN(d.getTime()) && d < todayMidnight;
        });

        // Fetch project names
        const { data: projectsData } = await supabaseClient.from("projects").select("id, name");
        const projectsMap = new Map<string, string>();
        (projectsData || []).forEach((p: any) => { if (p.id) projectsMap.set(p.id, p.name || "Unnamed"); });

        const mapTask = (t: any, overdue: boolean): AdminTeamTask => ({
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
          isOverdue: overdue,
        });

        setAdminTeamTasks((todayTasks || []).map((t: any) => mapTask(t, false)));
        setAdminOverdueTasks((overdueTasks || []).map((t: any) => mapTask(t, true)));

        // Weekly chart: last 7 days completed vs total
        const days: DayCompletion[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dayStr = d.toISOString().slice(0, 10);
          const label = d.toLocaleDateString("en", { weekday: "short" });
          const { data: dayTasks } = await supabaseClient
            .from("tasks")
            .select("id, status")
            .eq("activity_date", dayStr);
          const total = (dayTasks || []).length;
          const completed = (dayTasks || []).filter((t: any) => t.status === "completed").length;
          days.push({ label, completed, total });
        }
        setWeeklyChart(days);
        setAdminRefreshCount(c => c + 1);
      } catch (e) {
        console.error("Admin data load error:", e);
      } finally {
        setAdminLoading(false);
      }
    }

    void loadAdminData();

    // Real-time subscription: reload admin tasks + user stats whenever any task changes
    const channel = supabaseClient
      .channel("admin-tasks-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        void loadAdminData();
        void loadUserStats();
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [isAdmin]);

  // Computed leaderboards
  const taskAssignedLeaderboard = useMemo(() => 
    [...userTaskStats].sort((a, b) => b.assignedCount - a.assignedCount).slice(0, 5),
  [userTaskStats]);

  const mvpLeaderboard = useMemo(() => 
    [...userTaskStats].sort((a, b) => b.completedThisWeek - a.completedThisWeek).slice(0, 5),
  [userTaskStats]);

  const totalProjects = useMemo(() => projectStats.reduce((sum, s) => sum + s.count, 0), [projectStats]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <DubaiInfoPill />
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 truncate">
            {currentUserName ? `Hi ${currentUserName}` : "Hi there"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Let&apos;s get you on a productive routine today!
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs sm:text-sm shrink-0">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-sky-200/70 bg-white/70 px-3 sm:px-4 py-2 sm:py-1.5 font-medium text-sky-700 shadow-[0_10px_25px_rgba(15,23,42,0.16)] backdrop-blur hover:bg-white hover:text-sky-800 btn-pill-primary"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[12px] font-semibold text-white shadow-sm">
              +
            </span>
            <span>New Project</span>
          </Link>
          <Link
            href="/appointments"
            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-slate-200/80 bg-white/60 px-3 sm:px-4 py-2 sm:py-1.5 font-medium text-slate-700 shadow-[0_10px_25px_rgba(15,23,42,0.10)] backdrop-blur hover:bg-white hover:text-slate-900 btn-pill-secondary"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/80 text-[11px] text-white shadow-sm">
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 11h18" />
              </svg>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="font-extrabold text-[13px] leading-none">+</span>
              <span>Meeting</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Analytics Dashboard */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Projects by Type */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-white to-blue-50/30 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-blue-400/10 to-blue-600/5" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="8" rx="1"/><rect x="14" y="6" width="3" height="12" rx="1"/></svg>
              </span>
              <h3 className="text-sm font-semibold text-slate-700">Open Projects</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalProjects}</p>
            <p className="text-[11px] text-slate-500 mt-1">By project type</p>
            {chartsLoading ? (
              <div className="mt-3 h-20 flex items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
              </div>
            ) : projectStats.length > 0 ? (
              <div className="mt-3 space-y-2">
                {projectStats.map(stat => {
                  const colors = PROJECT_TYPE_COLORS[stat.type] || PROJECT_TYPE_COLORS.other;
                  const pct = totalProjects > 0 ? (stat.count / totalProjects) * 100 : 0;
                  return (
                    <div key={stat.type} className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${colors.bg}`} />
                      <span className="text-[11px] text-slate-600 flex-1">{PROJECT_TYPE_LABELS[stat.type] || stat.type}</span>
                      <span className="text-[11px] font-semibold text-slate-800">{stat.count}</span>
                      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${colors.bg} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 mt-3">No open projects</p>
            )}
          </div>
        </div>

        {/* Workflow Completion */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-white to-emerald-50/30 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400/10 to-emerald-600/5" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25">
                <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </span>
              <h3 className="text-sm font-semibold text-slate-700">Workflows</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">{workflowStats.avgCompletion}%</p>
            <p className="text-[11px] text-slate-500 mt-1">Overall completion rate</p>
            {chartsLoading ? (
              <div className="mt-3 h-20 flex items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
              </div>
            ) : (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-medium text-emerald-600">{workflowStats.completed}/{workflowStats.total} complete</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${workflowStats.avgCompletion}%` }} />
                </div>
                <div className="mt-2 flex gap-4">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-slate-500">Complete</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-slate-200" />
                    <span className="text-[10px] text-slate-500">In Progress</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Task Leaderboard - Most Assigned */}
        <div key={`warriors-${userStatsRefreshCount}`} className="stat-flash relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-white to-amber-50/30 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-amber-400/10 to-amber-600/5" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25">
                <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </span>
              <h3 className="text-sm font-semibold text-slate-700">Task Warriors</h3>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">Most tasks assigned</p>
            {chartsLoading ? (
              <div className="h-24 flex items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-200 border-t-amber-600" />
              </div>
            ) : taskAssignedLeaderboard.length > 0 ? (
              <div className="space-y-2">
                {taskAssignedLeaderboard.map((user, idx) => (
                  <div key={user.userId} className="flex items-center gap-2">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${idx === 0 ? "bg-amber-500 text-white" : idx === 1 ? "bg-slate-300 text-slate-700" : idx === 2 ? "bg-amber-700 text-white" : "bg-slate-100 text-slate-500"}`}>
                      {idx + 1}
                    </span>
                    <span className="text-[12px] text-slate-700 flex-1 truncate">{user.userName}</span>
                    <span className="text-[11px] font-bold text-amber-600">{user.assignedCount}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">No data yet</p>
            )}
          </div>
        </div>

        {/* MVP of the Week */}
        <div key={`mvp-${userStatsRefreshCount}`} className="stat-flash relative overflow-hidden rounded-2xl border border-purple-200/60 bg-gradient-to-br from-purple-50 via-white to-pink-50/30 p-5 shadow-[0_20px_50px_rgba(139,92,246,0.12)]">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/10" />
          <div className="absolute right-3 top-3">
            <span className="text-2xl">👑</span>
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25">
                <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </span>
              <h3 className="text-sm font-semibold text-purple-800">MVP of the Week</h3>
            </div>
            {chartsLoading ? (
              <div className="h-28 flex items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-200 border-t-purple-600" />
              </div>
            ) : mvpLeaderboard.length > 0 && mvpLeaderboard[0].completedThisWeek > 0 ? (
              <>
                <div className="text-center mb-3">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-lg font-bold text-white shadow-lg shadow-purple-500/30 ring-4 ring-purple-100">
                    {mvpLeaderboard[0].userName.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm font-bold text-purple-900 mt-2">{mvpLeaderboard[0].userName}</p>
                  <p className="text-[20px] font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {mvpLeaderboard[0].completedThisWeek} tasks
                  </p>
                  <p className="text-[10px] text-purple-500">completed this week</p>
                </div>
                {mvpLeaderboard.length > 1 && (
                  <div className="border-t border-purple-100 pt-2 space-y-1">
                    {mvpLeaderboard.slice(1).map((user, idx) => (
                      <div key={user.userId} className="flex items-center gap-2 text-[11px]">
                        <span className="text-purple-400">{idx + 2}.</span>
                        <span className="text-purple-700 flex-1 truncate">{user.userName}</span>
                        <span className="font-semibold text-purple-600">{user.completedThisWeek}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-[11px] text-purple-400">No tasks completed this week yet</p>
                <p className="text-[10px] text-purple-300 mt-1">Be the first to claim the crown!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tasks and Meetings Section */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* Today's Meetings */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-white to-sky-50/30 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-sky-400/10 to-blue-400/5" />
          <div className="relative">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/25">
                  <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Today&apos;s Meetings</h2>
                  <p className="text-[11px] text-slate-500">Upcoming meetings and calls</p>
                </div>
              </div>
              <Link href="/appointments" className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 transition-colors">
                View all
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
              </div>
            ) : appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
                  <svg className="h-6 w-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>
                </div>
                <p className="text-sm font-medium text-slate-600">No meetings today</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Enjoy your meeting-free day!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {appointments.map((appt) => {
                  const start = appt.start_time ? new Date(appt.start_time as string) : null;
                  const timeLabel = start && !Number.isNaN(start.getTime()) ? start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "";
                  const patientName = appt.patient ? `${appt.patient.first_name ?? ""} ${appt.patient.last_name ?? ""}`.trim().replace(/\s+/g, " ") : "Unknown";
                  const rawService = (appt.reason as string | null) ?? null;
                  const service = rawService ? (rawService.split("[")[0] || "Meeting").trim() : "Meeting";
                  let badgeLabel = "Scheduled";
                  let badgeClasses = "bg-sky-100 text-sky-700";
                  if (appt.status === "confirmed") { badgeLabel = "Confirmed"; badgeClasses = "bg-emerald-100 text-emerald-700"; }
                  else if (appt.status === "completed") { badgeLabel = "Done"; badgeClasses = "bg-slate-100 text-slate-600"; }
                  return (
                    <div key={appt.id as string} className="flex items-center gap-3 rounded-xl bg-white/80 border border-slate-100 p-3 hover:shadow-md transition-all">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 font-bold text-[11px]">{timeLabel}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{service}</p>
                        <p className="text-[11px] text-slate-500 truncate">{patientName}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeClasses}`}>{badgeLabel}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tasks */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-white to-rose-50/30 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-rose-400/10 to-pink-400/5" />
          <div className="relative">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/25">
                  <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Your Tasks</h2>
                  <p className="text-[11px] text-slate-500">Follow-ups and action items</p>
                </div>
              </div>
              <Link href="/tasks" className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 transition-colors">
                View all
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-rose-200 border-t-rose-600" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
                  <svg className="h-6 w-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                </div>
                <p className="text-sm font-medium text-slate-600">All caught up!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No open tasks assigned to you</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => {
                  const rawDate = (task.activity_date as string | null) ?? (task.created_at as string);
                  let badgeLabel = "Pending";
                  let badgeClasses = "bg-slate-100 text-slate-600";
                  if (rawDate) {
                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    const d = new Date(rawDate);
                    if (!Number.isNaN(d.getTime())) {
                      const taskDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                      const diffDays = Math.round((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      if (diffDays === 0) { badgeLabel = "Today"; badgeClasses = "bg-amber-100 text-amber-700"; }
                      else if (diffDays < 0) { badgeLabel = "Overdue"; badgeClasses = "bg-rose-100 text-rose-700"; }
                      else if (diffDays <= 7) { badgeLabel = "This week"; badgeClasses = "bg-sky-100 text-sky-700"; }
                    }
                  }
                  return (
                    <button key={task.id as string} type="button" onClick={() => setSelectedTaskId(task.id as string)}
                      className="flex w-full items-center gap-3 rounded-xl bg-white/80 border border-slate-100 p-3 text-left hover:shadow-md hover:border-rose-200 transition-all group">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-500 group-hover:bg-rose-100 transition-colors">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{task.name as string}</p>
                        <p className="text-[11px] text-slate-500 truncate">{task.content ? (task.content as string) : "Task"}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeClasses}`}>{badgeLabel}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Admin Dashboard Section */}
      {isAdmin && (() => {
        const PRIORITY_COLORS: Record<string, string> = {
          high: "bg-rose-100 text-rose-700",
          medium: "bg-amber-100 text-amber-700",
          low: "bg-slate-100 text-slate-600",
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

        const rawTasks = adminTaskFilter === "today" ? adminTeamTasks : adminOverdueTasks;

        // Unique filter options
        const uniqueUsers = Array.from(new Set(rawTasks.map(t => t.assigneeName))).sort();
        const uniqueProjects = Array.from(new Set(rawTasks.map(t => t.projectName).filter(Boolean))).sort() as string[];
        const uniqueSources = Array.from(new Set(rawTasks.map(t => t.source).filter(Boolean))).sort() as string[];

        // Apply filters
        const filteredTasks = rawTasks.filter(t => {
          if (adminSearch && !t.name.toLowerCase().includes(adminSearch.toLowerCase()) && !t.assigneeName.toLowerCase().includes(adminSearch.toLowerCase()) && !(t.projectName || "").toLowerCase().includes(adminSearch.toLowerCase())) return false;
          if (adminUserFilter !== "all" && t.assigneeName !== adminUserFilter) return false;
          if (adminStatusFilter !== "all" && t.status !== adminStatusFilter) return false;
          if (adminSourceFilter !== "all" && t.source !== adminSourceFilter) return false;
          return true;
        });

        const totalPages = Math.max(1, Math.ceil(filteredTasks.length / ADMIN_PAGE_SIZE));
        const safeAdminPage = Math.min(adminPage, totalPages);
        const pagedTasks = filteredTasks.slice((safeAdminPage - 1) * ADMIN_PAGE_SIZE, safeAdminPage * ADMIN_PAGE_SIZE);

        const resetFilters = () => {
          setAdminSearch(""); setAdminUserFilter("all"); setAdminStatusFilter("all"); setAdminSourceFilter("all"); setAdminPage(1);
        };
        const hasActiveFilters = adminSearch || adminUserFilter !== "all" || adminStatusFilter !== "all" || adminSourceFilter !== "all";

        return (
          <section className="space-y-5 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Team Productivity Dashboard</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Admin view — team tasks, overdue items &amp; weekly performance</p>
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 self-start">
                <button onClick={() => { setAdminTaskFilter("today"); setAdminPage(1); }}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${adminTaskFilter === "today" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
                  Today
                </button>
                <button onClick={() => { setAdminTaskFilter("overdue"); setAdminPage(1); }}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${adminTaskFilter === "overdue" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
                  Overdue
                  {adminOverdueTasks.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{adminOverdueTasks.length}</span>
                  )}
                </button>
              </div>
            </div>

            {/* Top Row: Stats + Chart */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Today card */}
              <div key={`today-${adminRefreshCount}`} className="stat-flash rounded-2xl border border-slate-200/60 bg-gradient-to-br from-sky-50 to-blue-50/40 p-5 shadow-sm">
                <p className="text-[10px] font-semibold text-sky-600 uppercase tracking-wide mb-1">Today</p>
                <p className="text-3xl font-bold text-slate-900">{adminTeamTasks.length}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">tasks scheduled</p>
              </div>
              {/* Overdue card — links to dedicated page */}
              <Link key={`overdue-${adminRefreshCount}`} href="/admin/overdue" className="stat-flash rounded-2xl border border-rose-200/60 bg-gradient-to-br from-rose-50 to-pink-50/40 p-5 shadow-sm hover:shadow-md transition-shadow group block">
                <p className="text-[10px] font-semibold text-rose-600 uppercase tracking-wide mb-1">Overdue</p>
                <p className="text-3xl font-bold text-rose-600">{adminOverdueTasks.length}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 group-hover:text-rose-500 transition-colors">need attention → view all</p>
              </Link>
              {/* 7-Day Chart */}
              <div key={`chart-${adminRefreshCount}`} className="stat-flash sm:col-span-2 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">7-Day Completion</h4>
                    <p className="text-[10px] text-slate-500">Tasks completed vs total</p>
                  </div>
                  {!adminLoading && weeklyChart.length > 0 && (() => {
                    const tc = weeklyChart.reduce((s, d) => s + d.completed, 0);
                    const tt = weeklyChart.reduce((s, d) => s + d.total, 0);
                    return <div className="text-right"><span className="text-lg font-bold text-slate-900">{tt > 0 ? Math.round((tc/tt)*100) : 0}%</span><p className="text-[10px] text-slate-500">{tc}/{tt} done</p></div>;
                  })()}
                </div>
                {adminLoading ? (
                  <div className="h-20 flex items-center justify-center"><div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" /></div>
                ) : (
                  <div className="flex items-end gap-1 h-20">
                    {weeklyChart.map((day, idx) => {
                      const maxVal = Math.max(...weeklyChart.map(d => d.total), 1);
                      const totalH = day.total > 0 ? Math.round((day.total / maxVal) * 72) : 3;
                      const completedH = day.total > 0 ? Math.round((day.completed / maxVal) * 72) : 0;
                      const isToday = idx === weeklyChart.length - 1;
                      return (
                        <div key={day.label} className="flex-1 flex flex-col items-center gap-0.5">
                          <div className="relative w-full" style={{ height: 72 }}>
                            <div className={`absolute bottom-0 left-0 right-0 rounded-t-sm ${isToday ? "bg-sky-100" : "bg-slate-100"}`} style={{ height: totalH }} />
                            <div className={`absolute bottom-0 left-0 right-0 rounded-t-sm ${isToday ? "bg-sky-500" : "bg-violet-400"}`} style={{ height: completedH }} />
                          </div>
                          <span className={`text-[8px] font-semibold ${isToday ? "text-sky-600" : "text-slate-400"}`}>{day.label}</span>
                          {day.total > 0 && <span className="text-[7px] text-slate-400">{day.completed}/{day.total}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Team Completion Rate row */}
            {!adminLoading && userTaskStats.length > 0 && (
              <div key={`completion-${adminRefreshCount}`} className="stat-flash rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
                <h4 className="text-xs font-bold text-slate-800 mb-4">Team Completion Rate</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
                  {[...userTaskStats]
                    .filter(u => u.assignedCount > 0)
                    .sort((a, b) => (b.completedCount / (b.assignedCount||1)) - (a.completedCount / (a.assignedCount||1)))
                    .map(u => {
                      const rate = u.assignedCount > 0 ? Math.round((u.completedCount / u.assignedCount) * 100) : 0;
                      const short = u.userName.split(" ").map((n: string, i: number) => i === 0 ? n : n.charAt(0) + ".").join(" ");
                      return (
                        <div key={u.userId}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] text-slate-700 font-medium truncate flex-1">{short}</span>
                            <span className="text-[10px] font-bold text-slate-500 ml-2">{rate}% <span className="text-slate-300 font-normal">({u.completedCount}/{u.assignedCount})</span></span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${rate >= 75 ? "bg-emerald-400" : rate >= 50 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${rate}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Full-width Task List with search + filters */}
            <div className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.06)] overflow-hidden">
              {/* Panel header */}
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${adminTaskFilter === "today" ? "bg-sky-500 animate-pulse" : "bg-rose-500"}`} />
                    {adminTaskFilter === "today" ? "Team Tasks Today" : "Overdue Tasks"}
                    <span className="text-[11px] font-normal text-slate-400">({filteredTasks.length} of {rawTasks.length})</span>
                  </h3>
                  {hasActiveFilters && (
                    <button onClick={resetFilters} className="text-[11px] text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      Clear filters
                    </button>
                  )}
                </div>
                {/* Search + filters row */}
                <div className="flex flex-wrap gap-2">
                  <div className="relative flex-1 min-w-[160px]">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input
                      type="text"
                      placeholder="Search tasks, people, projects…"
                      value={adminSearch}
                      onChange={e => { setAdminSearch(e.target.value); setAdminPage(1); }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-[12px] text-black placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200"
                    />
                  </div>
                  <select
                    value={adminUserFilter}
                    onChange={e => { setAdminUserFilter(e.target.value); setAdminPage(1); }}
                    className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-[12px] text-black focus:border-sky-400 focus:outline-none"
                  >
                    <option value="all">All Members</option>
                    {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <select
                    value={adminStatusFilter}
                    onChange={e => { setAdminStatusFilter(e.target.value); setAdminPage(1); }}
                    className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-[12px] text-black focus:border-sky-400 focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Done</option>
                  </select>
                  {uniqueProjects.length > 0 && (
                    <select
                      value={adminSourceFilter !== "all" && !["operations","social_workflow"].includes(adminSourceFilter) ? adminSourceFilter : "all"}
                      onChange={e => { setAdminSourceFilter(e.target.value); setAdminPage(1); }}
                      className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-[12px] text-black focus:border-sky-400 focus:outline-none"
                    >
                      <option value="all">All Sources</option>
                      <option value="operations">Operations</option>
                      <option value="social_workflow">Social Media</option>
                      {uniqueSources.filter(s => s !== "operations" && s !== "social_workflow").map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {/* Task rows */}
              {adminLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
                </div>
              ) : pagedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
                    <svg className="h-6 w-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                  </div>
                  <p className="text-sm font-medium text-slate-600">{hasActiveFilters ? "No tasks match your filters" : adminTaskFilter === "today" ? "No tasks scheduled for today" : "No overdue tasks!"}</p>
                  {hasActiveFilters && <button onClick={resetFilters} className="mt-2 text-[11px] text-sky-600 hover:underline">Clear filters</button>}
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {pagedTasks.map((task) => {
                    const dateLabel = (() => {
                      if (!task.activity_date) return "";
                      const raw = task.activity_date;
                      const d = raw.includes("T") || raw.includes("Z") || raw.includes("+")
                        ? new Date(raw)
                        : new Date(raw + "T00:00:00");
                      return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                    })();
                    const avatarColors = ["bg-sky-500","bg-violet-500","bg-amber-500","bg-rose-500","bg-emerald-500","bg-pink-500","bg-indigo-500","bg-orange-500"];
                    const avatarColor = avatarColors[task.assigneeName.charCodeAt(0) % avatarColors.length];
                    return (
                      <button key={task.id} type="button"
                        onClick={() => setSelectedTaskId(task.id)}
                        className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50/80 transition-colors group">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${avatarColor}`}>
                          {task.assigneeName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800 truncate group-hover:text-slate-900">{task.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-slate-500 font-medium">{task.assigneeName}</span>
                            {task.projectName && (
                              <><span className="text-slate-300">·</span><span className="text-[11px] text-indigo-500 font-medium truncate max-w-[120px]">{task.projectName}</span></>
                            )}
                            {dateLabel && (
                              <><span className="text-slate-300">·</span><span className={`text-[11px] font-medium ${task.isOverdue ? "text-rose-500" : "text-slate-400"}`}>{dateLabel}</span></>
                            )}
                            {task.source && (
                              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500 font-medium">{task.source === "social_workflow" ? "Social" : task.source}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {task.priority && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${PRIORITY_COLORS[task.priority] || "bg-slate-100 text-slate-500"}`}>
                              {task.priority}
                            </span>
                          )}
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[task.status] || "bg-slate-100 text-slate-500"}`}>
                            {STATUS_LABELS[task.status] || task.status}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                  <span className="text-[11px] text-slate-500">
                    Page {safeAdminPage} of {totalPages} &nbsp;·&nbsp; {filteredTasks.length} tasks
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setAdminPage(p => Math.max(1, p - 1))}
                      disabled={safeAdminPage === 1}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >← Prev</button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const start = Math.max(1, Math.min(safeAdminPage - 2, totalPages - 4));
                      const page = start + i;
                      if (page > totalPages) return null;
                      return (
                        <button key={page} onClick={() => setAdminPage(page)}
                          className={`rounded-lg w-7 h-7 text-[11px] font-semibold transition-colors ${page === safeAdminPage ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setAdminPage(p => Math.min(totalPages, p + 1))}
                      disabled={safeAdminPage === totalPages}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >Next →</button>
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onStatusChange={handleTaskStatusChange}
        />
      )}
    </div>
  );
}
