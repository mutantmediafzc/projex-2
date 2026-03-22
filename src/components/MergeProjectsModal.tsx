"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type Project = {
  id: string;
  name: string;
  status: string | null;
  project_type: string | null;
  company?: {
    id: string;
    name: string | null;
    logo_url: string | null;
  } | null;
};

type MergeProjectsModalProps = {
  projects: Project[];
  onClose: () => void;
  onMergeComplete: () => void;
};

const PROJECT_TYPE_LABELS: Record<string, string> = {
  social_media: "Social Media",
  website: "Website",
  branding: "Branding",
};

export default function MergeProjectsModal({
  projects,
  onClose,
  onMergeComplete,
}: MergeProjectsModalProps) {
  const [mainProjectId, setMainProjectId] = useState<string>(projects[0]?.id || "");
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"select" | "confirm" | "success">("select");
  const [mergeStats, setMergeStats] = useState<{
    posts: number;
    tasks: number;
    notes: number;
    documents: number;
  } | null>(null);

  const mainProject = projects.find((p) => p.id === mainProjectId);
  const projectsToMerge = projects.filter((p) => p.id !== mainProjectId);

  async function loadMergePreview() {
    const otherIds = projectsToMerge.map((p) => p.id);
    
    const [postsRes, tasksRes, notesRes, docsRes] = await Promise.all([
      supabaseClient.from("social_posts").select("id", { count: "exact" }).in("project_id", otherIds),
      supabaseClient.from("project_tasks").select("id", { count: "exact" }).in("project_id", otherIds),
      supabaseClient.from("project_notes").select("id", { count: "exact" }).in("project_id", otherIds),
      supabaseClient.from("project_documents").select("id", { count: "exact" }).in("project_id", otherIds),
    ]);

    setMergeStats({
      posts: postsRes.count || 0,
      tasks: tasksRes.count || 0,
      notes: notesRes.count || 0,
      documents: docsRes.count || 0,
    });
    setStep("confirm");
  }

  async function handleMerge() {
    setMerging(true);
    setError(null);

    try {
      const otherIds = projectsToMerge.map((p) => p.id);

      // Reassign all related records to the main project
      await Promise.all([
        supabaseClient.from("social_posts").update({ project_id: mainProjectId }).in("project_id", otherIds),
        supabaseClient.from("project_tasks").update({ project_id: mainProjectId }).in("project_id", otherIds),
        supabaseClient.from("project_notes").update({ project_id: mainProjectId }).in("project_id", otherIds),
        supabaseClient.from("project_documents").update({ project_id: mainProjectId }).in("project_id", otherIds),
      ]);

      // Delete the merged projects
      const { error: deleteError } = await supabaseClient
        .from("projects")
        .delete()
        .in("id", otherIds);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setStep("success");
      setTimeout(() => {
        onMergeComplete();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to merge projects");
    } finally {
      setMerging(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-500 to-cyan-600">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
            Merge Projects
          </h2>
          <p className="text-sm text-white/80 mt-1">
            {step === "select" && "Select which project will be the main record"}
            {step === "confirm" && "Review and confirm the merge"}
            {step === "success" && "Merge completed successfully!"}
          </p>
        </div>

        <div className="p-6">
          {step === "select" && (
            <>
              <p className="text-sm text-slate-600 mb-4">
                All posts, tasks, notes, and documents from the other projects will be moved to the main project. The other projects will be deleted.
              </p>

              <div className="space-y-2 mb-6">
                <label className="text-sm font-medium text-slate-700">Select Main Project:</label>
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setMainProjectId(project.id)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      mainProjectId === project.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {project.company?.logo_url ? (
                      <img src={project.company.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold">
                        {project.name[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{project.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {[
                          project.company?.name,
                          PROJECT_TYPE_LABELS[project.project_type || ""] || project.project_type,
                          project.status
                        ].filter(Boolean).join(" • ") || "No details"}
                      </p>
                    </div>
                    {mainProjectId === project.id && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-500 text-white rounded-full">
                        Main
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={loadMergePreview}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-medium hover:from-blue-600 hover:to-cyan-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {step === "confirm" && (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200 mb-4">
                  {mainProject?.company?.logo_url ? (
                    <img src={mainProject.company.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold text-lg">
                      {mainProject?.name[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-slate-900">{mainProject?.name}</p>
                    <p className="text-xs text-blue-600 font-medium">Main Record (will be kept)</p>
                  </div>
                </div>

                <p className="text-sm text-slate-600 mb-3">
                  The following will be merged into <strong>{mainProject?.name}</strong>:
                </p>

                <div className="space-y-2 mb-4">
                  {projectsToMerge.map((project) => (
                    <div key={project.id} className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-100">
                      <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                      <span className="text-sm text-slate-700">{project.name}</span>
                      <span className="text-xs text-red-500">(will be deleted)</span>
                    </div>
                  ))}
                </div>

                {mergeStats && (
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900">{mergeStats.posts}</p>
                      <p className="text-xs text-slate-500">Social Posts</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900">{mergeStats.tasks}</p>
                      <p className="text-xs text-slate-500">Tasks</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900">{mergeStats.notes}</p>
                      <p className="text-xs text-slate-500">Notes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900">{mergeStats.documents}</p>
                      <p className="text-xs text-slate-500">Documents</p>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("select")}
                  disabled={merging}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleMerge}
                  disabled={merging}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-medium hover:from-red-600 hover:to-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {merging ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Merging...
                    </>
                  ) : (
                    "Confirm Merge"
                  )}
                </button>
              </div>
            </>
          )}

          {step === "success" && (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Merge Complete!</h3>
              <p className="text-sm text-slate-600">
                All records have been merged into {mainProject?.name}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
