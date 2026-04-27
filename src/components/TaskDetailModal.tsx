"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabaseClient } from "@/lib/supabaseClient";
import { useUserRole } from "@/app/profile/hooks/useUserRole";

type TaskStatus = "not_started" | "in_progress" | "completed";
type TaskPriority = "low" | "medium" | "high";

interface TaskChecklistItem {
  id: string;
  task_id: string;
  label: string;
  is_completed: boolean;
  sort_order: number;
}

interface TaskComment {
  id: string;
  task_id: string;
  body: string;
  author_name: string | null;
  created_at: string;
}

interface TaskHistoryEntry {
  id: string;
  task_id: string;
  action_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by_name: string | null;
  created_at: string;
}

interface TaskDetailModalProps {
  taskId: string;
  onClose: () => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  onSave?: () => void;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" });
}

function taskStatusPillClasses(status: TaskStatus): string {
  if (status === "completed") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "in_progress") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-700 border-red-200";
}

function formatTaskStatusLabel(status: TaskStatus | null): string {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In progress";
  return "Not started";
}

// Convert URLs in text to clickable links
function linkifyText(text: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^\[\]`]+)/gi;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      // Reset regex lastIndex
      urlRegex.lastIndex = 0;
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-600 hover:text-sky-700 underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export default function TaskDetailModal({ taskId, onClose, onStatusChange, onSave }: TaskDetailModalProps) {
  const { role } = useUserRole();
  const isAdmin = role === "admin";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("low");
  const [editActivityDate, setEditActivityDate] = useState("");
  const [editAssignedUserName, setEditAssignedUserName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Checklist editing state
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistLabel, setEditingChecklistLabel] = useState("");
  
  // History state
  const [history, setHistory] = useState<TaskHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    async function loadTask() {
      try {
        setLoading(true);
        const [taskRes, checklistRes, commentsRes, historyRes] = await Promise.all([
          supabaseClient
            .from("tasks")
            .select("id, project_id, patient_id, name, content, status, priority, type, activity_date, created_at, updated_at, created_by_name, assigned_user_id, assigned_user_name, updated_by_name, updated_by_user_id, patient:patients(id, first_name, last_name, email, phone), project:projects(id, name)")
            .eq("id", taskId)
            .single(),
          supabaseClient
            .from("task_checklist_items")
            .select("id, task_id, label, is_completed, sort_order")
            .eq("task_id", taskId)
            .order("sort_order", { ascending: true }),
          supabaseClient
            .from("task_comments")
            .select("id, task_id, body, author_name, created_at")
            .eq("task_id", taskId)
            .order("created_at", { ascending: true }),
          supabaseClient
            .from("task_history")
            .select("id, task_id, action_type, field_name, old_value, new_value, changed_by_name, created_at")
            .eq("task_id", taskId)
            .order("created_at", { ascending: false }),
        ]);

        if (!taskRes.error && taskRes.data) {
          let taskData = taskRes.data;
          // If assigned_user_name is missing but assigned_user_id exists, resolve from users table
          if (!taskData.assigned_user_name && taskData.assigned_user_id) {
            const { data: userRow } = await supabaseClient
              .from("users")
              .select("full_name")
              .eq("id", taskData.assigned_user_id)
              .single();
            if (userRow?.full_name) {
              taskData = { ...taskData, assigned_user_name: userRow.full_name };
              // Backfill the DB so future loads are instant
              supabaseClient
                .from("tasks")
                .update({ assigned_user_name: userRow.full_name })
                .eq("id", taskData.id)
                .then(() => {});
            }
          }
          setTask(taskData);
          setEditName(taskData.name || "");
          setEditContent(taskData.content || "");
          setEditPriority(taskData.priority || "low");
          setEditActivityDate(taskData.activity_date || "");
          setEditAssignedUserName(taskData.assigned_user_name || "");
        }
        if (!checklistRes.error && checklistRes.data) {
          setChecklist(checklistRes.data as TaskChecklistItem[]);
        }
        if (!commentsRes.error && commentsRes.data) {
          setComments(commentsRes.data as TaskComment[]);
        }
        if (!historyRes.error && historyRes.data) {
          setHistory(historyRes.data as TaskHistoryEntry[]);
        }
      } catch (err) {
        console.error("Error loading task:", err);
      } finally {
        setLoading(false);
        setCommentsLoading(false);
        setHistoryLoading(false);
      }
    }

    loadTask();
  }, [taskId]);

  // Helper to get current user info
  async function getCurrentUser() {
    const { data: authData } = await supabaseClient.auth.getUser();
    const authUser = authData?.user;
    if (!authUser) return null;
    const meta = (authUser.user_metadata || {}) as Record<string, unknown>;
    const first = (meta["first_name"] as string) || "";
    const last = (meta["last_name"] as string) || "";
    const name = [first, last].filter(Boolean).join(" ") || authUser.email || "Unknown";
    return { id: authUser.id, name };
  }

  // Helper to log history
  async function logHistory(actionType: string, fieldName: string | null, oldValue: string | null, newValue: string | null) {
    const user = await getCurrentUser();
    if (!user) return;
    
    const { data } = await supabaseClient
      .from("task_history")
      .insert({
        task_id: taskId,
        action_type: actionType,
        field_name: fieldName,
        old_value: oldValue,
        new_value: newValue,
        changed_by_user_id: user.id,
        changed_by_name: user.name,
      })
      .select()
      .single();
    
    if (data) {
      setHistory((prev) => [data as TaskHistoryEntry, ...prev]);
    }
  }

  async function handleToggleChecklistItem(item: TaskChecklistItem) {
    const nextCompleted = !item.is_completed;
    try {
      await supabaseClient
        .from("task_checklist_items")
        .update({ is_completed: nextCompleted })
        .eq("id", item.id);

      setChecklist((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, is_completed: nextCompleted } : row))
      );
      
      await logHistory("checklist_toggled", item.label, item.is_completed ? "completed" : "incomplete", nextCompleted ? "completed" : "incomplete");
    } catch {}
  }

  async function handleAddChecklistItem() {
    if (!newChecklistItem.trim()) return;
    
    const user = await getCurrentUser();
    if (!user) return;
    
    const { data, error } = await supabaseClient
      .from("task_checklist_items")
      .insert({
        task_id: taskId,
        label: newChecklistItem.trim(),
        is_completed: false,
        sort_order: checklist.length,
      })
      .select()
      .single();
    
    if (!error && data) {
      setChecklist((prev) => [...prev, data as TaskChecklistItem]);
      setNewChecklistItem("");
      await logHistory("checklist_added", null, null, newChecklistItem.trim());
    }
  }

  async function handleUpdateChecklistItem(itemId: string, newLabel: string) {
    const item = checklist.find((i) => i.id === itemId);
    if (!item || !newLabel.trim()) return;
    
    const { error } = await supabaseClient
      .from("task_checklist_items")
      .update({ label: newLabel.trim() })
      .eq("id", itemId);
    
    if (!error) {
      setChecklist((prev) =>
        prev.map((row) => (row.id === itemId ? { ...row, label: newLabel.trim() } : row))
      );
      setEditingChecklistId(null);
      setEditingChecklistLabel("");
      await logHistory("checklist_updated", "label", item.label, newLabel.trim());
    }
  }

  async function handleDeleteChecklistItem(item: TaskChecklistItem) {
    const { error } = await supabaseClient
      .from("task_checklist_items")
      .delete()
      .eq("id", item.id);
    
    if (!error) {
      setChecklist((prev) => prev.filter((row) => row.id !== item.id));
      await logHistory("checklist_deleted", null, item.label, null);
    }
  }

  async function handleChangeStatus(status: TaskStatus) {
    setStatusDropdownOpen(false);
    if (!task || task.status === status) return;
    
    const oldStatus = task.status;

    try {
      const { error } = await supabaseClient
        .from("tasks")
        .update({ status })
        .eq("id", taskId);

      if (!error) {
        setTask((prev: any) => ({ ...prev, status }));
        onStatusChange?.(taskId, status);
        await logHistory("status_changed", "status", oldStatus, status);
      }
    } catch {}
  }

  async function handleSaveTask() {
    if (!editName.trim()) return;
    
    try {
      setSaving(true);
      setSaveError(null);

      // Get current user for tracking who edited
      const { data: authData } = await supabaseClient.auth.getUser();
      const authUser = authData?.user;
      if (!authUser) {
        setSaveError("You must be logged in to edit tasks");
        setSaving(false);
        return;
      }

      const meta = (authUser.user_metadata || {}) as Record<string, unknown>;
      const first = (meta["first_name"] as string) || "";
      const last = (meta["last_name"] as string) || "";
      const editorName = [first, last].filter(Boolean).join(" ") || authUser.email || "Unknown";
      const now = new Date().toISOString();

      const { data, error } = await supabaseClient
        .from("tasks")
        .update({
          name: editName.trim(),
          content: editContent.trim() || null,
          priority: editPriority,
          activity_date: editActivityDate || null,
          assigned_user_name: editAssignedUserName.trim() || null,
          updated_at: now,
          updated_by_user_id: authUser.id,
          updated_by_name: editorName,
        })
        .eq("id", taskId)
        .select()
        .single();

      if (error) {
        console.error("Error saving task:", error);
        setSaveError(error.message || "Failed to save task. Please try again.");
        return;
      }

      if (data) {
        // Log history for changed fields
        const changes: { field: string; oldVal: string | null; newVal: string | null }[] = [];
        if (task.name !== editName.trim()) {
          changes.push({ field: "name", oldVal: task.name, newVal: editName.trim() });
        }
        if ((task.content || "") !== (editContent.trim() || "")) {
          changes.push({ field: "description", oldVal: task.content || "", newVal: editContent.trim() || "" });
        }
        if (task.priority !== editPriority) {
          changes.push({ field: "priority", oldVal: task.priority, newVal: editPriority });
        }
        if ((task.activity_date || "") !== (editActivityDate || "")) {
          changes.push({ field: "due_date", oldVal: task.activity_date || "", newVal: editActivityDate || "" });
        }
        if ((task.assigned_user_name || "") !== (editAssignedUserName.trim() || "")) {
          changes.push({ field: "assigned_to", oldVal: task.assigned_user_name || "", newVal: editAssignedUserName.trim() || "" });
        }

        // Log each change to history
        for (const change of changes) {
          await logHistory("updated", change.field, change.oldVal, change.newVal);
        }

        setTask((prev: any) => ({
          ...prev,
          name: editName.trim(),
          content: editContent.trim() || null,
          priority: editPriority,
          activity_date: editActivityDate || null,
          assigned_user_name: editAssignedUserName.trim() || null,
          updated_at: now,
          updated_by_user_id: authUser.id,
          updated_by_name: editorName,
        }));
        setIsEditMode(false);
        
        // Notify parent to refresh task list
        onSave?.();
      }
    } catch (err) {
      console.error("Error saving task:", err);
      setSaveError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    setEditName(task.name || "");
    setEditContent(task.content || "");
    setEditPriority(task.priority || "low");
    setEditActivityDate(task.activity_date || "");
    setEditAssignedUserName(task.assigned_user_name || "");
    setIsEditMode(false);
    setSaveError(null);
  }

  async function handleSubmitComment() {
    if (!newComment.trim()) return;

    try {
      setCommentSaving(true);
      const { data: authData } = await supabaseClient.auth.getUser();
      const authUser = authData?.user;
      if (!authUser) return;

      const meta = (authUser.user_metadata || {}) as Record<string, unknown>;
      const first = (meta["first_name"] as string) || "";
      const last = (meta["last_name"] as string) || "";
      const fullName = [first, last].filter(Boolean).join(" ") || authUser.email || null;

      const { data, error } = await supabaseClient
        .from("task_comments")
        .insert({
          task_id: taskId,
          author_user_id: authUser.id,
          author_name: fullName,
          body: newComment.trim(),
        })
        .select("id, task_id, body, author_name, created_at")
        .single();

      if (!error && data) {
        setComments((prev) => [...prev, data as TaskComment]);
        setNewComment("");
      }
    } catch {} finally {
      setCommentSaving(false);
    }
  }

  if (!mounted) return null;

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-2xl">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
          <span className="text-sm text-slate-600">Loading task...</span>
        </div>
      </div>,
      document.body
    );
  }

  if (!task) {
    return createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
        <div className="rounded-2xl bg-white p-6 shadow-2xl">
          <p className="text-sm text-slate-600">Task not found</p>
          <button onClick={onClose} className="mt-4 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
            Close
          </button>
        </div>
      </div>,
      document.body
    );
  }

  const patient = task.patient as { first_name?: string; last_name?: string; email?: string; phone?: string } | null;
  const patientName = patient ? `${patient.first_name || ""} ${patient.last_name || ""}`.trim() : null;
  const project = task.project as { id: string; name: string } | null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center px-0 sm:px-4 py-0 sm:py-6">
      <button type="button" className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-xl max-h-[95vh] sm:max-h-[85vh] overflow-hidden rounded-t-2xl sm:rounded-2xl border-0 sm:border border-slate-200/50 bg-white shadow-2xl safe-area-inset-bottom">
        {/* Header with gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-5">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-white/10 blur-xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
                <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white line-clamp-1">{task.name}</h3>
                <p className="text-[11px] text-white/80">
                  Created by {task.created_by_name || "Unknown"}
                  {project && <span> • {project.name}</span>}
                </p>
                {task.updated_by_name && (
                  <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-1 shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-300 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-400"></span>
                    </span>
                    <span className="text-[10px] font-medium text-white">
                      ✨ Freshly updated by {task.updated_by_name}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditMode && (
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-white/20 px-3 text-white backdrop-blur-sm transition-all hover:bg-white/30"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  <span className="text-xs font-medium">Edit</span>
                </button>
              )}
              <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-sm transition-all hover:bg-white/30">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {isEditMode ? (
            <>
              {/* Edit Mode */}
              <div className="mb-4 space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Task Name *</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Task name"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Task description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Due Date</label>
                    <input
                      type="date"
                      value={editActivityDate}
                      onChange={(e) => setEditActivityDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Priority</label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned To</label>
                  <input
                    type="text"
                    value={editAssignedUserName}
                    onChange={(e) => setEditAssignedUserName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Assignee name"
                  />
                </div>
                {saveError && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    <div className="flex items-start gap-2">
                      <svg className="h-4 w-4 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4M12 16h.01" />
                      </svg>
                      <span>{saveError}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveTask}
                    disabled={saving || !editName.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* View Mode */}
              {task.content && (
                <div className="mb-4 rounded-xl bg-slate-50 p-4">
                  <p className="text-[12px] text-slate-700 leading-relaxed whitespace-pre-wrap">{linkifyText(task.content)}</p>
                </div>
              )}

              {/* Info Cards */}
              <div className="mb-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Due Date</p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-800">{formatDate(task.activity_date ?? task.created_at)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Priority</p>
                  <p className={`mt-1 text-[13px] font-semibold ${task.priority === "high" ? "text-red-600" : task.priority === "medium" ? "text-amber-600" : "text-slate-600"}`}>
                    {(task.priority as string).charAt(0).toUpperCase() + (task.priority as string).slice(1)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Assigned To</p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-800">{task.assigned_user_name || "Unassigned"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Status</p>
                  <div className="relative mt-1">
                    <button
                      type="button"
                      onClick={() => setStatusDropdownOpen((prev) => !prev)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold shadow-sm transition-all hover:scale-105 ${taskStatusPillClasses(task.status)}`}
                    >
                      {formatTaskStatusLabel(task.status)}
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {statusDropdownOpen && (
                      <div className="absolute left-0 top-full z-20 mt-2 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                        {(["not_started", "in_progress", "completed"] as TaskStatus[]).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleChangeStatus(s)}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[11px] font-medium text-slate-700 transition-all hover:bg-slate-50"
                          >
                            <span className={`h-2 w-2 rounded-full ${s === "completed" ? "bg-emerald-500" : s === "in_progress" ? "bg-amber-500" : "bg-red-400"}`} />
                            {formatTaskStatusLabel(s)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Patient Info if exists */}
          {patientName && (
            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Patient</p>
              <p className="mt-1 text-[13px] font-semibold text-slate-800">
                {patientName}
                {(patient?.email || patient?.phone) && (
                  <span className="ml-2 text-[11px] font-normal text-slate-500">{patient.email || patient.phone}</span>
                )}
              </p>
            </div>
          )}

          {/* Checklist */}
          <div className="mb-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <span className="text-[12px] font-bold text-slate-800">Checklist</span>
              {checklist.length > 0 && (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                  {checklist.filter((i) => i.is_completed).length}/{checklist.length}
                </span>
              )}
            </div>
            
            {/* Add new checklist item */}
            <div className="mb-3 flex items-center gap-2">
              <input
                type="text"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddChecklistItem()}
                placeholder="Add a checklist item..."
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                disabled={!newChecklistItem.trim()}
                className="rounded-lg bg-violet-100 px-3 py-2 text-[11px] font-semibold text-violet-700 hover:bg-violet-200 disabled:opacity-50 transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>

            {checklist.length > 0 ? (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                {checklist.map((item) => (
                  <div key={item.id} className="group flex items-center gap-2 rounded-lg p-2 transition-all hover:bg-white">
                    {editingChecklistId === item.id ? (
                      <>
                        <input
                          type="text"
                          value={editingChecklistLabel}
                          onChange={(e) => setEditingChecklistLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateChecklistItem(item.id, editingChecklistLabel);
                            if (e.key === "Escape") { setEditingChecklistId(null); setEditingChecklistLabel(""); }
                          }}
                          autoFocus
                          className="flex-1 rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-[12px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateChecklistItem(item.id, editingChecklistLabel)}
                          className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7" /></svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditingChecklistId(null); setEditingChecklistLabel(""); }}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleToggleChecklistItem(item)}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${item.is_completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white hover:border-emerald-400"}`}
                        >
                          {item.is_completed && (
                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                        <span className={`flex-1 text-[12px] ${item.is_completed ? "text-slate-400 line-through" : "text-slate-700"}`}>{item.label}</span>
                        <button
                          type="button"
                          onClick={() => { setEditingChecklistId(item.id); setEditingChecklistLabel(item.label); }}
                          className="rounded p-1 text-slate-400 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteChecklistItem(item)}
                          className="rounded p-1 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-[11px] text-slate-400">No checklist items yet. Add one above!</p>
            )}
          </div>

          {/* Comments Section */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <span className="text-[12px] font-bold text-slate-800">Comments</span>
              {comments.length > 0 && (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">{comments.length}</span>
              )}
            </div>

            {commentsLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" />
              </div>
            ) : comments.length === 0 ? (
              <p className="mb-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-[11px] text-slate-400">No comments yet. Be the first to comment!</p>
            ) : (
              <div className="mb-4 max-h-48 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded-lg bg-white p-3 shadow-sm">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-[10px] font-bold text-white shadow-sm">
                        {(comment.author_name || "U")[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-slate-800">{comment.author_name || "Unknown"}</span>
                        <span className="ml-2 text-[10px] text-slate-400">{formatDate(comment.created_at)}</span>
                      </div>
                    </div>
                    <p className="pl-9 text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap">{linkifyText(comment.body)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add Comment */}
            <div className="space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                rows={2}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[12px] text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={handleSubmitComment}
                disabled={commentSaving || !newComment.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-[11px] font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:shadow-xl hover:shadow-sky-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {commentSaving ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Posting...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 2L11 13" />
                      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                    Post Comment
                  </>
                )}
              </button>
            </div>
          </div>

          {/* History Section */}
          <div className="mt-5 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="mb-3 flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 transition-colors hover:bg-slate-100"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <span className="text-[12px] font-bold text-slate-800">Change History</span>
                {history.length > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{history.length}</span>
                )}
              </div>
              <svg className={`h-4 w-4 text-slate-400 transition-transform ${showHistory ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showHistory && (
              <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-200 border-t-amber-600" />
                  </div>
                ) : history.length === 0 ? (
                  <p className="p-4 text-center text-[11px] text-slate-400">No changes recorded yet</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {history.map((entry) => (
                      <div key={entry.id} className="p-3">
                        <div className="flex items-start gap-2">
                          <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold ${
                            entry.action_type === "status_changed" ? "bg-blue-500" :
                            entry.action_type === "updated" ? "bg-emerald-500" :
                            entry.action_type.startsWith("checklist") ? "bg-violet-500" :
                            "bg-slate-400"
                          }`}>
                            {(entry.changed_by_name || "U")[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-slate-700">
                              <span className="font-semibold text-slate-900">{entry.changed_by_name || "Unknown"}</span>
                              {" "}
                              {entry.action_type === "status_changed" && (
                                <>changed status from <span className="font-medium">{entry.old_value}</span> to <span className="font-medium text-emerald-600">{entry.new_value}</span></>
                              )}
                              {entry.action_type === "updated" && (
                                <>updated <span className="font-medium">{entry.field_name?.replace(/_/g, " ")}</span>{entry.old_value && entry.new_value ? <> from &quot;{entry.old_value?.slice(0, 50)}{(entry.old_value?.length || 0) > 50 ? "..." : ""}&quot; to &quot;{entry.new_value?.slice(0, 50)}{(entry.new_value?.length || 0) > 50 ? "..." : ""}&quot;</> : ""}</>
                              )}
                              {entry.action_type === "checklist_added" && (
                                <>added checklist item &quot;<span className="font-medium">{entry.new_value}</span>&quot;</>
                              )}
                              {entry.action_type === "checklist_updated" && (
                                <>updated checklist item from &quot;{entry.old_value}&quot; to &quot;<span className="font-medium">{entry.new_value}</span>&quot;</>
                              )}
                              {entry.action_type === "checklist_deleted" && (
                                <>deleted checklist item &quot;<span className="font-medium text-red-600">{entry.old_value}</span>&quot;</>
                              )}
                              {entry.action_type === "checklist_toggled" && (
                                <>marked &quot;{entry.field_name}&quot; as <span className={`font-medium ${entry.new_value === "completed" ? "text-emerald-600" : "text-amber-600"}`}>{entry.new_value}</span></>
                              )}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {new Date(entry.created_at).toLocaleString("en-AE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
