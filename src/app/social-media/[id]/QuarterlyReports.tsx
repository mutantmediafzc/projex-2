"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import QuarterlyDeliverables from "./QuarterlyDeliverables";

type QuarterlyReport = {
  id: string;
  report_quarter: string;
  quarter_start_date: string;
  quarter_end_date: string;
  monthly_data: MonthlyData[];
  platform_metrics: Record<string, PlatformMetric>;
  previous_quarter_comparison: Record<string, { current: number; previous: number; change: number }>;
  boosted_summary: Record<string, { posts: number; total_spend: number }>;
  objectives_text: string | null;
  core_goals: string | null;
  theme_text: string | null;
  content_pillars: string[];
  public_link_token: string | null;
  is_published: boolean;
  notes: string | null;
  created_at: string;
};

type MonthlyData = {
  month: string;
  reach: number;
  views: number;
  engagement: number;
  followers: number;
};

type PlatformMetric = {
  reach: number;
  views: number;
  engagement: number;
  followers: number;
};

type Props = {
  projectId: string;
  projectName: string;
  platforms: string[];
};

const QUARTERS = [
  { value: "Q1", label: "Q1 (Jan-Mar)", months: ["January", "February", "March"] },
  { value: "Q2", label: "Q2 (Apr-Jun)", months: ["April", "May", "June"] },
  { value: "Q3", label: "Q3 (Jul-Sep)", months: ["July", "August", "September"] },
  { value: "Q4", label: "Q4 (Oct-Dec)", months: ["October", "November", "December"] },
];

const PLATFORM_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  instagram: { icon: "📸", color: "text-pink-600", bg: "bg-pink-100" },
  facebook: { icon: "📘", color: "text-blue-600", bg: "bg-blue-100" },
  linkedin: { icon: "💼", color: "text-blue-700", bg: "bg-blue-100" },
  tiktok: { icon: "🎵", color: "text-gray-900", bg: "bg-gray-100" },
  x: { icon: "✖️", color: "text-gray-900", bg: "bg-gray-100" },
  youtube: { icon: "▶️", color: "text-red-600", bg: "bg-red-100" },
};

export default function QuarterlyReports({ projectId, projectName, platforms }: Props) {
  const [reports, setReports] = useState<QuarterlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReport, setEditingReport] = useState<QuarterlyReport | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(() => {
    const month = new Date().getMonth();
    if (month < 3) return "Q1";
    if (month < 6) return "Q2";
    if (month < 9) return "Q3";
    return "Q4";
  });
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadReports();
  }, [projectId]);

  async function loadReports() {
    setLoading(true);
    const { data } = await supabaseClient
      .from("social_quarterly_reports")
      .select("*")
      .eq("project_id", projectId)
      .order("quarter_start_date", { ascending: false });
    if (data) setReports(data as QuarterlyReport[]);
    setLoading(false);
  }

  const currentQuarterKey = `${selectedYear}-${selectedQuarter}`;
  const currentReport = reports.find((r) => r.report_quarter === currentQuarterKey);

  async function generatePublicLink(reportId: string) {
    setGenerating(true);
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await supabaseClient
      .from("social_quarterly_reports")
      .update({
        public_link_token: token,
        public_link_expires_at: expiresAt.toISOString(),
        is_published: true,
      })
      .eq("id", reportId);

    await loadReports();
    setGenerating(false);
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/reports/quarterly/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Quarterly Reports</h2>
          <p className="text-sm text-slate-500">Generate and manage quarterly performance reports</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-black focus:border-pink-300 focus:outline-none"
          >
            {[2024, 2025, 2026, 2027].map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-black focus:border-pink-300 focus:outline-none"
          >
            {QUARTERS.map((q) => (
              <option key={q.value} value={q.value}>{q.label}</option>
            ))}
          </select>
          <button
            onClick={() => { setEditingReport(currentReport || null); setShowModal(true); }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-pink-500/25 hover:shadow-xl"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {currentReport ? "Edit Report" : "Create Report"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
        </div>
      ) : !currentReport ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-100 to-fuchsia-100 text-pink-500">
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3v18h18" />
              <path d="M18 17V9" />
              <path d="M13 17V5" />
              <path d="M8 17v-3" />
            </svg>
          </div>
          <h3 className="mb-1 text-lg font-semibold text-slate-900">No report for {currentQuarterKey}</h3>
          <p className="text-sm text-slate-500">Create a quarterly report to track performance</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Report Header */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{projectName} - {currentQuarterKey}</h3>
                <p className="text-sm text-slate-500">
                  {new Date(currentReport.quarter_start_date).toLocaleDateString()} - {new Date(currentReport.quarter_end_date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {currentReport.public_link_token ? (
                  <button
                    onClick={() => copyLink(currentReport.public_link_token!)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {copiedToken === currentReport.public_link_token ? (
                      <><svg className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>Copied!</>
                    ) : (
                      <><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>Copy Link</>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => generatePublicLink(currentReport.id)}
                    disabled={generating}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    Generate Public Link
                  </button>
                )}
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${currentReport.is_published ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {currentReport.is_published ? "Published" : "Draft"}
                </span>
              </div>
            </div>

            {/* Platform Metrics Summary */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(currentReport.platform_metrics || {}).map(([platform, metrics]) => {
                const pConfig = PLATFORM_ICONS[platform.toLowerCase()] || { icon: "📊", color: "text-slate-600", bg: "bg-slate-100" };
                return (
                  <div key={platform} className={`rounded-xl ${pConfig.bg} p-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{pConfig.icon}</span>
                      <span className={`text-sm font-semibold capitalize ${pConfig.color}`}>{platform}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-slate-500">Reach:</span> <span className="font-medium">{(metrics as PlatformMetric).reach?.toLocaleString() || 0}</span></div>
                      <div><span className="text-slate-500">Views:</span> <span className="font-medium">{(metrics as PlatformMetric).views?.toLocaleString() || 0}</span></div>
                      <div><span className="text-slate-500">Engagement:</span> <span className="font-medium">{(metrics as PlatformMetric).engagement?.toLocaleString() || 0}</span></div>
                      <div><span className="text-slate-500">Followers:</span> <span className="font-medium">+{(metrics as PlatformMetric).followers?.toLocaleString() || 0}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Breakdown */}
          {currentReport.monthly_data && currentReport.monthly_data.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Monthly Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Month</th>
                      <th className="px-4 py-3 text-right">Reach</th>
                      <th className="px-4 py-3 text-right">Views</th>
                      <th className="px-4 py-3 text-right">Engagement</th>
                      <th className="px-4 py-3 text-right">Followers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentReport.monthly_data.map((month) => (
                      <tr key={month.month} className="border-b border-slate-100">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{month.month}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-right">{month.reach.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-right">{month.views.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-right">{month.engagement.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-right">+{month.followers.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quarter Comparison */}
          {currentReport.previous_quarter_comparison && Object.keys(currentReport.previous_quarter_comparison).length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Quarter-over-Quarter Comparison</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(currentReport.previous_quarter_comparison).map(([metric, data]) => (
                  <div key={metric} className="rounded-xl border border-slate-100 p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase mb-1">{metric.replace("_", " ")}</p>
                    <p className="text-xl font-bold text-slate-900">{data.current.toLocaleString()}</p>
                    <p className={`text-xs font-medium ${data.change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {data.change >= 0 ? "▲" : "▼"} {Math.abs(data.change).toFixed(1)}% vs last quarter
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quarterly Deliverables */}
          <QuarterlyDeliverables projectId={projectId} reportQuarter={currentQuarterKey} />

          {/* Boosted Summary */}
          {currentReport.boosted_summary && Object.keys(currentReport.boosted_summary).length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Boosted Content Summary</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Platform</th>
                      <th className="px-4 py-3 text-right">Posts</th>
                      <th className="px-4 py-3 text-right">Total Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(currentReport.boosted_summary).map(([platform, data]) => (
                      <tr key={platform} className="border-b border-slate-100">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900 capitalize">{platform}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-right">{data.posts}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-right">AED {data.total_spend.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-amber-50">
                      <td className="px-4 py-3 text-sm font-bold text-amber-800">Total</td>
                      <td className="px-4 py-3 text-sm font-bold text-amber-800 text-right">
                        {Object.values(currentReport.boosted_summary).reduce((sum, d) => sum + d.posts, 0)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-amber-800 text-right">
                        AED {Object.values(currentReport.boosted_summary).reduce((sum, d) => sum + d.total_spend, 0).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <QuarterlyReportModal
          report={editingReport}
          projectId={projectId}
          selectedYear={selectedYear}
          selectedQuarter={selectedQuarter}
          platforms={platforms}
          onClose={() => { setShowModal(false); setEditingReport(null); }}
          onSaved={() => { setShowModal(false); setEditingReport(null); loadReports(); }}
        />
      )}
    </div>
  );
}

function QuarterlyReportModal({
  report,
  projectId,
  selectedYear,
  selectedQuarter,
  platforms,
  onClose,
  onSaved,
}: {
  report: QuarterlyReport | null;
  projectId: string;
  selectedYear: number;
  selectedQuarter: string;
  platforms: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const quarterConfig = QUARTERS.find((q) => q.value === selectedQuarter)!;
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>(
    report?.monthly_data || quarterConfig.months.map((m) => ({ month: m, reach: 0, views: 0, engagement: 0, followers: 0 }))
  );
  const [platformMetrics, setPlatformMetrics] = useState<Record<string, PlatformMetric>>(
    report?.platform_metrics || platforms.reduce((acc, p) => ({ ...acc, [p]: { reach: 0, views: 0, engagement: 0, followers: 0 } }), {})
  );
  const [objectives, setObjectives] = useState(report?.objectives_text || "");
  const [coreGoals, setCoreGoals] = useState(report?.core_goals || "");
  const [theme, setTheme] = useState(report?.theme_text || "");
  const [notes, setNotes] = useState(report?.notes || "");
  const [saving, setSaving] = useState(false);

  const quarterStartMonth = selectedQuarter === "Q1" ? 0 : selectedQuarter === "Q2" ? 3 : selectedQuarter === "Q3" ? 6 : 9;
  const quarterStartDate = new Date(selectedYear, quarterStartMonth, 1).toISOString().split("T")[0];
  const quarterEndDate = new Date(selectedYear, quarterStartMonth + 3, 0).toISOString().split("T")[0];

  async function handleSubmit() {
    setSaving(true);
    const data = {
      project_id: projectId,
      report_quarter: `${selectedYear}-${selectedQuarter}`,
      quarter_start_date: quarterStartDate,
      quarter_end_date: quarterEndDate,
      monthly_data: monthlyData,
      platform_metrics: platformMetrics,
      objectives_text: objectives || null,
      core_goals: coreGoals || null,
      theme_text: theme || null,
      notes: notes || null,
    };

    if (report) {
      await supabaseClient.from("social_quarterly_reports").update(data).eq("id", report.id);
    } else {
      await supabaseClient.from("social_quarterly_reports").insert(data);
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            {report ? "Edit" : "Create"} {selectedYear} {selectedQuarter} Report
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Objectives Section */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Quarterly Objectives</label>
            <textarea
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-black focus:border-pink-300 focus:outline-none resize-none"
              placeholder="Describe the objectives for this quarter..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Core Goals</label>
              <textarea
                value={coreGoals}
                onChange={(e) => setCoreGoals(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-black focus:border-pink-300 focus:outline-none resize-none"
                placeholder="List core goals..."
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Theme</label>
              <textarea
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-black focus:border-pink-300 focus:outline-none resize-none"
                placeholder="Quarter theme..."
              />
            </div>
          </div>

          {/* Monthly Data */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Monthly Metrics</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Month</th>
                    <th className="px-3 py-2">Reach</th>
                    <th className="px-3 py-2">Views</th>
                    <th className="px-3 py-2">Engagement</th>
                    <th className="px-3 py-2">Followers</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((m, idx) => (
                    <tr key={m.month} className="border-b border-slate-100">
                      <td className="px-3 py-2 text-sm font-medium text-slate-900">{m.month}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={m.reach || ""}
                          onChange={(e) => {
                            const newData = [...monthlyData];
                            newData[idx].reach = parseInt(e.target.value) || 0;
                            setMonthlyData(newData);
                          }}
                          className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm text-black"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={m.views || ""}
                          onChange={(e) => {
                            const newData = [...monthlyData];
                            newData[idx].views = parseInt(e.target.value) || 0;
                            setMonthlyData(newData);
                          }}
                          className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm text-black"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={m.engagement || ""}
                          onChange={(e) => {
                            const newData = [...monthlyData];
                            newData[idx].engagement = parseInt(e.target.value) || 0;
                            setMonthlyData(newData);
                          }}
                          className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm text-black"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={m.followers || ""}
                          onChange={(e) => {
                            const newData = [...monthlyData];
                            newData[idx].followers = parseInt(e.target.value) || 0;
                            setMonthlyData(newData);
                          }}
                          className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm text-black"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Platform Metrics */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Platform Metrics</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {platforms.map((platform) => (
                <div key={platform} className="rounded-xl border border-slate-200 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-slate-900 capitalize">{platform}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {["reach", "views", "engagement", "followers"].map((metric) => (
                      <div key={metric}>
                        <label className="mb-1 block text-xs text-slate-500 capitalize">{metric}</label>
                        <input
                          type="number"
                          value={(platformMetrics[platform] as any)?.[metric] || ""}
                          onChange={(e) => {
                            setPlatformMetrics((prev) => ({
                              ...prev,
                              [platform]: {
                                ...prev[platform],
                                [metric]: parseInt(e.target.value) || 0,
                              },
                            }));
                          }}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-black"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-black focus:border-pink-300 focus:outline-none resize-none"
              placeholder="Additional notes..."
            />
          </div>

          {/* Actions */}
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
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-pink-500/25 hover:shadow-xl disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Report"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
