"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";

type SocialProject = {
  id: string;
  name: string;
  company_id: string;
};

type ProjectDetails = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  processed_outcome: string | null;
  pipeline: string | null;
  project_type: string | null;
  social_calendar_id: string | null;
  value: number | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string | null;
  is_archived?: boolean;
};

const PROJECT_TYPE_OPTIONS = [
  { value: "social_media_seo", label: "Social Media Marketing & SEO", color: "from-pink-500 to-fuchsia-500", bgColor: "bg-pink-50", textColor: "text-pink-700", icon: "📱", hasCalendar: true },
  { value: "app_design", label: "App Design & Development", color: "from-violet-500 to-purple-500", bgColor: "bg-violet-50", textColor: "text-violet-700", icon: "📲", hasCalendar: false },
  { value: "brand_development", label: "Brand Development", color: "from-amber-500 to-orange-500", bgColor: "bg-amber-50", textColor: "text-amber-700", icon: "🎨", hasCalendar: false },
  { value: "content_creation", label: "Content Creation", color: "from-rose-500 to-pink-500", bgColor: "bg-rose-50", textColor: "text-rose-700", icon: "✍️", hasCalendar: false },
  { value: "digital_marketing", label: "Digital Marketing", color: "from-cyan-500 to-blue-500", bgColor: "bg-cyan-50", textColor: "text-cyan-700", icon: "📊", hasCalendar: false },
  { value: "event_services", label: "Event Services", color: "from-emerald-500 to-teal-500", bgColor: "bg-emerald-50", textColor: "text-emerald-700", icon: "🎪", hasCalendar: false },
  { value: "studio_rental", label: "Studio Rental / Production / Editing", color: "from-indigo-500 to-violet-500", bgColor: "bg-indigo-50", textColor: "text-indigo-700", icon: "🎬", hasCalendar: false },
  { value: "technical_assistance", label: "Technical Assistance & Configuration", color: "from-slate-500 to-gray-600", bgColor: "bg-slate-50", textColor: "text-slate-700", icon: "🔧", hasCalendar: false },
  { value: "web_design", label: "Web Design & Development", color: "from-blue-500 to-cyan-500", bgColor: "bg-blue-50", textColor: "text-blue-700", icon: "🌐", hasCalendar: false },
] as const;

function formatMoney(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

const STATUS_OPTIONS = [
  "New Lead",
  "Processed",
  "Discovery",
  "Proposal",
  "Quotation",
  "Invoice",
  "Project Ongoing",
  "Project Delivered",
  "Project Lost",
];

export default function ProjectDetailsCard({
  project,
  companyId,
}: {
  project: ProjectDetails;
  companyId?: string;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  
  // Social calendar state
  const [socialProjects, setSocialProjects] = useState<SocialProject[]>([]);
  const [linkedCalendar, setLinkedCalendar] = useState<SocialProject | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [linkingCalendar, setLinkingCalendar] = useState(false);

  // Form state
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [status, setStatus] = useState(project.status || "");
  const [pipeline, setPipeline] = useState(project.pipeline || "");
  const [projectType, setProjectType] = useState(project.project_type || "");
  const [value, setValue] = useState(project.value?.toString() || "");
  const [startDate, setStartDate] = useState(project.start_date?.split("T")[0] || "");
  const [dueDate, setDueDate] = useState(project.due_date?.split("T")[0] || "");

  // Load social projects and linked calendar
  useEffect(() => {
    async function loadSocialData() {
      // Load available social projects for this company
      if (companyId) {
        const { data: socialData } = await supabaseClient
          .from("social_projects")
          .select("id, name, company_id")
          .eq("company_id", companyId)
          .order("name");
        
        if (socialData) {
          setSocialProjects(socialData);
        }
      }

      // Load linked calendar if exists
      if (project.social_calendar_id) {
        const { data: calendarData } = await supabaseClient
          .from("social_projects")
          .select("id, name, company_id")
          .eq("id", project.social_calendar_id)
          .single();
        
        if (calendarData) {
          setLinkedCalendar(calendarData);
        }
      }
    }
    loadSocialData();
  }, [companyId, project.social_calendar_id]);

  async function handleLinkCalendar(calendarId: string) {
    setLinkingCalendar(true);
    try {
      const { error: updateError } = await supabaseClient
        .from("projects")
        .update({ social_calendar_id: calendarId })
        .eq("id", project.id);

      if (!updateError) {
        const linked = socialProjects.find(sp => sp.id === calendarId);
        setLinkedCalendar(linked || null);
        setShowCalendarModal(false);
        router.refresh();
      }
    } catch {
      // ignore
    }
    setLinkingCalendar(false);
  }

  async function handleUnlinkCalendar() {
    setLinkingCalendar(true);
    try {
      const { error: updateError } = await supabaseClient
        .from("projects")
        .update({ social_calendar_id: null })
        .eq("id", project.id);

      if (!updateError) {
        setLinkedCalendar(null);
        router.refresh();
      }
    } catch {
      // ignore
    }
    setLinkingCalendar(false);
  }

  const isArchived = project.is_archived ?? false;

  const statusDisplay = (() => {
    if (project.status === "Processed" && project.processed_outcome) {
      return `Processed (${project.processed_outcome})`;
    }
    return project.status;
  })();

  async function handleSave() {
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabaseClient
        .from("projects")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          status: status || null,
          pipeline: pipeline.trim() || null,
          project_type: projectType || null,
          value: value ? Number(value) : null,
          start_date: startDate || null,
          due_date: dueDate || null,
        })
        .eq("id", project.id);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      // Auto-sync: Update linked social calendar status based on project status
      if (project.social_calendar_id) {
        const lostStatuses = ["Project Lost"];
        const activeStatuses = ["Project Ongoing", "Project Delivered", "Invoice", "Quotation", "Proposal", "Discovery", "Processed", "New Lead"];
        
        if (lostStatuses.includes(status)) {
          // Project is lost → mark social calendar as completed
          await supabaseClient
            .from("social_projects")
            .update({ status: "completed" })
            .eq("id", project.social_calendar_id);
        } else if (activeStatuses.includes(status)) {
          // Project is active → ensure social calendar is active
          await supabaseClient
            .from("social_projects")
            .update({ status: "active" })
            .eq("id", project.social_calendar_id);
        }
      }

      setIsEditing(false);
      setSaving(false);
      router.refresh();
    } catch {
      setError("Failed to save changes.");
      setSaving(false);
    }
  }

  async function handleArchiveToggle() {
    setArchiving(true);
    setError(null);

    try {
      const { error: updateError } = await supabaseClient
        .from("projects")
        .update({ is_archived: !isArchived })
        .eq("id", project.id);

      if (updateError) {
        setError(updateError.message);
        setArchiving(false);
        return;
      }

      // Auto-sync: Update linked social calendar when archiving/unarchiving
      if (project.social_calendar_id) {
        await supabaseClient
          .from("social_projects")
          .update({ status: !isArchived ? "archived" : "active" })
          .eq("id", project.social_calendar_id);
      }

      setArchiving(false);
      router.refresh();
    } catch {
      setError("Failed to update archive status.");
      setArchiving(false);
    }
  }

  function handleCancel() {
    setName(project.name);
    setDescription(project.description || "");
    setStatus(project.status || "");
    setPipeline(project.pipeline || "");
    setProjectType(project.project_type || "");
    setValue(project.value?.toString() || "");
    setStartDate(project.start_date?.split("T")[0] || "");
    setDueDate(project.due_date?.split("T")[0] || "");
    setError(null);
    setIsEditing(false);
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteProject() {
    setDeleting(true);
    setError(null);
    try {
      // Delete linked social calendar if exists
      if (project.social_calendar_id) {
        await supabaseClient
          .from("social_projects")
          .delete()
          .eq("id", project.social_calendar_id);
      }
      
      // Delete the project
      const { error: deleteError } = await supabaseClient
        .from("projects")
        .delete()
        .eq("id", project.id);

      if (deleteError) {
        setError(deleteError.message);
        setDeleting(false);
        return;
      }

      // Redirect to projects list
      router.push("/projects");
    } catch {
      setError("Failed to delete project.");
      setDeleting(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50/80 p-4 text-sm shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-sky-100/50 to-violet-100/30 blur-2xl" />
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-violet-500 shadow-lg shadow-sky-500/25">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" x2="8" y1="13" y2="13" />
                <line x1="16" x2="8" y1="17" y2="17" />
                <line x1="10" x2="8" y1="9" y2="9" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-slate-900">Project details</h2>
            {isArchived && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                Archived
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50"
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleArchiveToggle}
                  disabled={archiving}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium shadow-sm transition-all disabled:opacity-50 ${
                    isArchived
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  }`}
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {isArchived ? (
                      <>
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="m9 14 2 2 4-4" />
                      </>
                    ) : (
                      <>
                        <rect x="2" y="4" width="20" height="5" rx="2" />
                        <path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" />
                        <path d="M10 13h4" />
                      </>
                    )}
                  </svg>
                  {archiving ? "..." : isArchived ? "Unarchive" : "Archive"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700 shadow-sm transition-all hover:bg-red-100"
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-sky-500 to-violet-500 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg shadow-sky-500/25 hover:shadow-xl disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-600">
            {error}
          </div>
        )}

        {/* Content */}
        {!isEditing ? (
          <>
            {/* Project Type Badge */}
            {project.project_type && (() => {
              const typeOption = PROJECT_TYPE_OPTIONS.find(t => t.value === project.project_type);
              if (!typeOption) return null;
              return (
                <div className="mb-4">
                  <div className={`inline-flex items-center gap-2 rounded-xl ${typeOption.bgColor} px-3 py-2`}>
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${typeOption.color} text-white text-sm shadow-md`}>
                      {typeOption.icon}
                    </div>
                    <span className={`text-[12px] font-semibold ${typeOption.textColor}`}>{typeOption.label}</span>
                    {typeOption.hasCalendar && (
                      <span className="rounded-full bg-pink-100 px-1.5 py-0.5 text-[9px] font-medium text-pink-600">📅 Calendar</span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Social Media Calendar Link - Only show for social_media_seo projects */}
            {project.project_type === "social_media_seo" && (
              <div className="mb-4 rounded-xl border border-pink-200 bg-gradient-to-br from-pink-50 to-fuchsia-50/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-fuchsia-500 text-white shadow-md">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-pink-600 uppercase tracking-wide">Social Media Calendar</p>
                      {linkedCalendar ? (
                        <p className="text-[12px] font-semibold text-slate-900">{linkedCalendar.name}</p>
                      ) : (
                        <p className="text-[11px] text-slate-500">No calendar linked</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {linkedCalendar ? (
                      <>
                        <Link
                          href={`/social-media/${linkedCalendar.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-pink-500 px-2.5 py-1.5 text-[10px] font-medium text-white shadow-sm hover:bg-pink-600 transition-colors"
                        >
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                          Open
                        </Link>
                        <button
                          type="button"
                          onClick={handleUnlinkCalendar}
                          disabled={linkingCalendar}
                          className="inline-flex items-center rounded-lg border border-pink-200 bg-white px-2 py-1.5 text-[10px] font-medium text-pink-600 hover:bg-pink-50 disabled:opacity-50"
                        >
                          Unlink
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowCalendarModal(true)}
                        className="inline-flex items-center gap-1 rounded-lg border border-pink-300 bg-white px-2.5 py-1.5 text-[10px] font-medium text-pink-600 hover:bg-pink-50 transition-colors"
                      >
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        Link Calendar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <dl className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="rounded-lg bg-slate-50/80 p-2.5">
                <dt className="font-medium text-slate-400 uppercase tracking-wide text-[9px]">Status</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{statusDisplay ?? "—"}</dd>
              </div>
              <div className="rounded-lg bg-slate-50/80 p-2.5">
                <dt className="font-medium text-slate-400 uppercase tracking-wide text-[9px]">Pipeline</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{project.pipeline ?? "—"}</dd>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-2.5">
                <dt className="font-medium text-emerald-600 uppercase tracking-wide text-[9px]">Value</dt>
                <dd className="mt-0.5 font-bold text-emerald-700">{formatMoney(project.value)}</dd>
              </div>
              <div className="rounded-lg bg-slate-50/80 p-2.5">
                <dt className="font-medium text-slate-400 uppercase tracking-wide text-[9px]">Start</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{formatDate(project.start_date)}</dd>
              </div>
              <div className="rounded-lg bg-slate-50/80 p-2.5">
                <dt className="font-medium text-slate-400 uppercase tracking-wide text-[9px]">Target</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{formatDate(project.due_date)}</dd>
              </div>
              <div className="rounded-lg bg-slate-50/80 p-2.5">
                <dt className="font-medium text-slate-400 uppercase tracking-wide text-[9px]">Created</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{formatDate(project.created_at)}</dd>
              </div>
            </dl>
            <div className="mt-4 rounded-lg border border-slate-100 bg-white/60 p-3">
              <dt className="text-[9px] font-medium text-slate-400 uppercase tracking-wide">Description</dt>
              <dd className="mt-1 text-[11px] text-slate-700 leading-relaxed">
                {project.description && project.description.trim().length > 0
                  ? project.description
                  : "No description yet."}
              </dd>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {/* Name */}
            <div>
              <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">
                Project Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            {/* Project Type */}
            <div>
              <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                Project Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PROJECT_TYPE_OPTIONS.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setProjectType(type.value)}
                    className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all ${
                      projectType === type.value
                        ? "border-sky-500 bg-sky-50/50 shadow-md"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br ${type.color} text-white text-xs shadow`}>
                      {type.icon}
                    </div>
                    <span className="text-[9px] font-semibold text-slate-600">{type.label}</span>
                    {type.hasCalendar && (
                      <span className="rounded-full bg-pink-100 px-1 py-0.5 text-[7px] font-medium text-pink-600">📅</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Status */}
              <div>
                <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="">Select status</option>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Pipeline */}
              <div>
                <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Pipeline
                </label>
                <input
                  type="text"
                  value={pipeline}
                  onChange={(e) => setPipeline(e.target.value)}
                  placeholder="New Strategy"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Value */}
              <div>
                <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Value (AED)
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  min="0"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </div>
        )}
      </div>

      {/* Social Calendar Selection Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-pink-50 to-fuchsia-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-500 shadow-lg shadow-pink-500/30">
                  <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Link Social Calendar</h3>
                  <p className="text-[11px] text-slate-500">Select a calendar to associate</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-100 hover:text-red-600"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {socialProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                    <svg className="h-6 w-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-700">No social calendars found</p>
                  <p className="mt-1 text-[12px] text-slate-500">Create a social media project first</p>
                  <Link
                    href="/social-media"
                    className="mt-3 inline-flex items-center gap-1 rounded-lg bg-pink-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-pink-600"
                  >
                    Go to Social Media
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {socialProjects.map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => handleLinkCalendar(sp.id)}
                      disabled={linkingCalendar}
                      className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-pink-300 hover:bg-pink-50/50 disabled:opacity-50"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-pink-100 to-fuchsia-100 text-pink-500">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-900 truncate">{sp.name}</p>
                        <p className="text-[10px] text-slate-500">Social Media Calendar</p>
                      </div>
                      <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                <svg className="h-5 w-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Delete Project</h3>
                <p className="text-sm text-slate-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Are you sure you want to delete <strong>{project.name}</strong>? All project data including linked social calendars will be permanently removed.
            </p>
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
