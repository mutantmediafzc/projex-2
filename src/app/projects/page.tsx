"use client";

import { FormEvent, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import MergeProjectsModal from "@/components/MergeProjectsModal";
import { useUserRole } from "@/app/profile/hooks/useUserRole";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  pipeline: string | null;
  project_type: string | null;
  social_calendar_id: string | null;
  value: number | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string | null;
  is_archived: boolean;
  company: {
    id: string;
    name: string | null;
    logo_url: string | null;
  } | null;
};

const PROJECT_TYPE_OPTIONS = [
  { value: "social_media_seo", label: "Social Media Marketing & SEO", color: "from-pink-500 to-fuchsia-500", icon: "📱", hasCalendar: true },
  { value: "performance_marketing", label: "Performance Marketing", color: "from-orange-500 to-red-500", icon: "🚀", hasCalendar: false },
  { value: "seo_aeo", label: "SEO & AEO", color: "from-emerald-500 to-green-500", icon: "🔍", hasCalendar: false },
  { value: "app_design", label: "App Design & Development", color: "from-violet-500 to-purple-500", icon: "📲", hasCalendar: false },
  { value: "brand_development", label: "Brand Development", color: "from-amber-500 to-orange-500", icon: "🎨", hasCalendar: false },
  { value: "content_creation", label: "Content Creation", color: "from-rose-500 to-pink-500", icon: "✍️", hasCalendar: false },
  { value: "digital_marketing", label: "Digital Marketing", color: "from-cyan-500 to-blue-500", icon: "📊", hasCalendar: false },
  { value: "event_services", label: "Event Services", color: "from-emerald-500 to-teal-500", icon: "🎪", hasCalendar: false },
  { value: "studio_rental", label: "Studio Rental / Production / Editing", color: "from-indigo-500 to-violet-500", icon: "🎬", hasCalendar: false },
  { value: "technical_assistance", label: "Technical Assistance & Configuration", color: "from-slate-500 to-gray-600", icon: "🔧", hasCalendar: false },
  { value: "web_design", label: "Web Design & Development", color: "from-blue-500 to-cyan-500", icon: "🌐", hasCalendar: false },
] as const;

type Company = {
  id: string;
  name: string;
  logo_url: string | null;
  industry: string | null;
  town: string | null;
  country: string | null;
};

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

const STATUS_COLORS: Record<string, string> = {
  "New Lead": "from-sky-500 to-cyan-500",
  "Processed": "from-violet-500 to-purple-500",
  "Discovery": "from-amber-500 to-orange-500",
  "Proposal": "from-pink-500 to-rose-500",
  "Quotation": "from-indigo-500 to-blue-500",
  "Invoice": "from-emerald-500 to-teal-500",
  "Project Ongoing": "from-cyan-500 to-blue-500",
  "Project Delivered": "from-green-500 to-emerald-500",
  "Project Lost": "from-red-500 to-rose-500",
};

const INDUSTRY_COLORS: Record<string, string> = {
  Healthcare: "from-pink-500 to-rose-500",
  Finance: "from-emerald-500 to-teal-500",
  Technology: "from-violet-500 to-purple-500",
  Hospitality: "from-amber-500 to-orange-500",
  Retail: "from-sky-500 to-cyan-500",
  Education: "from-indigo-500 to-blue-500",
  Manufacturing: "from-slate-500 to-gray-500",
  "Real Estate": "from-lime-500 to-green-500",
};

export default function ProjectsPage() {
  const { role } = useUserRole();
  const isAdmin = role === "admin";
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>("");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [typeSearchQuery, setTypeSearchQuery] = useState("");
  const typeButtonRef = useRef<HTMLButtonElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [openingProjectId, setOpeningProjectId] = useState<string | null>(null);
  const router = useRouter();
  
  // Merge functionality
  const [selectMode, setSelectMode] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const handleProjectClick = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    setOpeningProjectId(projectId);
    router.push(`/projects/${projectId}`);
  };

  // Close dropdown on click outside
  useEffect(() => {
    if (!showTypeDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInsideButton = typeButtonRef.current?.contains(target);
      const isInsideDropdown = typeDropdownRef.current?.contains(target);
      if (!isInsideButton && !isInsideDropdown) {
        setShowTypeDropdown(false);
        setTypeSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTypeDropdown]);

  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      try {
        setLoading(true);
        setError(null);

        let query = supabaseClient
          .from("projects")
          .select(`
            id, name, description, status, pipeline, project_type, social_calendar_id, value, start_date, due_date, created_at, is_archived,
            company:companies(id, name, logo_url)
          `)
          .order("created_at", { ascending: false });

        const { data, error: fetchError } = await query;

        if (!isMounted) return;

        if (fetchError) {
          setError(fetchError.message);
          setProjects([]);
        } else {
          // Transform data to handle company as single object
          const transformed = (data || []).map((row: any) => ({
            ...row,
            company: Array.isArray(row.company) ? row.company[0] || null : row.company,
          }));
          setProjects(transformed as Project[]);
        }
      } catch {
        if (!isMounted) return;
        setError("Failed to load projects.");
        setProjects([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredProjects = projects.filter((project) => {
    // Archive filter
    if (showArchived) {
      if (!project.is_archived) return false;
    } else {
      if (project.is_archived) return false;
    }

    // Status filter
    if (statusFilter && project.status !== statusFilter) return false;

    // Project type filter
    if (projectTypeFilter && project.project_type !== projectTypeFilter) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = project.name.toLowerCase().includes(query);
      const matchesCompany = project.company?.name?.toLowerCase().includes(query);
      const matchesDescription = project.description?.toLowerCase().includes(query);
      if (!matchesName && !matchesCompany && !matchesDescription) return false;
    }

    return true;
  });

  const activeCount = projects.filter((p) => !p.is_archived).length;
  const archivedCount = projects.filter((p) => p.is_archived).length;
  const totalValue = filteredProjects.reduce((sum, p) => sum + (p.value || 0), 0);

  const uniqueStatuses = [...new Set(projects.map((p) => p.status).filter(Boolean))];
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, projectTypeFilter, showArchived]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <div className="pointer-events-none absolute -top-10 right-0 h-[300px] w-[400px] overflow-hidden opacity-50">
          <div className="absolute top-0 right-0 h-[250px] w-[350px] rounded-full bg-gradient-to-br from-emerald-200/60 to-teal-200/40 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  <path d="M12 11v6" />
                  <path d="M9 14h6" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-slate-900">Projects</h1>
                <p className="text-[12px] sm:text-[13px] text-slate-500">
                  {showArchived ? `${archivedCount} archived projects` : `${activeCount} active projects`}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {/* Merge Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                setSelectMode(!selectMode);
                setSelectedProjects([]);
              }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-all ${
                selectMode
                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
              {selectMode ? "Cancel" : "Merge"}
            </button>
            
            {/* Merge Button */}
            {selectMode && selectedProjects.length >= 2 && (
              <button
                type="button"
                onClick={() => setShowMergeModal(true)}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-[13px] font-medium text-white shadow-lg shadow-amber-500/25 hover:shadow-xl"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 8l4 4-4 4M7 8l-4 4 4 4M14 4l-4 16" />
                </svg>
                Merge {selectedProjects.length}
              </button>
            )}
            
            <button
              type="button"
              onClick={() => setShowArchived(!showArchived)}
              className={`group inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium shadow-sm transition-all ${
                showArchived
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/25"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21 8-2 2-1.5-3.7A2 2 0 0 0 15.65 5H8.35a2 2 0 0 0-1.85 1.3L5 10l-2-2" />
                <path d="M3.5 14h6.5" />
                <path d="M3.5 18h6.5" />
                <path d="m21 14-7-1.5V22" />
              </svg>
              {showArchived ? "View Active" : "View Archived"}
              {archivedCount > 0 && !showArchived && (
                <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                  {archivedCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowNewProjectModal(true)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-[13px] font-medium text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              New Project
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={`grid grid-cols-2 gap-2 sm:gap-4 ${isAdmin ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
        <div className="rounded-xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 to-teal-50 p-3 sm:p-4 shadow-sm">
          <p className="text-[10px] sm:text-[11px] font-medium text-emerald-600 uppercase tracking-wide">Total Projects</p>
          <p className="mt-0.5 sm:mt-1 text-xl sm:text-2xl font-bold text-emerald-700">{filteredProjects.length}</p>
        </div>
        {isAdmin && (
          <div className="rounded-xl border border-sky-200/50 bg-gradient-to-br from-sky-50 to-cyan-50 p-3 sm:p-4 shadow-sm">
            <p className="text-[10px] sm:text-[11px] font-medium text-sky-600 uppercase tracking-wide">Total Value</p>
            <p className="mt-0.5 sm:mt-1 text-xl sm:text-2xl font-bold text-sky-700 truncate">{formatMoney(totalValue)}</p>
          </div>
        )}
        <div className="rounded-xl border border-violet-200/50 bg-gradient-to-br from-violet-50 to-purple-50 p-3 sm:p-4 shadow-sm">
          <p className="text-[10px] sm:text-[11px] font-medium text-violet-600 uppercase tracking-wide">In Progress</p>
          <p className="mt-0.5 sm:mt-1 text-xl sm:text-2xl font-bold text-violet-700">
            {filteredProjects.filter((p) => p.status === "Project Ongoing").length}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200/50 bg-gradient-to-br from-amber-50 to-orange-50 p-3 sm:p-4 shadow-sm">
          <p className="text-[10px] sm:text-[11px] font-medium text-amber-600 uppercase tracking-wide">Delivered</p>
          <p className="mt-0.5 sm:mt-1 text-xl sm:text-2xl font-bold text-amber-700">
            {filteredProjects.filter((p) => p.status === "Project Delivered").length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-sm backdrop-blur overflow-visible">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects, companies..."
            className="h-10 sm:h-9 w-full sm:w-56 rounded-lg border border-slate-200 bg-white px-3 text-[14px] sm:text-[13px] text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-slate-500 hidden sm:inline">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 sm:h-9 flex-1 sm:flex-none rounded-lg border border-slate-200 bg-white px-3 text-[14px] sm:text-[13px] text-black shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">All Statuses</option>
            {uniqueStatuses.map((status) => (
              <option key={status} value={status!}>
                {status}
              </option>
            ))}
          </select>
        </div>
        
        {/* Project Type Filter - Searchable Dropdown */}
        <div className="relative">
          <button
            ref={typeButtonRef}
            type="button"
            onClick={() => {
              if (!showTypeDropdown && typeButtonRef.current) {
                const rect = typeButtonRef.current.getBoundingClientRect();
                setDropdownPosition({
                  top: rect.bottom + window.scrollY + 4,
                  left: rect.right - 288 + window.scrollX, // 288 = w-72 (18rem)
                });
              }
              setShowTypeDropdown(!showTypeDropdown);
            }}
            className={`h-10 sm:h-9 inline-flex items-center gap-2 rounded-lg border px-3 text-[14px] sm:text-[13px] shadow-sm transition-all ${
              projectTypeFilter 
                ? "border-emerald-300 bg-emerald-50 text-emerald-700" 
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {projectTypeFilter ? (
              <>
                <span>{PROJECT_TYPE_OPTIONS.find(t => t.value === projectTypeFilter)?.icon}</span>
                <span className="max-w-[120px] truncate">{PROJECT_TYPE_OPTIONS.find(t => t.value === projectTypeFilter)?.label}</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>Project Type</span>
              </>
            )}
            <svg className={`h-4 w-4 transition-transform ${showTypeDropdown ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          
          {showTypeDropdown && typeof document !== "undefined" && createPortal(
            <div 
              ref={typeDropdownRef}
              className="fixed w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
              style={{ top: dropdownPosition.top, left: dropdownPosition.left, zIndex: 9999 }}
            >
              <div className="relative mb-2">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  value={typeSearchQuery}
                  onChange={(e) => setTypeSearchQuery(e.target.value)}
                  placeholder="Search project types..."
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] text-black placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  autoFocus
                />
              </div>
              <div className="max-h-[240px] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    setProjectTypeFilter("");
                    setShowTypeDropdown(false);
                    setTypeSearchQuery("");
                  }}
                  className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
                    !projectTypeFilter ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-sm">✨</span>
                  <span>All Project Types</span>
                </button>
                {PROJECT_TYPE_OPTIONS
                  .filter(type => type.label.toLowerCase().includes(typeSearchQuery.toLowerCase()))
                  .map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        setProjectTypeFilter(type.value);
                        setShowTypeDropdown(false);
                        setTypeSearchQuery("");
                      }}
                      className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
                        projectTypeFilter === type.value ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className={`flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br ${type.color} text-sm text-white`}>
                        {type.icon}
                      </span>
                      <span className="flex-1">{type.label}</span>
                      {type.hasCalendar && (
                        <span className="rounded-full bg-pink-100 px-1.5 py-0.5 text-[10px] font-medium text-pink-600">📅 Calendar</span>
                      )}
                    </button>
                  ))}
              </div>
            </div>,
            document.body
          )}
        </div>
        
        {(searchQuery || statusFilter || projectTypeFilter) && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("");
              setProjectTypeFilter("");
              setShowTypeDropdown(false);
            }}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
            Clear
          </button>
        )}
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-[13px] text-slate-500">Loading projects...</div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
          {error}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white/60 p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
            <svg className="h-8 w-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className="mt-4 text-[15px] font-medium text-slate-700">
            {showArchived ? "No archived projects" : "No projects yet"}
          </p>
          <p className="mt-1 text-[13px] text-slate-500">
            {showArchived
              ? "Archived projects will appear here."
              : "Create your first project from a company page."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedProjects.map((project) => {
            const isSelected = selectedProjects.includes(project.id);
            
            return (
            <button
              type="button"
              key={project.id}
              onClick={(e) => {
                if (selectMode) {
                  e.preventDefault();
                  setSelectedProjects((prev) =>
                    isSelected
                      ? prev.filter((id) => id !== project.id)
                      : [...prev, project.id]
                  );
                } else {
                  handleProjectClick(e, project.id);
                }
              }}
              className={`group relative overflow-hidden rounded-xl border bg-white p-4 shadow-sm transition-all text-left w-full ${
                selectMode && isSelected
                  ? "border-amber-400 ring-2 ring-amber-200 shadow-amber-100"
                  : "border-slate-200/80 hover:shadow-lg hover:shadow-slate-200/50"
              }`}
            >
              {/* Selection checkbox in merge mode */}
              {selectMode && (
                <div className="absolute right-3 top-3 z-10">
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    isSelected 
                      ? "bg-amber-500 border-amber-500" 
                      : "border-slate-300 bg-white"
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                </div>
              )}
              
              {/* Loading overlay */}
              {openingProjectId === project.id && !selectMode && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm rounded-xl">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-700">Opening Project File...</p>
                  <p className="mt-1 text-xs text-slate-500">Please wait</p>
                </div>
              )}

              {/* Status gradient bar */}
              <div
                className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r ${
                  STATUS_COLORS[project.status || ""] || "from-slate-300 to-slate-400"
                }`}
              />
              
              <div className="flex items-start gap-3">
                {/* Company logo */}
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                  {project.company?.logo_url ? (
                    <Image
                      src={project.company.logo_url}
                      alt={project.company.name || "Company"}
                      fill
                      className="object-contain p-1.5"
                    />
                  ) : (
                    <svg className="h-6 w-6 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 21h18" />
                      <path d="M5 21V7l8-4v18" />
                      <path d="M19 21V11l-6-4" />
                    </svg>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-[12px] text-slate-500 truncate">
                    {project.company?.name || "No company"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {project.status && (
                  <span
                    className={`inline-flex rounded-full bg-gradient-to-r px-2 py-0.5 text-[10px] font-semibold text-white ${
                      STATUS_COLORS[project.status] || "from-slate-400 to-slate-500"
                    }`}
                  >
                    {project.status}
                  </span>
                )}
                {project.is_archived && (
                  <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    Archived
                  </span>
                )}
              </div>

              <div className={`mt-3 grid gap-2 text-[11px] ${isAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
                {isAdmin && (
                  <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                    <span className="text-slate-400">Value</span>
                    <p className="font-semibold text-slate-700">{formatMoney(project.value)}</p>
                  </div>
                )}
                <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                  <span className="text-slate-400">Due</span>
                  <p className="font-semibold text-slate-700">{formatDate(project.due_date)}</p>
                </div>
              </div>

              {project.description && (
                <p className="mt-3 text-[12px] text-slate-500 line-clamp-2">
                  {project.description}
                </p>
              )}
            </button>
          );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            type="button"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                if (totalPages <= 7) return true;
                if (page === 1 || page === totalPages) return true;
                if (Math.abs(page - currentPage) <= 1) return true;
                return false;
              })
              .map((page, idx, arr) => (
                <span key={page} className="flex items-center">
                  {idx > 0 && arr[idx - 1] !== page - 1 && (
                    <span className="px-1 text-slate-400">...</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`inline-flex h-9 min-w-[36px] items-center justify-center rounded-lg px-3 text-[13px] font-medium transition-all ${
                      currentPage === page
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </button>
                </span>
              ))}
          </div>
          
          <button
            type="button"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          
          <span className="ml-2 text-[12px] text-slate-500">
            Page {currentPage} of {totalPages} ({filteredProjects.length} projects)
          </span>
        </div>
      )}

      {/* Merge Projects Modal */}
      {showMergeModal && (
        <MergeProjectsModal
          projects={projects.filter((p) => selectedProjects.includes(p.id))}
          onClose={() => setShowMergeModal(false)}
          onMergeComplete={() => {
            setShowMergeModal(false);
            setSelectMode(false);
            setSelectedProjects([]);
            window.location.reload();
          }}
        />
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <NewProjectModal
          onClose={() => setShowNewProjectModal(false)}
          onCreated={(newProject) => {
            setProjects((prev) => [newProject, ...prev]);
            setShowNewProjectModal(false);
          }}
        />
      )}
    </div>
  );
}

// New Project Modal Component
function NewProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (project: Project) => void;
}) {
  const [step, setStep] = useState<"company" | "project">("company");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [companySearch, setCompanySearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load companies
  useEffect(() => {
    async function loadCompanies() {
      setLoadingCompanies(true);
      try {
        const { data, error } = await supabaseClient
          .from("companies")
          .select("id, name, logo_url, industry, town, country")
          .order("name", { ascending: true })
          .limit(200);

        if (!error && data) {
          setCompanies(data as Company[]);
        }
      } catch {
        // Ignore error
      }
      setLoadingCompanies(false);
    }
    loadCompanies();
  }, []);

  const filteredCompanies = companies.filter((company) => {
    if (!companySearch.trim()) return true;
    const search = companySearch.toLowerCase();
    return (
      company.name.toLowerCase().includes(search) ||
      company.industry?.toLowerCase().includes(search) ||
      company.town?.toLowerCase().includes(search) ||
      company.country?.toLowerCase().includes(search)
    );
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCompany) return;

    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = (formData.get("name") as string | null)?.trim();
    const description = (formData.get("description") as string | null)?.trim();
    const status = (formData.get("status") as string | null)?.trim();
    const pipeline = (formData.get("pipeline") as string | null)?.trim();
    const projectType = (formData.get("project_type") as string | null)?.trim();
    const valueRaw = (formData.get("value") as string | null)?.trim();
    const startDate = (formData.get("start_date") as string | null)?.trim();
    const dueDate = (formData.get("due_date") as string | null)?.trim();

    if (!name) {
      setError("Project name is required.");
      return;
    }

    if (!projectType) {
      setError("Project type is required.");
      return;
    }

    let value: number | null = null;
    if (valueRaw) {
      const parsed = Number(valueRaw.replace(/,/g, ""));
      if (!Number.isNaN(parsed) && parsed >= 0) {
        value = parsed;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabaseClient
        .from("projects")
        .insert({
          company_id: selectedCompany.id,
          name,
          description: description || null,
          status: status || "New Lead",
          pipeline: pipeline || null,
          project_type: projectType,
          value,
          start_date: startDate || null,
          due_date: dueDate || null,
        })
        .select(`
          id, name, description, status, pipeline, project_type, social_calendar_id, value, start_date, due_date, created_at, is_archived,
          company:companies(id, name, logo_url)
        `)
        .single();

      if (insertError || !data) {
        setError(insertError?.message ?? "Failed to create project.");
        setLoading(false);
        return;
      }

      // Transform to match Project type
      const newProject = {
        ...data,
        company: Array.isArray(data.company) ? data.company[0] || null : data.company,
      } as Project;

      onCreated(newProject);
    } catch {
      setError("Failed to create project.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl safe-area-inset-bottom">
        {/* Decorative gradients */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-gradient-to-br from-emerald-200/40 to-teal-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-200/30 to-sky-200/20 blur-2xl" />

        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <path d="M12 11v6" />
                <path d="M9 14h6" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Create New Project</h2>
              <p className="text-[12px] text-slate-500">
                {step === "company" ? "Step 1: Select a company" : "Step 2: Project details"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-red-100 hover:text-red-600"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-6 py-3">
          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${step === "company" ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-600"}`}>
            {selectedCompany ? "✓" : "1"}
          </div>
          <div className={`h-0.5 flex-1 rounded-full ${selectedCompany ? "bg-emerald-500" : "bg-slate-200"}`} />
          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${step === "project" ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
            2
          </div>
        </div>

        {/* Content */}
        <div className="relative overflow-y-auto max-h-[calc(90vh-180px)] p-6">
          {step === "company" ? (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                  <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  placeholder="Search companies by name, industry, or location..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-black placeholder:text-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Company list */}
              {loadingCompanies ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-500" />
                </div>
              ) : filteredCompanies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                    <svg className="h-7 w-7 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 21h18" />
                      <path d="M5 21V7l8-4v18" />
                      <path d="M19 21V11l-6-4" />
                    </svg>
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-700">No companies found</p>
                  <p className="mt-1 text-[13px] text-slate-500">Try adjusting your search</p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {filteredCompanies.map((company) => {
                    const location = [company.town, company.country].filter(Boolean).join(", ");
                    const industryColor = INDUSTRY_COLORS[company.industry || ""] || "from-slate-400 to-slate-500";
                    const isSelected = selectedCompany?.id === company.id;

                    return (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => {
                          setSelectedCompany(company);
                          setStep("project");
                        }}
                        className={`group relative overflow-hidden rounded-xl border p-3 text-left transition-all ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100"
                            : "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md"
                        }`}
                      >
                        <div className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r ${industryColor}`} />
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-slate-100 to-slate-200">
                            {company.logo_url ? (
                              <Image
                                src={company.logo_url}
                                alt={company.name}
                                fill
                                className="object-contain p-1.5"
                              />
                            ) : (
                              <span className="text-sm font-bold text-slate-600">
                                {company.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate">{company.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {company.industry && (
                                <span className={`inline-flex rounded-full bg-gradient-to-r px-1.5 py-0.5 text-[9px] font-semibold text-white ${industryColor}`}>
                                  {company.industry}
                                </span>
                              )}
                              {location && (
                                <span className="text-[10px] text-slate-500">{location}</span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <form id="project-form" onSubmit={handleSubmit} className="space-y-5">
              {/* Selected company preview */}
              {selectedCompany && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white border border-emerald-200">
                      {selectedCompany.logo_url ? (
                        <Image
                          src={selectedCompany.logo_url}
                          alt={selectedCompany.name}
                          fill
                          className="object-contain p-1.5"
                        />
                      ) : (
                        <span className="text-sm font-bold text-emerald-600">
                          {selectedCompany.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{selectedCompany.name}</p>
                      <p className="text-[11px] text-slate-500">Selected company</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep("company")}
                    className="text-[12px] font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Project form fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-1.5">
                  <label htmlFor="name" className="block text-[12px] font-semibold text-slate-700 uppercase tracking-wide">
                    Project Name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    placeholder="Enter project name"
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-black placeholder:text-slate-400 shadow-sm transition-all focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Project Type Selection */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="block text-[12px] font-semibold text-slate-700 uppercase tracking-wide">
                    Project Type *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {PROJECT_TYPE_OPTIONS.map((type) => (
                      <label
                        key={type.value}
                        className="relative cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="project_type"
                          value={type.value}
                          className="peer sr-only"
                          required
                        />
                        <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-slate-200 bg-white p-4 transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-50/50 peer-checked:shadow-lg peer-checked:shadow-emerald-500/10 hover:border-slate-300 hover:bg-slate-50">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${type.color} text-white text-lg shadow-lg`}>
                            {type.icon}
                          </div>
                          <span className="text-[12px] font-semibold text-slate-700">{type.label}</span>
                        </div>
                        <div className="absolute -top-1 -right-1 hidden h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white peer-checked:flex">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="status" className="block text-[12px] font-semibold text-slate-700 uppercase tracking-wide">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    defaultValue="New Lead"
                    className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black shadow-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="New Lead">New Lead</option>
                    <option value="Processed">Processed</option>
                    <option value="Discovery">Discovery</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Quotation">Quotation</option>
                    <option value="Invoice">Invoice</option>
                    <option value="Project Started">Project Started</option>
                    <option value="Project Ongoing">Project Ongoing</option>
                    <option value="Project Delivered">Project Delivered</option>
                    <option value="Project Lost">Project Lost</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="pipeline" className="block text-[12px] font-semibold text-slate-700 uppercase tracking-wide">
                    Pipeline
                  </label>
                  <select
                    id="pipeline"
                    name="pipeline"
                    className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black shadow-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Select pipeline</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Development">Development</option>
                    <option value="Support">Support</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="value" className="block text-[12px] font-semibold text-slate-700 uppercase tracking-wide">
                    Value (AED)
                  </label>
                  <input
                    id="value"
                    name="value"
                    type="text"
                    placeholder="0"
                    className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-400 shadow-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="start_date" className="block text-[12px] font-semibold text-slate-700 uppercase tracking-wide">
                    Start Date
                  </label>
                  <input
                    id="start_date"
                    name="start_date"
                    type="date"
                    className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black shadow-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="due_date" className="block text-[12px] font-semibold text-slate-700 uppercase tracking-wide">
                    Due Date
                  </label>
                  <input
                    id="due_date"
                    name="due_date"
                    type="date"
                    className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black shadow-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label htmlFor="description" className="block text-[12px] font-semibold text-slate-700 uppercase tracking-wide">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    placeholder="Brief description of the project..."
                    className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-400 shadow-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                  {error}
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="relative border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (step === "project") {
                  setStep("company");
                } else {
                  onClose();
                }
              }}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium text-slate-600 transition-all hover:bg-slate-100"
            >
              {step === "project" ? (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  Back
                </>
              ) : (
                "Cancel"
              )}
            </button>
            {step === "project" && (
              <button
                type="submit"
                form="project-form"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-[13px] font-medium text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14" />
                      <path d="M5 12h14" />
                    </svg>
                    Create Project
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
