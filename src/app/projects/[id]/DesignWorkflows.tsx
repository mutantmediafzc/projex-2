"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import MentionTextarea, { NoteBodyWithMentions, extractMentionedUserIds } from "@/components/MentionTextarea";

type StepStatus = "locked" | "pending" | "in_progress" | "completed" | "rejected";
type DesignWorkflowLane = "main_project" | "on_demand" | null;
type ApprovalStatus = "pending" | "approved" | "rejected" | null;
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
  rejectedAt: string | null;
  rejectionReason: string | null;
  data?: Record<string, unknown>;
  files?: FileUpload[];
  comments?: StepComment[];
  approvalStatus?: ApprovalStatus;
  suggestedAssignees?: string;
  isApprovalStep?: boolean;
  skipQA?: boolean;
};

type DesignWorkflowData = {
  lane: DesignWorkflowLane;
  steps: WorkflowStep[];
};

const LANE_OPTIONS = [
  { value: "main_project", label: "Main Project", desc: "Full creative workflow with 3-layer approval system" },
  { value: "on_demand", label: "On-Demand Work", desc: "Fast-track production for quick turnaround projects" },
] as const;

function getMainProjectSteps(): WorkflowStep[] {
  return [
    { id: "brief", number: 1, title: "Brief", description: "Content Strategy & Pillars", status: "pending", assignedUserId: null, assignedUserName: null, taskId: null, completedAt: null, rejectedAt: null, rejectionReason: null, suggestedAssignees: "Marianne, Abdel, Jeano, Corrine", files: [], comments: [] },
    { id: "internal_huddle", number: 2, title: "Internal Huddle", description: "Strategy alignment with Content Creator + Designers, SMMs to provide strategy with pegs/references", status: "locked", assignedUserId: null, assignedUserName: null, taskId: null, completedAt: null, rejectedAt: null, rejectionReason: null, suggestedAssignees: "Content Creator, Designers, SMMs, Corrine", files: [], comments: [], data: { pegsProvided: false, strategyNotes: "" } },
    { id: "concept", number: 3, title: "Concept", description: "Develops the 'Big Idea', scripts, and visual direction", status: "locked", assignedUserId: null, assignedUserName: null, taskId: null, completedAt: null, rejectedAt: null, rejectionReason: null, suggestedAssignees: "Dan", files: [], comments: [], data: { conceptNotes: "" } },
    { id: "creation", number: 4, title: "Creation", description: "High-level design and video editing execution", status: "locked", assignedUserId: null, assignedUserName: null, taskId: null, completedAt: null, rejectedAt: null, rejectionReason: null, suggestedAssignees: "Aryaa, Preslee, Sid, Editors", files: [], comments: [], data: { useBrandMusic: false, creationNotes: "" } },
    { id: "qa_check", number: 5, title: "QA Check", description: "Mandatory QA: Checks brand alignment and design quality", status: "locked", assignedUserId: null, assignedUserName: null, taskId: null, completedAt: null, rejectedAt: null, rejectionReason: null, suggestedAssignees: "Sid", isApprovalStep: true, approvalStatus: null, comments: [] },
    { id: "approval", number: 6, title: "Final Approval", description: "The ultimate 'Green Light' for the project", status: "locked", assignedUserId: null, assignedUserName: null, taskId: null, completedAt: null, rejectedAt: null, rejectionReason: null, suggestedAssignees: "Jeano", isApprovalStep: true, approvalStatus: null, comments: [] },
    { id: "pre_post", number: 7, title: "Pre-Post Check", description: "SMM Safety Net: Final polish on spelling, grammar, tags, and captions", status: "locked", assignedUserId: null, assignedUserName: null, taskId: null, completedAt: null, rejectedAt: null, rejectionReason: null, suggestedAssignees: "Marianne, Abdel", isApprovalStep: true, approvalStatus: null, comments: [] },
    { id: "live", number: 8, title: "Live", description: "Content is posted to the respective platforms", status: "locked", assignedUserId: null, assignedUserName: null, taskId: null, completedAt: null, rejectedAt: null, rejectionReason: null, files: [], comments: [], data: { publishedLinks: "" } },
  ];
}

function getOnDemandSteps(): WorkflowStep[] {
  return [
    { id: "intake", number: 1, title: "Intake", description: "Driven by the account plan or specific client request", status: "pending", assignedUserId: null, assignedUserName: null, taskId: null, completedAt: null, rejectedAt: null, rejectionReason: null, suggestedAssignees: "Corrine", files: [], comments: [], data: { requestNotes: "" } },
    { id: "creation", number: 2, title: "Creation", description: "Rapid production of static assets or quick-turn videos", status: "locked", assignedUserId: null, assignedUserName: null, taskId: null, completedAt: null, rejectedAt: null, rejectionReason: null, suggestedAssignees: "Mahra, Catherine", files: [], comments: [], data: { creationNotes: "" } },
    { id: "qa_check", number: 3, title: "QA Check", description: "Fast-Track: Bypasses Sid's QA to maintain agency speed", status: "locked", assignedUserId: null, assignedUserName: null, taskId: null, completedAt: null, rejectedAt: null, rejectionReason: null, skipQA: true, comments: [] },
    { id: "approval", number: 4, title: "Approval", description: "Final Sign-off: Must be viewed and approved by Jeano", status: "locked", assignedUserId: null, assignedUserName: null, taskId: null, completedAt: null, rejectedAt: null, rejectionReason: null, suggestedAssignees: "Jeano", isApprovalStep: true, approvalStatus: null, comments: [] },
    { id: "pre_post", number: 5, title: "Pre-Post Check", description: "SMM Safety Net: Final polish on spelling, grammar, tags, and captions", status: "locked", assignedUserId: null, assignedUserName: null, taskId: null, completedAt: null, rejectedAt: null, rejectionReason: null, suggestedAssignees: "Marianne, Abdel", isApprovalStep: true, approvalStatus: null, comments: [] },
    { id: "live", number: 6, title: "Live", description: "Content is posted to the respective platforms", status: "locked", assignedUserId: null, assignedUserName: null, taskId: null, completedAt: null, rejectedAt: null, rejectionReason: null, files: [], comments: [], data: { publishedLinks: "" } },
  ];
}

const getDefault = (): DesignWorkflowData => ({
  lane: null,
  steps: [{
    id: "select_lane", number: 1, title: "Select Workflow Type",
    description: "Choose the appropriate workflow for this design project",
    status: "pending", assignedUserId: null, assignedUserName: null,
    taskId: null, completedAt: null, rejectedAt: null, rejectionReason: null, data: { selectedLane: null }, comments: [],
  }],
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
        <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-black focus:border-purple-400 focus:outline-none" />
      </div>
      <div className="max-h-56 overflow-y-auto">
        {filtered.length === 0 ? <p className="p-4 text-center text-sm text-slate-500">No users found</p> : filtered.map(u => (
          <button key={u.id} type="button" onClick={() => onSelect(u)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-purple-50">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-bold text-white">{(u.full_name || u.email || "?")[0].toUpperCase()}</div>
            <div className="flex-1 min-w-0"><p className="font-medium text-slate-900 truncate">{u.full_name || "No name"}</p><p className="text-xs text-slate-500 truncate">{u.email}</p></div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DesignWorkflows({ projectId }: { projectId: string }) {
  const [data, setData] = useState<DesignWorkflowData>(getDefault());
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activePickerStep, setActivePickerStep] = useState<string | null>(null);
  const [selectedLane, setSelectedLane] = useState<DesignWorkflowLane>(null);
  const [assignmentModal, setAssignmentModal] = useState<{ show: boolean; userName: string }>({ show: false, userName: "" });

  useEffect(() => { supabaseClient.from("users").select("id, full_name, email").order("full_name").then(({ data: u }) => u && setUsers(u)); }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabaseClient.from("project_workflows").select("design_workflow_data").eq("project_id", projectId).single().then(({ data: d }) => {
      if (cancelled) return;
      if (d?.design_workflow_data && (d.design_workflow_data as DesignWorkflowData).steps?.length > 0) {
        const loaded = d.design_workflow_data as DesignWorkflowData;
        setData(loaded);
        if (loaded.lane) setSelectedLane(loaded.lane);
      } else {
        setData(getDefault());
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [projectId]);

  async function save(updated: DesignWorkflowData) {
    setSaving(true);
    await supabaseClient.from("project_workflows").upsert({ project_id: projectId, design_workflow_data: updated, updated_at: new Date().toISOString() }, { onConflict: "project_id" });
    setSaving(false);
  }

  async function createTask(step: WorkflowStep, userId: string, userName: string) {
    const { data: auth } = await supabaseClient.auth.getUser();
    if (!auth?.user) return null;
    const meta = auth.user.user_metadata || {};
    const name = [meta.first_name, meta.last_name].filter(Boolean).join(" ") || auth.user.email;
    const { data: t } = await supabaseClient.from("tasks").insert({
      project_id: projectId, name: `Design Workflow: ${step.title}`, content: step.description,
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
    const updated = { ...data, steps: data.steps.map(s => s.id === stepId ? { ...s, assignedUserId: user.id, assignedUserName: userName, status: (s.status === "locked" ? "locked" : "in_progress") as StepStatus, taskId } : s) };
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

  async function completeLaneSelection() {
    if (!selectedLane) return;
    const newSteps = selectedLane === "main_project" ? getMainProjectSteps() : getOnDemandSteps();
    const updated: DesignWorkflowData = {
      lane: selectedLane,
      steps: data.steps[0] ? [{ ...data.steps[0], status: "completed" as StepStatus, completedAt: new Date().toISOString(), data: { selectedLane } }, ...newSteps] : newSteps
    };
    setData(updated); await save(updated);
  }

  async function completeStep(stepId: string) {
    const stepIndex = data.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return;
    const step = data.steps[stepIndex];
    if (!step.assignedUserId && !step.skipQA) return;

    const updated = { ...data, steps: data.steps.map((s, i) => {
      if (s.id === stepId) return { ...s, status: "completed" as StepStatus, completedAt: new Date().toISOString(), approvalStatus: s.isApprovalStep ? "approved" as ApprovalStatus : s.approvalStatus };
      if (i === stepIndex + 1 && s.status === "locked") {
        return { ...s, status: "pending" as StepStatus };
      }
      return s;
    })};
    setData(updated); await save(updated);
  }

  async function rejectStep(stepId: string, reason: string) {
    const stepIndex = data.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return;
    
    // For QA Check rejection, go back to Creation step
    let targetStepId = "creation";
    if (stepId === "approval" || stepId === "pre_post") {
      targetStepId = "creation";
    }
    
    const targetIndex = data.steps.findIndex(s => s.id === targetStepId);
    
    const updated = { ...data, steps: data.steps.map((s, i) => {
      if (s.id === stepId) return { ...s, status: "rejected" as StepStatus, rejectedAt: new Date().toISOString(), rejectionReason: reason, approvalStatus: "rejected" as ApprovalStatus };
      if (s.id === targetStepId) return { ...s, status: "in_progress" as StepStatus, completedAt: null };
      if (i > targetIndex && i < stepIndex) return { ...s, status: "locked" as StepStatus, completedAt: null };
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
    const path = `workflows/${projectId}/design/${stepId}/${Date.now()}.${ext}`;
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

  async function markStepIncomplete(stepId: string) {
    const stepIndex = data.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return;
    const updated = { ...data, steps: data.steps.map((s, i) => {
      if (s.id === stepId) return { ...s, status: "in_progress" as StepStatus, completedAt: null, approvalStatus: null };
      if (i > stepIndex) return { ...s, status: "locked" as StepStatus, completedAt: null, approvalStatus: null };
      return s;
    })};
    if (stepId === "select_lane" && updated.steps[0]) { updated.steps = [{ ...updated.steps[0] }]; updated.lane = null; }
    setData(updated); await save(updated);
  }

  // Guard: show loading while data is being fetched
  if (loading || !data.steps || data.steps.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-purple-500" />
      </div>
    );
  }

  const completedSteps = data.steps.filter(s => s.status === "completed").length;
  const totalSteps = data.steps.length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const laneLabel = data.lane === "main_project" ? "Main Project" : data.lane === "on_demand" ? "On-Demand" : "";
  const laneColor = data.lane === "main_project" ? "from-purple-600 via-purple-700 to-pink-700" : "from-orange-500 via-orange-600 to-red-600";

  return (
    <div className="space-y-6">
      {assignmentModal.show && <AssignmentModal userName={assignmentModal.userName} onClose={() => setAssignmentModal({ show: false, userName: "" })} />}
      
      {/* Header */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${data.lane ? laneColor : "from-purple-600 via-purple-700 to-pink-700"} p-6 text-white shadow-2xl`}>
        <div className="relative flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase">
              {data.lane ? `Design: ${laneLabel}` : "Design Project"}
            </span>
            <h2 className="text-2xl font-bold mt-1">Creative Design Workflow</h2>
            <p className="text-sm text-white/70 mt-1">
              {data.lane === "main_project" ? "3-layer approval system for quality control" : 
               data.lane === "on_demand" ? "Fast-track production workflow" : 
               "Select the workflow type to begin"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right"><p className="text-3xl font-bold">{progress}%</p><p className="text-xs text-white/60">{completedSteps}/{totalSteps} steps</p></div>
            {saving && <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {data.steps.map((step) => (
          <DesignStepCard key={step.id} step={step} data={data} users={users} projectId={projectId}
            activePickerStep={activePickerStep} setActivePickerStep={setActivePickerStep}
            onAssignUser={assignUser} onMarkIncomplete={markStepIncomplete} onComplete={completeStep}
            onReject={rejectStep} onAddComment={addComment} onUpdateData={updateStepData}
            onFileUpload={handleFileUpload}
            selectedLane={selectedLane} setSelectedLane={setSelectedLane} onCompleteLaneSelection={completeLaneSelection}
          />
        ))}
      </div>
    </div>
  );
}

function DesignStepCard({ step, data, users, projectId, activePickerStep, setActivePickerStep, onAssignUser, onMarkIncomplete, onComplete, onReject, onAddComment, onUpdateData, onFileUpload, selectedLane, setSelectedLane, onCompleteLaneSelection }: {
  step: WorkflowStep; data: DesignWorkflowData; users: UserSummary[]; projectId: string;
  activePickerStep: string | null; setActivePickerStep: (s: string | null) => void;
  onAssignUser: (stepId: string, user: UserSummary) => void;
  onMarkIncomplete: (stepId: string) => void;
  onComplete: (stepId: string) => void;
  onReject: (stepId: string, reason: string) => void;
  onAddComment: (stepId: string, body: string) => void;
  onUpdateData: (stepId: string, key: string, value: unknown) => void;
  onFileUpload: (stepId: string, file: File) => void;
  selectedLane: DesignWorkflowLane; setSelectedLane: (l: DesignWorkflowLane) => void;
  onCompleteLaneSelection: () => void;
}) {
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const isLocked = step.status === "locked";
  const isDone = step.status === "completed";
  const isRejected = step.status === "rejected";
  const isActive = step.status === "pending" || step.status === "in_progress";
  const isSelectLane = step.id === "select_lane";

  async function handleSubmitComment() {
    if (!commentText.trim()) return;
    await onAddComment(step.id, commentText);
    setCommentText("");
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await onFileUpload(step.id, file);
    setUploading(false);
  }

  function handleReject() {
    if (!rejectionReason.trim()) return;
    onReject(step.id, rejectionReason);
    setShowRejectionModal(false);
    setRejectionReason("");
  }

  const statusColor = isLocked ? "bg-slate-300 text-slate-500" : isDone ? "bg-emerald-500 text-white" : isRejected ? "bg-red-500 text-white" : "bg-purple-500 text-white";
  const cardBorder = isLocked ? "border-slate-200 bg-slate-50 opacity-60" : isDone ? "border-emerald-200 bg-emerald-50/50" : isRejected ? "border-red-200 bg-red-50/50" : "border-purple-200 bg-white shadow-lg";

  return (
    <div className={`rounded-2xl border p-5 transition-all ${cardBorder}`}>
      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative rounded-2xl bg-white p-6 shadow-2xl max-w-md mx-4 w-full">
            <button onClick={() => setShowRejectionModal(false)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Reject & Send Back</h3>
            <p className="text-sm text-slate-600 mb-3">This will send the work back to the Creation step. Please provide feedback:</p>
            <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Enter rejection reason and feedback..." rows={4} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-black focus:border-red-400 focus:outline-none" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowRejectionModal(false)} className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium">Cancel</button>
              <button onClick={handleReject} disabled={!rejectionReason.trim()} className="flex-1 py-2 rounded-xl bg-red-600 text-white font-medium disabled:opacity-50">Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold shrink-0 ${statusColor}`}>
            {isDone ? "✓" : isRejected ? "✗" : step.number}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-slate-900">{step.title}</h3>
              {step.isApprovalStep && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase">Approval</span>}
              {step.skipQA && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">Bypassed</span>}
            </div>
            <p className="text-[12px] text-slate-500">{step.description}</p>
            {step.suggestedAssignees && !isDone && (
              <p className="text-[10px] text-purple-600 mt-1">Suggested: {step.suggestedAssignees}</p>
            )}
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase shrink-0 ${
            isLocked ? "bg-slate-200 text-slate-500" : 
            isDone ? "bg-emerald-100 text-emerald-700" : 
            isRejected ? "bg-red-100 text-red-700" :
            "bg-purple-100 text-purple-700"
          }`}>
            {isLocked ? "Locked" : isDone ? "Completed" : isRejected ? "Rejected" : "In Progress"}
          </span>
        </div>
        {!isLocked && !step.skipQA && (
          <div className="flex items-center gap-2">
            {isDone && <button type="button" onClick={() => onMarkIncomplete(step.id)} className="text-xs text-amber-600 hover:text-amber-700 font-medium px-2 py-1 rounded hover:bg-amber-50">Mark Incomplete</button>}
            <div className="relative">
              <button type="button" onClick={() => !isDone && setActivePickerStep(activePickerStep === step.id ? null : step.id)} disabled={isDone} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] ${step.assignedUserId ? "border-purple-200 bg-purple-50 text-purple-700" : "border-slate-200 bg-white text-slate-900"} ${isDone ? "opacity-50" : ""}`}>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span className="font-medium">{step.assignedUserName || "Assign User"}</span>
              </button>
              {activePickerStep === step.id && !isDone && <UserPicker users={users} onSelect={(u) => onAssignUser(step.id, u)} onClose={() => setActivePickerStep(null)} />}
            </div>
          </div>
        )}
      </div>

      {/* Rejected Banner */}
      {isRejected && step.rejectionReason && (
        <div className="mt-4 p-3 rounded-xl bg-red-100 border border-red-200">
          <p className="text-xs font-semibold text-red-700">Rejection Feedback:</p>
          <p className="text-sm text-red-800 mt-1">{step.rejectionReason}</p>
          <p className="text-[10px] text-red-500 mt-2">Rejected on: {step.rejectedAt ? new Date(step.rejectedAt).toLocaleString() : "N/A"}</p>
        </div>
      )}

      {/* Lane Selection Step */}
      {isSelectLane && isActive ? (
        <div className="mt-5 space-y-4">
          <p className="text-[11px] font-semibold text-slate-600 uppercase">Select Workflow Type</p>
          {LANE_OPTIONS.map(l => (
            <label key={l.value} className={`flex items-center gap-4 rounded-xl border-2 p-4 cursor-pointer ${selectedLane === l.value ? "border-purple-500 bg-purple-50" : "border-slate-200 hover:border-purple-200"}`}>
              <input type="radio" name="lane" value={l.value} checked={selectedLane === l.value} onChange={() => setSelectedLane(l.value as DesignWorkflowLane)} className="h-5 w-5 accent-purple-600" />
              <div>
                <p className="font-semibold text-slate-900">{l.label}</p>
                <p className="text-[12px] text-slate-500">{l.desc}</p>
              </div>
            </label>
          ))}
          <button type="button" onClick={onCompleteLaneSelection} disabled={!selectedLane} className="w-full mt-4 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">Start Workflow</button>
        </div>
      ) : null}
      {isSelectLane && isDone ? (
        <div className="mt-4 p-4 rounded-xl bg-emerald-100 text-emerald-800 text-sm">
          <strong>Selected:</strong> {LANE_OPTIONS.find(l => l.value === data.lane)?.label}
        </div>
      ) : null}

      {/* Skip QA Step (auto-complete) */}
      {step.skipQA && isActive ? (
        <div className="mt-5 space-y-4">
          <div className="p-4 rounded-xl bg-slate-100 border border-slate-200">
            <p className="text-sm text-slate-600">This step is bypassed for On-Demand workflow to maintain speed.</p>
          </div>
          <button type="button" onClick={() => onComplete(step.id)} className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700">Skip & Continue</button>
        </div>
      ) : null}

      {/* Regular Content Steps with Files */}
      {["brief", "internal_huddle", "concept", "creation", "intake", "live"].includes(step.id) && isActive ? (
        <div className="mt-5 space-y-4">
          {/* Step-specific inputs */}
          {step.id === "internal_huddle" && (
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={Boolean(step.data?.pegsProvided)} onChange={(e) => onUpdateData(step.id, "pegsProvided", e.target.checked)} className="h-4 w-4 accent-purple-600 rounded" />
                <span className="text-sm text-slate-700">Pegs/references provided to designers</span>
              </label>
              <textarea value={(step.data?.strategyNotes as string) || ""} onChange={(e) => onUpdateData(step.id, "strategyNotes", e.target.value)} placeholder="Strategy notes..." rows={4} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-black focus:border-purple-400 focus:outline-none" />
            </div>
          )}
          {step.id === "concept" && (
            <textarea value={(step.data?.conceptNotes as string) || ""} onChange={(e) => onUpdateData(step.id, "conceptNotes", e.target.value)} placeholder="Concept notes, big idea, scripts..." rows={4} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-black focus:border-purple-400 focus:outline-none" />
          )}
          {step.id === "creation" && (
            <div className="space-y-3">
              {data.lane === "main_project" && (
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={Boolean(step.data?.useBrandMusic)} onChange={(e) => onUpdateData(step.id, "useBrandMusic", e.target.checked)} className="h-4 w-4 accent-purple-600 rounded" />
                  <span className="text-sm text-slate-700">Using brand music</span>
                </label>
              )}
              <textarea value={(step.data?.creationNotes as string) || ""} onChange={(e) => onUpdateData(step.id, "creationNotes", e.target.value)} placeholder="Creation notes..." rows={3} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-black focus:border-purple-400 focus:outline-none" />
            </div>
          )}
          {step.id === "intake" && (
            <textarea value={(step.data?.requestNotes as string) || ""} onChange={(e) => onUpdateData(step.id, "requestNotes", e.target.value)} placeholder="Client request details..." rows={4} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-black focus:border-purple-400 focus:outline-none" />
          )}
          {step.id === "live" && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-2">Published Links</label>
              <textarea value={(step.data?.publishedLinks as string) || ""} onChange={(e) => onUpdateData(step.id, "publishedLinks", e.target.value)} placeholder="Enter links to published content (one per line)..." rows={3} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-black focus:border-purple-400 focus:outline-none" />
            </div>
          )}

          {/* File Upload */}
          <input ref={fileRef} type="file" onChange={handleUpload} className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-4 w-full hover:border-purple-400 hover:bg-purple-50/50 disabled:opacity-50">
            {uploading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" /> : (
              <>
                <svg className="h-6 w-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span className="text-sm text-slate-500">Upload files</span>
              </>
            )}
          </button>
          
          {/* Files List */}
          {step.files && step.files.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-slate-500 uppercase">Uploaded Files</p>
              {step.files.map((f, i) => (
                <div key={i} className={`flex items-center gap-2 p-3 rounded-lg border ${f.isActive ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                  <div className="flex-1 flex items-center gap-2 text-sm text-slate-700 min-w-0">
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span className="truncate">{f.name}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">v{f.version || 1}</span>
                  </div>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-[10px] font-semibold hover:bg-purple-200 transition-colors shrink-0">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                    Preview
                  </a>
                  {f.isActive && <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-bold shrink-0">ACTIVE</span>}
                </div>
              ))}
            </div>
          )}

          <button type="button" onClick={() => onComplete(step.id)} disabled={!step.assignedUserId} className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed">Complete Step</button>
          {!step.assignedUserId && <p className="text-[11px] text-amber-600 text-center">Please assign a user first</p>}
        </div>
      ) : null}

      {/* Approval Steps */}
      {step.isApprovalStep && !step.skipQA && isActive ? (
        <div className="mt-5 space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-sm font-semibold text-amber-800">Approval Required</p>
            <p className="text-xs text-amber-600 mt-1">
              {step.id === "qa_check" ? "Mandatory review: Check brand alignment and design quality. If issues found, reject to send back to Creation." : 
               step.id === "approval" ? "Final sign-off: Give the ultimate 'Green Light' for this project." : 
               "Final check: Verify spelling, grammar, tags, and captions before posting."}
            </p>
          </div>
          
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowRejectionModal(true)} className="flex-1 py-3 rounded-xl border-2 border-red-200 text-red-600 font-semibold hover:bg-red-50">
              Reject & Send Back
            </button>
            <button type="button" onClick={() => onComplete(step.id)} disabled={!step.assignedUserId} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50 hover:bg-emerald-700">
              Approve ✓
            </button>
          </div>
          {!step.assignedUserId && <p className="text-[11px] text-amber-600 text-center">Please assign a user first</p>}
        </div>
      ) : null}

      {/* Completed Display */}
      {isDone && step.files && step.files.length > 0 ? (
        <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
          {step.files.filter(f => f.isActive).map((f, i) => (
            <a key={i} href={f.url} target="_blank" className="flex items-center gap-2 text-emerald-700 text-sm hover:underline">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              {f.name} <span className="text-[10px] text-emerald-500">(v{f.version || 1})</span>
            </a>
          ))}
        </div>
      ) : null}
      {isDone && step.id === "live" && step.data?.publishedLinks ? (
        <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
          <p className="text-xs font-semibold text-emerald-700 mb-1">Published Links:</p>
          <p className="text-sm text-emerald-800 whitespace-pre-wrap">{step.data.publishedLinks as string}</p>
        </div>
      ) : null}

      {/* Comments Section */}
      {!isLocked && (
        <div className="mt-5 pt-4 border-t border-slate-100">
          <button type="button" onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {step.comments?.length || 0} Comments
            <svg className={`h-3 w-3 transition-transform ${showComments ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {showComments && (
            <div className="mt-3 space-y-3">
              {step.comments?.map(c => (
                <div key={c.id} className="flex gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 shrink-0">{(c.userName || "U")[0].toUpperCase()}</div>
                  <div className="flex-1 bg-slate-50 rounded-lg p-2">
                    <div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-800">{c.userName}</span><span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString()}</span></div>
                    <p className="text-xs text-slate-600 mt-1"><NoteBodyWithMentions body={c.body} /></p>
                  </div>
                </div>
              ))}
              <div className="space-y-2">
                <MentionTextarea value={commentText} onChange={setCommentText} users={users} placeholder="Add a comment... Use @ to mention" rows={2} />
                <button type="button" onClick={handleSubmitComment} disabled={!commentText.trim()} className="px-4 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50">Post Comment</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
