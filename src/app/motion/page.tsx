"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";

type MotionTask = {
  id: string;
  task_id: string;
  task_number: number;
  workspace_id: string | null;
  parent_task_id: string | null;
  project_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  completed_at: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  assignee_id: string | null;
  assignee_name: string | null;
  created_by_id: string | null;
  created_by_name: string | null;
  sort_order: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  labels?: MotionLabel[];
  checklist_items?: MotionChecklistItem[];
  subtasks?: MotionTask[];
  project?: ProjectSummary | null;
};

type ProjectSummary = {
  id: string;
  name: string;
  status: string | null;
  company?: { id: string; name: string } | null;
};

type MotionLabel = {
  id: string;
  name: string;
  color: string;
};

type MotionChecklistItem = {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  sort_order: number;
};

type MotionWorkspace = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
};

type UserSummary = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type ProjectOption = {
  id: string;
  name: string;
  status: string | null;
  company_name: string | null;
};

type ViewType = "list" | "kanban" | "calendar" | "timeline";

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  backlog: { label: "Backlog", color: "text-slate-600", bgColor: "bg-slate-100", borderColor: "border-slate-200" },
  todo: { label: "To Do", color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  in_progress: { label: "In Progress", color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
  in_review: { label: "In Review", color: "text-purple-600", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
  completed: { label: "Completed", color: "text-emerald-600", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
  blocked: { label: "Blocked", color: "text-red-600", bgColor: "bg-red-50", borderColor: "border-red-200" },
  cancelled: { label: "Cancelled", color: "text-gray-500", bgColor: "bg-gray-100", borderColor: "border-gray-200" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  none: { label: "None", color: "text-slate-400", icon: "○" },
  low: { label: "Low", color: "text-blue-500", icon: "↓" },
  medium: { label: "Medium", color: "text-amber-500", icon: "→" },
  high: { label: "High", color: "text-orange-500", icon: "↑" },
  urgent: { label: "Urgent", color: "text-red-600", icon: "⚡" },
};

const KANBAN_COLUMNS = ["backlog", "todo", "in_progress", "in_review", "completed"];

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateForInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === "completed" || status === "cancelled") return false;
  return new Date(dueDate) < new Date();
}

export default function MotionPage() {
  const [tasks, setTasks] = useState<MotionTask[]>([]);
  const [labels, setLabels] = useState<MotionLabel[]>([]);
  const [workspaces, setWorkspaces] = useState<MotionWorkspace[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewType, setViewType] = useState<ViewType>("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [labelFilter, setLabelFilter] = useState<string>("all");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MotionTask | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Create/Edit form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState("todo");
  const [formPriority, setFormPriority] = useState("medium");
  const [formDueDate, setFormDueDate] = useState("");
  const [formAssigneeId, setFormAssigneeId] = useState("");
  const [formProjectId, setFormProjectId] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [tasksRes, labelsRes, workspacesRes, usersRes, projectsRes] = await Promise.all([
          supabaseClient
            .from("motion_tasks")
            .select("*, project:projects(id, name, status, company:companies(id, name))")
            .eq("is_archived", false)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: false }),
          supabaseClient.from("motion_labels").select("*").order("name"),
          supabaseClient.from("motion_workspaces").select("*").order("name"),
          supabaseClient.from("users").select("id, full_name, email").order("full_name"),
          supabaseClient.from("projects").select("id, name, status, company:companies(name)").eq("is_archived", false).order("name"),
        ]);

        if (!isMounted) return;

        if (tasksRes.error) throw new Error(tasksRes.error.message);
        if (labelsRes.error) throw new Error(labelsRes.error.message);

        setTasks((tasksRes.data || []).map((t: any) => ({
          ...t,
          project: Array.isArray(t.project) ? t.project[0] || null : t.project,
        })) as MotionTask[]);
        setLabels((labelsRes.data || []) as MotionLabel[]);
        setWorkspaces((workspacesRes.data || []) as MotionWorkspace[]);
        setUsers((usersRes.data || []) as UserSummary[]);
        setProjects((projectsRes.data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          company_name: Array.isArray(p.company) ? p.company[0]?.name : p.company?.name || null,
        })) as ProjectOption[]);
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load data");
        setLoading(false);
      }
    }

    void loadData();
    return () => { isMounted = false; };
  }, []);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (assigneeFilter !== "all" && task.assignee_id !== assigneeFilter) return false;
      if (projectFilter !== "all" && task.project_id !== projectFilter) return false;
      if (term) {
        const searchFields = [task.title, task.description, task.task_id, task.assignee_name, task.project?.name].filter(Boolean).join(" ").toLowerCase();
        if (!searchFields.includes(term)) return false;
      }
      return true;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, assigneeFilter, projectFilter]);

  // Group tasks by status for Kanban
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, MotionTask[]> = {};
    KANBAN_COLUMNS.forEach((status) => { grouped[status] = []; });
    filteredTasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });
    return grouped;
  }, [filteredTasks]);

  // Calendar data
  const calendarTasks = useMemo(() => {
    return filteredTasks.filter((t) => t.due_date);
  }, [filteredTasks]);

  const resetForm = useCallback(() => {
    setFormTitle("");
    setFormDescription("");
    setFormStatus("todo");
    setFormPriority("medium");
    setFormDueDate("");
    setFormAssigneeId("");
    setFormProjectId("");
    setFormError(null);
  }, []);

  const openCreateModal = useCallback(() => {
    resetForm();
    setSelectedTask(null);
    setIsCreateModalOpen(true);
  }, [resetForm]);

  const openEditModal = useCallback((task: MotionTask) => {
    setFormTitle(task.title);
    setFormDescription(task.description || "");
    setFormStatus(task.status);
    setFormPriority(task.priority);
    setFormDueDate(formatDateForInput(task.due_date));
    setFormAssigneeId(task.assignee_id || "");
    setFormProjectId(task.project_id || "");
    setFormError(null);
    setSelectedTask(task);
    setIsCreateModalOpen(true);
  }, []);

  const handleSaveTask = async () => {
    if (!formTitle.trim()) {
      setFormError("Title is required");
      return;
    }

    try {
      setFormSaving(true);
      setFormError(null);

      const { data: authData } = await supabaseClient.auth.getUser();
      const user = authData?.user;
      if (!user) {
        setFormError("You must be logged in");
        setFormSaving(false);
        return;
      }

      const meta = (user.user_metadata || {}) as Record<string, unknown>;
      const creatorName = [meta.first_name, meta.last_name].filter(Boolean).join(" ") || user.email || "Unknown";

      const assignee = users.find((u) => u.id === formAssigneeId);
      const assigneeName = assignee ? (assignee.full_name || assignee.email || null) : null;

      const taskData = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        status: formStatus,
        priority: formPriority,
        due_date: formDueDate ? new Date(formDueDate).toISOString() : null,
        assignee_id: formAssigneeId || null,
        assignee_name: assigneeName,
        project_id: formProjectId || null,
        updated_at: new Date().toISOString(),
      };

      if (selectedTask) {
        // Update existing task
        const { data, error: updateError } = await supabaseClient
          .from("motion_tasks")
          .update(taskData)
          .eq("id", selectedTask.id)
          .select()
          .single();

        if (updateError) throw new Error(updateError.message);
        setTasks((prev) => prev.map((t) => (t.id === selectedTask.id ? (data as MotionTask) : t)));
      } else {
        // Create new task
        const { data, error: insertError } = await supabaseClient
          .from("motion_tasks")
          .insert({
            ...taskData,
            created_by_id: user.id,
            created_by_name: creatorName,
          })
          .select()
          .single();

        if (insertError) throw new Error(insertError.message);
        setTasks((prev) => [data as MotionTask, ...prev]);
      }

      setIsCreateModalOpen(false);
      resetForm();
      setSelectedTask(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setFormSaving(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updates: Partial<MotionTask> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === "completed" && task.status !== "completed") {
      updates.completed_at = new Date().toISOString();
    } else if (newStatus !== "completed") {
      updates.completed_at = null;
    }

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));

    const { error } = await supabaseClient
      .from("motion_tasks")
      .update(updates)
      .eq("id", taskId);

    if (error) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? task : t)));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    const task = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    const { error } = await supabaseClient.from("motion_tasks").delete().eq("id", taskId);

    if (error && task) {
      setTasks((prev) => [...prev, task]);
    }

    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
      setIsCreateModalOpen(false);
    }
  };

  // Drag and drop for Kanban
  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggedTaskId) {
      handleStatusChange(draggedTaskId, status);
      setDraggedTaskId(null);
    }
  };

  // Task counts by status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(STATUS_CONFIG).forEach((s) => { counts[s] = 0; });
    tasks.forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return counts;
  }, [tasks]);

  // Export to Excel (CSV format)
  const exportToExcel = useCallback(() => {
    setExporting(true);
    try {
      const headers = ["Task ID", "Title", "Description", "Status", "Priority", "Due Date", "Assignee", "Project", "Created At"];
      const rows = filteredTasks.map((task) => [
        task.task_id,
        `"${(task.title || "").replace(/"/g, '""')}"`,
        `"${(task.description || "").replace(/"/g, '""')}"`,
        STATUS_CONFIG[task.status]?.label || task.status,
        PRIORITY_CONFIG[task.priority]?.label || task.priority,
        task.due_date ? new Date(task.due_date).toLocaleDateString() : "",
        task.assignee_name || "",
        task.project?.name || "",
        task.created_at ? new Date(task.created_at).toLocaleDateString() : "",
      ]);

      const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `motion-tasks-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [filteredTasks]);

  // Export to PDF
  const exportToPDF = useCallback(() => {
    setExporting(true);
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Please allow popups to export PDF");
        setExporting(false);
        return;
      }

      const tableRows = filteredTasks.map((task) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${task.task_id}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${task.title}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${STATUS_CONFIG[task.status]?.label || task.status}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${PRIORITY_CONFIG[task.priority]?.label || task.priority}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${task.due_date ? new Date(task.due_date).toLocaleDateString() : "-"}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${task.assignee_name || "-"}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${task.project?.name || "-"}</td>
        </tr>
      `).join("");

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Motion Tasks Export</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
            h1 { color: #1e293b; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #f1f5f9; padding: 10px 8px; border: 1px solid #e2e8f0; text-align: left; font-weight: 600; }
            td { padding: 8px; border: 1px solid #e2e8f0; }
            tr:nth-child(even) { background: #f8fafc; }
            .meta { color: #64748b; font-size: 12px; margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <h1>Motion Tasks</h1>
          <p class="meta">Exported on ${new Date().toLocaleString()} • ${filteredTasks.length} tasks</p>
          <table>
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Assignee</th>
                <th>Project</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [filteredTasks]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-fuchsia-200 border-t-fuchsia-600" />
          <p className="text-sm text-slate-500">Loading Motion...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-center">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-xs text-red-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Motion</h1>
          <p className="text-sm text-slate-500">Task management with multiple views</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export Buttons */}
          <button
            onClick={exportToExcel}
            disabled={exporting || filteredTasks.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition-all hover:bg-emerald-100 disabled:opacity-50"
            title="Export to Excel (CSV)"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M8 13h2M8 17h2M14 13h2M14 17h2" />
            </svg>
            Excel
          </button>
          <button
            onClick={exportToPDF}
            disabled={exporting || filteredTasks.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition-all hover:bg-red-100 disabled:opacity-50"
            title="Export to PDF"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M9 15v-2h6v2" />
              <path d="M12 13v5" />
            </svg>
            PDF
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition-all hover:shadow-xl hover:shadow-fuchsia-500/30"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Task
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {KANBAN_COLUMNS.map((status) => (
          <div
            key={status}
            className={`rounded-xl border ${STATUS_CONFIG[status].borderColor} ${STATUS_CONFIG[status].bgColor} p-3`}
          >
            <p className={`text-[10px] font-bold uppercase tracking-wider ${STATUS_CONFIG[status].color}`}>
              {STATUS_CONFIG[status].label}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{statusCounts[status] || 0}</p>
          </div>
        ))}
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{tasks.length}</p>
        </div>
      </div>

      {/* View Toggle & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View Type Toggle */}
        <div className="inline-flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {(["kanban", "list", "calendar", "timeline"] as ViewType[]).map((v) => (
            <button
              key={v}
              onClick={() => setViewType(v)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                viewType === v
                  ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {v === "kanban" && (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="5" height="18" rx="1" />
                  <rect x="10" y="3" width="5" height="12" rx="1" />
                  <rect x="17" y="3" width="5" height="8" rx="1" />
                </svg>
              )}
              {v === "list" && (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                </svg>
              )}
              {v === "calendar" && (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              )}
              {v === "timeline" && (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                  <rect x="5" y="4" width="6" height="4" rx="1" fill="currentColor" />
                  <rect x="9" y="10" width="8" height="4" rx="1" fill="currentColor" />
                  <rect x="7" y="16" width="5" height="4" rx="1" fill="currentColor" />
                </svg>
              )}
              <span className="capitalize">{v}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-black shadow-sm focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
          />
        </div>

        {/* Filters */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-black shadow-sm focus:border-fuchsia-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-black shadow-sm focus:border-fuchsia-500 focus:outline-none"
        >
          <option value="all">All Priority</option>
          {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>

        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-black shadow-sm focus:border-fuchsia-500 focus:outline-none"
        >
          <option value="all">All Assignees</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
          ))}
        </select>

        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-black shadow-sm focus:border-fuchsia-500 focus:outline-none"
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}{p.company_name ? ` (${p.company_name})` : ""}</option>
          ))}
        </select>
      </div>

      {/* Views */}
      {viewType === "kanban" && (
        <KanbanView
          tasksByStatus={tasksByStatus}
          onEdit={openEditModal}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteTask}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          draggedTaskId={draggedTaskId}
        />
      )}

      {viewType === "list" && (
        <ListView
          tasks={filteredTasks}
          onEdit={openEditModal}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteTask}
        />
      )}

      {viewType === "calendar" && (
        <CalendarView tasks={calendarTasks} onEdit={openEditModal} />
      )}

      {viewType === "timeline" && (
        <TimelineView tasks={filteredTasks} onEdit={openEditModal} />
      )}

      {/* Create/Edit Modal */}
      {isCreateModalOpen && (
        <TaskModal
          isEdit={!!selectedTask}
          formTitle={formTitle}
          setFormTitle={setFormTitle}
          formDescription={formDescription}
          setFormDescription={setFormDescription}
          formStatus={formStatus}
          setFormStatus={setFormStatus}
          formPriority={formPriority}
          setFormPriority={setFormPriority}
          formDueDate={formDueDate}
          setFormDueDate={setFormDueDate}
          formAssigneeId={formAssigneeId}
          setFormAssigneeId={setFormAssigneeId}
          formProjectId={formProjectId}
          setFormProjectId={setFormProjectId}
          users={users}
          projects={projects}
          formSaving={formSaving}
          formError={formError}
          onSave={handleSaveTask}
          onClose={() => {
            setIsCreateModalOpen(false);
            setSelectedTask(null);
            resetForm();
          }}
          onDelete={selectedTask ? () => handleDeleteTask(selectedTask.id) : undefined}
        />
      )}
    </div>
  );
}

// Kanban View Component
function KanbanView({
  tasksByStatus,
  onEdit,
  onStatusChange,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  draggedTaskId,
}: {
  tasksByStatus: Record<string, MotionTask[]>;
  onEdit: (task: MotionTask) => void;
  onStatusChange: (taskId: string, status: string) => void;
  onDelete: (taskId: string) => void;
  onDragStart: (taskId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  draggedTaskId: string | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 overflow-x-auto sm:grid-cols-2 lg:grid-cols-5">
      {KANBAN_COLUMNS.map((status) => (
        <div
          key={status}
          className={`min-w-[280px] rounded-2xl border ${STATUS_CONFIG[status].borderColor} bg-white/80 backdrop-blur-sm`}
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, status)}
        >
          <div className={`rounded-t-2xl ${STATUS_CONFIG[status].bgColor} px-4 py-3`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold ${STATUS_CONFIG[status].color}`}>
                {STATUS_CONFIG[status].label}
              </h3>
              <span className={`rounded-full ${STATUS_CONFIG[status].bgColor} px-2 py-0.5 text-xs font-semibold ${STATUS_CONFIG[status].color}`}>
                {tasksByStatus[status]?.length || 0}
              </span>
            </div>
          </div>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto p-3">
            {tasksByStatus[status]?.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={() => onEdit(task)}
                onDelete={() => onDelete(task.id)}
                isDragging={draggedTaskId === task.id}
                onDragStart={() => onDragStart(task.id)}
              />
            ))}
            {tasksByStatus[status]?.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center">
                <p className="text-xs text-slate-400">No tasks</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Task Card Component
function TaskCard({
  task,
  onEdit,
  onDelete,
  isDragging,
  onDragStart,
}: {
  task: MotionTask;
  onEdit: () => void;
  onDelete: () => void;
  isDragging?: boolean;
  onDragStart?: () => void;
}) {
  const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.none;
  const overdue = isOverdue(task.due_date, task.status);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onEdit}
      className={`group cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-fuchsia-300 hover:shadow-md ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
          {task.task_id}
        </span>
        <span className={`text-sm ${priorityCfg.color}`} title={priorityCfg.label}>
          {priorityCfg.icon}
        </span>
      </div>
      <h4 className="mb-2 text-sm font-semibold text-slate-900 line-clamp-2">{task.title}</h4>
      {task.description && (
        <p className="mb-2 text-xs text-slate-500 line-clamp-2">{task.description}</p>
      )}
      {task.project && (
        <Link
          href={`/projects/${task.project.id}`}
          onClick={(e) => e.stopPropagation()}
          className="mb-2 inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          {task.project.name}
        </Link>
      )}
      <div className="flex items-center justify-between gap-2">
        {task.due_date && (
          <span className={`inline-flex items-center gap-1 text-[10px] ${overdue ? "text-red-600 font-semibold" : "text-slate-500"}`}>
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {formatDate(task.due_date)}
          </span>
        )}
        {task.assignee_name && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-400 to-purple-500 text-[10px] font-bold text-white" title={task.assignee_name}>
            {task.assignee_name[0]?.toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}

// List View Component
function ListView({
  tasks,
  onEdit,
  onStatusChange,
  onDelete,
}: {
  tasks: MotionTask[];
  onEdit: (task: MotionTask) => void;
  onStatusChange: (taskId: string, status: string) => void;
  onDelete: (taskId: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">ID</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Title</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Project</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Priority</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Due Date</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Assignee</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tasks.map((task) => {
            const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
            const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.none;
            const overdue = isOverdue(task.due_date, task.status);

            return (
              <tr key={task.id} className="transition-colors hover:bg-slate-50">
                <td className="px-4 py-3">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                    {task.task_id}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => onEdit(task)} className="text-left font-medium text-slate-900 hover:text-fuchsia-600">
                    {task.title}
                  </button>
                </td>
                <td className="px-4 py-3">
                  {task.project ? (
                    <Link
                      href={`/projects/${task.project.id}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      {task.project.name}
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={task.status}
                    onChange={(e) => onStatusChange(task.id, e.target.value)}
                    className={`rounded-lg border ${statusCfg.borderColor} ${statusCfg.bgColor} px-2 py-1 text-xs font-medium ${statusCfg.color} text-black`}
                  >
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${priorityCfg.color}`}>
                    {priorityCfg.icon} {priorityCfg.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${overdue ? "font-semibold text-red-600" : "text-slate-600"}`}>
                    {formatDate(task.due_date) || "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {task.assignee_name ? (
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-400 to-purple-500 text-[10px] font-bold text-white">
                        {task.assignee_name[0]?.toUpperCase()}
                      </div>
                      <span className="text-xs text-slate-600">{task.assignee_name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onDelete(task.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </td>
              </tr>
            );
          })}
          {tasks.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">
                No tasks found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Calendar View Component
function CalendarView({ tasks, onEdit }: { tasks: MotionTask[]; onEdit: (task: MotionTask) => void }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const days = useMemo(() => {
    const result: (number | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) result.push(null);
    for (let i = 1; i <= daysInMonth; i++) result.push(i);
    return result;
  }, [daysInMonth, firstDayOfMonth]);

  const tasksByDay = useMemo(() => {
    const map: Record<number, MotionTask[]> = {};
    tasks.forEach((task) => {
      if (task.due_date) {
        const date = new Date(task.due_date);
        if (date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()) {
          const day = date.getDate();
          if (!map[day]) map[day] = [];
          map[day].push(task);
        }
      }
    });
    return map;
  }, [tasks, currentDate]);

  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h3 className="text-lg font-bold text-slate-900">{monthName}</h3>
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="p-2 text-center text-xs font-semibold text-slate-500">
            {day}
          </div>
        ))}
        {days.map((day, idx) => {
          const dayTasks = day ? tasksByDay[day] || [] : [];
          const isToday =
            day === new Date().getDate() &&
            currentDate.getMonth() === new Date().getMonth() &&
            currentDate.getFullYear() === new Date().getFullYear();

          return (
            <div
              key={idx}
              className={`min-h-[80px] rounded-lg border p-1 ${
                day ? "border-slate-200 bg-white" : "border-transparent"
              } ${isToday ? "ring-2 ring-fuchsia-500" : ""}`}
            >
              {day && (
                <>
                  <span className={`block text-xs font-medium ${isToday ? "text-fuchsia-600" : "text-slate-600"}`}>
                    {day}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <button
                        key={task.id}
                        onClick={() => onEdit(task)}
                        className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] ${STATUS_CONFIG[task.status]?.bgColor || "bg-slate-100"} ${STATUS_CONFIG[task.status]?.color || "text-slate-600"}`}
                      >
                        {task.title}
                      </button>
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="block text-[10px] text-slate-400">+{dayTasks.length - 3} more</span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Timeline View Component
function TimelineView({ tasks, onEdit }: { tasks: MotionTask[]; onEdit: (task: MotionTask) => void }) {
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return dateA - dateB;
    });
  }, [tasks]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-slate-900">Timeline</h3>
      <div className="relative space-y-4 pl-8">
        <div className="absolute left-3 top-0 h-full w-0.5 bg-gradient-to-b from-fuchsia-500 to-purple-500" />
        {sortedTasks.map((task) => {
          const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
          return (
            <div key={task.id} className="relative">
              <div className={`absolute -left-5 top-2 h-4 w-4 rounded-full border-2 border-white shadow-sm ${statusCfg.bgColor}`}>
                <div className={`h-full w-full rounded-full ${task.status === "completed" ? "bg-emerald-500" : "bg-slate-300"}`} />
              </div>
              <button
                onClick={() => onEdit(task)}
                className="block w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-fuchsia-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="mb-1 block text-[10px] font-mono text-slate-400">{task.task_id}</span>
                    <h4 className="font-semibold text-slate-900">{task.title}</h4>
                    {task.description && (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-1">{task.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusCfg.bgColor} ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                    {task.due_date && (
                      <p className="mt-1 text-xs text-slate-500">{formatDate(task.due_date)}</p>
                    )}
                  </div>
                </div>
              </button>
            </div>
          );
        })}
        {sortedTasks.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">No tasks to display</p>
        )}
      </div>
    </div>
  );
}

// Task Modal Component
function TaskModal({
  isEdit,
  formTitle,
  setFormTitle,
  formDescription,
  setFormDescription,
  formStatus,
  setFormStatus,
  formPriority,
  setFormPriority,
  formDueDate,
  setFormDueDate,
  formAssigneeId,
  setFormAssigneeId,
  formProjectId,
  setFormProjectId,
  users,
  projects,
  formSaving,
  formError,
  onSave,
  onClose,
  onDelete,
}: {
  isEdit: boolean;
  formTitle: string;
  setFormTitle: (v: string) => void;
  formDescription: string;
  setFormDescription: (v: string) => void;
  formStatus: string;
  setFormStatus: (v: string) => void;
  formPriority: string;
  setFormPriority: (v: string) => void;
  formDueDate: string;
  setFormDueDate: (v: string) => void;
  formAssigneeId: string;
  setFormAssigneeId: (v: string) => void;
  formProjectId: string;
  setFormProjectId: (v: string) => void;
  users: UserSummary[];
  projects: ProjectOption[];
  formSaving: boolean;
  formError: string | null;
  onSave: () => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/50 bg-white shadow-2xl">
        {/* Header */}
        <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-violet-500 px-6 py-5">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                  <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white">{isEdit ? "Edit Task" : "New Task"}</h2>
            </div>
            <button onClick={onClose} className="rounded-lg bg-white/20 p-2 text-white hover:bg-white/30">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Title *</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Enter task title..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-black focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Description</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                placeholder="Add a description..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-black focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-black focus:border-fuchsia-500 focus:outline-none"
                >
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Priority</label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-black focus:border-fuchsia-500 focus:outline-none"
                >
                  {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Due Date</label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-black focus:border-fuchsia-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Assignee</label>
                <select
                  value={formAssigneeId}
                  onChange={(e) => setFormAssigneeId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-black focus:border-fuchsia-500 focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Project</label>
              <select
                value={formProjectId}
                onChange={(e) => setFormProjectId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-black focus:border-fuchsia-500 focus:outline-none"
              >
                <option value="">No Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.company_name ? ` (${p.company_name})` : ""}</option>
                ))}
              </select>
            </div>

            {formError && (
              <p className="rounded-lg bg-red-50 px-4 py-2 text-xs text-red-600">{formError}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            {isEdit && onDelete && (
              <button
                onClick={onDelete}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={formSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 hover:shadow-xl disabled:opacity-60"
            >
              {formSaving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                  {isEdit ? "Update Task" : "Create Task"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
