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
  content_pillars: string | null;
  target_audience: string | null;
  kpi_description: string | null;
  platform_specific_strategy: string | null;
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

type SocialKPI = {
  id: string;
  report_period: string;
  sm_reels: number;
  sm_long_form_video: number;
  sm_static_carousels: number;
  sm_stories: number;
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
  email_campaigns: number;
  whatsapp_campaigns: number;
  ewm_ctr_kpi: string | null;
  ewm_ctr_goal: number;
  seo_website_blogs: number;
  seo_linkedin_articles: number;
  seo_pr_offpage: number;
  seo_impressions_kpi: string | null;
  seo_impressions_goal: number;
  notes: string | null;
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
  const [kpis, setKpis] = useState<SocialKPI[]>([]);

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

    // Load strategy KPIs
    const { data: kpiData } = await supabaseClient
      .from("social_kpis")
      .select("*")
      .eq("strategy_id", linkData.id)
      .order("report_period", { ascending: false });
    
    if (kpiData) setKpis(kpiData as SocialKPI[]);

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
      {/* Header - Clean branded header with Mutant logo and Client logo */}
      <div className="bg-white border-b border-slate-200 print:border-0">
        {/* Top bar with logos */}
        <div className="border-b border-slate-100">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Mutant Logo */}
              <div className="flex items-center gap-3">
                <Image
                  src="/logos/mutant-logo.avif"
                  alt="Mutant"
                  width={120}
                  height={40}
                  className="h-10 w-auto object-contain"
                />
                <div className="h-8 w-px bg-slate-200" />
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Strategy Report</span>
              </div>
              
              {/* Client Logo */}
              <div className="flex items-center gap-3">
                {data.project?.company?.logo_url ? (
                  <Image
                    src={data.project.company.logo_url}
                    alt={data.project?.company?.name || ""}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-lg object-cover border border-slate-100"
                  />
                ) : data.project?.logo_url ? (
                  <Image
                    src={data.project.logo_url}
                    alt={data.project?.name || ""}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-lg object-cover border border-slate-100"
                  />
                ) : (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg text-white text-lg font-bold"
                    style={{ background: data.project?.brand_color || "linear-gradient(135deg, #ec4899, #d946ef)" }}
                  >
                    {data.project?.name?.charAt(0) || "?"}
                  </div>
                )}
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{data.project?.company?.name || data.project?.name}</p>
                  <p className="text-xs text-slate-500">{data.quarter}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Title section */}
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{data.title || `${data.project?.name} Strategy`}</h1>
            <p className="text-sm text-slate-500 mt-1">Integrated Marketing Strategy & KPI Report</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Strategy Overview Section */}
            {(data.objectives || data.core_goals || data.content_pillars || data.target_audience || data.kpi_description || data.platform_specific_strategy) && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                {data.objectives && (
                  <div className="mb-6">
                    <h3 className="text-base font-bold text-slate-900 mb-3">Objectives</h3>
                    <div className="text-sm text-slate-700 leading-relaxed strategy-content" dangerouslySetInnerHTML={{ __html: data.objectives }} />
                  </div>
                )}
                {data.core_goals && (
                  <div className="mb-6">
                    <h3 className="text-base font-bold text-slate-900 mb-3">Core Goals</h3>
                    <div className="text-sm text-slate-700 leading-relaxed strategy-content" dangerouslySetInnerHTML={{ __html: data.core_goals }} />
                  </div>
                )}
                {data.content_pillars && (
                  <div className="mb-6">
                    <h3 className="text-base font-bold text-slate-900 mb-3">Content Pillars</h3>
                    <div className="text-sm text-slate-700 leading-relaxed strategy-content" dangerouslySetInnerHTML={{ __html: data.content_pillars }} />
                  </div>
                )}
                {data.target_audience && (
                  <div className="mb-6">
                    <h3 className="text-base font-bold text-slate-900 mb-3">Target Audience</h3>
                    <div className="text-sm text-slate-700 leading-relaxed strategy-content" dangerouslySetInnerHTML={{ __html: data.target_audience }} />
                  </div>
                )}
                {data.kpi_description && (
                  <div className="mb-6">
                    <h3 className="text-base font-bold text-slate-900 mb-3">KPIs</h3>
                    <div className="text-sm text-slate-700 leading-relaxed strategy-content" dangerouslySetInnerHTML={{ __html: data.kpi_description }} />
                  </div>
                )}
                {data.platform_specific_strategy && (
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-3">Platform Specific Strategy</h3>
                    <div className="text-sm text-slate-700 leading-relaxed strategy-content" dangerouslySetInnerHTML={{ __html: data.platform_specific_strategy }} />
                  </div>
                )}
              </section>
            )}

            {/* KPIs Section */}
            {kpis.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-6">
              {kpis.map((kpi) => (
                <div key={kpi.id} className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="inline-flex items-center rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25">
                      {kpi.report_period}
                    </span>
                  </div>
                  
                  {/* Social Media Section */}
                  <div className="rounded-2xl bg-gradient-to-br from-pink-50/80 to-rose-50/80 backdrop-blur-sm p-5 border border-pink-100/50">
                    <h4 className="text-sm font-bold text-pink-700 mb-4 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-pink-100">📱</span>
                      Social Media Content
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div className="rounded-xl bg-white/60 backdrop-blur-sm p-4 text-center border border-pink-100/50 shadow-sm">
                        <p className="text-2xl font-bold text-pink-600">{kpi.sm_reels}</p>
                        <p className="text-xs text-pink-500 font-medium">Reels</p>
                      </div>
                      <div className="rounded-xl bg-white/60 backdrop-blur-sm p-4 text-center border border-pink-100/50 shadow-sm">
                        <p className="text-2xl font-bold text-pink-600">{kpi.sm_long_form_video}</p>
                        <p className="text-xs text-pink-500 font-medium">Long-Form Video</p>
                      </div>
                      <div className="rounded-xl bg-white/60 backdrop-blur-sm p-4 text-center border border-pink-100/50 shadow-sm">
                        <p className="text-2xl font-bold text-pink-600">{kpi.sm_static_carousels}</p>
                        <p className="text-xs text-pink-500 font-medium">Static/Carousels</p>
                      </div>
                      <div className="rounded-xl bg-white/60 backdrop-blur-sm p-4 text-center border border-pink-100/50 shadow-sm">
                        <p className="text-2xl font-bold text-pink-600">{kpi.sm_stories}</p>
                        <p className="text-xs text-pink-500 font-medium">Stories</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { label: "Impressions", kpiVal: kpi.sm_impressions_kpi, goal: kpi.sm_impressions_goal },
                        { label: "Reach", kpiVal: kpi.sm_reach_kpi, goal: kpi.sm_reach_goal },
                        { label: "Engagement", kpiVal: kpi.sm_engagement_kpi, goal: kpi.sm_engagement_goal },
                        { label: "Followers", kpiVal: kpi.sm_followers_kpi, goal: kpi.sm_followers_goal },
                        { label: "Clicks", kpiVal: kpi.sm_clicks_kpi, goal: kpi.sm_clicks_goal },
                      ].map((item) => (
                        <div key={item.label} className="rounded-xl bg-white/80 backdrop-blur-sm p-3 text-center border border-pink-50">
                          <p className="text-[10px] text-slate-500 mb-0.5">{item.label}</p>
                          <p className="text-xs font-semibold text-slate-800">{item.kpiVal || "—"}</p>
                          <p className="text-[9px] text-pink-500">Goal: {item.goal?.toLocaleString() || 0}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Email & WhatsApp Section */}
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-50/80 to-green-50/80 backdrop-blur-sm p-5 border border-emerald-100/50">
                    <h4 className="text-sm font-bold text-emerald-700 mb-4 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100">📧</span>
                      Email & WhatsApp Marketing
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-white/60 backdrop-blur-sm p-4 text-center border border-emerald-100/50 shadow-sm">
                        <p className="text-2xl font-bold text-emerald-600">{kpi.email_campaigns}</p>
                        <p className="text-xs text-emerald-500 font-medium">Email Campaigns</p>
                      </div>
                      <div className="rounded-xl bg-white/60 backdrop-blur-sm p-4 text-center border border-emerald-100/50 shadow-sm">
                        <p className="text-2xl font-bold text-emerald-600">{kpi.whatsapp_campaigns}</p>
                        <p className="text-xs text-emerald-500 font-medium">WhatsApp Campaigns</p>
                      </div>
                      <div className="rounded-xl bg-white/80 backdrop-blur-sm p-4 text-center border border-emerald-50">
                        <p className="text-[10px] text-slate-500 mb-0.5">CTR KPI</p>
                        <p className="text-lg font-semibold text-slate-800">{kpi.ewm_ctr_kpi || "—"}</p>
                        <p className="text-[9px] text-emerald-500">Goal: {kpi.ewm_ctr_goal}%</p>
                      </div>
                    </div>
                  </div>

                  {/* SEO & AEO Section */}
                  <div className="rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/80 backdrop-blur-sm p-5 border border-blue-100/50">
                    <h4 className="text-sm font-bold text-blue-700 mb-4 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100">🔍</span>
                      SEO & AEO
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-xl bg-white/60 backdrop-blur-sm p-4 text-center border border-blue-100/50 shadow-sm">
                        <p className="text-2xl font-bold text-blue-600">{kpi.seo_website_blogs}</p>
                        <p className="text-xs text-blue-500 font-medium">Website Blogs</p>
                      </div>
                      <div className="rounded-xl bg-white/60 backdrop-blur-sm p-4 text-center border border-blue-100/50 shadow-sm">
                        <p className="text-2xl font-bold text-blue-600">{kpi.seo_linkedin_articles}</p>
                        <p className="text-xs text-blue-500 font-medium">LinkedIn Articles</p>
                      </div>
                      <div className="rounded-xl bg-white/60 backdrop-blur-sm p-4 text-center border border-blue-100/50 shadow-sm">
                        <p className="text-2xl font-bold text-blue-600">{kpi.seo_pr_offpage}</p>
                        <p className="text-xs text-blue-500 font-medium">PR/Off Page</p>
                      </div>
                      <div className="rounded-xl bg-white/80 backdrop-blur-sm p-4 text-center border border-blue-50">
                        <p className="text-[10px] text-slate-500 mb-0.5">Impressions KPI</p>
                        <p className="text-lg font-semibold text-slate-800">{kpi.seo_impressions_kpi || "—"}</p>
                        <p className="text-[9px] text-blue-500">Goal: {kpi.seo_impressions_goal?.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {kpi.notes && (
                    <div className="rounded-2xl bg-slate-50/80 backdrop-blur-sm p-4 border border-slate-100/50">
                      <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
                      <p className="text-sm text-slate-700">{kpi.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
              </section>
            )}
          </div>

          {/* Right Sidebar - Section Navigation */}
          <div className="hidden lg:block w-48 flex-shrink-0">
            <div className="sticky top-8 space-y-2">
              {data.objectives && (
                <p className="text-sm text-slate-600 hover:text-pink-600 cursor-pointer">Objectives</p>
              )}
              {data.core_goals && (
                <p className="text-sm text-slate-600 hover:text-pink-600 cursor-pointer">Core Goals</p>
              )}
              {data.content_pillars && (
                <p className="text-sm text-slate-600 hover:text-pink-600 cursor-pointer">Content Pillars</p>
              )}
              {data.target_audience && (
                <p className="text-sm text-slate-600 hover:text-pink-600 cursor-pointer">Target Audience</p>
              )}
              {data.kpi_description && (
                <p className="text-sm text-pink-600 font-medium cursor-pointer">KPIs <span className="text-[10px] text-pink-400">(You are here)</span></p>
              )}
              {data.platform_specific_strategy && (
                <p className="text-sm text-slate-600 hover:text-pink-600 cursor-pointer">Platform Specific Strategy</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-8 space-y-8">
        {/* Quarterly Deliverables */}
        {data.deliverables.length > 0 && (
          <section className="rounded-3xl border border-white/20 bg-white/70 backdrop-blur-xl p-8 shadow-xl shadow-slate-200/50">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Quarterly Deliverables</h2>
            
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
          <section className="rounded-3xl border border-white/20 bg-white/70 backdrop-blur-xl p-8 shadow-xl shadow-slate-200/50">
            <h2 className="text-xl font-bold text-slate-900 mb-6">KPI Performance</h2>
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
          <section className="rounded-3xl border border-white/20 bg-white/70 backdrop-blur-xl p-8 shadow-xl shadow-slate-200/50">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Notes</h2>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{data.notes}</p>
          </section>
        )}

        {/* Footer */}
        <div className="border-t border-slate-200 mt-12 pt-8 pb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logos/mutant-logo.avif"
                alt="Mutant"
                width={80}
                height={28}
                className="h-7 w-auto object-contain opacity-60"
              />
              <span className="text-xs text-slate-400">Integrated Marketing Agency</span>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">For questions, please contact your account manager.</p>
              <p className="text-[10px] text-slate-300 mt-1">© {new Date().getFullYear()} Mutant Communications</p>
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .strategy-content strong, .strategy-content b {
          font-weight: 700;
        }
        .strategy-content em, .strategy-content i {
          font-style: italic;
        }
        .strategy-content u {
          text-decoration: underline;
        }
        .strategy-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .strategy-content ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .strategy-content li {
          margin: 0.25rem 0;
        }
        .strategy-content p {
          margin: 0.25rem 0;
        }
      `}</style>
    </div>
  );
}
