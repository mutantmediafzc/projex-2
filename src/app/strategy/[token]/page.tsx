"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabaseClient";

type StrategyData = {
  id: string;
  project_id: string;
  title: string;
  quarter: string;
  objectives: string | null;
  core_goals: string | null;
  theme: string | null;
  target_audience: string | null;
  content_pillars: string[];
  kpi_targets: Record<string, { target: number; description: string }>;
  deliverables: Deliverable[];
  subscriptions: {
    manychat_subscribers: number;
    meta_verified: boolean;
    whatsapp_subscribers: number;
    newsletter_subscribers: number;
  };
  monthly_kpis: MonthlyKPI[];
  notes: string | null;
  is_published: boolean;
  public_link_token: string | null;
  public_link_expires_at: string | null;
  project: {
    id: string;
    name: string;
    brand_color: string | null;
    logo_url: string | null;
    platforms: string[];
    company: { name: string; logo_url: string | null } | null;
  } | null;
};

type Deliverable = {
  asset_type: string;
  planned_count: number;
  delivered_count: number;
};

type MonthlyKPI = {
  month: string;
  reach: number;
  impressions: number;
  engagement_rate: number;
  follower_growth: number;
  website_clicks: number;
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

const ASSET_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  reel: { label: "Reels", icon: "🎬" },
  static_post: { label: "Static Posts", icon: "🖼️" },
  story: { label: "Stories", icon: "📲" },
  carousel: { label: "Carousels", icon: "🎠" },
  long_form_video: { label: "Long-Form Videos", icon: "🎞️" },
  article: { label: "Articles", icon: "📝" },
  whatsapp: { label: "WhatsApp Content", icon: "💬" },
  ad_creative: { label: "Ad Creatives", icon: "📢" },
};

export default function PublicStrategyPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const [data, setData] = useState<StrategyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStrategy();
  }, [resolvedParams.token]);

  async function loadStrategy() {
    setLoading(true);

    // First try to load from social_strategy_links table
    const { data: linkData, error: linkError } = await supabaseClient
      .from("social_strategy_links")
      .select(`
        *,
        project:social_projects(
          id, name, brand_color, logo_url, platforms,
          manychat_subscribers, meta_verified, whatsapp_subscribers, newsletter_subscribers,
          company:companies(name, logo_url)
        )
      `)
      .eq("public_link_token", resolvedParams.token)
      .eq("is_published", true)
      .single();

    if (linkError || !linkData) {
      setError("Strategy not found or link has expired.");
      setLoading(false);
      return;
    }

    if (linkData.public_link_expires_at && new Date(linkData.public_link_expires_at) < new Date()) {
      setError("This strategy link has expired.");
      setLoading(false);
      return;
    }

    // Load deliverables for the quarter
    const { data: deliverables } = await supabaseClient
      .from("social_quarterly_deliverables")
      .select("asset_type, planned_count, delivered_count")
      .eq("project_id", linkData.project_id)
      .eq("report_quarter", linkData.quarter);

    // Load monthly KPI data
    const { data: reports } = await supabaseClient
      .from("social_reports")
      .select("report_month, kpi_data")
      .eq("project_id", linkData.project_id)
      .order("report_month", { ascending: true })
      .limit(12);

    const monthlyKpis = (reports || []).map((r: any) => ({
      month: new Date(r.report_month).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      reach: r.kpi_data?.reach?.actual || 0,
      impressions: r.kpi_data?.impressions?.actual || 0,
      engagement_rate: r.kpi_data?.engagement_rate?.actual || 0,
      follower_growth: r.kpi_data?.follower_growth?.actual || 0,
      website_clicks: r.kpi_data?.website_clicks?.actual || 0,
    }));

    setData({
      ...linkData,
      deliverables: deliverables || [],
      monthly_kpis: monthlyKpis,
      subscriptions: {
        manychat_subscribers: linkData.project?.manychat_subscribers || 0,
        meta_verified: linkData.project?.meta_verified || false,
        whatsapp_subscribers: linkData.project?.whatsapp_subscribers || 0,
        newsletter_subscribers: linkData.project?.newsletter_subscribers || 0,
      },
      project: {
        ...linkData.project,
        company: Array.isArray(linkData.project?.company) ? linkData.project.company[0] : linkData.project?.company,
      },
    } as StrategyData);

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-4xl mb-4">📋</div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Strategy Not Available</h1>
          <p className="text-slate-500">{error || "Unable to load the strategy."}</p>
        </div>
      </div>
    );
  }

  const totalPlanned = data.deliverables.reduce((sum, d) => sum + d.planned_count, 0);
  const totalDelivered = data.deliverables.reduce((sum, d) => sum + d.delivered_count, 0);
  const overallProgress = totalPlanned > 0 ? Math.min((totalDelivered / totalPlanned) * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 print:border-0">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4">
            {data.project?.company?.logo_url ? (
              <Image
                src={data.project.company.logo_url}
                alt=""
                width={64}
                height={64}
                className="h-16 w-16 rounded-xl object-cover"
              />
            ) : (
              <div
                className="flex h-16 w-16 items-center justify-center rounded-xl text-white text-2xl font-bold"
                style={{ background: data.project?.brand_color || "linear-gradient(135deg, #ec4899, #d946ef)" }}
              >
                {data.project?.name?.charAt(0) || "?"}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{data.title || `${data.project?.name} Strategy`}</h1>
              <p className="text-sm text-slate-500">{data.project?.company?.name}</p>
              <p className="text-xs text-slate-400 mt-1">{data.quarter} Strategy & KPI Report</p>
            </div>
          </div>

          {/* Platform badges */}
          <div className="mt-4 flex items-center gap-2">
            {(data.project?.platforms || []).map((platform) => {
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

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Subscriptions & Verification */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Subscriptions & Verification</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Meta Verified */}
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span className="text-xs font-medium text-blue-700">Meta Verified</span>
              </div>
              {data.subscriptions.meta_verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  Verified
                </span>
              ) : (
                <span className="text-sm text-slate-500">Not Verified</span>
              )}
            </div>

            {/* Manychat */}
            <div className="rounded-xl bg-gradient-to-br from-purple-50 to-fuchsia-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-5 w-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
                <span className="text-xs font-medium text-purple-700">Manychat</span>
              </div>
              <p className="text-xl font-bold text-purple-700">{data.subscriptions.manychat_subscribers.toLocaleString()}</p>
              <p className="text-xs text-slate-500">subscribers</p>
            </div>

            {/* WhatsApp */}
            <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span className="text-xs font-medium text-green-700">WhatsApp</span>
              </div>
              <p className="text-xl font-bold text-green-700">{data.subscriptions.whatsapp_subscribers.toLocaleString()}</p>
              <p className="text-xs text-slate-500">subscribers</p>
            </div>

            {/* Newsletter */}
            <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-5 w-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span className="text-xs font-medium text-amber-700">Newsletter</span>
              </div>
              <p className="text-xl font-bold text-amber-700">{data.subscriptions.newsletter_subscribers.toLocaleString()}</p>
              <p className="text-xs text-slate-500">subscribers</p>
            </div>
          </div>
        </section>

        {/* Objectives & Goals */}
        {(data.objectives || data.core_goals || data.theme) && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Strategy Overview</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {data.objectives && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Objectives</h3>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{data.objectives}</p>
                </div>
              )}
              {data.core_goals && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Core Goals</h3>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{data.core_goals}</p>
                </div>
              )}
              {data.theme && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Theme</h3>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{data.theme}</p>
                </div>
              )}
              {data.target_audience && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Target Audience</h3>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{data.target_audience}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Quarterly Deliverables */}
        {data.deliverables.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Quarterly Deliverables</h2>
            
            {/* Overall Progress */}
            <div className="mb-6 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Overall Progress</span>
                <span className="text-sm font-bold text-slate-900">{totalDelivered} / {totalPlanned}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all ${
                    overallProgress >= 100
                      ? "bg-emerald-500"
                      : overallProgress >= 75
                      ? "bg-blue-500"
                      : overallProgress >= 50
                      ? "bg-amber-500"
                      : "bg-slate-400"
                  }`}
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs text-slate-500">{overallProgress.toFixed(0)}% complete</p>
            </div>

            {/* Deliverables Grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.deliverables.map((d) => {
                const typeConfig = ASSET_TYPE_LABELS[d.asset_type] || { label: d.asset_type, icon: "📄" };
                const progress = d.planned_count > 0 ? Math.min((d.delivered_count / d.planned_count) * 100, 100) : 0;
                return (
                  <div key={d.asset_type} className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{typeConfig.icon}</span>
                      <span className="text-xs font-semibold text-slate-700">{typeConfig.label}</span>
                    </div>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-xl font-bold text-slate-900">{d.delivered_count}</span>
                      <span className="text-xs text-slate-500">/ {d.planned_count} planned</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${
                          progress >= 100 ? "bg-emerald-500" : progress >= 50 ? "bg-blue-500" : "bg-slate-400"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* KPI Performance */}
        {data.monthly_kpis.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">KPI Performance</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600">Month</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600 text-right">Reach</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600 text-right">Impressions</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600 text-right">Engagement</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600 text-right">Followers</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600 text-right">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthly_kpis.map((kpi) => (
                    <tr key={kpi.month} className="border-b border-slate-100">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{kpi.month}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 text-right">{kpi.reach.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 text-right">{kpi.impressions.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 text-right">{kpi.engagement_rate.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-sm text-slate-600 text-right">+{kpi.follower_growth.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 text-right">{kpi.website_clicks.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Notes */}
        {data.notes && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Notes</h2>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{data.notes}</p>
          </section>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pt-8 pb-4">
          <p>This strategy report was generated by Projex. For questions, please contact your account manager.</p>
        </div>
      </div>
    </div>
  );
}
