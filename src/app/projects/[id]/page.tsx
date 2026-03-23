import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";
import CollapseSidebarOnMount from "@/components/CollapseSidebarOnMount";
import ProjectModeToggle from "./ProjectModeToggle";
import ProjectNotesTasksCard from "./ProjectNotesTasksCard";
import ProjectContextCard from "./ProjectContextCard";
import ProjectDetailsCard from "./ProjectDetailsCard";
import ProjectWorkflowsWrapper from "./ProjectWorkflowsWrapper";
import ProjectDanoteButton from "./ProjectDanoteButton";
import PerformanceMarketingButton from "./PerformanceMarketingButton";
import AdminTabsClient from "./AdminTabsClient";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

type Mode = "operations" | "admin";

type AdminTab = "cockpit" | "invoice" | "workflows";

type ProjectRow = {
  id: string;
  company_id: string;
  primary_contact_id: string | null;
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
  is_archived: boolean;
};

type CompanySummary = {
  id: string;
  name: string | null;
  logo_url: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_twitter: string | null;
  social_linkedin: string | null;
  social_tiktok: string | null;
};

type ContactSummary = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
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

function formatFullName(first: string | null, last: string | null): string {
  return [first ?? "", last ?? ""].join(" ").trim();
}

async function getProjectWithRelations(id: string): Promise<{
  project: ProjectRow | null;
  company: CompanySummary | null;
  primaryContact: ContactSummary | null;
}> {
  try {
    const { data: project, error } = await supabaseClient
      .from("projects")
      .select(
        "id, company_id, primary_contact_id, name, description, status, processed_outcome, pipeline, project_type, social_calendar_id, value, start_date, due_date, created_at, is_archived",
      )
      .eq("id", id)
      .single();

    if (error || !project) {
      return { project: null, company: null, primaryContact: null };
    }

    const projectAny = project as any;

    let company: CompanySummary | null = null;
    const companyId = projectAny.company_id as string | null | undefined;
    if (companyId) {
      const { data: companyData } = await supabaseClient
        .from("companies")
        .select("id, name, logo_url, social_instagram, social_facebook, social_twitter, social_linkedin, social_tiktok")
        .eq("id", companyId)
        .maybeSingle();

      if (companyData) {
        company = companyData as CompanySummary;
      }
    }

    let primaryContact: ContactSummary | null = null;
    const primaryContactId = projectAny.primary_contact_id as string | null | undefined;
    
    // First try to get primary contact from project
    if (primaryContactId) {
      const { data: contactData } = await supabaseClient
        .from("contacts")
        .select("id, first_name, last_name, email, phone, job_title")
        .eq("id", primaryContactId)
        .maybeSingle();

      if (contactData) {
        primaryContact = contactData as ContactSummary;
      }
    }
    
    // If no primary contact on project, try to get from company's contacts
    if (!primaryContact && companyId) {
      const { data: companyContacts } = await supabaseClient
        .from("contacts")
        .select("id, first_name, last_name, email, phone, job_title")
        .eq("company_id", companyId)
        .order("created_at", { ascending: true })
        .limit(1);

      if (companyContacts && companyContacts.length > 0) {
        primaryContact = companyContacts[0] as ContactSummary;
      }
    }

    return {
      project: project as ProjectRow,
      company,
      primaryContact,
    };
  } catch {
    return { project: null, company: null, primaryContact: null };
  }
}

export default async function ProjectPage({
  params,
  searchParams,
}: ProjectPageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const { project, company, primaryContact } = await getProjectWithRelations(id);

  if (!project) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 shadow-sm">
        Project not found.
      </div>
    );
  }

  const rawMode = (() => {
    const value = resolvedSearchParams?.mode;
    if (typeof value === "string") return value;
    if (Array.isArray(value) && value.length > 0) return value[0];
    return undefined;
  })();

  const mode: Mode = rawMode === "admin" ? "admin" : "operations";

  const rawAdminTab = (() => {
    const value = resolvedSearchParams?.tab;
    if (typeof value === "string") return value;
    if (Array.isArray(value) && value.length > 0) return value[0];
    return undefined;
  })();

  const adminTab: AdminTab =
    rawAdminTab === "cockpit" || rawAdminTab === "invoice" || rawAdminTab === "workflows"
      ? (rawAdminTab as AdminTab)
      : "cockpit";

  // Admin tabs are now handled by AdminTabsClient component

  const statusDisplay = (() => {
    if (project.status === "Processed" && project.processed_outcome) {
      return `Processed (${project.processed_outcome})`;
    }
    return project.status;
  })();

  return (
    <div className="space-y-6">
      <CollapseSidebarOnMount />
      <div className="relative">
        <div className="relative z-10 flex items-baseline justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-slate-900">{project.name}</h1>
              <ProjectModeToggle projectId={project.id} mode={mode} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
              {statusDisplay ? (
                <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-slate-50">
                  <span className="opacity-80">Status</span>
                  <span className="ml-1 font-semibold">{statusDisplay}</span>
                </span>
              ) : null}
              {project.pipeline ? (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  Pipeline: {project.pipeline}
                </span>
              ) : null}
              {company ? (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  Company: {company.name ?? "Unnamed"}
                </span>
              ) : null}
              {company && (company.social_instagram || company.social_facebook || company.social_twitter || company.social_linkedin || company.social_tiktok) ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-pink-200 bg-pink-50 px-2 py-0.5 text-[11px] font-medium text-pink-600">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                  @{company.social_instagram || company.social_facebook || company.social_twitter || company.social_linkedin || company.social_tiktok}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ProjectDanoteButton projectId={project.id} projectName={project.name} />
            <PerformanceMarketingButton projectId={project.id} />
            {company ? (
              <Link
                href={`/companies/${company.id}`}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <span className="inline-flex h-3.5 w-3.5 items-center justify-center">
                  <svg
                    className="h-3.5 w-3.5 text-slate-600"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h4v12H3zM10 10h4v8h-4zM17 8h4v10h-4z" />
                  </svg>
                </span>
                <span>Company</span>
              </Link>
            ) : null}
            <Link
              href="/companies"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center">
                <svg
                  className="h-3.5 w-3.5 text-slate-600"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h4v12H3zM10 10h4v8h-4zM17 8h4v10h-4z" />
                </svg>
              </span>
              <span>All companies</span>
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute -top-6 right-0 h-40 w-40 overflow-hidden">
          <div
            className={`${mode === "admin" ? "medical-glow" : "crm-glow"} h-full w-full`}
          />
        </div>
      </div>

      {mode === "operations" ? (
        <>
          <div className="grid items-stretch gap-6 md:grid-cols-2">
            {/* Enhanced Project Details Card - Editable */}
            <ProjectDetailsCard project={project} companyId={project.company_id} />

            {/* Enhanced Context Card */}
            <ProjectContextCard
              projectId={project.id}
              company={company}
              primaryContact={primaryContact}
            />
          </div>

          <ProjectNotesTasksCard projectId={project.id} />

          {/* Workflows Section - Available to all users */}
          <div className="mt-6">
            <div className="rounded-lg border border-slate-200/80 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <svg className="h-4 w-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  Project Workflow
                </h3>
              </div>
              <div className="p-4">
                <ProjectWorkflowsWrapper projectId={project.id} projectType={project.project_type} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-5">
          {/* Admin Mode Header Bar */}
          <div className="rounded-lg border border-slate-300/80 bg-gradient-to-r from-slate-50 to-slate-100/80 px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-white shadow-sm">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Administrative Panel</h2>
                  <p className="text-[10px] text-slate-500">Manage financials, documents, and administrative records</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-500">
                <span className="rounded-full bg-slate-200 px-2 py-0.5 font-medium text-slate-600">Admin Mode</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation - More Formal Style */}
          <div className="rounded-lg border border-slate-200/80 bg-white shadow-sm">
            <AdminTabsClient
              projectId={project.id}
              projectName={project.name}
              projectType={project.project_type}
              activeTab={adminTab}
            />
          </div>
        </div>
      )}
    </div>
  );
}
