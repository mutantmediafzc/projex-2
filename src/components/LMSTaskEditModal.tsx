"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { supabaseClient } from "@/lib/supabaseClient";

type TaskStatus = "not_started" | "in_progress" | "completed";
type TaskPriority = "low" | "medium" | "high";

type LMSUser = {
  id: string;
  full_name: string | null;
  email: string;
};

type LMSTask = {
  id: string;
  name: string;
  content: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: string;
  activity_date: string | null;
  assigned_user_id: string | null;
};

type LMSTaskEditModalProps = {
  task: LMSTask;
  users: LMSUser[];
  onClose: () => void;
  onSave: () => Promise<void> | void;
};

const TASK_TYPES = [
  ["todo", "To do"],
  ["email", "Email"],
  ["call", "Call"],
  ["whatsapp", "WhatsApp"],
  ["online_meeting", "Online Meeting"],
  ["in_person_meeting", "In-person Meeting"],
  ["lunch", "Lunch"],
  ["deadline", "Deadline"],
] as const;

function activityDateParts(value: string | null) {
  if (!value) return { date: "", time: "10:00" };
  const activityDate = new Date(value);
  if (Number.isNaN(activityDate.getTime())) {
    return { date: "", time: "10:00" };
  }
  const year = activityDate.getFullYear();
  const month = String(activityDate.getMonth() + 1).padStart(2, "0");
  const day = String(activityDate.getDate()).padStart(2, "0");
  const hours = String(activityDate.getHours()).padStart(2, "0");
  const minutes = String(activityDate.getMinutes()).padStart(2, "0");
  return { date: `${year}-${month}-${day}`, time: `${hours}:${minutes}` };
}

export default function LMSTaskEditModal({
  task,
  users,
  onClose,
  onSave,
}: LMSTaskEditModalProps) {
  const due = activityDateParts(task.activity_date);
  const [mounted, setMounted] = useState(false);
  const [taskType, setTaskType] = useState(task.type);
  const [status, setStatus] = useState<"in_progress" | "completed">(
    task.status === "completed" ? "completed" : "in_progress",
  );
  const [name, setName] = useState(task.name);
  const [assigneeId, setAssigneeId] = useState(task.assigned_user_id || "");
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(due.date);
  const [dueTime, setDueTime] = useState(due.time);
  const [notes, setNotes] = useState(task.content || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Task name is required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const authUser = authData.user;
      if (!authUser) throw new Error("You need to be signed in.");

      const metadata = authUser.user_metadata as Record<string, unknown>;
      const editorName =
        [metadata.first_name, metadata.last_name]
          .filter((value): value is string => typeof value === "string" && Boolean(value))
          .join(" ") ||
        authUser.email ||
        "Unknown";
      const assignee = users.find((user) => user.id === assigneeId);
      const assignedUserName = assignee?.full_name || assignee?.email || null;
      const activityDate = dueDate
        ? new Date(`${dueDate}T${dueTime || "10:00"}:00`).toISOString()
        : null;

      const { error: updateError } = await supabaseClient
        .from("tasks")
        .update({
          name: name.trim(),
          content: notes.trim() || null,
          type: taskType,
          status,
          priority,
          activity_date: activityDate,
          assigned_user_id: assigneeId || null,
          assigned_user_name: assignedUserName,
          updated_at: new Date().toISOString(),
          updated_by_user_id: authUser.id,
          updated_by_name: editorName,
        })
        .eq("id", task.id);

      if (updateError) throw updateError;
      await onSave();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save task.");
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  const fieldClassName =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lms-edit-task-title"
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id="lms-edit-task-title" className="text-lg font-bold text-slate-900">
            Edit task
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit task"
            className="rounded-lg px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        <form onSubmit={saveTask} className="space-y-3 bg-slate-50 p-4 sm:p-5">
          <label className="block text-xs font-semibold text-slate-900">
            Task type
            <select value={taskType} onChange={(event) => setTaskType(event.target.value)} className={fieldClassName}>
              {TASK_TYPES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-900">
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value as "in_progress" | "completed")} className={fieldClassName}>
              <option value="in_progress">Active</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-900">
            Name
            <input required value={name} onChange={(event) => setName(event.target.value)} className={fieldClassName} />
          </label>
          <label className="block text-xs font-semibold text-slate-900">
            Assign to
            <select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} className={fieldClassName}>
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.full_name || user.email}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-900">
            Priority
            <select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)} className={fieldClassName}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input aria-label="Due date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={fieldClassName} />
            <input aria-label="Due time" type="time" value={dueTime} onChange={(event) => setDueTime(event.target.value)} className={fieldClassName} />
          </div>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Notes" aria-label="Notes" className={fieldClassName} />
          {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
          <button disabled={saving} className="w-full rounded-lg bg-violet-600 p-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
            {saving ? "Saving…" : "Save task"}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
