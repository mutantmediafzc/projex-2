"use client";

import { useEffect, useState, use, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import ContentCalendar from "./ContentCalendar";
import ArticlePlanner from "./ArticlePlanner";
import AnalyticsKPIs from "./AnalyticsKPIs";
import ClientAccess from "./ClientAccess";
import QuarterlyReports from "./QuarterlyReports";
import SubscriptionsPanel from "./SubscriptionsPanel";
import StrategyLinkManager from "./StrategyLinkManager";
import TeamAssignments from "./TeamAssignments";
import EmailWhatsAppCampaigns from "./EmailWhatsAppCampaigns";
import BlogsArticles from "./BlogsArticles";
import SubscriptionsTab from "./SubscriptionsTab";
import { useUserRole } from "@/app/profile/hooks/useUserRole";

type SocialProject = {
  id: string;
  name: string;
  description: string | null;
  brand_color: string | null;
  logo_url: string | null;
  status: string | null;
  platforms: string[];
  created_at: string | null;
  manychat_subscribers: number;
  meta_verified: boolean;
  whatsapp_subscribers: number;
  newsletter_subscribers: number;
  company: {
    id: string;
    name: string | null;
    logo_url: string | null;
  } | null;
};

const TABS = [
  { id: "team", label: "Team", icon: TeamIcon },
  { id: "calendar", label: "Social Media & Ads", icon: CalendarIcon },
  { id: "email", label: "Email & WhatsApp", icon: EmailIcon },
  { id: "articles", label: "Blogs & Articles", icon: ArticleIcon },
  { id: "analytics", label: "Strategies & KPIs", icon: ChartIcon },
  { id: "subscriptions", label: "Subscriptions", icon: SubscriptionIcon },
  { id: "quarterly", label: "Reports", icon: ReportIcon },
  { id: "client", label: "Share Access", icon: LinkIcon },
];

function CalendarIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ArticleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SubscriptionIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}

const PLATFORM_ICONS: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  instagram: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    color: "text-pink-600",
    bg: "bg-gradient-to-br from-pink-500 to-purple-600",
  },
  linkedin: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    color: "text-blue-600",
    bg: "bg-gradient-to-br from-blue-600 to-blue-700",
  },
  tiktok: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ),
    color: "text-gray-900",
    bg: "bg-gradient-to-br from-gray-900 to-gray-700",
  },
  x: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    color: "text-gray-900",
    bg: "bg-gradient-to-br from-gray-900 to-black",
  },
  facebook: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    color: "text-blue-600",
    bg: "bg-gradient-to-br from-blue-600 to-blue-500",
  },
  youtube: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    color: "text-red-600",
    bg: "bg-gradient-to-br from-red-600 to-red-500",
  },
  whatsapp: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
    color: "text-green-600",
    bg: "bg-gradient-to-br from-green-500 to-green-600",
  },
  pinterest: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
      </svg>
    ),
    color: "text-red-700",
    bg: "bg-gradient-to-br from-red-600 to-red-700",
  },
};

export default function SocialProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { role } = useUserRole();
  const isAdmin = role === "admin";
  const [project, setProject] = useState<SocialProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("calendar");
  const [showIdeasModal, setShowIdeasModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditingPlatforms, setIsEditingPlatforms] = useState(false);
  const [editedPlatforms, setEditedPlatforms] = useState<string[]>([]);
  const [showPlatforms, setShowPlatforms] = useState(false);
  const platformsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  function handlePlatformsMouseEnter() {
    if (platformsTimeoutRef.current) clearTimeout(platformsTimeoutRef.current);
    setShowPlatforms(true);
  }

  function handlePlatformsMouseLeave() {
    platformsTimeoutRef.current = setTimeout(() => setShowPlatforms(false), 1500);
  }

  function togglePlatformsMenu() {
    setShowPlatforms(!showPlatforms);
    if (!showPlatforms) {
      if (platformsTimeoutRef.current) clearTimeout(platformsTimeoutRef.current);
      platformsTimeoutRef.current = setTimeout(() => setShowPlatforms(false), 4000);
    }
  }

  useEffect(() => {
    loadProject();
  }, [resolvedParams.id]);

  async function loadProject() {
    setLoading(true);
    const { data, error } = await supabaseClient
      .from("social_projects")
      .select(`
        id, name, description, brand_color, logo_url, status, platforms, created_at,
        manychat_subscribers, meta_verified, whatsapp_subscribers, newsletter_subscribers,
        company:companies(id, name, logo_url)
      `)
      .eq("id", resolvedParams.id)
      .single();

    if (!error && data) {
      const proj = {
        ...data,
        platforms: data.platforms || [],
        company: Array.isArray(data.company) ? data.company[0] || null : data.company,
      } as SocialProject;
      setProject(proj);
      setEditedName(proj.name);
      setEditedPlatforms(proj.platforms);
    }
    setLoading(false);
  }

  async function saveProjectName() {
    if (!project || !editedName.trim()) return;
    const { error } = await supabaseClient
      .from("social_projects")
      .update({ name: editedName.trim() })
      .eq("id", project.id);
    if (!error) {
      setProject({ ...project, name: editedName.trim() });
      setIsEditingName(false);
    }
  }

  async function saveProjectPlatforms() {
    if (!project) return;
    const { error } = await supabaseClient
      .from("social_projects")
      .update({ platforms: editedPlatforms })
      .eq("id", project.id);
    if (!error) {
      setProject({ ...project, platforms: editedPlatforms });
      setIsEditingPlatforms(false);
    }
  }

  async function updateProjectStatus(newStatus: string) {
    if (!project) return;
    const { error } = await supabaseClient
      .from("social_projects")
      .update({ status: newStatus })
      .eq("id", project.id);
    if (!error) {
      setProject({ ...project, status: newStatus });
    }
  }

  function toggleEditPlatform(platform: string) {
    setEditedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  }

  async function handleDeleteCalendar() {
    if (!project) return;
    setDeleting(true);
    try {
      // First delete all posts for this project
      await supabaseClient
        .from("social_posts")
        .delete()
        .eq("project_id", project.id);
      
      // Unlink this calendar from any projects that reference it
      await supabaseClient
        .from("projects")
        .update({ social_calendar_id: null })
        .eq("social_calendar_id", project.id);
      
      // Then delete the social project itself
      const { error } = await supabaseClient
        .from("social_projects")
        .delete()
        .eq("id", project.id);
      
      if (!error) {
        router.push("/social-media");
      }
    } catch (err) {
      console.error("Failed to delete calendar:", err);
    }
    setDeleting(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="mb-2 text-xl font-semibold text-slate-900">Project not found</h1>
        <Link href="/social-media" className="text-pink-600 hover:underline">
          Back to Social Media
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2 text-sm">
          <Link href="/social-media" className="text-slate-500 hover:text-pink-600">
            Integrated Marketing
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900">{project.name}</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {project.company?.logo_url ? (
              <Image
                src={project.company.logo_url}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 rounded-xl object-cover"
              />
            ) : (
              <div 
                className="flex h-12 w-12 items-center justify-center rounded-xl text-white font-bold text-lg"
                style={{ background: project.brand_color || 'linear-gradient(135deg, #ec4899, #d946ef)' }}
              >
                {project.name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="text-xl font-bold text-slate-900 border border-pink-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveProjectName();
                      if (e.key === "Escape") { setIsEditingName(false); setEditedName(project.name); }
                    }}
                  />
                  <button onClick={saveProjectName} className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7"/></svg>
                  </button>
                  <button onClick={() => { setIsEditingName(false); setEditedName(project.name); }} className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
                  <button 
                    onClick={() => setIsEditingName(true)} 
                    className="p-1.5 rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Edit project name"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </div>
              )}
              <p className="text-sm text-slate-500">{project.company?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowIdeasModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Generate Ideas
            </button>
            {/* Settings Menu - Collapsible */}
            <div 
              className="relative"
              onMouseEnter={handlePlatformsMouseEnter}
              onMouseLeave={handlePlatformsMouseLeave}
            >
              <button
                onClick={togglePlatformsMenu}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                title="Settings"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
              
              {/* Dropdown Menu */}
              {showPlatforms && (
                <div className="absolute right-0 top-full mt-2 z-50 rounded-xl border border-slate-200 bg-white p-3 shadow-xl min-w-[200px]">
                  {/* Status Section */}
                  <div className="mb-3 pb-3 border-b border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Status</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateProjectStatus('active')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          project.status !== 'paused' 
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Active
                      </button>
                      <button
                        onClick={() => updateProjectStatus('paused')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          project.status === 'paused' 
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Paused
                      </button>
                    </div>
                  </div>

                  {/* Platforms Section */}
                  <div className="mb-3 pb-3 border-b border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Active Platforms</p>
                    {isEditingPlatforms ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(PLATFORM_ICONS).map(([platform, pData]) => (
                            <button
                              key={platform}
                              type="button"
                              onClick={() => toggleEditPlatform(platform)}
                              className={`flex h-6 w-6 items-center justify-center rounded-lg transition-all ${
                                editedPlatforms.includes(platform)
                                  ? `${pData.bg} text-white shadow-sm`
                                  : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                              }`}
                              title={platform}
                            >
                              <span className="scale-75">{pData.icon}</span>
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-1 pt-1">
                          <button onClick={saveProjectPlatforms} className="flex-1 py-1 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 text-xs font-medium">Save</button>
                          <button onClick={() => { setIsEditingPlatforms(false); setEditedPlatforms(project.platforms); }} className="flex-1 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-medium">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {(project.platforms || []).map((platform) => {
                            const pData = PLATFORM_ICONS[platform.toLowerCase()];
                            if (!pData) return null;
                            return (
                              <span
                                key={platform}
                                className={`flex h-6 w-6 items-center justify-center rounded-lg ${pData.bg} text-white shadow-sm`}
                                title={platform}
                              >
                                <span className="scale-75">{pData.icon}</span>
                              </span>
                            );
                          })}
                          {(!project.platforms || project.platforms.length === 0) && (
                            <span className="text-xs text-slate-400">No platforms</span>
                          )}
                        </div>
                        <button 
                          onClick={() => setIsEditingPlatforms(true)} 
                          className="w-full py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-medium flex items-center justify-center gap-1"
                        >
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Edit
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Delete Section - Admin Only */}
                  {isAdmin && (
                    <div>
                      <button
                        onClick={() => { setShowPlatforms(false); setShowDeleteConfirm(true); }}
                        className="w-full py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                        Delete Calendar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2 flex-wrap">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={!isActive ? tab.label : undefined}
                className={`relative group flex items-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-lg shadow-pink-500/25 px-4 py-2"
                    : "text-slate-600 hover:bg-slate-100 p-2 border border-slate-200"
                }`}
              >
                <tab.icon />
                {isActive && <span>{tab.label}</span>}
                {!isActive && (
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none z-50">
                    {tab.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 sm:p-6 lg:p-8">
        {activeTab === "team" && (
          <TeamAssignments projectId={project.id} />
        )}
        {activeTab === "calendar" && (
          <ContentCalendar projectId={project.id} projectName={project.name} platforms={project.platforms} brandColor={project.brand_color} />
        )}
        {activeTab === "email" && (
          <EmailWhatsAppCampaigns projectId={project.id} />
        )}
        {activeTab === "articles" && (
          <BlogsArticles projectId={project.id} />
        )}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <AnalyticsKPIs projectId={project.id} platforms={project.platforms} />
            <StrategyLinkManager projectId={project.id} projectName={project.name} />
          </div>
        )}
        {activeTab === "subscriptions" && (
          <SubscriptionsTab projectId={project.id} projectName={project.name} />
        )}
        {activeTab === "client" && (
          <ClientAccess projectId={project.id} projectName={project.name} />
        )}
        {activeTab === "quarterly" && (
          <QuarterlyReports projectId={project.id} projectName={project.name} platforms={project.platforms} />
        )}
      </div>

      {/* Generate Ideas Modal */}
      {showIdeasModal && (
        <GenerateIdeasModal
          projectId={project.id}
          projectName={project.name}
          platforms={project.platforms}
          companyName={project.company?.name || ""}
          onClose={() => setShowIdeasModal(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Delete Calendar?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently delete <strong>{project.name}</strong> and all its posts. This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCalendar}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Deleting...
                  </>
                ) : (
                  "Delete Calendar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GenerateIdeasModal({
  projectId,
  projectName,
  platforms,
  companyName,
  onClose,
}: {
  projectId: string;
  projectName: string;
  platforms: string[];
  companyName: string;
  onClose: () => void;
}) {
  const [context, setContext] = useState("");
  const [tone, setTone] = useState("professional");
  const [postCount, setPostCount] = useState(5);
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>(platforms);
  const [generating, setGenerating] = useState(false);
  const [ideas, setIdeas] = useState<{ platform: string; caption: string; hashtags: string[]; hook: string }[]>([]);
  const [savedIdeas, setSavedIdeas] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const togglePlatform = (p: string) => {
    setTargetPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  async function generateIdeas() {
    if (!context.trim()) {
      setError("Please provide some context about what you want to post about.");
      return;
    }
    if (targetPlatforms.length === 0) {
      setError("Please select at least one platform.");
      return;
    }

    setGenerating(true);
    setError(null);
    setIdeas([]);

    try {
      const response = await fetch("/api/social-media/generate-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          context,
          tone,
          postCount,
          platforms: targetPlatforms,
          companyName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate ideas");
      }

      const data = await response.json();
      setIdeas(data.ideas || []);
    } catch (err) {
      setError("Failed to generate ideas. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveIdea(idea: typeof ideas[0], index: number) {
    const { error } = await supabaseClient.from("social_post_ideas").insert({
      project_id: projectId,
      platform: idea.platform,
      caption: idea.caption,
      hashtags: idea.hashtags,
      hook: idea.hook,
      context: context,
      tone: tone,
    });

    if (!error) {
      setSavedIdeas((prev) => new Set([...prev, index]));
    }
  }

  async function createPostFromIdea(idea: typeof ideas[0]) {
    const { data, error } = await supabaseClient.from("social_posts").insert({
      project_id: projectId,
      platforms: [idea.platform],
      caption: `${idea.caption}\n\n${idea.hashtags.map(h => `#${h}`).join(" ")}`,
      status: "draft",
      hashtags: idea.hashtags,
    }).select().single();

    if (!error && data) {
      alert("Post created as draft! Check the Content Calendar.");
    }
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Generate Post Ideas</h2>
              <p className="text-sm text-slate-500">AI-powered content suggestions for {projectName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {ideas.length === 0 ? (
            <div className="space-y-5">
              {/* Context Input */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  What do you want to post about? <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={4}
                  placeholder="e.g., We're launching a new product next week, it's a sustainable water bottle made from recycled materials. Target audience is eco-conscious millennials..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 resize-none"
                />
              </div>

              {/* Tone */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Tone</label>
                <div className="flex flex-wrap gap-2">
                  {["professional", "casual", "humorous", "inspirational", "educational", "promotional"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTone(t)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-all ${
                        tone === t
                          ? "border-violet-300 bg-violet-50 text-violet-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Platforms */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {platforms.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-all ${
                        targetPlatforms.includes(p)
                          ? "border-violet-300 bg-violet-50 text-violet-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of ideas */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Number of ideas: {postCount}
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={postCount}
                  onChange={(e) => setPostCount(Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
          ) : (
            /* Generated Ideas */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Generated Ideas ({ideas.length})</h3>
                <button
                  onClick={() => setIdeas([])}
                  className="text-sm text-violet-600 hover:text-violet-700"
                >
                  Generate More
                </button>
              </div>
              {ideas.map((idea, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-violet-200 hover:shadow-md"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 capitalize">
                      {idea.platform}
                    </span>
                    <div className="flex gap-2">
                      {savedIdeas.has(idx) ? (
                        <span className="text-xs text-emerald-600">Saved!</span>
                      ) : (
                        <button
                          onClick={() => saveIdea(idea, idx)}
                          className="text-xs text-slate-500 hover:text-violet-600"
                        >
                          Save Idea
                        </button>
                      )}
                      <button
                        onClick={() => createPostFromIdea(idea)}
                        className="text-xs font-medium text-violet-600 hover:text-violet-700"
                      >
                        Create Post
                      </button>
                    </div>
                  </div>
                  {idea.hook && (
                    <p className="mb-2 text-sm font-medium text-violet-700">Hook: {idea.hook}</p>
                  )}
                  <p className="mb-2 text-sm text-slate-700 whitespace-pre-wrap">{idea.caption}</p>
                  <div className="flex flex-wrap gap-1">
                    {idea.hashtags.map((h, i) => (
                      <span key={i} className="text-xs text-blue-600">#{h}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
          {ideas.length === 0 && (
            <button
              onClick={generateIdeas}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 hover:shadow-xl disabled:opacity-50"
            >
              {generating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Generate Ideas
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
