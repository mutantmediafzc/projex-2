"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import RichTextEditor from "@/components/RichTextEditor";

type StrategyLink = {
  id: string;
  title: string;
  quarter: string;
  objectives: string | null;
  core_goals: string | null;
  content_pillars: string | null;
  kpi_description: string | null;
  platform_specific_strategy: string | null;
  target_audience: string | null;
  is_published: boolean;
  public_link_token: string | null;
  public_link_expires_at: string | null;
  created_at: string;
};

type Props = {
  projectId: string;
  projectName: string;
};

const QUARTERS = [
  { value: "Q1", label: "Q1 (Jan-Mar)" },
  { value: "Q2", label: "Q2 (Apr-Jun)" },
  { value: "Q3", label: "Q3 (Jul-Sep)" },
  { value: "Q4", label: "Q4 (Oct-Dec)" },
];

export default function StrategyLinkManager({ projectId, projectName }: Props) {
  const [links, setLinks] = useState<StrategyLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLink, setEditingLink] = useState<StrategyLink | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    loadLinks();
  }, [projectId]);

  async function loadLinks() {
    setLoading(true);
    const { data } = await supabaseClient
      .from("social_strategy_links")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (data) setLinks(data as StrategyLink[]);
    setLoading(false);
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/strategy/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  async function togglePublish(link: StrategyLink) {
    const expiresAt = link.is_published ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseClient
      .from("social_strategy_links")
      .update({
        is_published: !link.is_published,
        public_link_expires_at: expiresAt,
      })
      .eq("id", link.id);
    await loadLinks();
  }

  async function deleteLink(id: string) {
    if (!confirm("Are you sure you want to delete this strategy link?")) return;
    await supabaseClient.from("social_strategy_links").delete().eq("id", id);
    await loadLinks();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Strategy & KPI Links</h3>
          <p className="text-xs text-slate-500">Create shareable strategy documents for clients</p>
        </div>
        <button
          onClick={() => { setEditingLink(null); setShowModal(true); }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-fuchsia-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-pink-500/25 hover:shadow-xl"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Strategy
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
        </div>
      ) : links.length === 0 ? (
        <div className="rounded-xl bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-500">No strategy links created yet.</p>
          <p className="text-xs text-slate-400 mt-1">Create a strategy link to share with clients.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div key={link.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{link.title}</h4>
                  <p className="text-xs text-slate-500">{link.quarter}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  link.is_published ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                }`}>
                  {link.is_published ? "Published" : "Draft"}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {link.is_published && link.public_link_token && (
                  <button
                    onClick={() => copyLink(link.public_link_token!)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {copiedToken === link.public_link_token ? (
                      <><svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>Copied!</>
                    ) : (
                      <><svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>Copy Link</>
                    )}
                  </button>
                )}
                <button
                  onClick={() => togglePublish(link)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                    link.is_published
                      ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {link.is_published ? "Unpublish" : "Publish"}
                </button>
                <button
                  onClick={() => { setEditingLink(link); setShowModal(true); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteLink(link.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <StrategyModal
          link={editingLink}
          projectId={projectId}
          projectName={projectName}
          onClose={() => { setShowModal(false); setEditingLink(null); }}
          onSaved={() => { setShowModal(false); setEditingLink(null); loadLinks(); }}
        />
      )}
    </div>
  );
}

function StrategyModal({
  link,
  projectId,
  projectName,
  onClose,
  onSaved,
}: {
  link: StrategyLink | null;
  projectId: string;
  projectName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const currentYear = new Date().getFullYear();
  const [title, setTitle] = useState(link?.title || `${projectName} Strategy`);
  const [year, setYear] = useState(link?.quarter?.split("-")[0] || String(currentYear));
  const [quarter, setQuarter] = useState(link?.quarter?.split("-")[1] || "Q1");
  const [objectives, setObjectives] = useState(link?.objectives || "");
  const [coreGoals, setCoreGoals] = useState(link?.core_goals || "");
  const [contentPillars, setContentPillars] = useState(link?.content_pillars || "");
  const [targetAudience, setTargetAudience] = useState(link?.target_audience || "");
  const [kpiDescription, setKpiDescription] = useState(link?.kpi_description || "");
  const [platformStrategy, setPlatformStrategy] = useState(link?.platform_specific_strategy || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    
    const data = {
      project_id: projectId,
      title,
      quarter: `${year}-${quarter}`,
      objectives: objectives || null,
      core_goals: coreGoals || null,
      content_pillars: contentPillars || null,
      target_audience: targetAudience || null,
      kpi_description: kpiDescription || null,
      platform_specific_strategy: platformStrategy || null,
    };

    console.log("Saving strategy data:", data);

    let result;
    if (link) {
      result = await supabaseClient.from("social_strategy_links").update(data).eq("id", link.id);
    } else {
      result = await supabaseClient.from("social_strategy_links").insert(data);
    }
    
    if (result.error) {
      console.error("Error saving strategy:", result.error);
      setError(result.error.message);
      setSaving(false);
      return;
    }
    
    console.log("Strategy saved successfully");
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            {link ? "Edit Strategy" : "Create Strategy Link"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black focus:border-pink-300 focus:outline-none"
              placeholder="Strategy title..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black focus:border-pink-300 focus:outline-none"
              >
                {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Quarter</label>
              <select
                value={quarter}
                onChange={(e) => setQuarter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black focus:border-pink-300 focus:outline-none"
              >
                {QUARTERS.map((q) => (
                  <option key={q.value} value={q.value}>{q.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Objectives</label>
            <RichTextEditor
              value={objectives}
              onChange={setObjectives}
              placeholder="Describe the strategy objectives..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Core Goals</label>
            <RichTextEditor
              value={coreGoals}
              onChange={setCoreGoals}
              placeholder="List the core goals..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Content Pillars</label>
            <RichTextEditor
              value={contentPillars}
              onChange={setContentPillars}
              placeholder="Define the content pillars..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Target Audience</label>
            <RichTextEditor
              value={targetAudience}
              onChange={setTargetAudience}
              placeholder="Describe the target audience..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">KPIs</label>
            <RichTextEditor
              value={kpiDescription}
              onChange={setKpiDescription}
              placeholder="Describe the key performance indicators..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Platform Specific Strategy</label>
            <RichTextEditor
              value={platformStrategy}
              onChange={setPlatformStrategy}
              placeholder="Describe platform-specific strategies..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !title.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-pink-500/25 hover:shadow-xl disabled:opacity-50"
            >
              {saving ? "Saving..." : link ? "Update Strategy" : "Create Strategy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
