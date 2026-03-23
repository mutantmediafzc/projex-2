"use client";

import Link from "next/link";
import { useUserRole } from "@/app/profile/hooks/useUserRole";
import InvoiceManagement from "./InvoiceManagement";
import ProjectNotesTasksCard from "./ProjectNotesTasksCard";
import ProjectWorkflowsWrapper from "./ProjectWorkflowsWrapper";

type AdminTab = "cockpit" | "invoice" | "workflows";

interface AdminTabsClientProps {
  projectId: string;
  projectName: string;
  projectType: string | null;
  activeTab: AdminTab;
}

export default function AdminTabsClient({
  projectId,
  projectName,
  projectType,
  activeTab,
}: AdminTabsClientProps) {
  const { role } = useUserRole();
  const isAdmin = role === "admin";

  // Filter tabs based on role - only admins can see invoice tab
  const adminTabs: { id: AdminTab; label: string }[] = [
    { id: "cockpit", label: "Cockpit" },
    ...(isAdmin ? [{ id: "invoice" as AdminTab, label: "Quotes & Invoices" }] : []),
    { id: "workflows", label: "Workflows" },
  ];

  // If non-admin tries to access invoice tab, redirect to cockpit
  const currentTab = !isAdmin && activeTab === "invoice" ? "cockpit" : activeTab;

  return (
    <>
      {/* Tab Navigation */}
      <nav className="flex flex-wrap border-b border-slate-200 px-2">
        {adminTabs.map((tab) => {
          const isActive = tab.id === currentTab;
          return (
            <Link
              key={tab.id}
              href={`/projects/${projectId}?mode=admin&tab=${tab.id}`}
              className={
                (isActive
                  ? "border-slate-800 bg-slate-800 text-white"
                  : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-800") +
                " relative inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-[11px] font-semibold tracking-wide transition-all"
              }
              style={isActive ? { borderRadius: '6px 6px 0 0', marginBottom: '-1px' } : {}}
            >
              {tab.id === "cockpit" && (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              )}
              {tab.id === "invoice" && (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M2 10h20" />
                </svg>
              )}
              {tab.id === "workflows" && (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              )}
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Tab Content Area */}
      <div className="p-4">
        {currentTab === "cockpit" && (
          <ProjectNotesTasksCard projectId={projectId} source="admin" />
        )}

        {currentTab === "invoice" && isAdmin && (
          <InvoiceManagement 
            projectId={projectId} 
            projectName={projectName}
          />
        )}

        {currentTab === "workflows" && (
          <ProjectWorkflowsWrapper projectId={projectId} projectType={projectType} />
        )}
      </div>
    </>
  );
}
