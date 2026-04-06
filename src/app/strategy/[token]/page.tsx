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

type ContentPost = {
  id: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  platform: string;
  platforms: string[];
  content_type: string;
  subject: string | null;
  caption: string | null;
  image_url: string | null;
  status: string;
  workflow_status: string;
  post_type: 'organic' | 'boosted';
};

const WORKFLOW_LABELS: Record<string, string> = {
  creatives_approval: "Creative Development",
  creative_approval: "Creative Approval",
  captions: "Copywriting",
  final_approval: "Final Approval",
  for_publishing: "Scheduled",
  published: "Live",
};

function getQuarterDateRange(quarter: string): { start: string; end: string } {
  // Handle formats: "Q2 2026", "2026-Q2", "Q2-2026"
  let q: number | null = null;
  let year: number | null = null;
  
  // Try "Q2 2026" format
  let match = quarter.match(/Q(\d)\s+(\d{4})/);
  if (match) {
    q = parseInt(match[1]);
    year = parseInt(match[2]);
  }
  
  // Try "2026-Q2" format
  if (!q || !year) {
    match = quarter.match(/(\d{4})-Q(\d)/);
    if (match) {
      year = parseInt(match[1]);
      q = parseInt(match[2]);
    }
  }
  
  // Try "Q2-2026" format
  if (!q || !year) {
    match = quarter.match(/Q(\d)-(\d{4})/);
    if (match) {
      q = parseInt(match[1]);
      year = parseInt(match[2]);
    }
  }
  
  if (!q || !year) {
    const today = new Date();
    return { start: today.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
  }
  
  const quarters: Record<number, { start: string; end: string }> = {
    1: { start: `${year}-01-01`, end: `${year}-03-31` },
    2: { start: `${year}-04-01`, end: `${year}-06-30` },
    3: { start: `${year}-07-01`, end: `${year}-09-30` },
    4: { start: `${year}-10-01`, end: `${year}-12-31` },
  };
  return quarters[q] || { start: `${year}-01-01`, end: `${year}-12-31` };
}

type EmailCampaign = {
  id: string;
  campaign_type: string;
  status: string;
  scheduled_date: string | null;
  title: string;
  content: string | null;
  image_url: string | null;
};

type BlogArticle = {
  id: string;
  publication_type: string;
  status: string;
  scheduled_date: string | null;
  title: string;
  content: string | null;
  image_url: string | null;
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

// Section definitions for navigation
const REPORT_SECTIONS = [
  { id: 'strategy', label: 'Strategy Overview', icon: '📋' },
  { id: 'kpis', label: 'KPIs', icon: '📊' },
  { id: 'content', label: 'Content Calendar', icon: '📅' },
  { id: 'campaigns', label: 'Campaigns', icon: '📧' },
  { id: 'articles', label: 'Articles', icon: '📝' },
];

export default function PublicStrategyPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const [data, setData] = useState<StrategyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<SocialKPI[]>([]);
  const [contentPosts, setContentPosts] = useState<ContentPost[]>([]);
  const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>([]);
  const [blogArticles, setBlogArticles] = useState<BlogArticle[]>([]);
  const [viewingContent, setViewingContent] = useState<{ type: string; item: ContentPost | EmailCampaign | BlogArticle } | null>(null);
  const [activeSection, setActiveSection] = useState('strategy');

  // Scroll to section
  function scrollToSection(sectionId: string) {
    setActiveSection(sectionId);
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

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

    // Get date range based on the strategy's quarter
    const { start: startDate, end: endDate } = getQuarterDateRange(linkData.quarter || "");

    // Load ALL content posts within the quarter
    const { data: posts } = await supabaseClient
      .from("social_posts")
      .select("id, scheduled_date, scheduled_time, platforms, content_type, subject, caption, image_asset_url, status, workflow_status, post_type")
      .eq("project_id", linkData.project_id)
      .gte("scheduled_date", startDate)
      .lte("scheduled_date", endDate)
      .order("scheduled_date", { ascending: true })
      .limit(50);
    
    if (posts) {
      setContentPosts(posts.map((p: any) => ({
        id: p.id,
        scheduled_date: p.scheduled_date,
        scheduled_time: p.scheduled_time,
        platform: Array.isArray(p.platforms) ? p.platforms.join(", ") : p.platforms || "",
        platforms: Array.isArray(p.platforms) ? p.platforms : [],
        content_type: p.content_type || "",
        subject: p.subject,
        caption: p.caption,
        image_url: p.image_asset_url,
        status: p.status,
        workflow_status: p.workflow_status || "captions",
        post_type: p.post_type || 'organic',
      })) as ContentPost[]);
    }

    // Load ALL email/WhatsApp campaigns within the quarter
    const { data: campaigns } = await supabaseClient
      .from("email_campaigns")
      .select("id, campaign_type, status, scheduled_date, title, content, image_url")
      .eq("project_id", linkData.project_id)
      .gte("scheduled_date", startDate)
      .lte("scheduled_date", endDate)
      .order("scheduled_date", { ascending: true })
      .limit(50);
    
    if (campaigns) setEmailCampaigns(campaigns as EmailCampaign[]);

    // Load ALL blog articles within the quarter
    const { data: blogs } = await supabaseClient
      .from("website_blogs")
      .select("id, publication_type, status, scheduled_date, title, content, image_url")
      .eq("project_id", linkData.project_id)
      .gte("scheduled_date", startDate)
      .lte("scheduled_date", endDate)
      .order("scheduled_date", { ascending: true })
      .limit(50);
    
    if (blogs) setBlogArticles(blogs as BlogArticle[]);

    setData({
      ...linkData,
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

  
  return (
    <div className="min-h-screen bg-slate-50 print:bg-white overflow-x-hidden">
      {/* Header - Clean branded header with Mutant logo and Client logo */}
      <div className="bg-white border-b border-slate-200 print:border-0">
        {/* Top bar with logos */}
        <div className="border-b border-slate-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Mutant Logo */}
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <Image
                  src="/logos/mutant-logo.avif"
                  alt="Mutant"
                  width={120}
                  height={40}
                  className="h-8 sm:h-10 w-auto object-contain"
                />
                <div className="hidden sm:block h-8 w-px bg-slate-200" />
                <span className="hidden sm:block text-xs font-medium text-slate-400 uppercase tracking-wider">Strategy Report</span>
              </div>
              
              {/* Client Logo */}
              <div className="flex items-center gap-2 sm:gap-3">
                {data.project?.company?.logo_url ? (
                  <Image
                    src={data.project.company.logo_url}
                    alt={data.project?.company?.name || ""}
                    width={48}
                    height={48}
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg object-cover border border-slate-100"
                  />
                ) : data.project?.logo_url ? (
                  <Image
                    src={data.project.logo_url}
                    alt={data.project?.name || ""}
                    width={48}
                    height={48}
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg object-cover border border-slate-100"
                  />
                ) : (
                  <div
                    className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg text-white text-base sm:text-lg font-bold flex-shrink-0"
                    style={{ background: data.project?.brand_color || "linear-gradient(135deg, #ec4899, #d946ef)" }}
                  >
                    {data.project?.name?.charAt(0) || "?"}
                  </div>
                )}
                <div className="text-right">
                  <p className="text-xs sm:text-sm font-semibold text-slate-900 line-clamp-1">{data.project?.company?.name || data.project?.name}</p>
                  <p className="text-[10px] sm:text-xs text-slate-500">{data.quarter}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Title section */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{data.title || `${data.project?.name} Strategy`}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Integrated Marketing Strategy & KPI Report</p>
        </div>

        {/* Section Navigation Tabs */}
        <div className="border-t border-slate-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex overflow-x-auto scrollbar-hide -mb-px">
              {REPORT_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeSection === section.id
                      ? 'border-pink-500 text-pink-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="text-sm sm:text-base">{section.icon}</span>
                  <span className="hidden sm:inline">{section.label}</span>
                  <span className="sm:hidden">{section.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 overflow-hidden">
        {/* SECTION: Strategy Overview - Box-style groupings */}
        <section id="section-strategy" className="scroll-mt-32">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white text-sm">📋</span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Strategy Overview</h2>
          </div>
          
          <div className="grid gap-4 sm:gap-5">
            {data.objectives && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm overflow-hidden">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-600 text-xs">🎯</span>
                  Objectives
                </h3>
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap strategy-content overflow-hidden" dangerouslySetInnerHTML={{ __html: data.objectives }} />
              </div>
            )}
            
            {data.core_goals && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm overflow-hidden">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 text-xs">🚀</span>
                  Core Goals
                </h3>
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap strategy-content overflow-hidden" dangerouslySetInnerHTML={{ __html: data.core_goals }} />
              </div>
            )}
            
            {data.content_pillars && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm overflow-hidden">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 text-violet-600 text-xs">📚</span>
                  Content Pillars
                </h3>
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap strategy-content overflow-hidden" dangerouslySetInnerHTML={{ __html: data.content_pillars }} />
              </div>
            )}
            
            {data.target_audience && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm overflow-hidden">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-600 text-xs">👥</span>
                  Target Audience
                </h3>
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap strategy-content overflow-hidden" dangerouslySetInnerHTML={{ __html: data.target_audience }} />
              </div>
            )}
            
            {data.kpi_description && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm overflow-hidden">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-pink-100 text-pink-600 text-xs">📊</span>
                  KPIs
                </h3>
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap strategy-content overflow-hidden" dangerouslySetInnerHTML={{ __html: data.kpi_description }} />
              </div>
            )}
            
            {data.platform_specific_strategy && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm overflow-hidden">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 text-xs">📱</span>
                  Platform Specific Strategy
                </h3>
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap strategy-content overflow-hidden" dangerouslySetInnerHTML={{ __html: data.platform_specific_strategy }} />
              </div>
            )}
          </div>
        </section>

        {/* SECTION: KPIs with Colorful Cards */}
        <section id="section-kpis" className="scroll-mt-32">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 text-white text-sm">📊</span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">KPIs & Performance</h2>
          </div>

          {kpis.length > 0 ? (
            <div className="space-y-6">
              {kpis.map((kpi) => (
                <div key={kpi.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                  {/* KPI Cards Grid - All Purple */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                    <div className="rounded-xl bg-gradient-to-br from-violet-800 to-purple-900 p-4 text-white shadow-lg">
                      <p className="text-sm font-bold mb-2">Views/Impressions</p>
                      <div className="text-xs leading-relaxed whitespace-pre-wrap break-words strategy-content" style={{wordWrap: 'break-word', overflowWrap: 'break-word'}} dangerouslySetInnerHTML={{ __html: kpi.sm_impressions_kpi || "—" }} />
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-violet-800 to-purple-900 p-4 text-white shadow-lg">
                      <p className="text-sm font-bold mb-2">Reach</p>
                      <div className="text-xs leading-relaxed whitespace-pre-wrap break-words strategy-content" style={{wordWrap: 'break-word', overflowWrap: 'break-word'}} dangerouslySetInnerHTML={{ __html: kpi.sm_reach_kpi || "—" }} />
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-violet-800 to-purple-900 p-4 text-white shadow-lg">
                      <p className="text-sm font-bold mb-2">Engagement</p>
                      <div className="text-xs leading-relaxed whitespace-pre-wrap break-words strategy-content" style={{wordWrap: 'break-word', overflowWrap: 'break-word'}} dangerouslySetInnerHTML={{ __html: kpi.sm_engagement_kpi || "—" }} />
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-violet-800 to-purple-900 p-4 text-white shadow-lg">
                      <p className="text-sm font-bold mb-2">Followers</p>
                      <div className="text-xs leading-relaxed whitespace-pre-wrap break-words strategy-content" style={{wordWrap: 'break-word', overflowWrap: 'break-word'}} dangerouslySetInnerHTML={{ __html: kpi.sm_followers_kpi || "—" }} />
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-violet-800 to-purple-900 p-4 text-white shadow-lg">
                      <p className="text-sm font-bold mb-2">Clicks</p>
                      <div className="text-xs leading-relaxed whitespace-pre-wrap break-words strategy-content" style={{wordWrap: 'break-word', overflowWrap: 'break-word'}} dangerouslySetInnerHTML={{ __html: kpi.sm_clicks_kpi || "—" }} />
                    </div>
                  </div>
                  
                  {/* Social Media Content Stats */}
                  <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 p-4 sm:p-5 border border-pink-100 mb-4">
                    <h4 className="text-sm font-bold text-pink-700 mb-3 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-pink-100">📱</span>
                      Social Media Content
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                      <div className="rounded-xl bg-white p-3 text-center border border-pink-100 shadow-sm">
                        <p className="text-xl sm:text-2xl font-bold text-pink-600">{kpi.sm_reels}</p>
                        <p className="text-[10px] sm:text-xs text-pink-500 font-medium">Reels</p>
                      </div>
                      <div className="rounded-xl bg-white p-3 text-center border border-pink-100 shadow-sm">
                        <p className="text-xl sm:text-2xl font-bold text-pink-600">{kpi.sm_long_form_video}</p>
                        <p className="text-[10px] sm:text-xs text-pink-500 font-medium">Long-Form</p>
                      </div>
                      <div className="rounded-xl bg-white p-3 text-center border border-pink-100 shadow-sm">
                        <p className="text-xl sm:text-2xl font-bold text-pink-600">{kpi.sm_static_carousels}</p>
                        <p className="text-[10px] sm:text-xs text-pink-500 font-medium">Static/Carousels</p>
                      </div>
                      <div className="rounded-xl bg-white p-3 text-center border border-pink-100 shadow-sm">
                        <p className="text-xl sm:text-2xl font-bold text-pink-600">{kpi.sm_stories}</p>
                        <p className="text-[10px] sm:text-xs text-pink-500 font-medium">Stories</p>
                      </div>
                    </div>
                  </div>

                  {/* Email & WhatsApp Stats */}
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 p-4 sm:p-5 border border-emerald-100 mb-4">
                    <h4 className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100">📧</span>
                      Email & WhatsApp Marketing
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                      <div className="rounded-xl bg-white p-3 text-center border border-emerald-100 shadow-sm">
                        <p className="text-xl sm:text-2xl font-bold text-emerald-600">{kpi.email_campaigns}</p>
                        <p className="text-[10px] sm:text-xs text-emerald-500 font-medium">Email Campaigns</p>
                      </div>
                      <div className="rounded-xl bg-white p-3 text-center border border-emerald-100 shadow-sm">
                        <p className="text-xl sm:text-2xl font-bold text-emerald-600">{kpi.whatsapp_campaigns}</p>
                        <p className="text-[10px] sm:text-xs text-emerald-500 font-medium">WhatsApp</p>
                      </div>
                      <div className="rounded-xl bg-white p-3 text-center border border-emerald-100 shadow-sm col-span-2 sm:col-span-1">
                        <p className="text-xl sm:text-2xl font-bold text-emerald-600">{kpi.ewm_ctr_goal}%</p>
                        <p className="text-[10px] sm:text-xs text-emerald-500 font-medium">CTR Goal</p>
                      </div>
                    </div>
                  </div>

                  {/* SEO Stats */}
                  <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-5 border border-blue-100">
                    <h4 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100">🔍</span>
                      SEO & AEO
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                      <div className="rounded-xl bg-white p-3 text-center border border-blue-100 shadow-sm">
                        <p className="text-xl sm:text-2xl font-bold text-blue-600">{kpi.seo_website_blogs}</p>
                        <p className="text-[10px] sm:text-xs text-blue-500 font-medium">Website Blogs</p>
                      </div>
                      <div className="rounded-xl bg-white p-3 text-center border border-blue-100 shadow-sm">
                        <p className="text-xl sm:text-2xl font-bold text-blue-600">{kpi.seo_linkedin_articles}</p>
                        <p className="text-[10px] sm:text-xs text-blue-500 font-medium">LinkedIn</p>
                      </div>
                      <div className="rounded-xl bg-white p-3 text-center border border-blue-100 shadow-sm">
                        <p className="text-xl sm:text-2xl font-bold text-blue-600">{kpi.seo_pr_offpage}</p>
                        <p className="text-[10px] sm:text-xs text-blue-500 font-medium">PR/Off Page</p>
                      </div>
                      <div className="rounded-xl bg-white p-3 text-center border border-blue-100 shadow-sm">
                        <p className="text-lg font-bold text-blue-600">{kpi.seo_impressions_kpi || "—"}</p>
                        <p className="text-[10px] sm:text-xs text-blue-500 font-medium">Impressions</p>
                      </div>
                    </div>
                  </div>

                  {kpi.notes && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
                      <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
                      <p className="text-sm text-slate-700">{kpi.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-sm text-slate-500">No KPI data available for this strategy.</p>
            </div>
          )}
        </section>

        {/* SECTION: Content Calendar (Social Media) */}
        <section id="section-content" className="scroll-mt-32">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 text-white text-sm">📅</span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Social Media Content</h2>
          </div>
          
          {contentPosts.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-pink-50 to-rose-50">
                <p className="text-sm text-slate-600">Content for <span className="font-semibold">{data.quarter}</span></p>
              </div>
              <div className="divide-y divide-slate-100">
                {contentPosts.map((post) => (
                  <div 
                    key={post.id}
                    onClick={() => setViewingContent({ type: 'social', item: post })}
                    className="p-3 sm:p-4 hover:bg-pink-50/50 cursor-pointer transition-colors flex items-center gap-3 sm:gap-4"
                  >
                    <div className="w-12 h-12 sm:w-16 sm:h-12 rounded-lg overflow-hidden bg-gradient-to-br from-pink-100 to-rose-100 flex-shrink-0 flex items-center justify-center">
                      {post.image_url ? (
                        <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-base sm:text-lg">📷</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-slate-900 line-clamp-1 mb-1">{post.subject || "Untitled"}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 capitalize">{post.platform}</span>
                        <span className="text-[10px] sm:text-xs text-slate-400">{post.content_type}</span>
                        <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full ${post.workflow_status === 'published' ? 'bg-emerald-100 text-emerald-700' : post.workflow_status === 'for_publishing' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{WORKFLOW_LABELS[post.workflow_status] || post.workflow_status}</span>
                        {post.post_type === 'boosted' && (
                          <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">💰 Boosted</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="text-xs text-slate-500">{post.scheduled_date ? new Date(post.scheduled_date).toLocaleDateString() : "—"}</p>
                    </div>
                    <svg className="h-4 w-4 text-slate-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-sm text-slate-500">No social media content for this quarter.</p>
            </div>
          )}
        </section>

        {/* SECTION: Email & WhatsApp Campaigns */}
        <section id="section-campaigns" className="scroll-mt-32">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 text-white text-sm">📧</span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Email & WhatsApp Campaigns</h2>
          </div>
          
          {emailCampaigns.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-green-50">
                <p className="text-sm text-slate-600">Campaigns for <span className="font-semibold">{data.quarter}</span></p>
              </div>
              <div className="divide-y divide-slate-100">
                {emailCampaigns.map((campaign) => (
                  <div 
                    key={campaign.id}
                    onClick={() => setViewingContent({ type: 'email', item: campaign })}
                    className="p-3 sm:p-4 hover:bg-emerald-50/50 cursor-pointer transition-colors flex items-center gap-3 sm:gap-4"
                  >
                    <div className="w-12 h-12 sm:w-16 sm:h-12 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-100 to-green-100 flex-shrink-0 flex items-center justify-center">
                      {campaign.image_url ? (
                        <img src={campaign.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-base sm:text-lg">{campaign.campaign_type === 'email' ? '✉️' : '💬'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full ${campaign.campaign_type === 'email' ? 'bg-violet-100 text-violet-700' : 'bg-green-100 text-green-700'}`}>
                          {campaign.campaign_type === 'email' ? '✉️ Email' : '💬 WhatsApp'}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-slate-700 line-clamp-1">{campaign.title}</p>
                    </div>
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="text-xs text-slate-500">{campaign.scheduled_date ? new Date(campaign.scheduled_date).toLocaleDateString() : "—"}</p>
                      <span className={`text-xs font-medium capitalize ${campaign.status === 'published' ? 'text-emerald-600' : campaign.status === 'approved' ? 'text-blue-600' : 'text-amber-600'}`}>{campaign.status}</span>
                    </div>
                    <svg className="h-4 w-4 text-slate-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-sm text-slate-500">No campaigns for this quarter.</p>
            </div>
          )}
        </section>

        {/* SECTION: Blogs & Articles */}
        <section id="section-articles" className="scroll-mt-32">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 text-white text-sm">📝</span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Blogs & Articles</h2>
          </div>
          
          {blogArticles.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50">
                <p className="text-sm text-slate-600">Articles for <span className="font-semibold">{data.quarter}</span></p>
              </div>
              <div className="divide-y divide-slate-100">
                {blogArticles.map((blog) => (
                  <div 
                    key={blog.id}
                    onClick={() => setViewingContent({ type: 'blog', item: blog })}
                    className="p-3 sm:p-4 hover:bg-violet-50/50 cursor-pointer transition-colors flex items-center gap-3 sm:gap-4"
                  >
                    <div className="w-12 h-12 sm:w-16 sm:h-12 rounded-lg overflow-hidden bg-gradient-to-br from-violet-100 to-purple-100 flex-shrink-0 flex items-center justify-center">
                      {blog.image_url ? (
                        <img src={blog.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-base sm:text-lg">{blog.publication_type === 'website_blog' ? '📝' : '💼'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                          {blog.publication_type === 'website_blog' ? '📝 Blog' : '💼 LinkedIn'}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-slate-700 line-clamp-1">{blog.title}</p>
                    </div>
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="text-xs text-slate-500">{blog.scheduled_date ? new Date(blog.scheduled_date).toLocaleDateString() : "—"}</p>
                      <span className={`text-xs font-medium capitalize ${blog.status === 'published' ? 'text-emerald-600' : blog.status === 'approved' ? 'text-blue-600' : 'text-amber-600'}`}>{blog.status}</span>
                    </div>
                    <svg className="h-4 w-4 text-slate-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-sm text-slate-500">No articles for this quarter.</p>
            </div>
          )}
        </section>

        
        {/* KPI Performance Table */}
        {data.monthly_kpis.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4">Monthly KPI Performance</h3>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-slate-600">Month</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-slate-600 text-right">Reach</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-slate-600 text-right">Impressions</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-slate-600 text-right">Engagement</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-slate-600 text-right">Followers</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-slate-600 text-right">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthly_kpis.map((kpi) => (
                    <tr key={kpi.month} className="border-b border-slate-100">
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-slate-900">{kpi.month}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-600 text-right">{kpi.reach.toLocaleString()}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-600 text-right">{kpi.impressions.toLocaleString()}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-600 text-right">{kpi.engagement_rate.toFixed(2)}%</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-600 text-right">+{kpi.follower_growth.toLocaleString()}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-600 text-right">{kpi.website_clicks.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Notes */}
        {data.notes && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3">Notes</h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{data.notes}</p>
          </section>
        )}

        {/* Footer */}
        <div className="border-t border-slate-200 pt-6 sm:pt-8 pb-6 sm:pb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logos/mutant-logo.avif"
                alt="Mutant"
                width={80}
                height={28}
                className="h-6 sm:h-7 w-auto object-contain opacity-60"
              />
              <span className="text-[10px] sm:text-xs text-slate-400">Integrated Marketing Agency</span>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-[10px] sm:text-xs text-slate-400">For questions, please contact your account manager.</p>
              <p className="text-[9px] sm:text-[10px] text-slate-300 mt-1">© {new Date().getFullYear()} Mutant Communications</p>
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
          margin: 0.5rem 0;
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
        }
        .strategy-content * {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* View-Only Content Modal */}
      {viewingContent && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className={`flex items-center justify-between border-b border-slate-100 px-6 py-4 ${
              viewingContent.type === 'social' ? 'bg-gradient-to-r from-pink-50 to-rose-50' :
              viewingContent.type === 'email' ? 'bg-gradient-to-r from-emerald-50 to-green-50' :
              'bg-gradient-to-r from-violet-50 to-purple-50'
            }`}>
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  viewingContent.type === 'social' ? 'bg-pink-100 text-pink-600' :
                  viewingContent.type === 'email' ? 'bg-emerald-100 text-emerald-600' :
                  'bg-violet-100 text-violet-600'
                }`}>
                  {viewingContent.type === 'social' ? '📱' : viewingContent.type === 'email' ? '📧' : '📝'}
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {viewingContent.type === 'social' ? 'Social Media Post' :
                     viewingContent.type === 'email' ? 'Campaign Details' : 'Article Details'}
                  </h2>
                  <p className="text-xs text-slate-500">View Only</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingContent(null)} 
                className="rounded-lg p-2 text-slate-400 hover:bg-white/50 hover:text-slate-600"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto">
              {/* SOCIAL MEDIA POST - Instagram-like layout */}
              {viewingContent.type === 'social' && (
                <div>
                  {/* Header: Logo + Username */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                    {data?.project?.logo_url ? (
                      <Image src={data.project.logo_url} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold">
                        {data?.project?.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{data?.project?.name || 'Brand'}</p>
                      <p className="text-xs text-slate-500">{data?.project?.company?.name || ''}</p>
                    </div>
                    {(viewingContent.item as ContentPost).post_type === 'boosted' && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700">💰 Boosted</span>
                    )}
                  </div>

                  {/* Image */}
                  <div className="bg-slate-100">
                    {(viewingContent.item as ContentPost).image_url ? (
                      <img 
                        src={(viewingContent.item as ContentPost).image_url!} 
                        alt="" 
                        className="w-full h-auto object-cover"
                      />
                    ) : (
                      <div className="aspect-square flex items-center justify-center">
                        <span className="text-4xl">📷</span>
                      </div>
                    )}
                  </div>

                  {/* Post Details */}
                  <div className="p-4 space-y-4">
                    {/* Date & Time */}
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span>📅</span>
                      <span>
                        {(viewingContent.item as ContentPost).scheduled_date 
                          ? new Date((viewingContent.item as ContentPost).scheduled_date!).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })
                          : "—"}
                        {(viewingContent.item as ContentPost).scheduled_time && ` at ${(viewingContent.item as ContentPost).scheduled_time}`}
                      </span>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Subject</label>
                      <p className="mt-1 text-base font-semibold text-slate-900">
                        {(viewingContent.item as ContentPost).subject || "Untitled"}
                      </p>
                    </div>

                    {/* Caption */}
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Caption</label>
                      <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                        {(viewingContent.item as ContentPost).caption || "No caption"}
                      </p>
                    </div>

                    {/* Format */}
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Format</label>
                      <p className="mt-1 text-sm text-slate-700">
                        {(viewingContent.item as ContentPost).content_type || "—"}
                      </p>
                    </div>

                    {/* Placements */}
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Placements</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(viewingContent.item as ContentPost).platforms.map((p) => (
                          <span key={p} className="text-xs font-medium px-3 py-1 rounded-full bg-pink-100 text-pink-700 capitalize">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* EMAIL/WHATSAPP CAMPAIGN */}
              {viewingContent.type === 'email' && (
                <div className="p-6 space-y-4">
                  {/* Title */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Title</label>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {(viewingContent.item as EmailCampaign).title}
                    </p>
                  </div>

                  {/* Type Badge */}
                  <div>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                      (viewingContent.item as EmailCampaign).campaign_type === 'email' 
                        ? 'bg-violet-100 text-violet-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {(viewingContent.item as EmailCampaign).campaign_type === 'email' ? '✉️ Email Campaign' : '💬 WhatsApp Campaign'}
                    </span>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Published Date</label>
                    <p className="mt-1 text-sm text-slate-700">
                      {(viewingContent.item as EmailCampaign).scheduled_date 
                        ? new Date((viewingContent.item as EmailCampaign).scheduled_date!).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        : "—"}
                    </p>
                  </div>

                  {/* Image - After title */}
                  {(viewingContent.item as EmailCampaign).image_url && (
                    <div className="rounded-xl overflow-hidden bg-slate-100">
                      <img 
                        src={(viewingContent.item as EmailCampaign).image_url!} 
                        alt="" 
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )}

                  {/* Content - After image */}
                  {(viewingContent.item as EmailCampaign).content && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Content</label>
                      <div 
                        className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap strategy-content prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: (viewingContent.item as EmailCampaign).content || '' }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* BLOG ARTICLE */}
              {viewingContent.type === 'blog' && (
                <div className="p-6 space-y-4">
                  {/* Image - Before title */}
                  {(viewingContent.item as BlogArticle).image_url && (
                    <div className="rounded-xl overflow-hidden bg-slate-100 -mx-6 -mt-6 mb-4">
                      <img 
                        src={(viewingContent.item as BlogArticle).image_url!} 
                        alt="" 
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Title</label>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {(viewingContent.item as BlogArticle).title}
                    </p>
                  </div>

                  {/* Type Badge */}
                  <div>
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-violet-100 text-violet-700">
                      {(viewingContent.item as BlogArticle).publication_type === 'website_blog' ? '📝 Website Blog' : '💼 LinkedIn Article'}
                    </span>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Published Date</label>
                    <p className="mt-1 text-sm text-slate-700">
                      {(viewingContent.item as BlogArticle).scheduled_date 
                        ? new Date((viewingContent.item as BlogArticle).scheduled_date!).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        : "—"}
                    </p>
                  </div>

                  {/* Content */}
                  {(viewingContent.item as BlogArticle).content && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Content</label>
                      <div 
                        className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap strategy-content prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: (viewingContent.item as BlogArticle).content || '' }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end border-t border-slate-100 px-6 py-4 bg-slate-50">
              <button
                onClick={() => setViewingContent(null)}
                className="rounded-xl bg-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
