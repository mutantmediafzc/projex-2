"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import PostModal from "./PostModal";
import { PLATFORM_ICONS } from "./socialMediaUtils";
import BoostedDownload from "./BoostedDownload";

// Helper to properly encode image URLs with spaces in path
function getImageUrl(url: string | null): string {
  if (!url) return "";
  // If it's already a full URL (http/https) or a data URL, return as-is
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  // For local paths, ensure spaces are encoded
  return url.split("/").map((segment, i) => i === 0 ? segment : encodeURIComponent(decodeURIComponent(segment))).join("/");
}

type WorkflowStatus = "production" | "creatives_approval" | "creative_approval" | "captions" | "final_approval" | "for_publishing" | "published";

type Post = {
  id: string;
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
};

type Props = {
  projectId: string;
  projectName?: string;
  platforms: string[];
  brandColor: string | null;
};

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

const CONTENT_TYPE_ICONS: Record<string, string> = {
  "Reel (9:16)": "🎬",
  "Static Post (4:5)": "🖼️",
  "Static Post (4:5) + Story (9:16)": "📱",
  "Story (9:16)": "📲",
  "Carousel Post (4:5)": "🎠",
  "Long-Form Video (16:9)": "🎞️",
  "WhatsApp (1:1)": "💬",
  "Ad Creatives (Check dimensions on notes)": "📢",
};

export default function ContentCalendar({ projectId, projectName, platforms, brandColor }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"calendar" | "list" | "grid">("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [draggedPost, setDraggedPost] = useState<Post | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | "all">("all");
  const [contentTypeFilter, setContentTypeFilter] = useState<string | "all">("all");
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; post: Post } | null>(null);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);

  useEffect(() => {
    loadPosts();
  }, [projectId]);

  async function loadPosts() {
    setLoading(true);
    const { data } = await supabaseClient
      .from("social_posts")
      .select("*")
      .eq("project_id", projectId)
      .order("scheduled_date", { ascending: true });
    if (data) setPosts(data as Post[]);
    setLoading(false);
  }

  async function updatePostDate(postId: string, newDate: Date) {
    await supabaseClient
      .from("social_posts")
      .update({ scheduled_date: newDate.toISOString() })
      .eq("id", postId);
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, scheduled_date: newDate.toISOString() } : p))
    );
  }

  async function duplicatePost(post: Post) {
    const { id, created_at, ...postData } = post;
    const { data, error } = await supabaseClient
      .from("social_posts")
      .insert({
        ...postData,
        project_id: projectId,
        subject: post.subject ? `${post.subject} (Copy)` : "(Copy)",
        status: "draft",
        workflow_status: "production",
      })
      .select()
      .single();
    if (data) {
      setPosts((prev) => [...prev, data as Post]);
    }
    return { data, error };
  }

  async function duplicateSelectedPosts() {
    const postsTodup = posts.filter(p => selectedPosts.has(p.id));
    for (const post of postsTodup) {
      await duplicatePost(post);
    }
    setSelectedPosts(new Set());
    setSelectionMode(false);
  }

  async function bulkUpdatePosts(updates: { scheduled_date?: string; workflow_status?: WorkflowStatus }) {
    const ids = Array.from(selectedPosts);
    await supabaseClient
      .from("social_posts")
      .update(updates)
      .in("id", ids);
    setPosts((prev) =>
      prev.map((p) => (selectedPosts.has(p.id) ? { ...p, ...updates } : p))
    );
    setSelectedPosts(new Set());
    setSelectionMode(false);
    setShowBulkEditModal(false);
  }

  async function deleteSelectedPosts() {
    if (!confirm(`Delete ${selectedPosts.size} selected post(s)?`)) return;
    const ids = Array.from(selectedPosts);
    await supabaseClient.from("social_posts").delete().in("id", ids);
    setPosts((prev) => prev.filter((p) => !selectedPosts.has(p.id)));
    setSelectedPosts(new Set());
    setSelectionMode(false);
  }

  function togglePostSelection(postId: string) {
    setSelectedPosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  }

  function selectAllVisible() {
    setSelectedPosts(new Set(filteredPosts.map(p => p.id)));
  }

  function clearSelection() {
    setSelectedPosts(new Set());
    setSelectionMode(false);
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  // Posts filtered by status only (for content type counts)
  const statusFilteredPosts = statusFilter === "all" 
    ? posts 
    : posts.filter(p => p.workflow_status === statusFilter);

  // Filter posts by both status and content type
  const filteredPosts = statusFilteredPosts.filter(p => {
    if (contentTypeFilter !== "all" && p.content_type !== contentTypeFilter) return false;
    return true;
  });

  // Status counts (always based on all posts)
  const statusCounts: Record<WorkflowStatus | "all", number> = {
    all: posts.length,
    production: posts.filter(p => p.workflow_status === "production").length,
    creatives_approval: posts.filter(p => p.workflow_status === "creatives_approval").length,
    creative_approval: posts.filter(p => p.workflow_status === "creative_approval").length,
    captions: posts.filter(p => p.workflow_status === "captions").length,
    final_approval: posts.filter(p => p.workflow_status === "final_approval").length,
    for_publishing: posts.filter(p => p.workflow_status === "for_publishing").length,
    published: posts.filter(p => p.workflow_status === "published").length,
  };

  // Content type counts - based on status filtered posts (hierarchical)
  const contentTypeCounts = CONTENT_TYPES.reduce((acc, type) => {
    acc[type] = statusFilteredPosts.filter(p => p.content_type === type).length;
    return acc;
  }, {} as Record<string, number>);

  // Total count for "All" format button - based on status filtered posts
  const allFormatsCount = statusFilteredPosts.length;

  const getPostsForDay = (day: number) =>
    filteredPosts
      .filter((post) => {
        if (!post.scheduled_date) return false;
        const d = new Date(post.scheduled_date);
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
      })
      .sort((a, b) => {
        const tA = a.scheduled_time || "00:00";
        const tB = b.scheduled_time || "00:00";
        return tA.localeCompare(tB);
      });

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const getWorkflowStyle = (status: WorkflowStatus | undefined) => {
    return WORKFLOW_COLORS[status || "captions"];
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <h2 className="min-w-[180px] text-center text-lg font-semibold text-slate-900">{monthNames[month]} {year}</h2>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">Today</button>
        </div>
        <div className="flex items-center gap-3">
          <BoostedDownload projectId={projectId} projectName={projectName} />
          <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
            <button onClick={() => setViewMode("calendar")} title="Calendar View" className={`relative group px-3 py-1.5 text-sm font-medium transition-all ${viewMode === "calendar" ? "bg-pink-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Calendar</span>
            </button>
            <button onClick={() => setViewMode("list")} title="List View" className={`relative group px-3 py-1.5 text-sm font-medium transition-all ${viewMode === "list" ? "bg-pink-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">List</span>
            </button>
            <button onClick={() => setViewMode("grid")} title="Grid View" className={`relative group px-3 py-1.5 text-sm font-medium transition-all ${viewMode === "grid" ? "bg-pink-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Grid</span>
            </button>
          </div>
          <button
            onClick={() => { setSelectionMode(!selectionMode); if (selectionMode) clearSelection(); }}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
              selectionMode ? "border-pink-300 bg-pink-50 text-pink-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              {selectionMode && <path d="M9 12l2 2 4-4" />}
            </svg>
            {selectionMode ? "Cancel" : "Select"}
          </button>
          <button onClick={() => { setEditingPost(null); setShowPostModal(true); }} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-pink-500/25 hover:shadow-xl">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            New Post
          </button>
        </div>
      </div>

      {/* Selection Actions Bar */}
      {selectionMode && selectedPosts.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 p-3 text-white shadow-lg">
          <span className="text-sm font-medium">{selectedPosts.size} selected</span>
          <div className="h-4 w-px bg-white/30" />
          <button onClick={selectAllVisible} className="text-sm hover:underline">Select All ({filteredPosts.length})</button>
          <div className="flex-1" />
          <button onClick={() => setShowBulkEditModal(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-sm font-medium hover:bg-white/30">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            Edit
          </button>
          <button onClick={duplicateSelectedPosts} className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-sm font-medium hover:bg-white/30">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
            Duplicate
          </button>
          <button onClick={deleteSelectedPosts} className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/80 px-3 py-1.5 text-sm font-medium hover:bg-red-500">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
            Delete
          </button>
          <button onClick={clearSelection} className="rounded-lg p-1.5 hover:bg-white/20">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Filters Section */}
      <div className="mb-4 space-y-3">
        {/* Workflow Status Filter - Primary filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 mr-1">Status:</span>
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              statusFilter === "all" ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            All ({statusCounts.all})
          </button>
          {WORKFLOW_ORDER.map((status) => {
            const count = statusCounts[status];
            const colors = WORKFLOW_COLORS[status];
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                  statusFilter === status 
                    ? `${colors.bg} ${colors.text} ring-2 ring-offset-1 ring-current` 
                    : `bg-white text-slate-600 hover:bg-slate-100 border border-slate-200`
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                {WORKFLOW_LABELS[status]} ({count})
              </button>
            );
          })}
        </div>

        {/* Content Type Filter - Secondary filter (counts based on selected status) */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 mr-1">Format:</span>
          <button
            onClick={() => setContentTypeFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              contentTypeFilter === "all" ? "bg-cyan-500 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            All
          </button>
          {CONTENT_TYPES.map((type) => {
            const count = contentTypeCounts[type] || 0;
            return (
              <button
                key={type}
                onClick={() => setContentTypeFilter(type)}
                title={type}
                className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                  contentTypeFilter === type 
                    ? "bg-slate-700 text-white" 
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>{CONTENT_TYPE_ICONS[type]}</span>
                <span className="text-[11px]">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" /></div>
      ) : viewMode === "calendar" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="px-2 py-3 text-center text-xs font-medium text-slate-500">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const dayPosts = day ? getPostsForDay(day) : [];
              const isToday = day && new Date().getFullYear() === year && new Date().getMonth() === month && new Date().getDate() === day;
              return (
                <div key={idx} className={`min-h-[120px] border-b border-r border-slate-100 p-2 transition-all ${
                        day ? "hover:bg-slate-50" : "bg-slate-50/50"
                      } ${dragOverDay === day ? "bg-pink-50 ring-2 ring-inset ring-pink-400 scale-[1.02]" : ""} ${
                        isDragging ? "cursor-copy" : ""
                      }`}
                      onDragOver={(e) => { e.preventDefault(); if (day) setDragOverDay(day); }}
                      onDragLeave={() => setDragOverDay(null)}
                      onDrop={() => {
                        if (day && draggedPost) {
                          updatePostDate(draggedPost.id, new Date(year, month, day, 10, 0, 0));
                          setDraggedPost(null);
                        }
                        setDragOverDay(null);
                        setIsDragging(false);
                      }}>
                  {day && (
                    <>
                      <div className={`mb-1 text-sm ${isToday ? "flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 font-semibold text-white" : "font-medium text-slate-700"}`}>{day}</div>
                      <div className="space-y-1">
                        {dayPosts.slice(0, 3).map((post) => {
                          const style = getWorkflowStyle(post.workflow_status);
                          const isSelected = selectedPosts.has(post.id);
                          return (
                            <div key={post.id} draggable={!selectionMode}
                              onDragStart={() => { if (!selectionMode) { setDraggedPost(post); setIsDragging(true); } }}
                              onDragEnd={() => { setDraggedPost(null); setDragOverDay(null); setIsDragging(false); }}
                              onClick={(e) => {
                                if (selectionMode) {
                                  e.stopPropagation();
                                  togglePostSelection(post.id);
                                } else {
                                  setEditingPost(post);
                                  setShowPostModal(true);
                                }
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenu({ x: e.clientX, y: e.clientY, post });
                              }}
                              className={`relative cursor-grab active:cursor-grabbing rounded-lg overflow-hidden border ${style.border} ${style.bg} transition-all hover:scale-105 hover:shadow-md ${
                                draggedPost?.id === post.id ? "opacity-50 ring-2 ring-pink-400" : ""
                              } ${isSelected ? "ring-2 ring-pink-500 ring-offset-1" : ""} ${selectionMode ? "cursor-pointer" : ""}`}>
                              {/* Selection checkbox */}
                              {selectionMode && (
                                <div className={`absolute top-1 left-1 z-10 h-4 w-4 rounded border-2 flex items-center justify-center transition-all ${
                                  isSelected ? "bg-pink-500 border-pink-500" : "bg-white/80 border-slate-300"
                                }`}>
                                  {isSelected && (
                                    <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                                  )}
                                </div>
                              )}
                              {/* Image Preview or Placeholder */}
                              <div className="h-12 w-full overflow-hidden bg-slate-100 relative">
                                {post.image_asset_url ? (
                                  <img 
                                    src={getImageUrl(post.image_asset_url)} 
                                    alt="" 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      target.nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                ) : null}
                                {/* No image placeholder */}
                                <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 ${post.image_asset_url ? 'hidden' : ''}`}>
                                  <div className="flex flex-col items-center gap-0.5 text-slate-400">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <rect x="3" y="3" width="18" height="18" rx="2" />
                                      <circle cx="8.5" cy="8.5" r="1.5" />
                                      <path d="M21 15l-5-5L5 21" />
                                    </svg>
                                    <span className="text-[8px] font-medium">No image</span>
                                  </div>
                                </div>
                                {/* Broken image placeholder */}
                                {post.image_asset_url && (
                                  <div className="hidden absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
                                    <div className="flex flex-col items-center gap-0.5 text-orange-400">
                                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                        <line x1="12" y1="9" x2="12" y2="13" />
                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                      </svg>
                                      <span className="text-[8px] font-medium">Missing</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="px-2 py-1">
                                <div className="flex items-center gap-1 mb-0.5">
                                  {(post.platforms || []).slice(0, 2).map((p) => <span key={p} className="opacity-70 text-[10px]">{PLATFORM_ICONS[p.toLowerCase()]}</span>)}
                                  {post.content_type && (
                                    <span className="text-[9px] ml-auto" title={post.content_type}>
                                      {CONTENT_TYPE_ICONS[post.content_type] || "📝"}
                                    </span>
                                  )}
                                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} title={WORKFLOW_LABELS[post.workflow_status || "captions"]} />
                                </div>
                                <div className={`line-clamp-1 text-[10px] ${style.text}`}>{post.subject || post.caption?.slice(0, 50) || "No subject"}</div>
                              </div>
                            </div>
                          );
                        })}
                        {dayPosts.length > 3 && <div className="text-xs text-slate-500">+{dayPosts.length - 3} more</div>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-3">
          {filteredPosts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><p className="text-slate-500">No posts found. {statusFilter !== "all" && "Try changing the filter or create a new post!"}</p></div>
          ) : [...filteredPosts].sort((a, b) => {
            if (!a.scheduled_date && !b.scheduled_date) return 0;
            if (!a.scheduled_date) return 1;
            if (!b.scheduled_date) return -1;
            const dateA = a.scheduled_date + (a.scheduled_time ? "T" + a.scheduled_time : "T00:00");
            const dateB = b.scheduled_date + (b.scheduled_time ? "T" + b.scheduled_time : "T00:00");
            return dateA.localeCompare(dateB);
          }).map((post) => {
            const style = getWorkflowStyle(post.workflow_status);
            const isSelected = selectedPosts.has(post.id);
            return (
              <div key={post.id} 
                onClick={() => {
                  if (selectionMode) {
                    togglePostSelection(post.id);
                  } else {
                    setEditingPost(post);
                    setShowPostModal(true);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, post });
                }}
                className={`cursor-pointer rounded-2xl border ${style.border} bg-white overflow-hidden transition-all hover:shadow-lg ${
                  isSelected ? "ring-2 ring-pink-500 ring-offset-2" : ""
                }`}>
                <div className="flex relative">
                  {/* Selection checkbox for list view */}
                  {selectionMode && (
                    <div className={`absolute top-3 left-3 z-10 h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                      isSelected ? "bg-pink-500 border-pink-500" : "bg-white border-slate-300"
                    }`}>
                      {isSelected && (
                        <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                      )}
                    </div>
                  )}
                  {/* Image Preview or Placeholder */}
                  <div className="w-24 h-24 flex-shrink-0 overflow-hidden bg-slate-100 relative">
                    {post.image_asset_url ? (
                      <img 
                        src={getImageUrl(post.image_asset_url)} 
                        alt="" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    {/* No image placeholder */}
                    <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 ${post.image_asset_url ? 'hidden' : ''}`}>
                      <div className="flex flex-col items-center gap-1 text-slate-400">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                        <span className="text-[10px] font-medium">No image</span>
                      </div>
                    </div>
                    {/* Broken image placeholder */}
                    {post.image_asset_url && (
                      <div className="hidden absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
                        <div className="flex flex-col items-center gap-1 text-orange-400">
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                          <span className="text-[10px] font-medium">Missing</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {(post.platforms || []).map((p) => <span key={p} className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600">{PLATFORM_ICONS[p.toLowerCase()]}</span>)}
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                        {WORKFLOW_LABELS[post.workflow_status || "captions"]}
                      </span>
                      {post.post_type === "boosted" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          💰 Boosted
                        </span>
                      )}
                    </div>
                    <p className="mb-1 text-sm font-medium text-slate-900">{post.subject || "No subject"}</p>
                    <p className="mb-1 line-clamp-2 text-xs text-slate-600">{post.caption || "No caption"}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{post.scheduled_date ? new Date(post.scheduled_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "Not scheduled"}</span>
                      {post.scheduled_time && <span className="font-medium text-slate-600">{post.scheduled_time}</span>}
                      {post.content_type && <span className="text-slate-400">• {post.content_type}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
              .slice()
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
                const isSelected = selectedPosts.has(post.id);
                return (
                  <div
                    key={post.id}
                    onClick={() => {
                      if (selectionMode) {
                        togglePostSelection(post.id);
                      } else {
                        setEditingPost(post);
                        setShowPostModal(true);
                      }
                    }}
                    className={`bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group ${
                      isSelected ? "ring-2 ring-pink-500" : ""
                    }`}
                  >
                    {/* Image - 4:5 aspect ratio */}
                    <div className="aspect-[4/5] bg-slate-100 relative overflow-hidden">
                      {selectionMode && (
                        <div className={`absolute top-2 left-2 z-10 h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                          isSelected ? "bg-pink-500 border-pink-500" : "bg-white/80 border-slate-300"
                        }`}>
                          {isSelected && (
                            <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                          )}
                        </div>
                      )}
                      {post.image_asset_url ? (
                        <img src={getImageUrl(post.image_asset_url)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-12 h-12 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                          </svg>
                        </div>
                      )}
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
      ) : null}

      {/* Drag hint */}
      {isDragging && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-medium shadow-xl z-50 animate-bounce">
          Drop on a date to reschedule
        </div>
      )}

      {showPostModal && (
        <PostModal post={editingPost} projectId={projectId} availablePlatforms={platforms} onClose={() => { setShowPostModal(false); setEditingPost(null); }} onSaved={() => { setShowPostModal(false); setEditingPost(null); loadPosts(); }} />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-slate-200 py-2 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={() => setContextMenu(null)}
        >
          <button
            onClick={() => { setEditingPost(contextMenu.post); setShowPostModal(true); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            Edit Post
          </button>
          <button
            onClick={async () => { await duplicatePost(contextMenu.post); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
            Duplicate
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            onClick={() => { setSelectionMode(true); togglePostSelection(contextMenu.post.id); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12l2 2 4-4" /></svg>
            Select
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            onClick={async () => {
              if (confirm("Delete this post?")) {
                await supabaseClient.from("social_posts").delete().eq("id", contextMenu.post.id);
                setPosts((prev) => prev.filter((p) => p.id !== contextMenu.post.id));
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
            Delete
          </button>
        </div>
      )}

      {/* Click outside to close context menu */}
      {contextMenu && (
        <div className="fixed inset-0 z-[9998]" onClick={() => setContextMenu(null)} />
      )}

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <BulkEditModal
          selectedCount={selectedPosts.size}
          onClose={() => setShowBulkEditModal(false)}
          onSave={bulkUpdatePosts}
        />
      )}
    </div>
  );
}

function BulkEditModal({
  selectedCount,
  onClose,
  onSave,
}: {
  selectedCount: number;
  onClose: () => void;
  onSave: (updates: { scheduled_date?: string; workflow_status?: WorkflowStatus }) => void;
}) {
  const [scheduledDate, setScheduledDate] = useState("");
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | "">("");

  const handleSave = () => {
    const updates: { scheduled_date?: string; workflow_status?: WorkflowStatus } = {};
    if (scheduledDate) updates.scheduled_date = new Date(scheduledDate).toISOString();
    if (workflowStatus) updates.workflow_status = workflowStatus;
    if (Object.keys(updates).length > 0) {
      onSave(updates);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Edit {selectedCount} Posts</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-500">Leave fields empty to keep current values.</p>
          
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Scheduled Date</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Workflow Status</label>
            <select
              value={workflowStatus}
              onChange={(e) => setWorkflowStatus(e.target.value as WorkflowStatus | "")}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
            >
              <option value="">Keep current status</option>
              <option value="production">Production</option>
              <option value="creatives_approval">Creative Development</option>
              <option value="creative_approval">Creative Approval</option>
              <option value="captions">Copywriting</option>
              <option value="final_approval">Final Approval</option>
              <option value="for_publishing">Scheduled</option>
              <option value="published">Live</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 p-5">
          <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!scheduledDate && !workflowStatus}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-pink-500/25 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Update Posts
          </button>
        </div>
      </div>
    </div>
  );
}
