"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";
import { useUserRole } from "@/app/profile/hooks/useUserRole";
import PostModal from "../[id]/PostModal";

type WorkflowStatus = "production" | "creatives_approval" | "creative_approval" | "captions" | "final_approval" | "for_publishing" | "published";

type Post = {
  id: string;
  project_id: string;
  platforms: string[];
  subject: string | null;
  caption: string | null;
  media_urls: { url: string; type: "image" | "video" }[];
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: "draft" | "pending" | "approved" | "published";
  workflow_status: WorkflowStatus;
  hashtags: string[];
  post_type: "organic" | "boosted";
  content_type: string | null;
  image_asset_url: string | null;
  video_url: string | null;
  first_comment: string | null;
  shoot_status: "pending" | "scheduled" | "completed" | "cancelled";
  shoot_date: string | null;
  shoot_time: string | null;
  shoot_count: number;
  raw_assets_link: string | null;
  shoot_notes: string | null;
  creative_notes: string | null;
  danote_board_id: string | null;
  platform_budgets: Record<string, number>;
  published_urls: Record<string, string>;
  assigned_creative_ids: string[];
  created_at: string;
  project?: {
    id: string;
    name: string;
    brand_color: string | null;
    company: {
      id: string;
      name: string;
      logo_url: string | null;
    } | null;
  };
};

type Project = {
  id: string;
  name: string;
  brand_color: string | null;
  status: "active" | "paused";
  company: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
};

const CONTENT_TYPES = [
  "Reel (9:16)",
  "Static Post (4:5)",
  "Static Post (4:5) + Story (9:16)",
  "Story (9:16)",
  "Carousel Post (4:5)",
  "Long-Form Video (16:9)",
  "WhatsApp (1:1)",
  "Ad Creatives (Check dimensions on notes)",
];

const WORKFLOW_COLORS: Record<WorkflowStatus, { bg: string; text: string; border: string; dot: string }> = {
  production: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", dot: "bg-orange-500" },
  creatives_approval: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300", dot: "bg-blue-500" },
  creative_approval: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", dot: "bg-amber-500" },
  captions: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300", dot: "bg-slate-500" },
  final_approval: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300", dot: "bg-purple-500" },
  for_publishing: { bg: "bg-green-100", text: "text-green-700", border: "border-green-300", dot: "bg-green-500" },
  published: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", dot: "bg-emerald-500" },
};

const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  production: "Production",
  creatives_approval: "Creative Development",
  creative_approval: "Creative Approval",
  captions: "Copywriting",
  final_approval: "Final Approval",
  for_publishing: "Scheduled",
  published: "Live",
};

// Order of workflow statuses for display
const WORKFLOW_ORDER: WorkflowStatus[] = [
  "production",
  "creatives_approval",
  "creative_approval", 
  "captions",
  "final_approval",
  "for_publishing",
  "published",
];

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "📸",
  facebook: "👤",
  tiktok: "🎵",
  linkedin: "💼",
  x: "𝕏",
  youtube: "▶️",
};

export default function ContentCalendar2026() {
  const { role, userId, loading: roleLoading } = useUserRole();
  const isAdmin = role === "admin" || role === "hr";
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Filters
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | "all">("all");
  const [shootFilter, setShootFilter] = useState<"all" | "pending" | "scheduled" | "completed">("all");
  const [projectStatusFilter, setProjectStatusFilter] = useState<"all" | "active" | "paused">("all");
  
  // Drag and drop
  const [draggedPost, setDraggedPost] = useState<Post | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // UI
  const [showFilters, setShowFilters] = useState(true);
  const [hoveredPost, setHoveredPost] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "list" | "grid">("calendar");
  const [sidebarView, setSidebarView] = useState<"calendars">("calendars");
  
  // Edit modal
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);

  // Users map for assigned creatives display
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchUsers() {
      const { data } = await supabaseClient.from("users").select("id, full_name").order("full_name");
      if (data) {
        const map: Record<string, string> = {};
        for (const u of data) map[u.id] = u.full_name || u.id;
        setUsersMap(map);
      }
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!roleLoading) {
      loadData();
    }
  }, [roleLoading, userId, isAdmin]);

  async function loadData() {
    setLoading(true);
    
    // Load all projects with company info and team assignments (both active and paused)
    const { data: projectsData } = await supabaseClient
      .from("social_projects")
      .select(`
        id, name, brand_color, status,
        company:companies(id, name, logo_url),
        project_manager_ids, account_manager_ids, creative_team_lead_ids, creative_ids, videographer_ids,
        social_media_specialist_ids, performance_marketer_ids, email_whatsapp_specialist_ids,
        website_blogs_specialist_ids, content_creator_ids
      `)
      .in("status", ["active", "paused"])
      .order("name");
    
    if (projectsData) {
      // Filter projects based on user access (admins see all, users see only assigned)
      const filteredProjects = projectsData.filter((p: any) => {
        if (isAdmin) return true;
        if (!userId) return false;
        // Check if user is assigned to any team role (now arrays)
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
      
      const transformed = filteredProjects.map((p: any) => ({
        ...p,
        company: Array.isArray(p.company) ? p.company[0] || null : p.company,
      }));
      setProjects(transformed);
    }

    // Load all posts with project info - from active and paused projects
    const { data: postsData } = await supabaseClient
      .from("social_posts")
      .select(`
        id, project_id, platforms, subject, caption, media_urls, scheduled_date, scheduled_time,
        status, workflow_status, hashtags, post_type, content_type, image_asset_url, video_url,
        first_comment, shoot_status, shoot_date, shoot_time, shoot_count, raw_assets_link, shoot_notes,
        creative_notes, danote_board_id, platform_budgets, published_urls, assigned_creative_ids, created_at,
        project:social_projects!inner(id, name, brand_color, status, company:companies(id, name, logo_url))
      `)
      .in("project.status", ["active", "paused"])
      .order("scheduled_date", { ascending: true });

    if (postsData && projectsData) {
      // Get list of accessible project IDs
      const accessibleProjectIds = new Set(
        projectsData
          .filter((p: any) => {
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
          })
          .map((p: any) => p.id)
      );
      
      // Filter posts to only show those from accessible projects
      const filteredPosts = postsData.filter((post: any) => accessibleProjectIds.has(post.project_id));
      
      const transformed = filteredPosts.map((post: any) => ({
        ...post,
        project: post.project ? {
          ...post.project,
          company: Array.isArray(post.project.company) ? post.project.company[0] || null : post.project.company,
        } : null,
      }));
      setPosts(transformed);
    }
    
    setLoading(false);
  }

  async function updatePostDate(postId: string, newDate: Date) {
    const dateStr = newDate.toISOString();
    await supabaseClient
      .from("social_posts")
      .update({ scheduled_date: dateStr })
      .eq("id", postId);
    
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, scheduled_date: dateStr } : p))
    );
  }

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  // Build calendar grid with previous/next month days for complete weeks
  const calendarDays: { day: number; isCurrentMonth: boolean; date: Date }[] = [];
  
  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthDays - i),
    });
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i),
    });
  }
  
  // Next month days to complete the grid (6 rows)
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i),
    });
  }

  // Filter posts
  const filteredPosts = posts.filter((post) => {
    // Brand filter
    if (selectedBrands.length > 0 && !selectedBrands.includes(post.project_id)) {
      return false;
    }
    // Content type filter
    if (selectedContentTypes.length > 0 && !selectedContentTypes.includes(post.content_type || "")) {
      return false;
    }
    // Workflow status filter
    if (statusFilter !== "all" && post.workflow_status !== statusFilter) {
      return false;
    }
    // Shoot filter
    if (shootFilter !== "all" && post.shoot_status !== shootFilter) {
      return false;
    }
    return true;
  });

  const getPostsForDate = (date: Date) => {
    return filteredPosts.filter((post) => {
      if (!post.scheduled_date) return false;
      const postDate = new Date(post.scheduled_date);
      return (
        postDate.getFullYear() === date.getFullYear() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getDate() === date.getDate()
      );
    });
  };

  const getWorkflowStyle = (status: WorkflowStatus | undefined) => {
    return WORKFLOW_COLORS[status || "captions"];
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleDragStart = (e: React.DragEvent, post: Post) => {
    setDraggedPost(post);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", post.id);
  };

  const handleDragEnd = () => {
    setDraggedPost(null);
    setDragOverDate(null);
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDate(dateKey);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    if (draggedPost) {
      updatePostDate(draggedPost.id, new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10, 0, 0));
    }
    setDraggedPost(null);
    setDragOverDate(null);
    setIsDragging(false);
  };

  const formatDateKey = (date: Date) => {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  // Calculate 2-week period from today to a fixed Sunday endpoint
  // The endpoint is always the same Sunday 2 weeks out, regardless of which day you run it
  // Sunday: +14 days, Monday: +13 days, Tuesday: +12 days, Wednesday: +11 days,
  // Thursday: +10 days, Friday: +9 days, Saturday: +8 days
  const getCurrentPeriod = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Calculate days to add to reach the fixed Sunday endpoint (end of 2-week cycle)
    // If today is Sunday (0), add 14 days
    // If today is Monday (1), add 13 days
    // If today is Saturday (6), add 8 days
    const daysToAdd = dayOfWeek === 0 ? 14 : (14 - dayOfWeek);
    
    // Period starts from today
    const periodStart = new Date(today);
    
    // Period ends on the fixed Sunday (2 weeks out, aligned to week cycle)
    const periodEnd = new Date(today);
    periodEnd.setDate(today.getDate() + daysToAdd);
    periodEnd.setHours(23, 59, 59, 999);
    
    return { start: periodStart, end: periodEnd, displayEnd: periodEnd };
  };
  
  const currentPeriod = getCurrentPeriod();
  
  // Filter posts for current period (independent of status filter for counts)
  const periodPosts = posts.filter((post) => {
    if (!post.scheduled_date) return false;
    const postDate = new Date(post.scheduled_date);
    // Apply brand filter if selected
    if (selectedBrands.length > 0 && !selectedBrands.includes(post.project_id)) {
      return false;
    }
    // Check if post is within current period
    return postDate >= currentPeriod.start && postDate <= currentPeriod.end;
  });
  
  // Stats based on period
  const totalPosts = filteredPosts.length;
  const periodPostCount = periodPosts.length;
  const postsWithShootPending = filteredPosts.filter(p => p.shoot_status === "pending").length;
  
  // Status counts for period (not filtered by status)
  const periodStatusCounts = WORKFLOW_ORDER.reduce((acc, status) => {
    acc[status] = periodPosts.filter(p => p.workflow_status === status).length;
    return acc;
  }, {} as Record<WorkflowStatus, number>);
  
  // Content type counts for period
  const contentTypeCounts = CONTENT_TYPES.reduce((acc, type) => {
    acc[type] = periodPosts.filter(p => p.content_type === type).length;
    return acc;
  }, {} as Record<string, number>);
  
  // Format period dates for display
  const formatPeriodDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/social-media"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="bg-gradient-to-r from-pink-500 to-fuchsia-600 bg-clip-text text-transparent">
                    Content Calendar 2026
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">
                    {periodPostCount} posts
                  </span>
                </h1>
                <p className="text-sm text-slate-500">
                  <span className="font-medium text-pink-600">Period: {formatPeriodDate(currentPeriod.start)} - {formatPeriodDate(currentPeriod.displayEnd)}</span>
                  <span className="mx-2">•</span>
                  Drag & drop content across dates
                </p>
              </div>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <h2 className="min-w-[160px] text-center text-lg font-semibold text-slate-900">
                {monthNames[month]} {year}
              </h2>
              <button
                onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                title="Filter"
                className={`relative group ml-2 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  showFilters
                    ? "border-pink-300 bg-pink-50 text-pink-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                </svg>
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Filter</span>
              </button>
              {/* View Mode Toggle */}
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setViewMode("calendar")}
                  title="Calendar View"
                  className={`relative group px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === "calendar"
                      ? "bg-pink-500 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Calendar</span>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  title="List View"
                  className={`relative group px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === "list"
                      ? "bg-pink-500 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">List</span>
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  title="Grid View"
                  className={`relative group px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === "grid"
                      ? "bg-pink-500 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Grid</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Top Filter Bar - Workflow Status & Content Types */}
        <div className="px-4 sm:px-6 lg:px-8 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-4">
            {/* Workflow Status Pills */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Status:</span>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === "all"
                      ? "bg-slate-800 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  All
                </button>
                {WORKFLOW_ORDER.map((status) => {
                  const colors = WORKFLOW_COLORS[status];
                  const count = periodStatusCounts[status] || 0;
                  return (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        statusFilter === status
                          ? `${colors.bg} ${colors.text}`
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                      {WORKFLOW_LABELS[status]}
                      <span className={statusFilter === status ? "opacity-75" : "text-slate-400"}>({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-4 w-px bg-slate-200" />

            {/* Content Type Pills */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Format:</span>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setSelectedContentTypes([])}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedContentTypes.length === 0
                      ? "bg-purple-600 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  All
                </button>
                {CONTENT_TYPES.map((type) => {
                  const count = contentTypeCounts[type] || 0;
                  const isSelected = selectedContentTypes.includes(type);
                  const shortName = type.split(" ")[0] + (type.includes("(") ? " " + type.match(/\([^)]+\)/)?.[0] : "");
                  const icon = type === "Reel (9:16)" ? "🎬"
                    : type === "Static Post (4:5)" ? "🖼️" 
                    : type === "Static Post (4:5) + Story (9:16)" ? "📱"
                    : type === "Story (9:16)" ? "📲"
                    : type === "Carousel Post (4:5)" ? "🎠"
                    : type === "Long-Form Video (16:9)" ? "🎞️"
                    : type === "WhatsApp (1:1)" ? "💬"
                    : type === "Ad Creatives (Check dimensions on notes)" ? "📢"
                    : "📝";
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        setSelectedContentTypes((prev) =>
                          isSelected
                            ? prev.filter((t) => t !== type)
                            : [...prev, type]
                        );
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                        isSelected
                          ? "bg-purple-100 text-purple-700 border border-purple-300"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      title={type}
                    >
                      <span>{icon}</span>
                      <span className="text-slate-400">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar with Tab Switcher */}
        {showFilters && (
          <div className="w-64 flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto max-h-[calc(100vh-160px)] sticky top-40">
            {/* Sidebar Header */}
            <div className="px-3 py-2.5 border-b border-slate-200 bg-gradient-to-r from-pink-50 to-purple-50">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <span className="text-pink-500">📅</span>
                  Calendars
                </h3>
                <select
                  value={projectStatusFilter}
                  onChange={(e) => setProjectStatusFilter(e.target.value as "all" | "active" | "paused")}
                  className="text-[10px] px-2 py-1 rounded border border-slate-200 bg-white text-slate-600 focus:outline-none focus:border-pink-300"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            </div>
            
            <div className="p-3">
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedBrands([])}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedBrands.length === 0
                      ? "bg-pink-100 text-pink-700 font-medium"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  All Calendars ({projects.filter(p => projectStatusFilter === "all" || p.status === projectStatusFilter).length})
                </button>
                {[...projects]
                  .filter(p => projectStatusFilter === "all" || p.status === projectStatusFilter)
                  .sort((a, b) => {
                    const nameA = a.name.toLowerCase();
                    const nameB = b.name.toLowerCase();
                    return nameA.localeCompare(nameB);
                  }).map((project) => {
                  const postCount = posts.filter(p => p.project_id === project.id).length;
                  const isSelected = selectedBrands.includes(project.id);
                  const displayName = project.name;
                  const statusColor = project.status === "active" ? "#22c55e" : "#eab308"; // green for active, yellow for paused
                  return (
                    <button
                      key={project.id}
                      onClick={() => {
                        setSelectedBrands((prev) =>
                          isSelected
                            ? prev.filter((id) => id !== project.id)
                            : [...prev, project.id]
                        );
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                        isSelected
                          ? "bg-pink-100 text-pink-700 font-medium"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                      title={`Filter by ${displayName}`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: statusColor }}
                        title={project.status === "active" ? "Active" : "Paused"}
                      />
                      <span className="truncate flex-1 text-xs">
                        {displayName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({postCount})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Calendar/List View */}
        <div className="flex-1 p-4 sm:p-6 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
            </div>
          ) : viewMode === "list" ? (
            /* List View */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto table-scroll">
              <table className="w-full min-w-[1200px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap w-28">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap w-20">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap w-44">Calendar</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap w-16">Asset</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap w-32">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">Caption</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap w-36">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap w-28">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase whitespace-nowrap w-40">Assigned Creatives</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPosts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                        No posts found matching your filters
                      </td>
                    </tr>
                  ) : (
                    filteredPosts
                      .sort((a, b) => {
                        if (!a.scheduled_date && !b.scheduled_date) return 0;
                        if (!a.scheduled_date) return 1;
                        if (!b.scheduled_date) return -1;
                        const dateA = a.scheduled_date.slice(0, 10) + (a.scheduled_time ? "T" + a.scheduled_time : "T00:00");
                        const dateB = b.scheduled_date.slice(0, 10) + (b.scheduled_time ? "T" + b.scheduled_time : "T00:00");
                        return dateA.localeCompare(dateB);
                      })
                      .map((post) => {
                        const style = getWorkflowStyle(post.workflow_status);
                        const brandColor = post.project?.brand_color || "#ec4899";
                        return (
                          <tr 
                              key={post.id} 
                              onClick={() => { setEditingPost(post); setShowPostModal(true); }}
                              className="hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                            <td className="px-4 py-3 w-28">
                              <span className="text-sm text-slate-900 whitespace-nowrap">
                                {post.scheduled_date ? new Date(post.scheduled_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "No date"}
                              </span>
                            </td>
                            <td className="px-4 py-3 w-20">
                              <span className="text-sm text-slate-600 whitespace-nowrap">
                                {post.scheduled_time || "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3 w-44">
                              <Link
                                href={`/social-media/${post.project_id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                title={`Go to ${post.project?.name || "Unknown"} calendar`}
                              >
                                {post.project?.company?.logo_url ? (
                                  <img src={post.project.company.logo_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                                ) : (
                                  <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: brandColor }}>
                                    {(post.project?.name || "?")[0]}
                                  </span>
                                )}
                                <span className="text-sm text-slate-700 truncate max-w-[120px] hover:text-pink-600 hover:underline">
                                  {post.project?.name || "Unknown"}
                                </span>
                              </Link>
                            </td>
                            <td className="px-4 py-3 w-16">
                              {post.image_asset_url ? (
                                <img src={post.image_asset_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                  </svg>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 w-32">
                              <p className="text-sm font-medium text-slate-900 truncate max-w-[100px]">
                                {post.subject || "—"}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm text-slate-600 line-clamp-1 max-w-[250px]">
                                {post.caption || "No caption"}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-slate-600 whitespace-nowrap">
                                {post.content_type || "-"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                {WORKFLOW_LABELS[post.workflow_status || "captions"]}
                              </span>
                            </td>
                            <td className="px-4 py-3 w-40">
                              {post.assigned_creative_ids && post.assigned_creative_ids.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {post.assigned_creative_ids.map((id) => (
                                    <span key={id} className="inline-flex items-center rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 whitespace-nowrap">
                                      {usersMap[id] || id}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          ) : viewMode === "grid" ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredPosts.length === 0 ? (
                <div className="col-span-full text-center py-12 text-sm text-slate-500">
                  No posts found matching your filters
                </div>
              ) : (
                filteredPosts
                  .sort((a, b) => {
                    if (!a.scheduled_date && !b.scheduled_date) return 0;
                    if (!a.scheduled_date) return 1;
                    if (!b.scheduled_date) return -1;
                    return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
                  })
                  .map((post) => {
                    const brandColor = post.project?.brand_color || "#ec4899";
                    const style = getWorkflowStyle(post.workflow_status);
                    return (
                      <div
                        key={post.id}
                        onClick={() => { setEditingPost(post); setShowPostModal(true); }}
                        className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                      >
                        {/* Header with brand */}
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
                          {post.project?.company?.logo_url ? (
                            <img src={post.project.company.logo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: brandColor }}>
                              {(post.project?.name || "?")[0]}
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-900 truncate">{post.project?.name || "Unknown"}</p>
                          </div>
                        </div>
                        
                        {/* Image - 4:5 aspect ratio */}
                        <div className="aspect-[4/5] bg-slate-100 relative overflow-hidden">
                          {post.image_asset_url ? (
                            <img src={post.image_asset_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-12 h-12 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <path d="M21 15l-5-5L5 21" />
                              </svg>
                            </div>
                          )}
                          {/* Boosted badge overlay */}
                          {post.post_type === "boosted" && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-semibold bg-purple-600 text-white rounded-full shadow">Boosted</span>
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="p-3 space-y-2">
                          {/* Date */}
                          <p className="text-xs font-semibold text-slate-900">
                            {post.scheduled_date ? new Date(post.scheduled_date).toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "No date"}
                            {post.scheduled_time && <span className="font-normal text-slate-500 ml-1">{post.scheduled_time}</span>}
                          </p>
                          
                          {/* Subject */}
                          <p className="text-sm font-medium text-slate-900 line-clamp-2">{post.subject || "Untitled"}</p>
                          
                          {/* Caption preview */}
                          {post.caption && (
                            <p className="text-xs text-slate-600 line-clamp-3">{post.caption}</p>
                          )}
                          
                          {/* Format */}
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-medium">Format</span>
                            <span>{post.content_type || "—"}</span>
                          </div>
                          
                          {/* Platforms */}
                          <div className="flex flex-wrap gap-1">
                            {post.platforms.map((p) => (
                              <span key={p} className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded-full capitalize">{p}</span>
                            ))}
                          </div>
                          
                          {/* View Asset link */}
                          {post.image_asset_url && (
                            <a 
                              href={post.image_asset_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-purple-600 hover:underline"
                            >
                              View Asset
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          ) : (
            /* Calendar View */
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm min-w-[800px]">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="px-2 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7">
                {calendarDays.map((dayInfo, idx) => {
                  const dateKey = formatDateKey(dayInfo.date);
                  const dayPosts = getPostsForDate(dayInfo.date);
                  const isDragOver = dragOverDate === dateKey;
                  const isTodayDate = isToday(dayInfo.date);

                  return (
                    <div
                      key={idx}
                      className={`min-h-[140px] border-b border-r border-slate-100 p-2 transition-all ${
                        dayInfo.isCurrentMonth ? "bg-white" : "bg-slate-50/50"
                      } ${isDragOver ? "bg-pink-50 ring-2 ring-inset ring-pink-400" : ""} ${
                        isDragging ? "cursor-copy" : ""
                      }`}
                      onDragOver={(e) => handleDragOver(e, dateKey)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dayInfo.date)}
                    >
                      {/* Day Number */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-sm font-medium ${
                            isTodayDate
                              ? "flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-lg shadow-pink-500/30"
                              : dayInfo.isCurrentMonth
                              ? "text-slate-700"
                              : "text-slate-400"
                          }`}
                        >
                          {dayInfo.day}
                        </span>
                        {dayPosts.length > 0 && (
                          <span className="text-[10px] font-medium text-slate-400">
                            {dayPosts.length} post{dayPosts.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      {/* Posts */}
                      <div className="space-y-1">
                        {dayPosts.slice(0, 4).map((post) => {
                          const style = getWorkflowStyle(post.workflow_status);
                          const brandColor = post.project?.brand_color || "#ec4899";
                          const isHovered = hoveredPost === post.id;

                          return (
                            <div
                              key={post.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, post)}
                              onDragEnd={handleDragEnd}
                              onClick={() => { setEditingPost(post); setShowPostModal(true); }}
                              onMouseEnter={() => setHoveredPost(post.id)}
                              onMouseLeave={() => setHoveredPost(null)}
                              className={`group cursor-pointer active:cursor-grabbing rounded-lg overflow-hidden border transition-all ${
                                isHovered ? "scale-105 shadow-lg z-10 relative" : ""
                              } ${style.border} ${style.bg}`}
                              style={{
                                borderLeftWidth: "3px",
                                borderLeftColor: brandColor,
                              }}
                            >
                              {/* Image Preview or Placeholder */}
                              <div className="h-10 w-full overflow-hidden bg-slate-100 relative">
                                {post.image_asset_url ? (
                                  <img
                                    src={post.image_asset_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    draggable={false}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      target.nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                ) : null}
                                {/* No image placeholder */}
                                <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 ${post.image_asset_url ? 'hidden' : ''}`}>
                                  <div className="flex items-center gap-1 text-slate-400">
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <rect x="3" y="3" width="18" height="18" rx="2" />
                                      <circle cx="8.5" cy="8.5" r="1.5" />
                                      <path d="M21 15l-5-5L5 21" />
                                    </svg>
                                    <span className="text-[8px] font-medium">No image</span>
                                  </div>
                                </div>
                                {/* Broken image placeholder (shown on error) */}
                                {post.image_asset_url && (
                                  <div className="hidden absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
                                    <div className="flex items-center gap-1 text-orange-400">
                                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                        <line x1="12" y1="9" x2="12" y2="13" />
                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                      </svg>
                                      <span className="text-[8px] font-medium">Missing</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="px-1.5 py-1">
                                {/* Account info with logo */}
                                <div className="flex items-center gap-1 mb-0.5">
                                  {post.project?.company?.logo_url ? (
                                    <img 
                                      src={post.project.company.logo_url} 
                                      alt="" 
                                      className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <span
                                      className="w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-white"
                                      style={{ backgroundColor: brandColor }}
                                    >
                                      {(post.project?.name || "?")[0]}
                                    </span>
                                  )}
                                  <span className="text-[9px] font-medium text-slate-700 truncate flex-1">
                                    {post.project?.name || "Unknown"}
                                  </span>
                                  {/* Status dot */}
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`}
                                    title={WORKFLOW_LABELS[post.workflow_status || "captions"]}
                                  />
                                </div>
                                {/* Subject */}
                                <div className="text-[10px] font-medium text-slate-900 line-clamp-1">
                                  {post.subject || post.caption?.slice(0, 30) || "No subject"}
                                </div>
                              </div>

                              {/* Hover tooltip */}
                              {isHovered && (
                                <div className="absolute left-full top-0 ml-2 w-48 p-2 bg-white rounded-lg shadow-xl border border-slate-200 z-50 pointer-events-none">
                                  <p className="text-xs font-medium text-slate-900 mb-1">
                                    {post.project?.name || "Unknown"}
                                  </p>
                                  <p className="text-[10px] text-slate-600 line-clamp-3 mb-1">
                                    {post.caption || "No caption"}
                                  </p>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    {post.content_type && <span>{post.content_type}</span>}
                                    <span>•</span>
                                    <span>{WORKFLOW_LABELS[post.workflow_status || "captions"]}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {dayPosts.length > 4 && (
                          <div className="text-[10px] font-medium text-slate-500 pl-1">
                            +{dayPosts.length - 4} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Drag hint */}
          {isDragging && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-medium shadow-xl z-50 animate-bounce">
              Drop on a date to reschedule
            </div>
          )}
        </div>
      </div>

      {/* Post Edit Modal */}
      {showPostModal && editingPost && (
        <PostModal
          post={editingPost as any}
          projectId={editingPost.project_id}
          projectInfo={editingPost.project as any}
          availablePlatforms={["instagram", "facebook", "tiktok", "linkedin", "x", "youtube", "whatsapp", "pinterest"]}
          onClose={() => { setShowPostModal(false); setEditingPost(null); }}
          onSaved={() => { setShowPostModal(false); setEditingPost(null); loadData(); }}
        />
      )}
    </div>
  );
}
