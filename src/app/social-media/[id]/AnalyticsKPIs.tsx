"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

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

export default function AnalyticsKPIs({ projectId }: { projectId: string }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // KPI system state
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [kpis, setKpis] = useState<SocialKPI[]>([]);
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [editingKpi, setEditingKpi] = useState<SocialKPI | null>(null);
  const [activeTab, setActiveTab] = useState<"reports" | "kpis">("kpis");

  useEffect(() => {
    loadReports();
    loadStrategies();
    loadKpis();
  }, [projectId]);

  async function loadReports() {
    setLoading(true);
    const { data } = await supabaseClient
      .from("social_reports")
      .select("*")
      .eq("project_id", projectId)
      .order("report_month", { ascending: false });
    if (data) setReports(data as Report[]);
    setLoading(false);
  }

  async function loadStrategies() {
    const { data } = await supabaseClient
      .from("social_strategy_links")
      .select("id, title, quarter")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (data) setStrategies(data as Strategy[]);
  }

  async function loadKpis() {
    const { data } = await supabaseClient
      .from("social_kpis")
      .select("*, strategy:social_strategy_links(id, title, quarter)")
      .eq("project_id", projectId)
      .order("report_period", { ascending: false });
    if (data) setKpis(data as SocialKPI[]);
  }

  const currentReport = reports.find((r) => r.report_month.startsWith(selectedMonth));
  const previousReport = reports.find((r) => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    return r.report_month.startsWith(`${prevYear}-${String(prevMonth).padStart(2, "0")}`);
  });

  const calculateMoM = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Strategies & KPIs</h2>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === "reports" && (
            <>
              <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500/20" />
              <button onClick={() => { setEditingReport(currentReport || null); setShowModal(true); }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-pink-500/25 hover:shadow-xl">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                {currentReport ? "Edit Report" : "Add Report"}
              </button>
            </>
          )}
          {activeTab === "kpis" && (
            <button onClick={() => { setEditingKpi(null); setShowKpiModal(true); }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-pink-500/25 hover:shadow-xl">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
              Add KPI
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setActiveTab("kpis")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === "kpis" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
        >
          📊 Strategy KPIs
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === "reports" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
        >
          📈 Monthly Reports
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" /></div>
      ) : activeTab === "kpis" ? (
        /* KPIs Tab Content */
        kpis.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-100 to-fuchsia-100 text-pink-500">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
            </div>
            <h3 className="mb-1 text-lg font-semibold text-slate-900">No KPIs added yet</h3>
            <p className="text-sm text-slate-500">Add KPI data linked to your strategies</p>
          </div>
        ) : (
          <div className="space-y-4">
            {kpis.map((kpi) => (
              <div key={kpi.id} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-900">{kpi.report_period}</span>
                      {kpi.strategy && (
                        <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                          {kpi.strategy.title}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">Added {new Date(kpi.created_at).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => { setEditingKpi(kpi); setShowKpiModal(true); }}
                    className="text-slate-400 hover:text-slate-600">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </div>
                
                {/* Social Media Section */}
                <div className="mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-pink-600 mb-3">Social Media</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <div className="rounded-lg bg-pink-50 p-3">
                      <p className="text-[10px] text-pink-600 font-medium">Reels</p>
                      <p className="text-lg font-bold text-pink-700">{kpi.sm_reels}</p>
                    </div>
                    <div className="rounded-lg bg-pink-50 p-3">
                      <p className="text-[10px] text-pink-600 font-medium">Long-Form Video</p>
                      <p className="text-lg font-bold text-pink-700">{kpi.sm_long_form_video}</p>
                    </div>
                    <div className="rounded-lg bg-pink-50 p-3">
                      <p className="text-[10px] text-pink-600 font-medium">Static/Carousels</p>
                      <p className="text-lg font-bold text-pink-700">{kpi.sm_static_carousels}</p>
                    </div>
                    <div className="rounded-lg bg-pink-50 p-3">
                      <p className="text-[10px] text-pink-600 font-medium">Stories</p>
                      <p className="text-lg font-bold text-pink-700">{kpi.sm_stories}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { label: "Impressions", kpi: kpi.sm_impressions_kpi, goal: kpi.sm_impressions_goal },
                      { label: "Reach", kpi: kpi.sm_reach_kpi, goal: kpi.sm_reach_goal },
                      { label: "Engagement", kpi: kpi.sm_engagement_kpi, goal: kpi.sm_engagement_goal },
                      { label: "Followers", kpi: kpi.sm_followers_kpi, goal: kpi.sm_followers_goal },
                      { label: "Clicks", kpi: kpi.sm_clicks_kpi, goal: kpi.sm_clicks_goal },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg border border-pink-100 bg-white p-2 text-center">
                        <p className="text-[9px] text-slate-500 mb-0.5">{item.label}</p>
                        <p className="text-xs font-semibold text-slate-800 truncate">{item.kpi || "—"}</p>
                        <p className="text-[10px] text-pink-600">Goal: {item.goal?.toLocaleString() || 0}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Email & WhatsApp Section */}
                <div className="mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-green-600 mb-3">Email & WhatsApp</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-green-50 p-3">
                      <p className="text-[10px] text-green-600 font-medium">Email Campaigns</p>
                      <p className="text-lg font-bold text-green-700">{kpi.email_campaigns}</p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-3">
                      <p className="text-[10px] text-green-600 font-medium">WhatsApp Campaigns</p>
                      <p className="text-lg font-bold text-green-700">{kpi.whatsapp_campaigns}</p>
                    </div>
                    <div className="rounded-lg border border-green-100 bg-white p-3 text-center">
                      <p className="text-[10px] text-slate-500">CTR KPI</p>
                      <p className="text-sm font-semibold text-slate-800">{kpi.ewm_ctr_kpi || "—"}</p>
                      <p className="text-[10px] text-green-600">Goal: {kpi.ewm_ctr_goal}%</p>
                    </div>
                  </div>
                </div>

                {/* SEO & AEO Section */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-3">SEO & AEO</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-blue-50 p-3">
                      <p className="text-[10px] text-blue-600 font-medium">Website Blogs</p>
                      <p className="text-lg font-bold text-blue-700">{kpi.seo_website_blogs}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-3">
                      <p className="text-[10px] text-blue-600 font-medium">LinkedIn Articles</p>
                      <p className="text-lg font-bold text-blue-700">{kpi.seo_linkedin_articles}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-3">
                      <p className="text-[10px] text-blue-600 font-medium">PR/Off Page</p>
                      <p className="text-lg font-bold text-blue-700">{kpi.seo_pr_offpage}</p>
                    </div>
                    <div className="rounded-lg border border-blue-100 bg-white p-3 text-center">
                      <p className="text-[10px] text-slate-500">Impressions KPI</p>
                      <p className="text-sm font-semibold text-slate-800">{kpi.seo_impressions_kpi || "—"}</p>
                      <p className="text-[10px] text-blue-600">Goal: {kpi.seo_impressions_goal?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : !currentReport ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-100 to-fuchsia-100 text-pink-500">
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
          </div>
          <h3 className="mb-1 text-lg font-semibold text-slate-900">No data for {selectedMonth}</h3>
          <p className="text-sm text-slate-500">Add metrics for this month to track performance</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(KPI_LABELS).map(([key, { label, format, icon }]) => {
              const kpiData = currentReport.kpi_data[key as keyof typeof currentReport.kpi_data];
              const prevData = previousReport?.kpi_data[key as keyof typeof currentReport.kpi_data];
              const actual = kpiData?.actual || 0;
              const goal = kpiData?.goal || 0;
              const progress = goal > 0 ? Math.min((actual / goal) * 100, 100) : 0;
              const mom = prevData ? calculateMoM(actual, prevData.actual) : null;

              return (
                <div key={key} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600">{icon}<span className="text-sm font-medium">{label}</span></div>
                    {mom !== null && (
                      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${mom >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {mom >= 0 ? "▲" : "▼"} {Math.abs(mom).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="mb-3">
                    <span className="text-2xl font-bold text-slate-900">{format(actual)}</span>
                    <span className="ml-2 text-sm text-slate-500">/ {format(goal)} goal</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-emerald-500" : progress >= 75 ? "bg-blue-500" : progress >= 50 ? "bg-amber-500" : "bg-slate-300"}`}
                      style={{ width: `${progress}%` }} />
                  </div>
                  <div className="mt-1 text-right text-xs text-slate-500">{progress.toFixed(0)}% of goal</div>
                </div>
              );
            })}
          </div>

          {/* Notes */}
          {currentReport.notes && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Notes</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{currentReport.notes}</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <ReportModal report={editingReport} projectId={projectId} selectedMonth={selectedMonth}
          onClose={() => { setShowModal(false); setEditingReport(null); }}
          onSaved={() => { setShowModal(false); setEditingReport(null); loadReports(); }} />
      )}

      {showKpiModal && (
        <KpiModal kpi={editingKpi} projectId={projectId} strategies={strategies}
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

function KpiModal({ kpi, projectId, strategies, onClose, onSaved }: { 
  kpi: SocialKPI | null; 
  projectId: string; 
  strategies: Strategy[];
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
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Strategy</label>
              <select value={strategyId} onChange={(e) => setStrategyId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500/20">
                <option value="">Select a strategy...</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>{s.title} ({s.quarter})</option>
                ))}
              </select>
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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: "Impressions", kpiVal: smImpressionsKpi, setKpi: setSmImpressionsKpi, goalVal: smImpressionsGoal, setGoal: setSmImpressionsGoal },
                { label: "Reach", kpiVal: smReachKpi, setKpi: setSmReachKpi, goalVal: smReachGoal, setGoal: setSmReachGoal },
                { label: "Engagement", kpiVal: smEngagementKpi, setKpi: setSmEngagementKpi, goalVal: smEngagementGoal, setGoal: setSmEngagementGoal },
                { label: "Followers", kpiVal: smFollowersKpi, setKpi: setSmFollowersKpi, goalVal: smFollowersGoal, setGoal: setSmFollowersGoal },
                { label: "Clicks", kpiVal: smClicksKpi, setKpi: setSmClicksKpi, goalVal: smClicksGoal, setGoal: setSmClicksGoal },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div>
                    <label className="mb-1 block text-[10px] text-slate-500">{item.label} KPI</label>
                    <input type="text" value={item.kpiVal} onChange={(e) => item.setKpi(e.target.value)}
                      className="w-full rounded-lg border border-pink-200 bg-white px-2 py-1.5 text-xs text-black focus:border-pink-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-slate-500">{item.label} Goal</label>
                    <input type="number" value={item.goalVal} onChange={(e) => item.setGoal(parseInt(e.target.value) || 0)}
                      className="w-full rounded-lg border border-pink-200 bg-white px-2 py-1.5 text-xs text-black focus:border-pink-400 focus:outline-none" />
                  </div>
                </div>
              ))}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-600">CTR KPI</label>
                <input type="text" value={ewmCtrKpi} onChange={(e) => setEwmCtrKpi(e.target.value)}
                  className="w-full rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-black focus:border-green-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">CTR Goal (%)</label>
                <input type="number" value={ewmCtrGoal} onChange={(e) => setEwmCtrGoal(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-black focus:border-green-400 focus:outline-none" />
              </div>
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
                <input type="number" value={seoImpressionsGoal} onChange={(e) => setSeoImpressionsGoal(parseInt(e.target.value) || 0)}
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
