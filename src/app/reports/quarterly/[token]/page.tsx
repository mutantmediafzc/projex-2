"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabaseClient";

type QuarterlyReport = {
  id: string;
  report_quarter: string;
  quarter_start_date: string;
  quarter_end_date: string;
  monthly_data: { month: string; reach: number; views: number; engagement: number; followers: number }[];
  platform_metrics: Record<string, { reach: number; views: number; engagement: number; followers: number }>;
  previous_quarter_comparison: Record<string, { current: number; previous: number; change: number }>;
  boosted_summary: Record<string, { posts: number; total_spend: number }>;
  content_data: Post[];
  objectives_text: string | null;
  core_goals: string | null;
  theme_text: string | null;
  content_pillars: string[];
  notes: string | null;
  project: {
    id: string;
    name: string;
    brand_color: string | null;
    logo_url: string | null;
    platforms: string[];
    report_platforms: string[];
    company: { name: string; logo_url: string | null } | null;
  } | null;
};

type Post = {
  id: string;
  caption: string | null;
  platforms: string[];
  content_type: string | null;
  post_type: string;
  platform_budgets: Record<string, number>;
  scheduled_date: string | null;
  media_urls: { url: string; type: string }[];
};

const PLATFORM_ICONS: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  instagram: {
    icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/></svg>,
    label: "Instagram",
    color: "text-pink-600",
    bg: "bg-gradient-to-br from-pink-500 to-purple-600",
  },
  facebook: {
    icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    label: "Facebook",
    color: "text-blue-600",
    bg: "bg-gradient-to-br from-blue-600 to-blue-500",
  },
  linkedin: {
    icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z"/></svg>,
    label: "LinkedIn",
    color: "text-blue-700",
    bg: "bg-gradient-to-br from-blue-700 to-blue-600",
  },
  tiktok: {
    icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>,
    label: "TikTok",
    color: "text-gray-900",
    bg: "bg-gradient-to-br from-gray-900 to-gray-700",
  },
  x: {
    icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    label: "X",
    color: "text-gray-900",
    bg: "bg-gradient-to-br from-gray-900 to-black",
  },
  youtube: {
    icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
    label: "YouTube",
    color: "text-red-600",
    bg: "bg-gradient-to-br from-red-600 to-red-500",
  },
};

export default function PublicQuarterlyReportPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const [report, setReport] = useState<QuarterlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [boostedPlatformFilter, setBoostedPlatformFilter] = useState<string>("all");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadReport();
  }, [resolvedParams.token]);

  async function loadReport() {
    setLoading(true);

    const { data, error: fetchError } = await supabaseClient
      .from("social_quarterly_reports")
      .select(`
        *,
        project:social_projects(
          id, name, brand_color, logo_url, platforms, report_platforms,
          company:companies(name, logo_url)
        )
      `)
      .eq("public_link_token", resolvedParams.token)
      .eq("is_published", true)
      .single();

    if (fetchError || !data) {
      setError("Report not found or has expired.");
      setLoading(false);
      return;
    }

    if (data.public_link_expires_at && new Date(data.public_link_expires_at) < new Date()) {
      setError("This report link has expired.");
      setLoading(false);
      return;
    }

    // Load content data for the quarter
    const { data: posts } = await supabaseClient
      .from("social_posts")
      .select("id, caption, platforms, content_type, post_type, platform_budgets, scheduled_date, media_urls")
      .eq("project_id", data.project.id)
      .gte("scheduled_date", data.quarter_start_date)
      .lte("scheduled_date", data.quarter_end_date)
      .order("scheduled_date", { ascending: true });

    setReport({
      ...data,
      content_data: posts || [],
      project: {
        ...data.project,
        company: Array.isArray(data.project.company) ? data.project.company[0] : data.project.company,
      },
    } as QuarterlyReport);
    setLoading(false);
  }

  async function downloadPDF() {
    setDownloading(true);
    try {
      // Use browser print functionality for PDF
      window.print();
    } catch (err) {
      console.error("PDF download failed:", err);
    }
    setDownloading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Report Not Available</h1>
          <p className="text-slate-500">{error || "Unable to load the report."}</p>
        </div>
      </div>
    );
  }

  const displayPlatforms = (report.project?.report_platforms?.length ? report.project.report_platforms : report.project?.platforms) || [];
  const filteredPlatformMetrics = platformFilter === "all"
    ? report.platform_metrics
    : { [platformFilter]: report.platform_metrics[platformFilter] };

  const filteredContent = platformFilter === "all"
    ? report.content_data
    : report.content_data.filter((p) => p.platforms.includes(platformFilter));

  const boostedContent = report.content_data.filter((p) => p.post_type === "boosted");
  const filteredBoostedContent = boostedPlatformFilter === "all"
    ? boostedContent
    : boostedContent.filter((p) => p.platforms.includes(boostedPlatformFilter));

  const boostedTotals = filteredBoostedContent.reduce(
    (acc, post) => {
      Object.entries(post.platform_budgets || {}).forEach(([platform, amount]) => {
        if (boostedPlatformFilter === "all" || platform === boostedPlatformFilter) {
          acc.total += amount;
          acc.byPlatform[platform] = (acc.byPlatform[platform] || 0) + amount;
        }
      });
      return acc;
    },
    { total: 0, byPlatform: {} as Record<string, number> }
  );

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 print:border-0">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {report.project?.company?.logo_url ? (
                <Image
                  src={report.project.company.logo_url}
                  alt=""
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-xl object-cover"
                />
              ) : (
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-xl text-white text-2xl font-bold"
                  style={{ background: report.project?.brand_color || "linear-gradient(135deg, #ec4899, #d946ef)" }}
                >
                  {report.project?.name?.charAt(0) || "?"}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {report.project?.name} - {report.report_quarter}
                </h1>
                <p className="text-sm text-slate-500">
                  Social Media Marketing Report & Analytics
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(report.quarter_start_date).toLocaleDateString("en-US", { month: "long", day: "numeric" })} - {new Date(report.quarter_end_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
            <button
              onClick={downloadPDF}
              disabled={downloading}
              className="print:hidden inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {downloading ? "Preparing..." : "Download PDF"}
            </button>
          </div>

          {/* Platform badges */}
          <div className="mt-4 flex items-center gap-2">
            {displayPlatforms.map((platform) => {
              const pConfig = PLATFORM_ICONS[platform.toLowerCase()];
              if (!pConfig) return null;
              return (
                <span
                  key={platform}
                  className={`inline-flex items-center gap-1.5 rounded-full ${pConfig.bg} px-3 py-1.5 text-xs font-medium text-white`}
                >
                  {pConfig.icon}
                  {pConfig.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Objectives Section */}
        {(report.objectives_text || report.core_goals || report.theme_text) && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 print:border print:shadow-none">
            <h2 className="text-lg font-bold text-slate-900 mb-4">A. Objectives</h2>
            {report.objectives_text && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Overview</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{report.objectives_text}</p>
              </div>
            )}
            {report.core_goals && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Core Goals</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{report.core_goals}</p>
              </div>
            )}
            {report.theme_text && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Theme</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{report.theme_text}</p>
              </div>
            )}
          </section>
        )}

        {/* Platform Filter */}
        <div className="print:hidden flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Filter by platform:</span>
          <button
            onClick={() => setPlatformFilter("all")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              platformFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Platforms
          </button>
          {displayPlatforms.map((platform) => {
            const pConfig = PLATFORM_ICONS[platform.toLowerCase()];
            if (!pConfig) return null;
            return (
              <button
                key={platform}
                onClick={() => setPlatformFilter(platform)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  platformFilter === platform ? `${pConfig.bg} text-white` : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {pConfig.label}
              </button>
            );
          })}
        </div>

        {/* Organic Content Analytics */}
        <section className="rounded-2xl border border-slate-200 bg-white print:border print:shadow-none">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">E. Organic Content Analytics</h2>
          </div>
          <div className="p-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600">Platform</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600">Reach</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600">Views</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600">Engagement</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-600">Followers</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(filteredPlatformMetrics).map(([platform, metrics]) => {
                  const pConfig = PLATFORM_ICONS[platform.toLowerCase()];
                  if (!metrics) return null;
                  return (
                    <tr key={platform} className="border-b border-slate-100">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${pConfig?.bg || "bg-slate-200"} text-white`}>
                            {pConfig?.icon || "📊"}
                          </span>
                          <span className="font-medium text-slate-900 capitalize">{platform}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-semibold text-slate-900">{metrics.reach?.toLocaleString() || 0}</span>
                        <span className="block text-xs text-emerald-600">100%</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-semibold text-slate-900">{metrics.views?.toLocaleString() || 0}</span>
                        <span className="block text-xs text-emerald-600">100%</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-semibold text-slate-900">{metrics.engagement?.toLocaleString() || 0}</span>
                        <span className="block text-xs text-emerald-600">100%</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-semibold text-slate-900">+{metrics.followers?.toLocaleString() || 0}</span>
                        <span className="block text-xs text-emerald-600">100%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Quarter Growth Charts */}
        {report.monthly_data && report.monthly_data.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 print:border print:shadow-none">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Quarter Growth</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {["reach", "views", "engagement", "followers"].map((metric) => (
                <div key={metric} className="rounded-xl border border-slate-100 p-4">
                  <h3 className="text-sm font-semibold text-slate-600 capitalize mb-3">{metric}</h3>
                  <div className="space-y-2">
                    {report.monthly_data.map((m, idx) => {
                      const value = (m as any)[metric] || 0;
                      const maxValue = Math.max(...report.monthly_data.map((d) => (d as any)[metric] || 0));
                      const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                      return (
                        <div key={m.month} className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-12">{m.month.slice(0, 3)}</span>
                          <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-pink-500 to-fuchsia-500 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-700 w-16 text-right">
                            {value.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quarter Comparison */}
        {report.previous_quarter_comparison && Object.keys(report.previous_quarter_comparison).length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 print:border print:shadow-none">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Comparison from Previous Quarter</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(report.previous_quarter_comparison).map(([metric, data]) => (
                <div key={metric} className="rounded-xl bg-slate-50 p-4 text-center">
                  <p className="text-xs font-medium text-slate-500 uppercase mb-1">{metric.replace("_", " ")}</p>
                  <p className="text-2xl font-bold text-slate-900">{data.current.toLocaleString()}</p>
                  <p className={`text-sm font-semibold ${data.change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {data.change >= 0 ? "↑" : "↓"} {Math.abs(data.change).toFixed(1)}%
                  </p>
                  <p className="text-xs text-slate-400">vs {data.previous.toLocaleString()} last quarter</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Content Calendar */}
        <section className="rounded-2xl border border-slate-200 bg-white print:border print:shadow-none">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">F. Content Calendar</h2>
            <div className="print:hidden flex items-center gap-2">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg ${viewMode === "list" ? "bg-slate-200" : "hover:bg-slate-100"}`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-slate-200" : "hover:bg-slate-100"}`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                </svg>
              </button>
            </div>
          </div>
          <div className="p-6">
            {viewMode === "list" ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600">Posts</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600">Format</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600">Platforms</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContent.slice(0, 20).map((post) => (
                    <tr key={post.id} className="border-b border-slate-100">
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          {post.media_urls?.[0]?.url && (
                            <Image
                              src={post.media_urls[0].url}
                              alt=""
                              width={48}
                              height={48}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          )}
                          <div>
                            <p className="font-medium text-slate-900 line-clamp-1">
                              {post.caption?.slice(0, 50) || "Untitled"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {post.scheduled_date ? new Date(post.scheduled_date).toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "No date"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{post.content_type || "Post"}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {post.platforms.map((p) => (
                            <span key={p} className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 capitalize">
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredContent.slice(0, 12).map((post) => (
                  <div key={post.id} className="rounded-xl border border-slate-200 overflow-hidden">
                    {post.media_urls?.[0]?.url && (
                      <Image
                        src={post.media_urls[0].url}
                        alt=""
                        width={300}
                        height={200}
                        className="w-full h-40 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <p className="text-sm font-medium text-slate-900 line-clamp-2 mb-2">
                        {post.caption?.slice(0, 80) || "Untitled"}
                      </p>
                      <p className="text-xs text-slate-500 mb-2">
                        {post.scheduled_date ? new Date(post.scheduled_date).toLocaleDateString() : "No date"}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {post.platforms.map((p) => (
                          <span key={p} className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 capitalize">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Boosted Content */}
        {boostedContent.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white print:border print:shadow-none">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">G. Boosted Content</h2>
                <div className="print:hidden flex items-center gap-2">
                  <span className="text-sm text-slate-500">Filter:</span>
                  <select
                    value={boostedPlatformFilter}
                    onChange={(e) => setBoostedPlatformFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-black"
                  >
                    <option value="all">All Platforms</option>
                    {displayPlatforms.map((p) => (
                      <option key={p} value={p} className="capitalize">{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600">Boosted Posts</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600">Format</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600">Platforms</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBoostedContent.map((post) => (
                    <tr key={post.id} className="border-b border-slate-100">
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          {post.media_urls?.[0]?.url && (
                            <Image
                              src={post.media_urls[0].url}
                              alt=""
                              width={48}
                              height={48}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          )}
                          <div>
                            <p className="font-medium text-slate-900 line-clamp-1">
                              {post.caption?.slice(0, 50) || "Untitled"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {post.scheduled_date ? new Date(post.scheduled_date).toLocaleDateString() : "No date"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{post.content_type || "Post"}</td>
                      <td className="px-4 py-4 text-sm text-slate-600 capitalize">
                        {Object.keys(post.platform_budgets || {}).join(", ") || post.platforms.join(", ")}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-900 text-right">
                        AED {Object.values(post.platform_budgets || {}).reduce((sum, v) => sum + v, 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-amber-50">
                    <td colSpan={3} className="px-4 py-3 text-sm font-bold text-amber-800">
                      Total ({filteredBoostedContent.length} posts)
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-amber-800 text-right">
                      AED {boostedTotals.total.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pt-8 pb-4">
          <p>This report was generated by Projex. For questions, please contact your account manager.</p>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:border { border: 1px solid #e2e8f0 !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:bg-white { background: white !important; }
        }
      `}</style>
    </div>
  );
}
