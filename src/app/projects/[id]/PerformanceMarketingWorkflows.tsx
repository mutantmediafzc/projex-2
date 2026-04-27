"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import MentionTextarea, { NoteBodyWithMentions, extractMentionedUserIds } from "@/components/MentionTextarea";

type StepStatus = "locked" | "pending" | "in_progress" | "completed";
type ApprovalStatus = "pending" | "approved" | "rejected" | "changes_required" | null;
type UserSummary = { id: string; full_name: string | null; email: string | null };
type FileUpload = { name: string; url: string; uploadedAt: string; isActive?: boolean; version?: number };
type StepComment = { id: string; userId: string; userName: string; body: string; createdAt: string };

type WorkflowStep = {
  id: string;
  number: number;
  title: string;
  description: string;
  status: StepStatus;
  assignedUserId: string | null;
  assignedUserName: string | null;
  taskId: string | null;
  completedAt: string | null;
  data?: Record<string, unknown>;
  files?: FileUpload[];
  comments?: StepComment[];
  approvalStatus?: ApprovalStatus;
  owner?: string;
  outputs?: string[];
  isApprovalStep?: boolean;
  isClientStep?: boolean;
};

type PerformanceMarketingWorkflowData = {
  steps: WorkflowStep[];
  campaignObjective?: string;
  targetGeo?: string;
  budget?: string;
  duration?: string;
  platforms?: string[];
};

function getDefaultSteps(): WorkflowStep[] {
  return [
    {
      id: "research_discovery",
      number: 1,
      title: "Research & Discovery",
      description: "Build strategic foundation with market research, competitor analysis, audience insights, and platform trends",
      status: "pending",
      assignedUserId: null,
      assignedUserName: null,
      taskId: null,
      completedAt: null,
      owner: "Performance Team",
      outputs: ["Research summary", "Benchmarks"],
      files: [],
      comments: [],
      data: { marketResearch: "", competitorAnalysis: "", audienceInsights: "" }
    },
    {
      id: "campaign_intake",
      number: 2,
      title: "Campaign Intake & Objective Definition",
      description: "Capture client requirements: objective, target geo & audience, budget, duration, KPIs (CPA, CPL, ROAS)",
      status: "locked",
      assignedUserId: null,
      assignedUserName: null,
      taskId: null,
      completedAt: null,
      owner: "Client + Performance Team",
      outputs: ["Campaign brief"],
      isClientStep: true,
      files: [],
      comments: [],
      data: { objective: "", targetGeo: "", audience: "", budget: "", duration: "", kpis: "" }
    },
    {
      id: "strategy_planning",
      number: 3,
      title: "Strategy & Planning",
      description: "Define execution approach: platform selection, funnel mapping (TOF/MOF/BOF), audience segmentation, budget allocation",
      status: "locked",
      assignedUserId: null,
      assignedUserName: null,
      taskId: null,
      completedAt: null,
      owner: "Performance Team",
      outputs: ["Strategy document"],
      files: [],
      comments: [],
      data: { platforms: [], funnelMapping: "", audienceSegments: "", budgetAllocation: "" }
    },
    {
      id: "internal_review",
      number: 4,
      title: "Internal Review & Alignment",
      description: "Ensure quality before client exposure: strategy review, feedback incorporation, final internal sign-off",
      status: "locked",
      assignedUserId: null,
      assignedUserName: null,
      taskId: null,
      completedAt: null,
      owner: "Team Leads / Strategy Heads",
      isApprovalStep: true,
      approvalStatus: null,
      comments: []
    },
    {
      id: "client_proposal",
      number: 5,
      title: "Client Proposal & Approval",
      description: "Validate direction with client: proposal presentation, feedback loop, final approval",
      status: "locked",
      assignedUserId: null,
      assignedUserName: null,
      taskId: null,
      completedAt: null,
      owner: "Client + Account Manager + Performance Team",
      isClientStep: true,
      isApprovalStep: true,
      approvalStatus: null,
      files: [],
      comments: []
    },
    {
      id: "asset_access_setup",
      number: 6,
      title: "Asset & Access Setup",
      description: "Prepare execution environment: platform access (Meta, Google, LinkedIn), landing pages, tracking setup (pixels, events)",
      status: "locked",
      assignedUserId: null,
      assignedUserName: null,
      taskId: null,
      completedAt: null,
      owner: "Performance Team + Client",
      isClientStep: true,
      outputs: ["Platform access", "Tracking setup"],
      files: [],
      comments: [],
      data: { metaAccess: false, googleAccess: false, linkedInAccess: false, pixelSetup: false, landingPageReady: false }
    },
    {
      id: "creative_production",
      number: 7,
      title: "Creative Brief → Production → Approval",
      description: "Full creative lifecycle: brief, production, internal review, client review, final approval",
      status: "locked",
      assignedUserId: null,
      assignedUserName: null,
      taskId: null,
      completedAt: null,
      owner: "Performance + Creative Team + Client",
      isClientStep: true,
      isApprovalStep: true,
      approvalStatus: null,
      files: [],
      comments: [],
      data: { briefShared: false, productionComplete: false, internalApproved: false }
    },
    {
      id: "campaign_setup",
      number: 8,
      title: "Campaign Setup",
      description: "Build campaign structure: hierarchy, audience mapping, budget setup, placement & bidding, tracking (pixel, UTMs)",
      status: "locked",
      assignedUserId: null,
      assignedUserName: null,
      taskId: null,
      completedAt: null,
      owner: "Performance Team",
      outputs: ["Campaign structure"],
      files: [],
      comments: [],
      data: { hierarchySetup: false, audienceMapping: false, budgetSetup: false, trackingSetup: false }
    },
    {
      id: "prelaunch_approval",
      number: 9,
      title: "Final Pre-Launch Approval",
      description: "Ensure all stakeholders aligned: creatives approved, tracking validated, budget confirmed, landing pages live",
      status: "locked",
      assignedUserId: null,
      assignedUserName: null,
      taskId: null,
      completedAt: null,
      owner: "Performance Team + Client",
      isApprovalStep: true,
      approvalStatus: null,
      comments: [],
      data: { creativesApproved: false, trackingValidated: false, budgetConfirmed: false, landingPagesLive: false }
    },
    {
      id: "launch_validation",
      number: 10,
      title: "Launch & Platform Validation",
      description: "Go live with monitoring: campaign launched, platform review (~24 hours), ad approval status, delivery & tracking check",
      status: "locked",
      assignedUserId: null,
      assignedUserName: null,
      taskId: null,
      completedAt: null,
      owner: "Platform + Performance Team",
      outputs: ["Campaign live"],
      comments: [],
      data: { launchDate: "", platformStatus: "", adApprovalStatus: "", deliveryStatus: "" }
    },
    {
      id: "learning_phase",
      number: 11,
      title: "Learning Phase Monitoring",
      description: "Stabilize performance: Meta 3-7 days, Google ~5 days, LinkedIn ~24 hours. Limited edits, monitor CTR, CPC, delivery",
      status: "locked",
      assignedUserId: null,
      assignedUserName: null,
      taskId: null,
      completedAt: null,
      owner: "Performance Team",
      comments: [],
      data: { learningStartDate: "", learningEndDate: "", ctr: "", cpc: "", deliveryNotes: "" }
    },
    {
      id: "performance_optimization",
      number: 12,
      title: "Performance Optimization",
      description: "Improve efficiency: pause low performers, scale high performers, refine audiences, identify funnel drop-offs",
      status: "locked",
      assignedUserId: null,
      assignedUserName: null,
      taskId: null,
      completedAt: null,
      owner: "Performance Team",
      comments: [],
      data: { optimizationNotes: "", pausedAds: "", scaledSegments: "", audienceRefinements: "" }
    },
    {
      id: "mid_campaign_review",
      number: 13,
      title: "Mid-Campaign Review & Client Feedback",
      description: "Strategic alignment (~2 weeks): share performance report, discuss CPA/CPL & lead quality, recommend scaling or changes",
      status: "locked",
      assignedUserId: null,
      assignedUserName: null,
      taskId: null,
      completedAt: null,
      owner: "Performance Team + Client",
      isClientStep: true,
      files: [],
      comments: [],
      data: { performanceReport: "", clientFeedback: "", scalingDecision: "" }
    },
    {
      id: "creative_refresh",
      number: 14,
      title: "Creative Fatigue & Refresh Cycle",
      description: "Maintain performance: triggered by high frequency, CTR drop, rising CPA. New creative request, approval, relaunch",
      status: "locked",
      assignedUserId: null,
      assignedUserName: null,
      taskId: null,
      completedAt: null,
      owner: "Performance + Creative Team + Client",
      isClientStep: true,
      files: [],
      comments: [],
      data: { refreshTrigger: "", newCreativeStatus: "" }
    },
    {
      id: "ongoing_management",
      number: 15,
      title: "Ongoing Campaign Management",
      description: "Maintain stability: budget optimization, audience expansion/refinement, placement adjustments, lead quality monitoring",
      status: "locked",
      assignedUserId: null,
      assignedUserName: null,
      taskId: null,
      completedAt: null,
      owner: "Performance Team",
      comments: [],
      data: { managementNotes: "", currentPhase: "optimizing" }
    },
    {
      id: "monthly_iteration",
      number: 16,
      title: "Monthly Iteration",
      description: "For always-on campaigns: monthly reporting, creative refresh, messaging updates, strategy adjustments",
      status: "locked",
      assignedUserId: null,
      assignedUserName: null,
      taskId: null,
      completedAt: null,
      owner: "Performance + Creative + Client",
      isClientStep: true,
      files: [],
      comments: [],
      data: { monthlyReports: [], iterationNotes: "" }
    },
    {
      id: "final_reporting",
      number: 17,
      title: "Final Reporting & Feedback Loop",
      description: "Close campaign lifecycle: spend vs results, CPA/CPL analysis, lead quality review. Learnings fed back to research",
      status: "locked",
      assignedUserId: null,
      assignedUserName: null,
      taskId: null,
      completedAt: null,
      owner: "Performance Team + Client",
      isClientStep: true,
      outputs: ["Final report", "Learnings document"],
      files: [],
      comments: [],
      data: { finalReport: "", learnings: "" }
    },
  ];
}

const getDefault = (): PerformanceMarketingWorkflowData => ({
  steps: getDefaultSteps(),
});

function AssignmentModal({ userName, onClose }: { userName: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div ref={ref} className="relative rounded-2xl bg-white p-6 shadow-2xl text-center max-w-sm mx-4">
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-8 w-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900">User Assigned</h3>
        <p className="mt-2 text-sm text-slate-600"><strong>{userName}</strong> has been assigned</p>
        <p className="mt-3 text-xs text-slate-400">Closing automatically...</p>
      </div>
    </div>
  );
}

function UserPicker({ users, onSelect, onClose }: { users: UserSummary[]; onSelect: (u: UserSummary) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [onClose]);
  const filtered = users.filter(u => (u.full_name || u.email || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
      <div className="p-2 border-b border-slate-100">
        <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-orange-400 focus:outline-none" />
      </div>
      <div className="max-h-56 overflow-y-auto">
        {filtered.length === 0 ? <p className="p-4 text-center text-sm text-slate-500">No users found</p> : filtered.map(u => (
          <button key={u.id} type="button" onClick={() => onSelect(u)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-orange-50">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-xs font-bold text-white">{(u.full_name || u.email || "?")[0].toUpperCase()}</div>
            <div className="flex-1 min-w-0"><p className="font-medium text-slate-900 truncate">{u.full_name || "No name"}</p><p className="text-xs text-slate-500 truncate">{u.email}</p></div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepCard({
  step,
  users,
  projectId,
  activePickerStep,
  setActivePickerStep,
  onAssignUser,
  onMarkIncomplete,
  onComplete,
  onAddComment,
  onUpdateData,
  onFileUpload,
  onApprove,
  onReject,
}: {
  step: WorkflowStep;
  users: UserSummary[];
  projectId: string;
  activePickerStep: string | null;
  setActivePickerStep: (id: string | null) => void;
  onAssignUser: (stepId: string, user: UserSummary) => void;
  onMarkIncomplete: (stepId: string) => void;
  onComplete: (stepId: string) => void;
  onAddComment: (stepId: string, body: string) => void;
  onUpdateData: (stepId: string, key: string, value: unknown) => void;
  onFileUpload: (stepId: string, file: File) => void;
  onApprove: (stepId: string) => void;
  onReject: (stepId: string) => void;
}) {
  const [commentText, setCommentText] = useState("");
  const [expanded, setExpanded] = useState(step.status === "in_progress" || step.status === "pending");

  const statusColors: Record<StepStatus, string> = {
    locked: "bg-slate-100 text-slate-400 border-slate-200",
    pending: "bg-amber-50 text-amber-600 border-amber-200",
    in_progress: "bg-blue-50 text-blue-600 border-blue-200",
    completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
  };

  const statusIcons: Record<StepStatus, React.ReactNode> = {
    locked: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    pending: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    in_progress: <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
    completed: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  };

  return (
    <div className={`rounded-2xl border-2 bg-white shadow-sm transition-all ${step.status === "locked" ? "opacity-60 border-slate-200" : step.status === "completed" ? "border-emerald-200" : "border-orange-200"}`}>
      <div
        className="flex items-center gap-4 p-4 cursor-pointer"
        onClick={() => step.status !== "locked" && setExpanded(!expanded)}
      >
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white ${step.status === "completed" ? "bg-gradient-to-br from-emerald-500 to-green-500" : step.status === "locked" ? "bg-slate-300" : "bg-gradient-to-br from-orange-500 to-red-500"}`}>
          {step.number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900">{step.title}</h3>
            {step.isClientStep && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">Client</span>
            )}
            {step.isApprovalStep && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Approval</span>
            )}
          </div>
          <p className="text-sm text-slate-500 truncate">{step.description}</p>
          {step.owner && <p className="text-xs text-slate-400 mt-0.5">Owner: {step.owner}</p>}
        </div>
        <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusColors[step.status]}`}>
          {statusIcons[step.status]}
          <span className="capitalize">{step.status.replace("_", " ")}</span>
        </div>
        {step.status !== "locked" && (
          <svg className={`h-5 w-5 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
        )}
      </div>

      {expanded && step.status !== "locked" && (
        <div className="border-t border-slate-100 p-4 space-y-4">
          {/* Assignment */}
          <div className="flex items-center justify-between">
            <div className="relative">
              <button
                type="button"
                onClick={() => setActivePickerStep(activePickerStep === step.id ? null : step.id)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
              >
                {step.assignedUserId ? (
                  <>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-[10px] font-bold text-white">
                      {(step.assignedUserName || "?")[0].toUpperCase()}
                    </div>
                    <span className="text-slate-700">{step.assignedUserName}</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    <span className="text-slate-500">Assign user</span>
                  </>
                )}
              </button>
              {activePickerStep === step.id && (
                <UserPicker users={users} onSelect={(u) => onAssignUser(step.id, u)} onClose={() => setActivePickerStep(null)} />
              )}
            </div>

            <div className="flex items-center gap-2">
              {step.status === "completed" && (
                <button
                  type="button"
                  onClick={() => onMarkIncomplete(step.id)}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  Reopen
                </button>
              )}
              {(step.status === "pending" || step.status === "in_progress") && step.assignedUserId && (
                step.isApprovalStep ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onReject(step.id)}
                      className="flex items-center gap-1 rounded-lg bg-red-500 px-3 py-2 text-xs font-medium text-white hover:bg-red-600"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => onApprove(step.id)}
                      className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                      Approve
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onComplete(step.id)}
                    className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-xs font-medium text-white hover:from-orange-600 hover:to-red-600"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    Complete
                  </button>
                )
              )}
            </div>
          </div>

          {/* Outputs */}
          {step.outputs && step.outputs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {step.outputs.map((output, i) => (
                <span key={i} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{output}</span>
              ))}
            </div>
          )}

          {/* Files */}
          {step.files !== undefined && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">Files</label>
              <div className="flex flex-wrap gap-2">
                {(step.files || []).map((f, i) => (
                  <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs hover:bg-slate-200">
                    <svg className="h-3.5 w-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    {f.name}
                  </a>
                ))}
                <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-500 hover:border-orange-400 hover:text-orange-600">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Upload
                  <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && onFileUpload(step.id, e.target.files[0])} />
                </label>
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">Comments ({(step.comments || []).length})</label>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {(step.comments || []).map((c) => (
                <div key={c.id} className="rounded-lg bg-slate-50 p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-700">{c.userName}</span>
                    <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <NoteBodyWithMentions body={c.body} />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <MentionTextarea
                  value={commentText}
                  onChange={setCommentText}
                  placeholder="Add a comment..."
                  users={users}
                  rows={2}
                />
              </div>
              <button
                type="button"
                onClick={() => { onAddComment(step.id, commentText); setCommentText(""); }}
                disabled={!commentText.trim()}
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PerformanceMarketingWorkflows({ projectId }: { projectId: string }) {
  const [data, setData] = useState<PerformanceMarketingWorkflowData>(getDefault());
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activePickerStep, setActivePickerStep] = useState<string | null>(null);
  const [assignmentModal, setAssignmentModal] = useState<{ show: boolean; userName: string }>({ show: false, userName: "" });

  useEffect(() => { supabaseClient.from("users").select("id, full_name, email").order("full_name").then(({ data: u }) => u && setUsers(u)); }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabaseClient.from("project_workflows").select("performance_marketing_data").eq("project_id", projectId).single().then(({ data: d }) => {
      if (cancelled) return;
      if (d?.performance_marketing_data && (d.performance_marketing_data as PerformanceMarketingWorkflowData).steps?.length > 0) {
        setData(d.performance_marketing_data as PerformanceMarketingWorkflowData);
      } else {
        setData(getDefault());
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [projectId]);

  async function save(updated: PerformanceMarketingWorkflowData) {
    setSaving(true);
    await supabaseClient.from("project_workflows").upsert({ project_id: projectId, performance_marketing_data: updated, updated_at: new Date().toISOString() }, { onConflict: "project_id" });
    setSaving(false);
  }

  async function createTask(step: WorkflowStep, userId: string, userName: string) {
    const { data: auth } = await supabaseClient.auth.getUser();
    if (!auth?.user) return null;
    const meta = auth.user.user_metadata || {};
    const name = [meta.first_name, meta.last_name].filter(Boolean).join(" ") || auth.user.email;
    const { data: t } = await supabaseClient.from("tasks").insert({
      project_id: projectId, name: `Performance Marketing: ${step.title}`, content: step.description,
      status: "not_started", priority: "high", type: "todo",
      created_by_user_id: auth.user.id, created_by_name: name,
      assigned_user_id: userId, assigned_user_name: userName, source: "admin",
      activity_date: new Date().toISOString().slice(0, 10),
    }).select("id").single();
    return t?.id || null;
  }

  async function assignUser(stepId: string, user: UserSummary) {
    const step = data.steps.find(s => s.id === stepId);
    if (!step) return;
    const userName = user.full_name || user.email || "Unknown";
    const taskId = step.taskId || await createTask(step, user.id, userName);
    const updated = { ...data, steps: data.steps.map(s => {
      if (s.id !== stepId) return s;
      const newStatus: StepStatus = s.status === "locked" ? "locked" : "in_progress";
      return { ...s, assignedUserId: user.id, assignedUserName: userName, status: newStatus, taskId };
    })};
    setData(updated); save(updated); setActivePickerStep(null);
    setAssignmentModal({ show: true, userName });
  }

  async function addComment(stepId: string, body: string) {
    const { data: auth } = await supabaseClient.auth.getUser();
    if (!auth?.user || !body.trim()) return;
    const meta = auth.user.user_metadata || {};
    const userName = [meta.first_name, meta.last_name].filter(Boolean).join(" ") || auth.user.email || "Unknown";
    const comment: StepComment = { id: crypto.randomUUID(), userId: auth.user.id, userName, body: body.trim(), createdAt: new Date().toISOString() };
    const updated = { ...data, steps: data.steps.map(s => s.id === stepId ? { ...s, comments: [...(s.comments || []), comment] } : s) };
    setData(updated); await save(updated);

    const mentionedIds = extractMentionedUserIds(body);
    if (mentionedIds.length > 0) {
      try {
        await supabaseClient.from("workflow_step_mentions").insert(mentionedIds.map(uid => ({
          project_id: projectId, step_id: stepId, mentioned_user_id: uid, comment_body: body.trim(), author_name: userName
        })));
        for (const uid of mentionedIds) {
          fetch("/api/notifications/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: uid, type: "workflow", body: body.trim(), authorName: userName, linkPath: `/projects/${projectId}` }),
          }).catch(() => {});
        }
      } catch (e) { console.warn("Mentions table not ready:", e); }
    }
  }

  async function completeStep(stepId: string) {
    const stepIndex = data.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return;
    const step = data.steps[stepIndex];
    if (!step.assignedUserId) return;

    const updated = { ...data, steps: data.steps.map((s, i) => {
      if (s.id === stepId) return { ...s, status: "completed" as StepStatus, completedAt: new Date().toISOString(), approvalStatus: "approved" as ApprovalStatus };
      if (i === stepIndex + 1 && s.status === "locked") return { ...s, status: "pending" as StepStatus };
      return s;
    })};
    setData(updated); await save(updated);
  }

  async function approveStep(stepId: string) {
    await completeStep(stepId);
  }

  async function rejectStep(stepId: string) {
    const stepIndex = data.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1 || stepIndex === 0) return;

    // Go back to previous step
    const updated = { ...data, steps: data.steps.map((s, i) => {
      if (s.id === stepId) return { ...s, approvalStatus: "rejected" as ApprovalStatus };
      if (i === stepIndex - 1) return { ...s, status: "in_progress" as StepStatus, completedAt: null };
      return s;
    })};
    setData(updated); await save(updated);
  }

  async function markStepIncomplete(stepId: string) {
    const stepIndex = data.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return;
    const updated = { ...data, steps: data.steps.map((s, i) => {
      if (s.id === stepId) return { ...s, status: "in_progress" as StepStatus, completedAt: null, approvalStatus: null };
      if (i > stepIndex) return { ...s, status: "locked" as StepStatus, completedAt: null, approvalStatus: null };
      return s;
    })};
    setData(updated); await save(updated);
  }

  async function updateStepData(stepId: string, key: string, value: unknown) {
    const updated = { ...data, steps: data.steps.map(s => s.id === stepId ? { ...s, data: { ...s.data, [key]: value } } : s) };
    setData(updated); await save(updated);
  }

  async function handleFileUpload(stepId: string, file: File) {
    const ext = file.name.split(".").pop() || "file";
    const path = `workflows/${projectId}/performance/${stepId}/${Date.now()}.${ext}`;
    const { error } = await supabaseClient.storage.from("project-files").upload(path, file);
    if (error) { console.error(error); return; }
    const { data: urlData } = supabaseClient.storage.from("project-files").getPublicUrl(path);

    const step = data.steps.find(s => s.id === stepId);
    const currentFiles = step?.files || [];
    const maxVersion = currentFiles.reduce((max, f) => Math.max(max, f.version || 1), 0);
    const updatedFiles = currentFiles.map(f => ({ ...f, isActive: false }));
    const newFile: FileUpload = { name: file.name, url: urlData.publicUrl, uploadedAt: new Date().toISOString(), isActive: true, version: maxVersion + 1 };

    const updated = { ...data, steps: data.steps.map(s => s.id === stepId ? { ...s, files: [...updatedFiles, newFile] } : s) };
    setData(updated); await save(updated);
  }

  // Guard: show loading while data is being fetched
  if (loading || !data.steps || data.steps.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500" />
      </div>
    );
  }

  const completedSteps = data.steps.filter(s => s.status === "completed").length;
  const totalSteps = data.steps.length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className="space-y-6">
      {assignmentModal.show && <AssignmentModal userName={assignmentModal.userName} onClose={() => setAssignmentModal({ show: false, userName: "" })} />}

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 p-6 text-white shadow-2xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase">
              🚀 Performance Marketing
            </span>
            <h2 className="text-2xl font-bold mt-1">Performance Marketing Workflow</h2>
            <p className="text-sm text-white/70 mt-1">Research → Strategy → Launch → Optimize → Report</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-3xl font-bold">{progress}%</p>
              <p className="text-xs text-white/60">{completedSteps}/{totalSteps} steps</p>
            </div>
            {saving && <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-2 rounded-full bg-white/20">
          <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {data.steps.map((step) => (
          <StepCard
            key={step.id}
            step={step}
            users={users}
            projectId={projectId}
            activePickerStep={activePickerStep}
            setActivePickerStep={setActivePickerStep}
            onAssignUser={assignUser}
            onMarkIncomplete={markStepIncomplete}
            onComplete={completeStep}
            onAddComment={addComment}
            onUpdateData={updateStepData}
            onFileUpload={handleFileUpload}
            onApprove={approveStep}
            onReject={rejectStep}
          />
        ))}
      </div>
    </div>
  );
}
