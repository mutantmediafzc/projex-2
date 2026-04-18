"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabaseClient";
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
  company: {
    id: string;
    name: string | null;
    logo_url: string | null;
  } | null;
  _postCount?: number;
  _articleCount?: number;
};

type Company = {
  id: string;
  name: string;
  logo_url: string | null;
};

const PLATFORM_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  instagram: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    color: "from-pink-500 to-purple-600",
  },
  linkedin: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    color: "from-blue-600 to-blue-700",
  },
  tiktok: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ),
    color: "from-gray-900 to-gray-700",
  },
  x: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    color: "from-gray-900 to-black",
  },
  facebook: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    color: "from-blue-600 to-blue-500",
  },
  youtube: {
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    color: "from-red-600 to-red-500",
  },
};

const STATUS_COLORS: Record<string, string> = {
  active: "from-emerald-500 to-teal-500",
  paused: "from-amber-500 to-orange-500",
  completed: "from-blue-500 to-indigo-500",
  archived: "from-slate-400 to-gray-500",
};

export default function SocialMediaPage() {
  const { role, userId, loading: roleLoading } = useUserRole();
  const isAdmin = role === "admin" || role === "hr";
  
  const [projects, setProjects] = useState<SocialProject[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [letterFilter, setLetterFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  useEffect(() => {
    if (!roleLoading) {
      loadProjects();
      loadCompanies();
    }
  }, [roleLoading, userId, isAdmin]);

  async function loadProjects() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabaseClient
        .from("social_projects")
        .select(`
          id, name, description, brand_color, logo_url, status, platforms, created_at,
          company:companies(id, name, logo_url),
          project_manager_ids, account_manager_ids, creative_team_lead_ids, creative_ids, videographer_ids,
          social_media_specialist_ids, performance_marketer_ids, email_whatsapp_specialist_ids,
          website_blogs_specialist_ids, content_creator_ids
        `)
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        setProjects([]);
      } else {
        // Filter projects based on user access (admins see all, users see only assigned)
        const filteredData = (data || []).filter((p: any) => {
          if (isAdmin) return true;
          if (!userId) return false;
          return (
            (p.project_manager_ids || []).includes(userId) ||
            (p.account_manager_ids || []).includes(userId) ||
            (p.creative_team_lead_ids || []).includes(userId) ||
            (p.creative_ids || []).includes(userId) ||
            (p.videographer_ids || []).includes(userId) ||
            (p.social_media_specialist_ids || []).includes(userId) ||
            (p.performance_marketer_ids || []).includes(userId) ||
            (p.email_whatsapp_specialist_ids || []).includes(userId) ||
            (p.website_blogs_specialist_ids || []).includes(userId) ||
            (p.content_creator_ids || []).includes(userId)
          );
        });
        
        const transformed = filteredData.map((row: any) => ({
          ...row,
          platforms: row.platforms || [],
          company: Array.isArray(row.company) ? row.company[0] || null : row.company,
        }));
        setProjects(transformed as SocialProject[]);
      }
    } catch {
      setError("Failed to load social media projects.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadCompanies() {
    const { data } = await supabaseClient
      .from("companies")
      .select("id, name, logo_url")
      .order("name");
    setCompanies(data || []);
  }

  async function updateProjectStatus(projectId: string, newStatus: string) {
    const { error } = await supabaseClient
      .from("social_projects")
      .update({ status: newStatus })
      .eq("id", projectId);
    
    if (error) {
      console.error("Error updating project status:", error);
      return;
    }
    
    // Update local state
    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, status: newStatus } : p
    ));
  }

  async function downloadAllReports() {
    try {
      // Fetch all subscriptions
      const { data: subscriptions } = await supabaseClient
        .from("project_subscriptions")
        .select(`
          id, name, amount, start_month, start_year, end_month, end_year,
          project:social_projects(id, name)
        `)
        .order("start_year", { ascending: false })
        .order("start_month", { ascending: false });

      // Fetch all boosted posts only (never organic)
      const { data: boostedPosts } = await supabaseClient
        .from("social_posts")
        .select(`
          id, subject, caption, platforms, post_type, platform_budgets, scheduled_date,
          project:social_projects(id, name)
        `)
        .eq("post_type", "boosted")
        .order("scheduled_date", { ascending: true });

      const months = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

      // Create subscriptions CSV
      const subHeaders = ["Project", "Subscription Name", "Amount", "Start Month", "Start Year", "End Month", "End Year"];
      const subRows = (subscriptions || []).map((sub: any) => [
        sub.project?.name || "Unknown",
        sub.name,
        sub.amount?.toFixed(2) || "0.00",
        months[sub.start_month] || sub.start_month,
        sub.start_year,
        months[sub.end_month] || sub.end_month,
        sub.end_year,
      ]);
      const subCsvContent = [
        subHeaders.join(","),
        ...subRows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(",")),
      ].join("\n");

      // Create boost report CSV — columns: Account, Subject, Date, Platform, Amount (AED)
      // One row per platform per post (e.g. boosted on IG + TikTok = 2 rows)
      const boostHeaders = ["Account", "Subject", "Date", "Platform", "Amount (AED)"];
      const boostRows: string[] = [];

      for (const post of (boostedPosts || []) as any[]) {
        const budgets = post.platform_budgets || {};
        const accountName = (post.project?.name || "Unknown").replace(/"/g, '""');
        const subject = (post.subject || post.caption?.slice(0, 50) || "Untitled").replace(/"/g, '""');
        const dateStr = post.scheduled_date
          ? new Date(post.scheduled_date).toLocaleDateString("en-GB")
          : "";
        const platforms: string[] = post.platforms || [];

        if (platforms.length === 0) {
          boostRows.push([`"${accountName}"`, `"${subject}"`, `"${dateStr}"`, "", "0.00"].join(","));
        } else {
          for (const platform of platforms) {
            const amount = Number(budgets[platform] || 0);
            boostRows.push([
              `"${accountName}"`,
              `"${subject}"`,
              `"${dateStr}"`,
              `"${platform.charAt(0).toUpperCase() + platform.slice(1)}"`,
              amount.toFixed(2),
            ].join(","));
          }
        }
      }

      const grandTotal = (boostedPosts || []).reduce((sum: number, post: any) => {
        return sum + Object.values(post.platform_budgets || {}).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
      }, 0);
      boostRows.push("");
      boostRows.push([`"TOTAL"`, `"${(boostedPosts || []).length} boosted posts"`, "", "", grandTotal.toFixed(2)].join(","));

      const boostCsvContent = [boostHeaders.join(","), ...boostRows].join("\n");

      // Download both CSVs
      const date = new Date().toISOString().split("T")[0];
      
      // Subscriptions CSV
      const subBlob = new Blob([subCsvContent], { type: "text/csv;charset=utf-8;" });
      const subLink = document.createElement("a");
      subLink.href = URL.createObjectURL(subBlob);
      subLink.download = `all_subscriptions_${date}.csv`;
      subLink.click();

      // Boost CSV
      setTimeout(() => {
        const boostBlob = new Blob([boostCsvContent], { type: "text/csv;charset=utf-8;" });
        const boostLink = document.createElement("a");
        boostLink.href = URL.createObjectURL(boostBlob);
        boostLink.download = `all_boost_spent_${date}.csv`;
        boostLink.click();
      }, 500);

    } catch (err) {
      console.error("Error downloading reports:", err);
      alert("Failed to download reports. Please try again.");
    }
  }

  const filteredProjects = projects
    .filter((project) => {
      // Hide completed and archived projects by default
      if (!statusFilter && (project.status === "completed" || project.status === "archived")) {
        return false;
      }
      if (statusFilter && project.status !== statusFilter) return false;
      if (letterFilter) {
        const firstLetter = project.name.charAt(0).toUpperCase();
        if (firstLetter !== letterFilter) return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = project.name.toLowerCase().includes(query);
        const matchesCompany = project.company?.name?.toLowerCase().includes(query);
        const matchesDescription = project.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesCompany && !matchesDescription) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      return sortDirection === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

  // Get available letters from projects
  const availableLetters = [...new Set(
    projects
      .filter((p) => !statusFilter || p.status === statusFilter)
      .filter((p) => statusFilter || (p.status !== "completed" && p.status !== "archived"))
      .map((p) => p.name.charAt(0).toUpperCase())
  )].sort();

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Integrated Marketing</h1>
          <p className="text-sm text-slate-500">Plan, execute, and track your marketing campaigns and content calendar in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadAllReports}
            title="Download All Subscription and Boost Report"
            className="relative group inline-flex items-center justify-center rounded-xl border border-violet-200 bg-violet-50 p-2.5 text-violet-700 transition-all hover:bg-violet-100 hover:border-violet-300"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none z-50">
              Download Reports
            </span>
          </button>
          <Link
            href="/social-media/calendar"
            title="Content Calendar 2026"
            className="relative group inline-flex items-center justify-center rounded-xl border border-pink-200 bg-pink-50 p-2.5 text-pink-700 transition-all hover:bg-pink-100 hover:border-pink-300"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none z-50">
              Content Calendar 2026
            </span>
          </Link>
          <button
            onClick={() => setShowNewProjectModal(true)}
            title="New Social Project"
            className="relative group inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 p-2.5 text-white shadow-lg shadow-pink-500/25 transition-all hover:from-pink-600 hover:to-fuchsia-700 hover:shadow-xl hover:shadow-pink-500/30"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none z-50">
              New Social Project
            </span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search projects or companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
          />
        </div>
        <button
          onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M3 12h12M3 18h6" />
          </svg>
          {sortDirection === "asc" ? "A → Z" : "Z → A"}
        </button>
        {/* View Mode Toggle */}
        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              viewMode === "list"
                ? "bg-pink-500 text-white shadow"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            List
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              viewMode === "grid"
                ? "bg-pink-500 text-white shadow"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Grid
          </button>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Alphabetical Filter */}
      <div className="mb-6 flex flex-wrap items-center gap-1">
        <button
          onClick={() => setLetterFilter("")}
          className={`h-8 min-w-[2rem] rounded-lg px-2 text-xs font-medium transition-all ${
            letterFilter === ""
              ? "bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-md"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All
        </button>
        {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => {
          const isAvailable = availableLetters.includes(letter);
          const isActive = letterFilter === letter;
          return (
            <button
              key={letter}
              onClick={() => isAvailable && setLetterFilter(isActive ? "" : letter)}
              disabled={!isAvailable}
              className={`h-8 w-8 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-md"
                  : isAvailable
                  ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  : "bg-slate-50 text-slate-300 cursor-not-allowed"
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Loading / Error states */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Projects List/Grid */}
      {!loading && !error && (
        <>
          {/* List View */}
          {viewMode === "list" && (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_150px_180px_120px_80px] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                <span>Project</span>
                <span>Company</span>
                <span>Platforms</span>
                <span>Status</span>
                <span></span>
              </div>
              {/* Table Rows */}
              {filteredProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/social-media/${project.id}`}
                  className="grid grid-cols-[1fr_150px_180px_120px_80px] gap-4 items-center px-4 py-3 border-b border-slate-50 hover:bg-pink-50/50 transition-colors group"
                >
                  {/* Project Name & Logo */}
                  <div className="flex items-center gap-3 min-w-0">
                    {project.company?.logo_url ? (
                      <Image
                        src={project.company.logo_url}
                        alt=""
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div 
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-white font-bold text-sm flex-shrink-0"
                        style={{ background: project.brand_color || 'linear-gradient(135deg, #ec4899, #d946ef)' }}
                      >
                        {project.name.charAt(0)}
                      </div>
                    )}
                    <span className="font-medium text-slate-900 truncate group-hover:text-pink-600">
                      {project.name}
                    </span>
                  </div>
                  {/* Company */}
                  <span className="text-sm text-slate-500 truncate">
                    {project.company?.name || '—'}
                  </span>
                  {/* Platforms */}
                  <div className="flex items-center gap-1">
                    {(project.platforms || []).slice(0, 5).map((platform) => {
                      const platformData = PLATFORM_ICONS[platform.toLowerCase()];
                      if (!platformData) return null;
                      return (
                        <span
                          key={platform}
                          className={`flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br ${platformData.color} text-white`}
                          title={platform}
                        >
                          <span className="scale-75">{platformData.icon}</span>
                        </span>
                      );
                    })}
                  </div>
                  {/* Status - Clickable Dropdown */}
                  <div onClick={(e) => e.preventDefault()}>
                    <select
                      value={project.status || 'active'}
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        updateProjectStatus(project.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`appearance-none cursor-pointer rounded-full px-3 py-1 text-xs font-medium text-white border-0 outline-none ${
                        project.status === 'paused' 
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                          : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      }`}
                      style={{ backgroundImage: project.status === 'paused' ? 'linear-gradient(to right, #f59e0b, #f97316)' : 'linear-gradient(to right, #10b981, #14b8a6)' }}
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                    </select>
                  </div>
                  {/* Arrow */}
                  <div className="flex justify-end">
                    <svg className="h-4 w-4 text-slate-300 group-hover:text-pink-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </Link>
              ))}
              {filteredProjects.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-100 to-fuchsia-100 text-pink-500">
                    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                    </svg>
                  </div>
                  <h3 className="mb-1 text-lg font-semibold text-slate-900">No marketing projects yet</h3>
                  <p className="mb-4 text-sm text-slate-500">Create your first integrated marketing project to get started</p>
                  <button
                    onClick={() => setShowNewProjectModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-pink-500/25"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Create Project
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Grid View */}
          {viewMode === "grid" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/social-media/${project.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-pink-200 hover:shadow-lg hover:shadow-pink-500/10"
                >
                  {/* Status dropdown */}
                  <div className="absolute right-4 top-4" onClick={(e) => e.preventDefault()}>
                    <select
                      value={project.status || 'active'}
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        updateProjectStatus(project.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`appearance-none cursor-pointer rounded-full px-3 py-1 text-xs font-medium text-white border-0 outline-none`}
                      style={{ backgroundImage: project.status === 'paused' ? 'linear-gradient(to right, #f59e0b, #f97316)' : 'linear-gradient(to right, #10b981, #14b8a6)' }}
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                    </select>
                  </div>

                  {/* Company info */}
                  <div className="mb-4 flex items-center gap-3">
                    {project.company?.logo_url ? (
                      <Image
                        src={project.company.logo_url}
                        alt=""
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-xl object-cover"
                      />
                    ) : (
                      <div 
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold text-sm"
                        style={{ background: project.brand_color || 'linear-gradient(135deg, #ec4899, #d946ef)' }}
                      >
                        {project.company?.name?.charAt(0) || project.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold text-slate-900 group-hover:text-pink-600">
                        {project.name}
                      </h3>
                      <p className="truncate text-xs text-slate-500">
                        {project.company?.name || 'No company'}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p className="mb-4 line-clamp-2 text-sm text-slate-600">
                      {project.description}
                    </p>
                  )}

                  {/* Platforms */}
                  <div className="flex items-center gap-1.5">
                    {(project.platforms || []).map((platform) => {
                      const platformData = PLATFORM_ICONS[platform.toLowerCase()];
                      if (!platformData) return null;
                      return (
                        <span
                          key={platform}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${platformData.color} text-white shadow-sm`}
                          title={platform}
                        >
                          {platformData.icon}
                        </span>
                      );
                    })}
                    {(!project.platforms || project.platforms.length === 0) && (
                      <span className="text-xs text-slate-400">No platforms configured</span>
                    )}
                  </div>

                  {/* Hover arrow */}
                  <div className="absolute bottom-4 right-4 opacity-0 transition-opacity group-hover:opacity-100">
                    <svg className="h-5 w-5 text-pink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}

              {filteredProjects.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-100 to-fuchsia-100 text-pink-500">
                    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                    </svg>
                  </div>
                  <h3 className="mb-1 text-lg font-semibold text-slate-900">No marketing projects yet</h3>
                  <p className="mb-4 text-sm text-slate-500">Create your first integrated marketing project to get started</p>
                  <button
                    onClick={() => setShowNewProjectModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-pink-500/25"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Create Project
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <NewProjectModal
          companies={companies}
          onClose={() => setShowNewProjectModal(false)}
          onCreated={() => {
            setShowNewProjectModal(false);
            loadProjects();
          }}
        />
      )}
    </div>
  );
}

function NewProjectModal({
  companies,
  onClose,
  onCreated,
}: {
  companies: Company[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [brandColor, setBrandColor] = useState("#ec4899");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePlatform = (platform: string) => {
    setPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !companyId) {
      setError("Project name and company are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: insertError } = await supabaseClient
        .from("social_projects")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          company_id: companyId,
          brand_color: brandColor,
          platforms: platforms,
          status: "active",
        });

      if (insertError) {
        setError(insertError.message);
      } else {
        onCreated();
      }
    } catch {
      setError("Failed to create project");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-900">New Marketing Project</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Company selector */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Company <span className="text-red-500">*</span>
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
              required
            >
              <option value="">Select a company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project name */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Q1 2025 Social Campaign"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the project..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500/20 resize-none"
            />
          </div>

          {/* Brand Color */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Brand Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-lg border border-slate-200"
              />
              <input
                type="text"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 uppercase focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
              />
            </div>
          </div>

          {/* Platforms */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Platforms
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PLATFORM_ICONS).map(([platform, data]) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => togglePlatform(platform)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                    platforms.includes(platform)
                      ? `border-transparent bg-gradient-to-r ${data.color} text-white shadow-lg`
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {data.icon}
                  <span className="capitalize">{platform}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-pink-500/25 transition-all hover:from-pink-600 hover:to-fuchsia-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
