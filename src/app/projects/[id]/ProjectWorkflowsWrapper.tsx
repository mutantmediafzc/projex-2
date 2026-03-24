"use client";

import React, { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import ProjectWorkflows from "./ProjectWorkflows";
import DesignWorkflows from "./DesignWorkflows";
import PerformanceMarketingWorkflows from "./PerformanceMarketingWorkflows";
import SEOWorkflows from "./SEOWorkflows";

type WorkflowType = "design" | "website" | "performance_marketing" | "seo_aeo" | null;

type WorkflowTypeData = {
  workflow_type: WorkflowType;
};

export default function ProjectWorkflowsWrapper({ projectId, projectType }: { projectId: string; projectType: string | null }) {
  const [workflowType, setWorkflowType] = useState<WorkflowType>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadWorkflowType() {
      const { data } = await supabaseClient
        .from("project_workflows")
        .select("workflow_type")
        .eq("project_id", projectId)
        .single();
      
      if (data?.workflow_type) {
        setWorkflowType(data.workflow_type as WorkflowType);
      } else if (projectType === "website") {
        // Legacy: if project_type is website, default to website workflow
        setWorkflowType("website");
      }
      setLoading(false);
    }
    loadWorkflowType();
  }, [projectId, projectType]);

  async function selectWorkflowType(type: WorkflowType) {
    setSaving(true);
    setWorkflowType(type);
    await supabaseClient
      .from("project_workflows")
      .upsert({ 
        project_id: projectId, 
        workflow_type: type,
        updated_at: new Date().toISOString() 
      }, { onConflict: "project_id" });
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
      </div>
    );
  }

  // If no workflow type selected yet, show the selector
  if (!workflowType) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-6 text-white shadow-2xl">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/5" />
          <div className="relative">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase">
              Project Workflow
            </span>
            <h2 className="text-2xl font-bold mt-1">Select Workflow Type</h2>
            <p className="text-sm text-white/70 mt-1">Choose the type of workflow for this project</p>
          </div>
        </div>

        {/* Workflow Type Selection */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Design Workflow Card */}
          <button
            type="button"
            onClick={() => selectWorkflowType("design")}
            disabled={saving}
            className="group relative overflow-hidden rounded-2xl border-2 border-purple-200 bg-white p-6 text-left shadow-lg transition-all hover:border-purple-500 hover:shadow-xl disabled:opacity-50"
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg">
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                  <line x1="9" y1="9" x2="9.01" y2="9"/>
                  <line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">Design Workflow</h3>
              <p className="mt-2 text-sm text-slate-600">Creative workflow with 3-layer approval system for design projects, social media content, and marketing materials.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">Main Projects</span>
                <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-semibold text-pink-700">On-Demand</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">3-Layer QA</span>
              </div>
              <div className="mt-4 text-xs text-purple-600 font-semibold flex items-center gap-1">
                Select Design Workflow
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </div>
          </button>

          {/* Website Workflow Card */}
          <button
            type="button"
            onClick={() => selectWorkflowType("website")}
            disabled={saving}
            className="group relative overflow-hidden rounded-2xl border-2 border-blue-200 bg-white p-6 text-left shadow-lg transition-all hover:border-blue-500 hover:shadow-xl disabled:opacity-50"
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg">
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">Website Workflow</h3>
              <p className="mt-2 text-sm text-slate-600">Full website development workflow with project scoping, UI/UX design, scaffolding, and deployment phases.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Custom</span>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">Template</span>
                <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold text-cyan-700">SAAS</span>
              </div>
              <div className="mt-4 text-xs text-blue-600 font-semibold flex items-center gap-1">
                Select Website Workflow
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </div>
          </button>

          {/* Performance Marketing Workflow Card */}
          <button
            type="button"
            onClick={() => selectWorkflowType("performance_marketing")}
            disabled={saving}
            className="group relative overflow-hidden rounded-2xl border-2 border-orange-200 bg-white p-6 text-left shadow-lg transition-all hover:border-orange-500 hover:shadow-xl disabled:opacity-50"
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-orange-100 to-red-100 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg text-2xl">
                🚀
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">Performance Marketing</h3>
              <p className="mt-2 text-sm text-slate-600">Full campaign lifecycle from research to reporting. Meta, Google, LinkedIn ads with optimization and creative refresh cycles.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">17 Steps</span>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">Client Approvals</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Optimization</span>
              </div>
              <div className="mt-4 text-xs text-orange-600 font-semibold flex items-center gap-1">
                Select Performance Marketing
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </div>
          </button>

          {/* SEO & AEO Workflow Card */}
          <button
            type="button"
            onClick={() => selectWorkflowType("seo_aeo")}
            disabled={saving}
            className="group relative overflow-hidden rounded-2xl border-2 border-emerald-200 bg-white p-6 text-left shadow-lg transition-all hover:border-emerald-500 hover:shadow-xl disabled:opacity-50"
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-100 to-green-100 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-lg text-2xl">
                🔍
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">SEO & AEO Workflow</h3>
              <p className="mt-2 text-sm text-slate-600">Complete SEO workflow from onboarding to completion. Technical SEO, content production, link building, and performance tracking.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">4 Phases</span>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Content Flow</span>
                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700">Multi-Role</span>
              </div>
              <div className="mt-4 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                Select SEO & AEO Workflow
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </div>
          </button>
        </div>

        {saving && (
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
            Saving...
          </div>
        )}
      </div>
    );
  }

  // Render the appropriate workflow based on selection
  function renderWorkflow() {
    switch (workflowType) {
      case "design":
        return <DesignWorkflows key="design" projectId={projectId} />;
      case "performance_marketing":
        return <PerformanceMarketingWorkflows key="performance_marketing" projectId={projectId} />;
      case "seo_aeo":
        return <SEOWorkflows key="seo_aeo" projectId={projectId} />;
      case "website":
        return <ProjectWorkflows key="website" projectId={projectId} projectType="website" />;
      default:
        return null;
    }
  }

  // Show loading when switching workflow types
  if (saving) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Change Workflow Type Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => selectWorkflowType(null)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          Change Workflow Type
        </button>
      </div>
      {renderWorkflow()}
    </div>
  );
}
