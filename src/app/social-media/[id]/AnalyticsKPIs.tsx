"use client";

import { useState, useEffect, useRef } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import RichTextEditor from "@/components/RichTextEditor";

type Report = {
  id: string;
  report_month: string;
  kpi_data: {
    reach?: { actual: number; goal: number };
    impressions?: { actual: number; goal: number };
    engagement_rate?: { actual: number; goal: number };
    follower_growth?: { actual: number; goal: number };
    website_clicks?: { actual: number; goal: number };
  };
  platform_metrics: Record<string, any>;
  mom_comparison: Record<string, number>;
  is_published: boolean;
  notes: string | null;
  created_at: string;
};

type Strategy = {
  id: string;
  title: string;
  quarter: string;
};

type PlatformGoals = {
  facebook: number;
  instagram: number;
  linkedin: number;
  tiktok: number;
  youtube: number;
  x: number;
};

type SocialKPI = {
  id: string;
  project_id: string;
  strategy_id: string | null;
  report_period: string;
  // Social Media Content
  sm_reels: number;
  sm_long_form_video: number;
  sm_static_carousels: number;
  sm_stories: number;
  // Social Media KPIs
  sm_impressions_kpi: string | null;
  sm_impressions_goal: number;
  sm_reach_kpi: string | null;
  sm_reach_goal: number;
  sm_engagement_kpi: string | null;
  sm_engagement_goal: number;
  sm_followers_kpi: string | null;
  sm_followers_goal: number;
  sm_clicks_kpi: string | null;
  sm_clicks_goal: number;
  // Platform-specific goals
  impressions_facebook_goal: string | null;
  impressions_instagram_goal: string | null;
  impressions_linkedin_goal: string | null;
  impressions_tiktok_goal: string | null;
  impressions_youtube_goal: string | null;
  impressions_x_goal: string | null;
  reach_facebook_goal: string | null;
  reach_instagram_goal: string | null;
  reach_linkedin_goal: string | null;
  reach_tiktok_goal: string | null;
  reach_youtube_goal: string | null;
  reach_x_goal: string | null;
  engagement_facebook_goal: string | null;
  engagement_instagram_goal: string | null;
  engagement_linkedin_goal: string | null;
  engagement_tiktok_goal: string | null;
  engagement_youtube_goal: string | null;
  engagement_x_goal: string | null;
  followers_facebook_goal: string | null;
  followers_instagram_goal: string | null;
  followers_linkedin_goal: string | null;
  followers_tiktok_goal: string | null;
  followers_youtube_goal: string | null;
  followers_x_goal: string | null;
  clicks_facebook_goal: string | null;
  clicks_instagram_goal: string | null;
  clicks_linkedin_goal: string | null;
  clicks_tiktok_goal: string | null;
  clicks_youtube_goal: string | null;
  clicks_x_goal: string | null;
  // Email & WhatsApp
  email_campaigns: number;
  whatsapp_campaigns: number;
  ewm_ctr_kpi: string | null;
  ewm_ctr_goal: number;
  // SEO & AEO
  seo_website_blogs: number;
  seo_linkedin_articles: number;
  seo_pr_offpage: number;
  seo_impressions_kpi: string | null;
  seo_impressions_goal: number;
  notes: string | null;
  created_at: string;
  strategy?: Strategy;
};

const KPI_LABELS: Record<string, { label: string; format: (v: number) => string; icon: React.ReactNode }> = {
  reach: {
    label: "Total Reach",
    format: (v) => v.toLocaleString(),
    icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  },
  impressions: {
    label: "Impressions",
    format: (v) => v.toLocaleString(),
    icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h20M12 2v20"/></svg>,
  },
  engagement_rate: {
    label: "Engagement Rate",
    format: (v) => `${v.toFixed(2)}%`,
    icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  },
  follower_growth: {
    label: "Net Follower Growth",
    format: (v) => (v >= 0 ? "+" : "") + v.toLocaleString(),
    icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  website_clicks: {
    label: "Website Clicks",
    format: (v) => v.toLocaleString(),
    icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  },
};

export default function AnalyticsKPIs({ projectId, platforms = [] }: { projectId: string; platforms?: string[] }) {
  const [loading, setLoading] = useState(true);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [kpis, setKpis] = useState<SocialKPI[]>([]);
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [editingKpi, setEditingKpi] = useState<SocialKPI | null>(null);
  const [expandedKpis, setExpandedKpis] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedKpis(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  async function handleDeleteKpi(kpiId: string) {
    if (!confirm("Are you sure you want to delete this KPI?")) return;
    setDeleting(kpiId);
    await supabaseClient.from("social_kpis").delete().eq("id", kpiId);
    setDeleting(null);
    loadKpis();
  }

  useEffect(() => {
    loadStrategies();
    loadKpis();
  }, [projectId]);

  async function loadStrategies() {
    const { data } = await supabaseClient
      .from("social_strategy_links")
      .select("id, title, quarter")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (data) setStrategies(data as Strategy[]);
  }

  async function loadKpis() {
    setLoading(true);
    const { data } = await supabaseClient
      .from("social_kpis")
      .select("*, strategy:social_strategy_links(id, title, quarter)")
      .eq("project_id", projectId)
      .order("report_period", { ascending: false });
    if (data) setKpis(data as SocialKPI[]);
    setLoading(false);
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Strategies & KPIs</h2>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setEditingKpi(null); setShowKpiModal(true); }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-pink-500/25 hover:shadow-xl">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            Add KPI
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" /></div>
      ) : (
        kpis.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-100 to-fuchsia-100 text-pink-500">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
            </div>
            <h3 className="mb-1 text-lg font-semibold text-slate-900">No KPIs added yet</h3>
            <p className="text-sm text-slate-500">Add KPI data linked to your strategies</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {/* List Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
              <div className="col-span-2">Period</div>
              <div className="col-span-3">Strategy Link</div>
              <div className="col-span-2 text-center">Social Media</div>
              <div className="col-span-2 text-center">Email/WA</div>
              <div className="col-span-1 text-center">SEO</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            
            {/* KPI List Items */}
            {kpis.map((kpi) => {
              const isExpanded = expandedKpis.has(kpi.id);
              const totalSM = kpi.sm_reels + kpi.sm_long_form_video + kpi.sm_static_carousels + kpi.sm_stories;
              const totalEW = kpi.email_campaigns + kpi.whatsapp_campaigns;
              const totalSEO = kpi.seo_website_blogs + kpi.seo_linkedin_articles + kpi.seo_pr_offpage;
              
              return (
                <div key={kpi.id} className="border-b border-slate-100 last:border-b-0">
                  {/* Compact Row */}
                  <div className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-50 transition-colors">
                    <div className="col-span-2">
                      <span className="text-sm font-semibold text-slate-900">{kpi.report_period}</span>
                      <p className="text-[10px] text-slate-400">{new Date(kpi.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="col-span-3">
                      {kpi.strategy ? (
                        <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700 truncate max-w-full">
                          {kpi.strategy.title}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Not linked</span>
                      )}
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-pink-600">
                        <span className="text-pink-400">📱</span> {totalSM}
                      </span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-600">
                        <span className="text-green-400">📧</span> {totalEW}
                      </span>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
                        <span className="text-blue-400">🔍</span> {totalSEO}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleExpanded(kpi.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        title={isExpanded ? "Collapse" : "Expand"}
                      >
                        <svg className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                      <button
                        onClick={() => { setEditingKpi(kpi); setShowKpiModal(true); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        title="Edit"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteKpi(kpi.id)}
                        disabled={deleting === kpi.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                        title="Delete"
                      >
                        {deleting === kpi.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                        ) : (
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 bg-slate-50/50 border-t border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Social Media */}
                        <div className="rounded-xl border border-pink-100 bg-white p-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-pink-600 mb-3">Social Media</h4>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="rounded-lg bg-pink-50 p-2 text-center">
                              <p className="text-[10px] text-pink-500">Reels</p>
                              <p className="text-lg font-bold text-pink-700">{kpi.sm_reels}</p>
                            </div>
                            <div className="rounded-lg bg-pink-50 p-2 text-center">
                              <p className="text-[10px] text-pink-500">Long-Form</p>
                              <p className="text-lg font-bold text-pink-700">{kpi.sm_long_form_video}</p>
                            </div>
                            <div className="rounded-lg bg-pink-50 p-2 text-center">
                              <p className="text-[10px] text-pink-500">Static</p>
                              <p className="text-lg font-bold text-pink-700">{kpi.sm_static_carousels}</p>
                            </div>
                            <div className="rounded-lg bg-pink-50 p-2 text-center">
                              <p className="text-[10px] text-pink-500">Stories</p>
                              <p className="text-lg font-bold text-pink-700">{kpi.sm_stories}</p>
                            </div>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between"><span className="text-slate-500">Impressions:</span><span className="font-medium">{kpi.sm_impressions_kpi || "—"} <span className="text-pink-500">(Goal: {kpi.sm_impressions_goal?.toLocaleString()})</span></span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Reach:</span><span className="font-medium">{kpi.sm_reach_kpi || "—"} <span className="text-pink-500">(Goal: {kpi.sm_reach_goal?.toLocaleString()})</span></span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Engagement:</span><span className="font-medium">{kpi.sm_engagement_kpi || "—"} <span className="text-pink-500">(Goal: {kpi.sm_engagement_goal?.toLocaleString()})</span></span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Followers:</span><span className="font-medium">{kpi.sm_followers_kpi || "—"} <span className="text-pink-500">(Goal: {kpi.sm_followers_goal?.toLocaleString()})</span></span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Clicks:</span><span className="font-medium">{kpi.sm_clicks_kpi || "—"} <span className="text-pink-500">(Goal: {kpi.sm_clicks_goal?.toLocaleString()})</span></span></div>
                          </div>
                        </div>
                        
                        {/* Email & WhatsApp */}
                        <div className="rounded-xl border border-green-100 bg-white p-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-green-600 mb-3">Email & WhatsApp</h4>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="rounded-lg bg-green-50 p-2 text-center">
                              <p className="text-[10px] text-green-500">Email</p>
                              <p className="text-lg font-bold text-green-700">{kpi.email_campaigns}</p>
                            </div>
                            <div className="rounded-lg bg-green-50 p-2 text-center">
                              <p className="text-[10px] text-green-500">WhatsApp</p>
                              <p className="text-lg font-bold text-green-700">{kpi.whatsapp_campaigns}</p>
                            </div>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between"><span className="text-slate-500">CTR KPI:</span><span className="font-medium">{kpi.ewm_ctr_kpi || "—"} <span className="text-green-500">(Goal: {kpi.ewm_ctr_goal}%)</span></span></div>
                          </div>
                        </div>
                        
                        {/* SEO & AEO */}
                        <div className="rounded-xl border border-blue-100 bg-white p-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-3">SEO & AEO</h4>
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            <div className="rounded-lg bg-blue-50 p-2 text-center">
                              <p className="text-[10px] text-blue-500">Blogs</p>
                              <p className="text-lg font-bold text-blue-700">{kpi.seo_website_blogs}</p>
                            </div>
                            <div className="rounded-lg bg-blue-50 p-2 text-center">
                              <p className="text-[10px] text-blue-500">LinkedIn</p>
                              <p className="text-lg font-bold text-blue-700">{kpi.seo_linkedin_articles}</p>
                            </div>
                            <div className="rounded-lg bg-blue-50 p-2 text-center">
                              <p className="text-[10px] text-blue-500">PR</p>
                              <p className="text-lg font-bold text-blue-700">{kpi.seo_pr_offpage}</p>
                            </div>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between"><span className="text-slate-500">Impressions:</span><span className="font-medium">{kpi.seo_impressions_kpi || "—"} <span className="text-blue-500">(Goal: {kpi.seo_impressions_goal?.toLocaleString()})</span></span></div>
                          </div>
                        </div>
                      </div>
                      
                      {kpi.notes && (
                        <div className="mt-3 rounded-lg bg-slate-100 p-3">
                          <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
                          <p className="text-sm text-slate-700">{kpi.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {showKpiModal && (
        <KpiModal kpi={editingKpi} projectId={projectId} strategies={strategies} platforms={platforms}
          onClose={() => { setShowKpiModal(false); setEditingKpi(null); }}
          onSaved={() => { setShowKpiModal(false); setEditingKpi(null); loadKpis(); }} />
      )}
    </div>
  );
}

function ReportModal({ report, projectId, selectedMonth, onClose, onSaved }: { report: Report | null; projectId: string; selectedMonth: string; onClose: () => void; onSaved: () => void }) {
  const [kpiData, setKpiData] = useState<Report["kpi_data"]>(report?.kpi_data || {});
  const [notes, setNotes] = useState(report?.notes || "");
  const [saving, setSaving] = useState(false);

  const updateKpi = (key: string, field: "actual" | "goal", value: number) => {
    setKpiData((prev) => ({
      ...prev,
      [key]: { ...prev[key as keyof typeof prev], [field]: value },
    }));
  };

  async function handleSubmit() {
    setSaving(true);
    const data = {
      project_id: projectId,
      report_month: `${selectedMonth}-01`,
      kpi_data: kpiData,
      notes: notes || null,
    };

    if (report) {
      await supabaseClient.from("social_reports").update(data).eq("id", report.id);
    } else {
      await supabaseClient.from("social_reports").insert(data);
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">{report ? "Edit Report" : "Add Report"} - {selectedMonth}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {Object.entries(KPI_LABELS).map(([key, { label }]) => (
            <div key={key} className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{label} (Actual)</label>
                <input type="number" value={kpiData[key as keyof typeof kpiData]?.actual || ""} onChange={(e) => updateKpi(key, "actual", parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500/20" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{label} (Goal)</label>
                <input type="number" value={kpiData[key as keyof typeof kpiData]?.goal || ""} onChange={(e) => updateKpi(key, "goal", parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500/20" />
              </div>
            </div>
          ))}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500/20 resize-none"
              placeholder="Monthly performance notes..." />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-pink-500/25 hover:shadow-xl disabled:opacity-50">
              {saving ? "Saving..." : "Save Report"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchableStrategyDropdown({ 
  strategies, 
  value, 
  onChange 
}: { 
  strategies: Strategy[]; 
  value: string; 
  onChange: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedStrategy = strategies.find(s => s.id === value);
  const displayName = selectedStrategy ? `${selectedStrategy.title} (${selectedStrategy.quarter})` : "";

  const filteredStrategies = strategies.filter(s => {
    const searchLower = search.toLowerCase();
    return s.title.toLowerCase().includes(searchLower) || s.quarter.toLowerCase().includes(searchLower);
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <div
        className={`flex items-center gap-2 w-full rounded-xl border bg-white px-4 py-2.5 text-sm cursor-pointer transition-all ${
          isOpen ? "border-pink-400 ring-2 ring-pink-500/20" : "border-slate-200 hover:border-slate-300"
        }`}
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search strategies..."
            className="flex-1 outline-none text-sm text-black bg-transparent placeholder:text-slate-400"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`flex-1 truncate ${value ? "text-slate-900" : "text-slate-400"}`}>
            {value ? displayName : "Select a strategy link..."}
          </span>
        )}
        {value && !isOpen && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="text-slate-400 hover:text-slate-600"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
        <svg className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          <div
            className="px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50 cursor-pointer border-b border-slate-100"
            onClick={() => {
              onChange("");
              setIsOpen(false);
              setSearch("");
            }}
          >
            No strategy link
          </div>
          {filteredStrategies.length === 0 ? (
            <div className="px-4 py-4 text-sm text-slate-400 text-center">No strategies found</div>
          ) : (
            filteredStrategies.map((strategy) => (
              <div
                key={strategy.id}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                  strategy.id === value ? "bg-purple-50" : "hover:bg-slate-50"
                }`}
                onClick={() => {
                  onChange(strategy.id);
                  setIsOpen(false);
                  setSearch("");
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{strategy.title}</p>
                  <p className="text-xs text-purple-600">{strategy.quarter}</p>
                </div>
                {strategy.id === value && (
                  <svg className="h-4 w-4 text-purple-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
};

function KpiModal({ kpi, projectId, strategies, platforms, onClose, onSaved }: { 
  kpi: SocialKPI | null; 
  projectId: string; 
  strategies: Strategy[];
  platforms: string[];
  onClose: () => void; 
  onSaved: () => void;
}) {
  const [strategyId, setStrategyId] = useState(kpi?.strategy_id || "");
  const [reportPeriod, setReportPeriod] = useState(kpi?.report_period || "");
  
  // Social Media Content
  const [smReels, setSmReels] = useState(kpi?.sm_reels || 0);
  const [smLongFormVideo, setSmLongFormVideo] = useState(kpi?.sm_long_form_video || 0);
  const [smStaticCarousels, setSmStaticCarousels] = useState(kpi?.sm_static_carousels || 0);
  const [smStories, setSmStories] = useState(kpi?.sm_stories || 0);
  
  // Social Media KPIs
  const [smImpressionsKpi, setSmImpressionsKpi] = useState(kpi?.sm_impressions_kpi || "");
  const [smImpressionsGoal, setSmImpressionsGoal] = useState(kpi?.sm_impressions_goal || 0);
  const [smReachKpi, setSmReachKpi] = useState(kpi?.sm_reach_kpi || "");
  const [smReachGoal, setSmReachGoal] = useState(kpi?.sm_reach_goal || 0);
  const [smEngagementKpi, setSmEngagementKpi] = useState(kpi?.sm_engagement_kpi || "");
  const [smEngagementGoal, setSmEngagementGoal] = useState(kpi?.sm_engagement_goal || 0);
  const [smFollowersKpi, setSmFollowersKpi] = useState(kpi?.sm_followers_kpi || "");
  const [smFollowersGoal, setSmFollowersGoal] = useState(kpi?.sm_followers_goal || 0);
  const [smClicksKpi, setSmClicksKpi] = useState(kpi?.sm_clicks_kpi || "");
  const [smClicksGoal, setSmClicksGoal] = useState(kpi?.sm_clicks_goal || 0);
  
  // Platform-specific goals
  const [impressionsGoals, setImpressionsGoals] = useState<PlatformGoals>({
    facebook: Number(kpi?.impressions_facebook_goal) || 0,
    instagram: Number(kpi?.impressions_instagram_goal) || 0,
    linkedin: Number(kpi?.impressions_linkedin_goal) || 0,
    tiktok: Number(kpi?.impressions_tiktok_goal) || 0,
    youtube: Number(kpi?.impressions_youtube_goal) || 0,
    x: Number(kpi?.impressions_x_goal) || 0,
  });
  const [reachGoals, setReachGoals] = useState<PlatformGoals>({
    facebook: Number(kpi?.reach_facebook_goal) || 0,
    instagram: Number(kpi?.reach_instagram_goal) || 0,
    linkedin: Number(kpi?.reach_linkedin_goal) || 0,
    tiktok: Number(kpi?.reach_tiktok_goal) || 0,
    youtube: Number(kpi?.reach_youtube_goal) || 0,
    x: Number(kpi?.reach_x_goal) || 0,
  });
  const [engagementGoals, setEngagementGoals] = useState<PlatformGoals>({
    facebook: Number(kpi?.engagement_facebook_goal) || 0,
    instagram: Number(kpi?.engagement_instagram_goal) || 0,
    linkedin: Number(kpi?.engagement_linkedin_goal) || 0,
    tiktok: Number(kpi?.engagement_tiktok_goal) || 0,
    youtube: Number(kpi?.engagement_youtube_goal) || 0,
    x: Number(kpi?.engagement_x_goal) || 0,
  });
  const [followersGoals, setFollowersGoals] = useState<PlatformGoals>({
    facebook: Number(kpi?.followers_facebook_goal) || 0,
    instagram: Number(kpi?.followers_instagram_goal) || 0,
    linkedin: Number(kpi?.followers_linkedin_goal) || 0,
    tiktok: Number(kpi?.followers_tiktok_goal) || 0,
    youtube: Number(kpi?.followers_youtube_goal) || 0,
    x: Number(kpi?.followers_x_goal) || 0,
  });
  const [clicksGoals, setClicksGoals] = useState<PlatformGoals>({
    facebook: Number(kpi?.clicks_facebook_goal) || 0,
    instagram: Number(kpi?.clicks_instagram_goal) || 0,
    linkedin: Number(kpi?.clicks_linkedin_goal) || 0,
    tiktok: Number(kpi?.clicks_tiktok_goal) || 0,
    youtube: Number(kpi?.clicks_youtube_goal) || 0,
    x: Number(kpi?.clicks_x_goal) || 0,
  });
  
  // Email & WhatsApp
  const [emailCampaigns, setEmailCampaigns] = useState(kpi?.email_campaigns || 0);
  const [whatsappCampaigns, setWhatsappCampaigns] = useState(kpi?.whatsapp_campaigns || 0);
  const [ewmCtrKpi, setEwmCtrKpi] = useState(kpi?.ewm_ctr_kpi || "");
  const [ewmCtrGoal, setEwmCtrGoal] = useState(kpi?.ewm_ctr_goal || 0);
  
  // SEO & AEO
  const [seoWebsiteBlogs, setSeoWebsiteBlogs] = useState(kpi?.seo_website_blogs || 0);
  const [seoLinkedinArticles, setSeoLinkedinArticles] = useState(kpi?.seo_linkedin_articles || 0);
  const [seoPrOffpage, setSeoPrOffpage] = useState(kpi?.seo_pr_offpage || 0);
  const [seoImpressionsKpi, setSeoImpressionsKpi] = useState(kpi?.seo_impressions_kpi || "");
  const [seoImpressionsGoal, setSeoImpressionsGoal] = useState(kpi?.seo_impressions_goal || 0);
  
  const [notes, setNotes] = useState(kpi?.notes || "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!reportPeriod.trim()) return;
    
    setSaving(true);
    const data = {
      project_id: projectId,
      strategy_id: strategyId || null,
      report_period: reportPeriod,
      sm_reels: smReels,
      sm_long_form_video: smLongFormVideo,
      sm_static_carousels: smStaticCarousels,
      sm_stories: smStories,
      sm_impressions_kpi: smImpressionsKpi || null,
      sm_impressions_goal: smImpressionsGoal,
      sm_reach_kpi: smReachKpi || null,
      sm_reach_goal: smReachGoal,
      sm_engagement_kpi: smEngagementKpi || null,
      sm_engagement_goal: smEngagementGoal,
      sm_followers_kpi: smFollowersKpi || null,
      sm_followers_goal: smFollowersGoal,
      sm_clicks_kpi: smClicksKpi || null,
      sm_clicks_goal: smClicksGoal,
      // Platform-specific goals
      impressions_facebook_goal: impressionsGoals.facebook || null,
      impressions_instagram_goal: impressionsGoals.instagram || null,
      impressions_linkedin_goal: impressionsGoals.linkedin || null,
      impressions_tiktok_goal: impressionsGoals.tiktok || null,
      impressions_youtube_goal: impressionsGoals.youtube || null,
      impressions_x_goal: impressionsGoals.x || null,
      reach_facebook_goal: reachGoals.facebook || null,
      reach_instagram_goal: reachGoals.instagram || null,
      reach_linkedin_goal: reachGoals.linkedin || null,
      reach_tiktok_goal: reachGoals.tiktok || null,
      reach_youtube_goal: reachGoals.youtube || null,
      reach_x_goal: reachGoals.x || null,
      engagement_facebook_goal: engagementGoals.facebook || null,
      engagement_instagram_goal: engagementGoals.instagram || null,
      engagement_linkedin_goal: engagementGoals.linkedin || null,
      engagement_tiktok_goal: engagementGoals.tiktok || null,
      engagement_youtube_goal: engagementGoals.youtube || null,
      engagement_x_goal: engagementGoals.x || null,
      followers_facebook_goal: followersGoals.facebook || null,
      followers_instagram_goal: followersGoals.instagram || null,
      followers_linkedin_goal: followersGoals.linkedin || null,
      followers_tiktok_goal: followersGoals.tiktok || null,
      followers_youtube_goal: followersGoals.youtube || null,
      followers_x_goal: followersGoals.x || null,
      clicks_facebook_goal: clicksGoals.facebook || null,
      clicks_instagram_goal: clicksGoals.instagram || null,
      clicks_linkedin_goal: clicksGoals.linkedin || null,
      clicks_tiktok_goal: clicksGoals.tiktok || null,
      clicks_youtube_goal: clicksGoals.youtube || null,
      clicks_x_goal: clicksGoals.x || null,
      email_campaigns: emailCampaigns,
      whatsapp_campaigns: whatsappCampaigns,
      ewm_ctr_kpi: ewmCtrKpi || null,
      ewm_ctr_goal: ewmCtrGoal,
      seo_website_blogs: seoWebsiteBlogs,
      seo_linkedin_articles: seoLinkedinArticles,
      seo_pr_offpage: seoPrOffpage,
      seo_impressions_kpi: seoImpressionsKpi || null,
      seo_impressions_goal: seoImpressionsGoal,
      notes: notes || null,
    };

    if (kpi) {
      await supabaseClient.from("social_kpis").update(data).eq("id", kpi.id);
    } else {
      await supabaseClient.from("social_kpis").insert(data);
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">{kpi ? "Edit KPI" : "Add KPI"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Strategy & Period */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Strategy Link</label>
              <SearchableStrategyDropdown
                strategies={strategies}
                value={strategyId}
                onChange={setStrategyId}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Report Period *</label>
              <input type="text" value={reportPeriod} onChange={(e) => setReportPeriod(e.target.value)}
                placeholder="e.g., 2026-Q2 or 2026-03"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500/20" />
            </div>
          </div>

          {/* Social Media Section */}
          <div className="rounded-xl border border-pink-200 bg-pink-50/50 p-4">
            <h3 className="text-sm font-bold text-pink-700 mb-4">📱 Social Media</h3>
            
            <p className="text-xs font-semibold text-pink-600 mb-2">A. Content</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="mb-1 block text-xs text-slate-600">Reels</label>
                <input type="number" value={smReels} onChange={(e) => setSmReels(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm text-black focus:border-pink-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Long-Form Video</label>
                <input type="number" value={smLongFormVideo} onChange={(e) => setSmLongFormVideo(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm text-black focus:border-pink-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Static/Carousels</label>
                <input type="number" value={smStaticCarousels} onChange={(e) => setSmStaticCarousels(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm text-black focus:border-pink-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Stories</label>
                <input type="number" value={smStories} onChange={(e) => setSmStories(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm text-black focus:border-pink-400 focus:outline-none" />
              </div>
            </div>

            <p className="text-xs font-semibold text-pink-600 mb-2">B. KPI</p>
            
            {/* Impressions KPI with platform goals */}
            <div className="mb-6 border-b border-pink-100 pb-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Impressions KPI</label>
              <RichTextEditor
                value={smImpressionsKpi}
                onChange={setSmImpressionsKpi}
                placeholder="Enter impressions KPI ranges..."
                minHeight="100px"
              />
              {platforms.length > 0 && (
                <div className="mt-3 space-y-2">
                  {platforms.map((platform) => (
                    <div key={platform}>
                      <label className="mb-1 block text-xs text-slate-500">{PLATFORM_LABELS[platform] || platform} Goal</label>
                      <input 
                        type="number" 
                        step="any"
                        value={impressionsGoals[platform as keyof PlatformGoals] || ""}
                        onChange={(e) => setImpressionsGoals(prev => ({ ...prev, [platform]: parseFloat(e.target.value) || 0 }))}
                        placeholder={`Enter ${PLATFORM_LABELS[platform] || platform} goal...`}
                        className="w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm text-black focus:border-pink-400 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reach KPI with platform goals */}
            <div className="mb-6 border-b border-pink-100 pb-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Reach KPI</label>
              <RichTextEditor
                value={smReachKpi}
                onChange={setSmReachKpi}
                placeholder="e.g., Consistent Reach KPI Range:&#10;Instagram: 6,790 - 10,184&#10;Facebook: 565 - 848"
                minHeight="100px"
              />
              {platforms.length > 0 && (
                <div className="mt-3 space-y-2">
                  {platforms.map((platform) => (
                    <div key={platform}>
                      <label className="mb-1 block text-xs text-slate-500">{PLATFORM_LABELS[platform] || platform} Goal</label>
                      <input 
                        type="number" 
                        step="any"
                        value={reachGoals[platform as keyof PlatformGoals] || ""}
                        onChange={(e) => setReachGoals(prev => ({ ...prev, [platform]: parseFloat(e.target.value) || 0 }))}
                        placeholder={`Enter ${PLATFORM_LABELS[platform] || platform} goal...`}
                        className="w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm text-black focus:border-pink-400 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Engagement KPI with platform goals */}
            <div className="mb-6 border-b border-pink-100 pb-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Engagement KPI</label>
              <RichTextEditor
                value={smEngagementKpi}
                onChange={setSmEngagementKpi}
                placeholder="Enter engagement KPI ranges..."
                minHeight="100px"
              />
              {platforms.length > 0 && (
                <div className="mt-3 space-y-2">
                  {platforms.map((platform) => (
                    <div key={platform}>
                      <label className="mb-1 block text-xs text-slate-500">{PLATFORM_LABELS[platform] || platform} Goal</label>
                      <input 
                        type="number" 
                        step="any"
                        value={engagementGoals[platform as keyof PlatformGoals] || ""}
                        onChange={(e) => setEngagementGoals(prev => ({ ...prev, [platform]: parseFloat(e.target.value) || 0 }))}
                        placeholder={`Enter ${PLATFORM_LABELS[platform] || platform} goal...`}
                        className="w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm text-black focus:border-pink-400 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Followers KPI with platform goals */}
            <div className="mb-6 border-b border-pink-100 pb-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Followers KPI</label>
              <RichTextEditor
                value={smFollowersKpi}
                onChange={setSmFollowersKpi}
                placeholder="Enter followers KPI ranges..."
                minHeight="100px"
              />
              {platforms.length > 0 && (
                <div className="mt-3 space-y-2">
                  {platforms.map((platform) => (
                    <div key={platform}>
                      <label className="mb-1 block text-xs text-slate-500">{PLATFORM_LABELS[platform] || platform} Goal</label>
                      <input 
                        type="number" 
                        step="any"
                        value={followersGoals[platform as keyof PlatformGoals] || ""}
                        onChange={(e) => setFollowersGoals(prev => ({ ...prev, [platform]: parseFloat(e.target.value) || 0 }))}
                        placeholder={`Enter ${PLATFORM_LABELS[platform] || platform} goal...`}
                        className="w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm text-black focus:border-pink-400 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Clicks KPI with platform goals */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Clicks KPI</label>
              <RichTextEditor
                value={smClicksKpi}
                onChange={setSmClicksKpi}
                placeholder="Enter clicks KPI ranges..."
                minHeight="100px"
              />
              {platforms.length > 0 && (
                <div className="mt-3 space-y-2">
                  {platforms.map((platform) => (
                    <div key={platform}>
                      <label className="mb-1 block text-xs text-slate-500">{PLATFORM_LABELS[platform] || platform} Goal</label>
                      <input 
                        type="number" 
                        step="any"
                        value={clicksGoals[platform as keyof PlatformGoals] || ""}
                        onChange={(e) => setClicksGoals(prev => ({ ...prev, [platform]: parseFloat(e.target.value) || 0 }))}
                        placeholder={`Enter ${PLATFORM_LABELS[platform] || platform} goal...`}
                        className="w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm text-black focus:border-pink-400 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Email & WhatsApp Section */}
          <div className="rounded-xl border border-green-200 bg-green-50/50 p-4">
            <h3 className="text-sm font-bold text-green-700 mb-4">📧 Email & WhatsApp Marketing</h3>
            
            <p className="text-xs font-semibold text-green-600 mb-2">A. Campaigns</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="mb-1 block text-xs text-slate-600">Email Campaigns</label>
                <input type="number" value={emailCampaigns} onChange={(e) => setEmailCampaigns(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-black focus:border-green-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">WhatsApp Campaigns</label>
                <input type="number" value={whatsappCampaigns} onChange={(e) => setWhatsappCampaigns(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-black focus:border-green-400 focus:outline-none" />
              </div>
            </div>

            <p className="text-xs font-semibold text-green-600 mb-2">B. KPI</p>
            <div className="flex items-center gap-2">
              <div className="w-24">
                <label className="mb-1 block text-xs text-slate-600">CTR (%)</label>
                <input type="number" step="any" value={ewmCtrGoal} onChange={(e) => setEwmCtrGoal(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-black focus:border-green-400 focus:outline-none" />
              </div>
              <span className="text-sm font-medium text-green-700 mt-5">CTR</span>
            </div>
          </div>

          {/* SEO & AEO Section */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
            <h3 className="text-sm font-bold text-blue-700 mb-4">🔍 SEO & AEO</h3>
            
            <p className="text-xs font-semibold text-blue-600 mb-2">A. Content</p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="mb-1 block text-xs text-slate-600">Website Blogs</label>
                <input type="number" value={seoWebsiteBlogs} onChange={(e) => setSeoWebsiteBlogs(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-black focus:border-blue-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">LinkedIn Articles</label>
                <input type="number" value={seoLinkedinArticles} onChange={(e) => setSeoLinkedinArticles(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-black focus:border-blue-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">PR/Off Page</label>
                <input type="number" value={seoPrOffpage} onChange={(e) => setSeoPrOffpage(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-black focus:border-blue-400 focus:outline-none" />
              </div>
            </div>

            <p className="text-xs font-semibold text-blue-600 mb-2">B. KPI</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-600">Impressions KPI</label>
                <input type="text" value={seoImpressionsKpi} onChange={(e) => setSeoImpressionsKpi(e.target.value)}
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-black focus:border-blue-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Impressions Goal</label>
                <input type="number" step="any" value={seoImpressionsGoal} onChange={(e) => setSeoImpressionsGoal(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-black focus:border-blue-400 focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-black focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500/20 resize-none"
              placeholder="Additional notes..." />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={saving || !reportPeriod.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-pink-500/25 hover:shadow-xl disabled:opacity-50">
              {saving ? "Saving..." : "Save KPI"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
