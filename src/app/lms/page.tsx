"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import TaskDetailModal from "@/components/TaskDetailModal";
import { supabaseClient } from "@/lib/supabaseClient";

const COLUMNS = [
  ["campaign_leads", "Campaign Leads"],
  ["outreach", "Outreach"],
  ["audit", "Audit"],
  ["qualified", "Qualified"],
  ["call_booked", "Call Booked / Meeting Set"],
  ["proposal_sent", "Proposal Sent"],
  ["for_invoicing", "For Invoicing"],
  ["won", "Won"],
  ["lost", "Lost"],
] as const;
type LeadStatus = (typeof COLUMNS)[number][0];
type Answer = {
  id: string;
  question: string;
  answer: string | number | string[] | null;
};
type CRMUser = { id: string; full_name: string | null; email: string };
type CRMContact = {
  id: string;
  company_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
};
type CRMCompany = { id: string; name: string };
type History = {
  id: string;
  submission_id: string;
  from_status: LeadStatus | null;
  to_status: LeadStatus;
  event_type?: string;
  assigned_user_name?: string | null;
  changed_by_email: string | null;
  changed_at: string;
};
type TaskHistory = {
  id: string;
  task_id: string;
  action_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by_name: string | null;
  created_at: string;
};
type LeadTask = {
  id: string;
  lead_submission_id: string;
  name: string;
  content: string | null;
  status: "not_started" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  type: string;
  activity_date: string | null;
  reminder_enabled: boolean;
  created_at: string;
  created_by_name: string | null;
  assigned_user_id: string | null;
  assigned_user_name: string | null;
  history: TaskHistory[];
};
type ContactDetails = {
  name: string;
  email: string;
  phone: string;
  website: string;
};
type Lead = {
  id: string;
  form_slug: "mm26-aeo" | "mm26-pm" | "manual";
  website: string;
  email: string;
  questionnaire: Answer[];
  created_at: string;
  lead_status: LeadStatus;
  assigned_user_id: string | null;
  status_history: History[];
  tasks: LeadTask[];
  lead_name: string | null;
  contact_id: string | null;
  company_id: string | null;
  pipeline: string;
  amount: number;
  close_date: string | null;
  contact?: ContactDetails;
};

const taskLabels: Record<string, string> = {
  todo: "To do",
  email: "Email",
  call: "Call",
  whatsapp: "WhatsApp",
  online_meeting: "Online Meeting",
  in_person_meeting: "In-person Meeting",
  lunch: "Lunch",
  deadline: "Deadline",
};
const statusLabel = (status: LeadStatus | null) =>
  COLUMNS.find(([value]) => value === status)?.[1] || "Campaign Leads";
const textAnswer = (lead: Lead, ids: string[], match: string) => {
  const item = lead.questionnaire.find(
    (entry) =>
      ids.includes(entry.id) || entry.question.toLowerCase().includes(match),
  );
  return Array.isArray(item?.answer)
    ? item.answer.join(", ")
    : item?.answer == null
      ? ""
      : String(item.answer);
};
const isContactAnswer = (item: Answer) =>
  [
    "firstName",
    "lastName",
    "fullName",
    "email",
    "phoneCountryCode",
    "countryCode",
    "mobile",
    "mobileNumber",
    "phone",
    "phoneNumber",
  ].includes(item.id) ||
  /first name|last name|full name|email|country calling code|mobile number|phone/i.test(
    item.question,
  );
function getContact(lead: Lead): ContactDetails {
  if (lead.contact) return lead.contact;
  const first = textAnswer(lead, ["firstName"], "first name");
  const last = textAnswer(lead, ["lastName"], "last name");
  const code = textAnswer(
    lead,
    ["phoneCountryCode", "countryCode"],
    "country calling code",
  );
  const mobile = textAnswer(
    lead,
    ["mobile", "mobileNumber", "phone", "phoneNumber"],
    "mobile number",
  );
  return {
    name:
      textAnswer(lead, ["fullName"], "full name") ||
      [first, last].filter(Boolean).join(" "),
    email: textAnswer(lead, ["email"], "email") || lead.email,
    phone: [code, mobile].filter(Boolean).join(" "),
    website: lead.website,
  };
}
function leadName(lead: Lead) {
  return lead.lead_name || getContact(lead).name || lead.email;
}
function pipelineLabel(lead: Lead) {
  if (lead.form_slug === "mm26-aeo") return "AEO";
  if (lead.form_slug === "mm26-pm") return "Performance Marketing";
  return lead.pipeline || "Mutant Leads";
}
function formatAmount(amount: number) {
  return `AED ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
function relativeDue(date: string | null) {
  if (!date) return "No due date";
  const dueDate = new Date(date);
  if (Number.isNaN(dueDate.getTime())) return "No due date";
  const today = new Date();
  const dueDay = Date.UTC(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate(),
  );
  const currentDay = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const days = Math.round((dueDay - currentDay) / 86400000);
  if (days === 0) return "due today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 1) return `in ${days} days`;
  return `${Math.abs(days)} days overdue`;
}

function TaskRows({
  tasks,
  onEdit,
  onComplete,
}: {
  tasks: LeadTask[];
  onEdit: (id: string) => void;
  onComplete: (task: LeadTask) => void;
}) {
  const activeTasks = tasks.filter((task) => task.status !== "completed");
  if (!activeTasks.length) return null;
  return (
    <div className="mt-3 space-y-1 border-t border-slate-100 pt-2">
      {activeTasks.map((task) => (
        <div key={task.id} className="rounded-md px-1 py-1.5 text-[11px] text-slate-600 hover:bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-slate-700">◷</span>
            <span className="min-w-0 flex-1 truncate">
              {taskLabels[task.type] || task.type}
            </span>
            <span className="shrink-0 text-slate-400">
              {relativeDue(task.activity_date)}
            </span>
            <button
              type="button"
              title="Set as complete"
              aria-label="Set task as complete"
              onClick={(event) => {
                event.stopPropagation();
                onComplete(task);
              }}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-3.5 w-3.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
              </svg>
            </button>
            <button
              type="button"
              title="Edit task"
              aria-label="Edit task"
              onClick={(event) => {
                event.stopPropagation();
                onEdit(task.id);
              }}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-3.5 w-3.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LMSPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<CRMUser[]>([]);
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [companies, setCompanies] = useState<CRMCompany[]>([]);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [taskDetailId, setTaskDetailId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "tasks" | "history">(
    "details",
  );
  const [answersExpanded, setAnswersExpanded] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [createLeadSaving, setCreateLeadSaving] = useState(false);
  const [createLeadError, setCreateLeadError] = useState("");
  const [newLeadName, setNewLeadName] = useState("");
  const [newContactId, setNewContactId] = useState("");
  const [newContactFirstName, setNewContactFirstName] = useState("");
  const [newContactLastName, setNewContactLastName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newCompanyId, setNewCompanyId] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newOwnerId, setNewOwnerId] = useState("");
  const [newPipeline, setNewPipeline] = useState("Mutant Leads");
  const [newLeadStatus, setNewLeadStatus] =
    useState<LeadStatus>("campaign_leads");
  const [newAmount, setNewAmount] = useState("");
  const [newCloseDate, setNewCloseDate] = useState("");
  const [newCreateTask, setNewCreateTask] = useState(false);
  const boardHeaderRef = useRef<HTMLDivElement>(null);
  const boardBodyRef = useRef<HTMLDivElement>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [taskType, setTaskType] = useState("todo");
  const [taskStatus, setTaskStatus] = useState<"in_progress" | "completed">(
    "in_progress",
  );
  const [taskName, setTaskName] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskDueTime, setTaskDueTime] = useState("10:00");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">(
    "medium",
  );
  const [taskNotes, setTaskNotes] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskReminder] = useState(false);
  const authFetch = useCallback(async (url: string, init?: RequestInit) => {
    const { data } = await supabaseClient.auth.getSession();
    if (!data.session?.access_token)
      throw new Error("You need to be signed in.");
    return fetch(url, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${data.session.access_token}`,
      },
    });
  }, []);
  const loadLeads = useCallback(async () => {
    const response = await authFetch("/api/lms");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to load leads.");
    const normalized = result.leads.map((lead: Lead) => ({
      ...lead,
      contact: getContact(lead),
      questionnaire: lead.questionnaire.filter(
        (item) => !isContactAnswer(item),
      ),
    }));
    setLeads(normalized);
    setUsers(result.users);
    setContacts(result.contacts);
    setCompanies(result.companies);
    setSelected((current) =>
      current
        ? normalized.find((lead: Lead) => lead.id === current.id) || current
        : null,
    );
  }, [authFetch]);
  useEffect(() => {
    loadLeads()
      .catch((reason) =>
        setError(
          reason instanceof Error ? reason.message : "Unable to load leads.",
        ),
      )
      .finally(() => setLoading(false));
  }, [loadLeads]);
  const filteredLeads = useMemo(
    () =>
      leads.filter(
        (lead) =>
          (assigneeFilter === "all" ||
            (assigneeFilter === "unassigned"
              ? !lead.assigned_user_id
              : lead.assigned_user_id === assigneeFilter)) &&
          (sourceFilter === "all" || lead.form_slug === sourceFilter),
      ),
    [assigneeFilter, leads, sourceFilter],
  );
  const grouped = useMemo(
    () =>
      Object.fromEntries(
        COLUMNS.map(([status]) => [
          status,
          filteredLeads.filter((lead) => lead.lead_status === status),
        ]),
      ),
    [filteredLeads],
  );
  async function moveLead(id: string, status: LeadStatus) {
    const previous = leads;
    const previousSelected = selected;
    setLeads((items) =>
      items.map((lead) =>
        lead.id === id ? { ...lead, lead_status: status } : lead,
      ),
    );
    setSelected((lead) =>
      lead?.id === id ? { ...lead, lead_status: status } : lead,
    );
    setDraggedId(null);

    try {
      const response = await authFetch("/api/lms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to move lead.");
      if (result.history) {
        setLeads((items) =>
          items.map((lead) =>
            lead.id === id
              ? {
                  ...lead,
                  status_history: [result.history, ...lead.status_history],
                }
              : lead,
          ),
        );
        setSelected((lead) =>
          lead?.id === id
            ? {
                ...lead,
                status_history: [result.history, ...lead.status_history],
              }
            : lead,
        );
      }
    } catch (reason) {
      setLeads(previous);
      setSelected((lead) => (lead?.id === id ? previousSelected : lead));
      setError(
        reason instanceof Error ? reason.message : "Unable to move lead.",
      );
    }
  }
  async function assignLead(lead: Lead, assignedUserId: string | null) {
    const previous = lead.assigned_user_id;
    setLeads((items) =>
      items.map((item) =>
        item.id === lead.id
          ? { ...item, assigned_user_id: assignedUserId }
          : item,
      ),
    );
    setSelected((item) =>
      item?.id === lead.id
        ? { ...item, assigned_user_id: assignedUserId }
        : item,
    );
    try {
      const response = await authFetch("/api/lms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, assignedUserId }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to assign lead.");
      if (result.history) {
        setLeads((items) =>
          items.map((item) =>
            item.id === lead.id
              ? {
                  ...item,
                  status_history: [result.history, ...item.status_history],
                }
              : item,
          ),
        );
        setSelected((item) =>
          item?.id === lead.id
            ? {
                ...item,
                status_history: [result.history, ...item.status_history],
              }
            : item,
        );
      }
    } catch (reason) {
      setLeads((items) =>
        items.map((item) =>
          item.id === lead.id ? { ...item, assigned_user_id: previous } : item,
        ),
      );
      setSelected((item) =>
        item?.id === lead.id ? { ...item, assigned_user_id: previous } : item,
      );
      setError(
        reason instanceof Error ? reason.message : "Unable to assign lead.",
      );
    }
  }

  async function completeTask(task: LeadTask) {
    const updateTask = (lead: Lead) => ({
      ...lead,
      tasks: lead.tasks.map((item) =>
        item.id === task.id ? { ...item, status: "completed" as const } : item,
      ),
    });
    setLeads((items) => items.map((lead) => updateTask(lead)));
    setSelected((lead) => (lead ? updateTask(lead) : lead));

    const { error: completeError } = await supabaseClient
      .from("tasks")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", task.id);

    if (completeError) {
      setLeads((items) =>
        items.map((lead) => ({
          ...lead,
          tasks: lead.tasks.map((item) =>
            item.id === task.id ? task : item,
          ),
        })),
      );
      setSelected((lead) =>
        lead
          ? {
              ...lead,
              tasks: lead.tasks.map((item) =>
                item.id === task.id ? task : item,
              ),
            }
          : lead,
      );
      setError(completeError.message || "Unable to complete task.");
    }
  }
  async function updateDealDetails(
    lead: Lead,
    changes: {
      amount?: number;
      companyId?: string | null;
      closeDate?: string | null;
    },
  ) {
    try {
      const response = await authFetch("/api/lms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, ...changes }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to update deal details.");
      }
      setLeads((items) =>
        items.map((item) =>
          item.id === lead.id ? { ...item, ...result.lead } : item,
        ),
      );
      setSelected((item) =>
        item?.id === lead.id ? { ...item, ...result.lead } : item,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to update deal details.",
      );
    }
  }
  function toggleTaskForm() {
    setTaskFormOpen((open) => {
      if (!open) {
        setTaskAssigneeId(selected?.assigned_user_id || "");
        setTaskError("");
      }
      return !open;
    });
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !taskName.trim()) {
      setTaskError("Task name is required.");
      return;
    }
    setTaskSaving(true);
    setTaskError("");
    try {
      const response = await authFetch("/api/lms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selected.id,
          taskType,
          status: taskStatus,
          name: taskName,
          dueDate: taskDueDate,
          dueTime: taskDueTime,
          priority: taskPriority,
          notes: taskNotes,
          assignedUserId: taskAssigneeId || null,
          reminder: taskReminder,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to create task.");
      setTaskFormOpen(false);
      setTaskName("");
      setTaskNotes("");
      setTaskAssigneeId("");
      setTaskPriority("medium");
      await loadLeads();
    } catch (reason) {
      setTaskError(
        reason instanceof Error ? reason.message : "Unable to create task.",
      );
    } finally {
      setTaskSaving(false);
    }
  }

  async function createLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateLeadSaving(true);
    setCreateLeadError("");
    try {
      const response = await authFetch("/api/lms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_lead",
          leadName: newLeadName,
          contactId:
            newContactId && newContactId !== "__create_new__"
              ? newContactId
              : null,
          newContactFirstName:
            newContactId === "__create_new__" ? newContactFirstName : null,
          newContactLastName:
            newContactId === "__create_new__" ? newContactLastName : null,
          newContactEmail:
            newContactId === "__create_new__" ? newContactEmail : null,
          createNewContact: newContactId === "__create_new__",
          companyId:
            newCompanyId && newCompanyId !== "__create_new__"
              ? newCompanyId
              : null,
          newCompanyName:
            newCompanyId === "__create_new__" ? newCompanyName : null,
          assignedUserId: newOwnerId,
          pipeline: newPipeline,
          leadStatus: newLeadStatus,
          amount: newAmount || 0,
          closeDate: newCloseDate || null,
          createTask: newCreateTask,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to create lead.");
      setCreateLeadOpen(false);
      setNewLeadName("");
      setNewContactId("");
      setNewContactFirstName("");
      setNewContactLastName("");
      setNewContactEmail("");
      setNewCompanyId("");
      setNewCompanyName("");
      setNewOwnerId("");
      setNewPipeline("Mutant Leads");
      setNewLeadStatus("campaign_leads");
      setNewAmount("");
      setNewCloseDate("");
      setNewCreateTask(false);
      await loadLeads();
    } catch (reason) {
      setCreateLeadError(
        reason instanceof Error ? reason.message : "Unable to create lead.",
      );
    } finally {
      setCreateLeadSaving(false);
    }
  }

  return (
    <main className="min-h-full bg-slate-50 px-5 py-6 sm:px-8">
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
              Lead Management System
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Campaign Leads
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Drag a lead to update its pipeline stage.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCreateLeadError("");
                setCreateLeadOpen(true);
              }}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
            >
              + Create lead
            </button>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
              <strong className="text-slate-900">{filteredLeads.length}</strong>
              {filteredLeads.length !== leads.length
                ? ` of ${leads.length}`
                : ""}{" "}
              total leads
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Filter leads
          </span>
          <label className="text-xs font-medium text-slate-600">
            Assigned
            <select
              value={assigneeFilter}
              onChange={(event) => setAssigneeFilter(event.target.value)}
              className="ml-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
            >
              <option value="all">Everyone</option>
              <option value="unassigned">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Source
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              className="ml-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
            >
              <option value="all">All sources</option>
              <option value="mm26-aeo">AEO</option>
              <option value="mm26-pm">PM</option>
              <option value="manual">Manual</option>
            </select>
          </label>
        </div>
      </div>
      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      {loading ? (
        <div className="py-20 text-center text-sm text-slate-500">
          Loading leads…
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div
            ref={boardHeaderRef}
            onScroll={(event) => {
              if (boardBodyRef.current) {
                boardBodyRef.current.scrollLeft =
                  event.currentTarget.scrollLeft;
              }
            }}
            className="overflow-x-auto"
          >
            <div className="flex min-w-max">
              {COLUMNS.map(([status, label]) => (
                <header
                  key={status}
                  className="flex w-72 shrink-0 items-start justify-between border-r border-slate-200 bg-white px-4 py-3 last:border-r-0"
                >
                  <div>
                    <h2 className="text-sm font-semibold text-slate-700">
                      {label}
                    </h2>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Total amount{" "}
                      <span className="font-semibold text-slate-700">
                        {formatAmount(
                          grouped[status].reduce(
                            (total, lead) => total + Number(lead.amount || 0),
                            0,
                          ),
                        )}
                      </span>
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {grouped[status].length}
                  </span>
                </header>
              ))}
            </div>
          </div>
          <div
            ref={boardBodyRef}
            className="overflow-x-hidden"
            aria-label="Campaign lead columns"
          >
            <div className="flex min-w-max items-stretch">
              {COLUMNS.map(([status, label]) => (
                <section
                  key={status}
                  aria-label={label}
                  className="w-72 shrink-0 border-r border-slate-200 bg-slate-50/70 p-3 last:border-r-0"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => draggedId && moveLead(draggedId, status)}
                >
                  <div className="min-h-32 space-y-3">
                    {grouped[status].map((lead) => (
                      <div
                        key={lead.id}
                        role="button"
                        tabIndex={0}
                        draggable
                        onDragStart={() => setDraggedId(lead.id)}
                        onClick={() => {
                          setSelected(lead);
                          setActiveTab("details");
                          setAnswersExpanded(false);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelected(lead);
                            setActiveTab("details");
                            setAnswersExpanded(false);
                          }
                        }}
                        className="block w-full cursor-grab rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-violet-200"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <span className="font-semibold text-slate-900">
                            {leadName(lead)}
                          </span>
                          <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase">
                            {lead.form_slug === "manual"
                              ? "Manual"
                              : lead.form_slug.replace("mm26-", "")}
                          </span>
                        </div>
                        <p className="truncate text-xs text-slate-500">
                          {lead.email}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {lead.website}
                        </p>
                        {lead.amount > 0 && (
                          <p className="mt-2 text-xs font-semibold text-slate-700">
                            AED {Number(lead.amount).toLocaleString()}
                          </p>
                        )}
                        <TaskRows
                          tasks={lead.tasks}
                          onEdit={setTaskDetailId}
                          onComplete={completeTask}
                        />
                        {lead.assigned_user_id && (
                          <p className="mt-2 truncate text-[11px] font-medium text-violet-600">
                            Assigned to{" "}
                            {users.find(
                              (user) => user.id === lead.assigned_user_id,
                            )?.full_name ||
                              users.find(
                                (user) => user.id === lead.assigned_user_id,
                              )?.email}
                          </p>
                        )}
                        <p className="mt-3 text-[11px] text-slate-400">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
      {createLeadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setCreateLeadOpen(false)
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-lead-title"
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-lime-200 to-emerald-200 px-7 py-5">
              <h2
                id="create-lead-title"
                className="text-xl font-bold text-slate-900"
              >
                Create a lead
              </h2>
              <button
                type="button"
                onClick={() => setCreateLeadOpen(false)}
                aria-label="Close create lead form"
                className="text-2xl text-slate-600 hover:text-slate-900"
              >
                ×
              </button>
            </div>
            <form
              onSubmit={createLead}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-4 overflow-y-auto px-7 py-6">
                <label className="block text-sm font-semibold text-slate-700">
                  Associate lead to contact
                  <select
                    value={newContactId}
                    onChange={(event) => {
                      const contactId = event.target.value;
                      setNewContactId(contactId);
                      if (contactId !== "__create_new__") {
                        setNewContactFirstName("");
                        setNewContactLastName("");
                        setNewContactEmail("");
                      }
                      const contact = contacts.find(
                        (item) => item.id === contactId,
                      );
                      if (contact?.company_id)
                        setNewCompanyId(contact.company_id);
                    }}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
                  >
                    <option value="">Select a contact</option>
                    <option value="__create_new__">+ Create new contact</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {[contact.first_name, contact.last_name]
                          .filter(Boolean)
                          .join(" ") || contact.email}
                      </option>
                    ))}
                  </select>
                </label>
                {newContactId === "__create_new__" && (
                  <div className="grid gap-3 rounded-xl border border-violet-100 bg-violet-50/50 p-3 sm:grid-cols-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      First name <span className="text-rose-500">*</span>
                      <input
                        required
                        autoFocus
                        value={newContactFirstName}
                        onChange={(event) =>
                          setNewContactFirstName(event.target.value)
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
                      />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                      Last name <span className="text-rose-500">*</span>
                      <input
                        required
                        value={newContactLastName}
                        onChange={(event) =>
                          setNewContactLastName(event.target.value)
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
                      />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
                      Email
                      <input
                        type="email"
                        value={newContactEmail}
                        onChange={(event) =>
                          setNewContactEmail(event.target.value)
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
                      />
                    </label>
                    <p className="text-xs text-slate-500 sm:col-span-2">
                      Select or create a company below to save this contact.
                    </p>
                  </div>
                )}
                <label className="block text-sm font-semibold text-slate-700">
                  Associate lead to company
                  <select
                    required={newContactId === "__create_new__"}
                    value={newCompanyId}
                    onChange={(event) => {
                      setNewCompanyId(event.target.value);
                      if (event.target.value !== "__create_new__") {
                        setNewCompanyName("");
                      }
                    }}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
                  >
                    <option value="">Select a company</option>
                    <option value="__create_new__">+ Create new company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </label>
                {newCompanyId === "__create_new__" && (
                  <label className="block text-sm font-semibold text-slate-700">
                    New company name <span className="text-rose-500">*</span>
                    <input
                      required
                      autoFocus
                      value={newCompanyName}
                      onChange={(event) =>
                        setNewCompanyName(event.target.value)
                      }
                      placeholder="Enter company name"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                    />
                  </label>
                )}
                <label className="block text-sm font-semibold text-slate-700">
                  Lead name <span className="text-rose-500">*</span>
                  <input
                    required
                    value={newLeadName}
                    onChange={(event) => setNewLeadName(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Lead owner <span className="text-rose-500">*</span>
                  <select
                    required
                    value={newOwnerId}
                    onChange={(event) => setNewOwnerId(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
                  >
                    <option value="">Select an owner</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Pipeline <span className="text-rose-500">*</span>
                  <select
                    required
                    value={newPipeline}
                    onChange={(event) => setNewPipeline(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
                  >
                    <option value="Mutant Leads">Mutant Leads</option>
                    <option value="AEO">AEO</option>
                    <option value="Performance Marketing">
                      Performance Marketing
                    </option>
                  </select>
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Deal stage <span className="text-rose-500">*</span>
                  <select
                    required
                    value={newLeadStatus}
                    onChange={(event) =>
                      setNewLeadStatus(event.target.value as LeadStatus)
                    }
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
                  >
                    {COLUMNS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Amount
                  <div className="relative mt-1.5">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newAmount}
                      onChange={(event) => setNewAmount(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-14 font-normal"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                      AED
                    </span>
                  </div>
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Close date
                  <input
                    type="date"
                    value={newCloseDate}
                    onChange={(event) => setNewCloseDate(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newCreateTask}
                    onChange={(event) => setNewCreateTask(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-violet-600"
                  />
                  Create a task to follow up on this lead
                </label>
                {createLeadError && (
                  <p
                    role="alert"
                    className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
                  >
                    {createLeadError}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center justify-between border-t border-slate-200 px-7 py-4">
                <button
                  type="button"
                  onClick={() => setCreateLeadOpen(false)}
                  className="font-semibold text-violet-600"
                >
                  Cancel
                </button>
                <button
                  disabled={createLeadSaving}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {createLeadSaving ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {taskDetailId && (
        <TaskDetailModal
          taskId={taskDetailId}
          onClose={() => setTaskDetailId(null)}
          onSave={loadLeads}
        />
      )}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setSelected(null)
          }
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between p-6 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {leadName(selected)}
                </h2>
                <p className="text-sm text-slate-500">{selected.email}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-500"
              >
                Close
              </button>
            </div>
            <div className="flex border-b border-slate-200 px-6">
              {(
                [
                  ["details", "Lead details"],
                  [
                    "tasks",
                    `Tasks${selected.tasks.length ? ` (${selected.tasks.length})` : ""}`,
                  ],
                  ["history", "History"],
                ] as const
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`border-b-2 px-3 py-3 text-sm font-semibold ${activeTab === tab ? "border-violet-500 text-violet-700" : "border-transparent text-slate-500"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="space-y-5 p-6">
              {activeTab === "details" && (
                <>
                  <section className="rounded-xl border border-violet-100 bg-violet-50/60 p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-700">
                      Contact details
                    </h3>
                    {(() => {
                      const contact = getContact(selected);
                      return (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {[
                            ["Full name", contact.name],
                            ["Email", contact.email],
                            ["Phone", contact.phone],
                            ["Website", contact.website],
                          ].map(([label, value]) => (
                            <div
                              key={label}
                              className="rounded-xl bg-white/80 p-3"
                            >
                              <p className="text-xs text-slate-500">{label}</p>
                              <p className="mt-1 text-sm text-slate-900">
                                {value || "—"}
                              </p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </section>
                  <section className="rounded-xl border border-slate-200 bg-white p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Deal details
                    </h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Pipeline</p>
                        <p className="mt-1 text-sm text-slate-900">
                          {pipelineLabel(selected)}
                        </p>
                      </div>
                      <label className="rounded-xl bg-slate-50 p-3">
                        <span className="text-xs text-slate-500">Amount</span>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-slate-500">AED</span>
                          <input
                            key={`${selected.id}-${selected.amount}`}
                            aria-label="Deal amount"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={selected.amount || 0}
                            onBlur={(event) =>
                              updateDealDetails(selected, {
                                amount: Number(event.target.value || 0),
                              })
                            }
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900"
                          />
                        </div>
                      </label>
                      <label className="rounded-xl bg-slate-50 p-3">
                        <span className="text-xs text-slate-500">Company</span>
                        <select
                          aria-label="Deal company"
                          value={selected.company_id || ""}
                          onChange={(event) =>
                            updateDealDetails(selected, {
                              companyId: event.target.value || null,
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900"
                        >
                          <option value="">No company</option>
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="rounded-xl bg-slate-50 p-3">
                        <span className="text-xs text-slate-500">
                          Close date
                        </span>
                        <input
                          aria-label="Deal close date"
                          type="date"
                          value={selected.close_date || ""}
                          onChange={(event) =>
                            updateDealDetails(selected, {
                              closeDate: event.target.value || null,
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900"
                        />
                      </label>
                    </div>
                  </section>
                  <section className="rounded-xl border border-violet-100 bg-violet-50/60 p-4">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-violet-700">
                      Lead status
                      <select
                        aria-label="Lead status"
                        value={selected.lead_status}
                        onChange={(event) =>
                          moveLead(
                            selected.id,
                            event.target.value as LeadStatus,
                          )
                        }
                        className="mt-3 w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900"
                      >
                        <option value="" disabled>
                          Select a status
                        </option>
                        {COLUMNS.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </section>
                  <section className="rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setAnswersExpanded((value) => !value)}
                      className="flex w-full justify-between p-4 text-left"
                    >
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                          Questionnaire answers
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {selected.questionnaire.length} submitted answers
                        </p>
                      </div>
                      <span>{answersExpanded ? "⌃" : "⌄"}</span>
                    </button>
                    {answersExpanded && (
                      <div className="space-y-3 border-t p-4">
                        {selected.questionnaire.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl bg-slate-50 p-3"
                          >
                            <p className="text-xs text-slate-500">
                              {item.question}
                            </p>
                            <p className="mt-1 text-sm text-slate-900">
                              {Array.isArray(item.answer)
                                ? item.answer.join(", ")
                                : String(item.answer ?? "—")}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                  <section className="rounded-xl border border-violet-100 bg-violet-50/60 p-4">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-violet-700">
                      Assigned user
                      <select
                        value={selected.assigned_user_id || ""}
                        onChange={(event) =>
                          assignLead(selected, event.target.value || null)
                        }
                        className="mt-3 w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm"
                      >
                        <option value="">Unassigned</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.full_name || user.email}
                          </option>
                        ))}
                      </select>
                    </label>
                  </section>
                </>
              )}
              {activeTab === "tasks" && (
                <section>
                  <div className="mb-4 flex justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">
                        Tasks for this lead
                      </h3>
                      <p className="text-xs text-slate-500">
                        Create and edit follow-ups.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleTaskForm}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                    >
                      {taskFormOpen ? "Cancel" : "+ Add task"}
                    </button>
                  </div>
                  {taskFormOpen && (
                    <form
                      onSubmit={createTask}
                      className="mb-5 space-y-3 rounded-xl bg-slate-50 p-4"
                    >
                      <label className="block text-xs font-semibold">
                        Task type
                        <select
                          value={taskType}
                          onChange={(event) => setTaskType(event.target.value)}
                          className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"
                        >
                          {Object.entries(taskLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-xs font-semibold">
                        Status
                        <select
                          value={taskStatus}
                          onChange={(event) =>
                            setTaskStatus(
                              event.target.value as "in_progress" | "completed",
                            )
                          }
                          className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"
                        >
                          <option value="in_progress">Active</option>
                          <option value="completed">Completed</option>
                        </select>
                      </label>
                      <label className="block text-xs font-semibold">
                        Name
                        <input
                          required
                          value={taskName}
                          onChange={(event) => setTaskName(event.target.value)}
                          className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"
                        />
                      </label>
                      <label className="block text-xs font-semibold">
                        Assign to
                        <select
                          value={taskAssigneeId}
                          onChange={(event) =>
                            setTaskAssigneeId(event.target.value)
                          }
                          className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"
                        >
                          <option value="">Unassigned</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.full_name || user.email}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-xs font-semibold">
                        Priority
                        <select
                          value={taskPriority}
                          onChange={(event) =>
                            setTaskPriority(
                              event.target.value as "low" | "medium" | "high",
                            )
                          }
                          className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          required
                          type="date"
                          value={taskDueDate}
                          onChange={(event) =>
                            setTaskDueDate(event.target.value)
                          }
                          className="rounded-lg border bg-white p-2 text-sm"
                        />
                        <input
                          type="time"
                          value={taskDueTime}
                          onChange={(event) =>
                            setTaskDueTime(event.target.value)
                          }
                          className="rounded-lg border bg-white p-2 text-sm"
                        />
                      </div>
                      <textarea
                        value={taskNotes}
                        onChange={(event) => setTaskNotes(event.target.value)}
                        rows={3}
                        placeholder="Notes"
                        className="w-full rounded-lg border bg-white p-2 text-sm"
                      />
                      {taskError && (
                        <p role="alert" className="text-xs text-rose-600">
                          {taskError}
                        </p>
                      )}
                      <button
                        disabled={taskSaving}
                        className="w-full rounded-lg bg-violet-600 p-2.5 text-sm font-semibold text-white"
                      >
                        {taskSaving ? "Saving…" : "Save task"}
                      </button>
                    </form>
                  )}
                  {selected.tasks.map((task) => (
                    <div key={task.id} className="mb-2 rounded-xl border p-3">
                      <p className="font-semibold">{task.name}</p>
                      <p className="text-xs text-slate-500">
                        {taskLabels[task.type] || task.type} ·{" "}
                        {relativeDue(task.activity_date)} ·{" "}
                        {task.status === "completed" ? "Completed" : "Active"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Assigned to {task.assigned_user_name || "Unassigned"}
                      </p>
                    </div>
                  ))}
                </section>
              )}
              {activeTab === "history" && (
                <section>
                  <h3 className="text-sm font-semibold">Lead history</h3>
                  <div className="mt-4 space-y-4">
                    {selected.status_history.map((entry) => (
                      <div
                        key={entry.id}
                        className="border-l-2 border-violet-200 pl-4"
                      >
                        <p className="text-sm">
                          {entry.event_type === "assignment_changed"
                            ? `Assigned lead to ${entry.assigned_user_name || "Unassigned"}`
                            : `Moved from ${statusLabel(entry.from_status)} to ${statusLabel(entry.to_status)}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(entry.changed_at).toLocaleString()}{" "}
                          {entry.changed_by_email
                            ? `by ${entry.changed_by_email}`
                            : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
