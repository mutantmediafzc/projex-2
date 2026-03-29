"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type Activity = {
  id: string;
  activity_type: string;
  description: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
};

type Props = {
  accountId: string;
};

const ACTIVITY_ICONS: Record<string, { icon: string; bg: string; text: string }> = {
  follower_gained: { icon: "👤+", bg: "bg-emerald-100", text: "text-emerald-700" },
  follower_lost: { icon: "👤-", bg: "bg-red-100", text: "text-red-700" },
  post_published: { icon: "📸", bg: "bg-purple-100", text: "text-purple-700" },
  reel_published: { icon: "🎬", bg: "bg-pink-100", text: "text-pink-700" },
  story_published: { icon: "📱", bg: "bg-blue-100", text: "text-blue-700" },
  engagement: { icon: "❤️", bg: "bg-rose-100", text: "text-rose-700" },
  comment: { icon: "💬", bg: "bg-amber-100", text: "text-amber-700" },
  target_added: { icon: "🎯", bg: "bg-indigo-100", text: "text-indigo-700" },
  campaign_started: { icon: "🚀", bg: "bg-emerald-100", text: "text-emerald-700" },
  campaign_completed: { icon: "✅", bg: "bg-green-100", text: "text-green-700" },
  milestone: { icon: "🏆", bg: "bg-amber-100", text: "text-amber-700" },
  status_change: { icon: "🔄", bg: "bg-slate-100", text: "text-slate-700" },
  default: { icon: "📋", bg: "bg-slate-100", text: "text-slate-600" },
};

export default function ActivityLog({ accountId }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadActivities();
  }, [accountId]);

  async function loadActivities() {
    setLoading(true);
    const { data } = await supabaseClient
      .from("ig_activity_log")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(100);
    
    setActivities(data || []);
    setLoading(false);
  }

  // Use actual activities only - no hardcoded sample data
  const filteredActivities = filter === "all" 
    ? activities 
    : activities.filter(a => a.activity_type === filter);

  const activityTypes = [...new Set(activities.map(a => a.activity_type))];

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  }

  function getActivityStyle(type: string) {
    return ACTIVITY_ICONS[type] || ACTIVITY_ICONS.default;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Activity Log</h2>
          <p className="text-sm text-slate-500 mt-1">Track all account activities and events</p>
        </div>
        <button
          onClick={loadActivities}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
            filter === "all"
              ? "bg-purple-100 text-purple-700"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All Activities
        </button>
        {activityTypes.map((type) => {
          const style = getActivityStyle(type);
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filter === type
                  ? `${style.bg} ${style.text}`
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          );
        })}
      </div>

      {/* Activity List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <svg className="h-8 w-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No activities yet</h3>
          <p className="mt-1 text-sm text-slate-500">Activities will appear here as your account grows</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredActivities.map((activity, idx) => {
              const style = getActivityStyle(activity.activity_type);
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.bg} flex-shrink-0`}>
                    <span className="text-lg">{style.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900">{activity.description || activity.activity_type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatTime(activity.created_at)}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}>
                    {activity.activity_type.replace(/_/g, " ")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Load More */}
      {filteredActivities.length >= 20 && (
        <div className="text-center">
          <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
            Load more activities
          </button>
        </div>
      )}

      {/* Stats Summary */}
      {activities.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {activities.filter(a => a.activity_type === "follower_gained").length}
            </p>
            <p className="text-xs text-emerald-700 mt-1">Growth Events</p>
          </div>
          <div className="rounded-xl bg-purple-50 border border-purple-100 p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {activities.filter(a => ["post_published", "reel_published", "story_published"].includes(a.activity_type)).length}
            </p>
            <p className="text-xs text-purple-700 mt-1">Content Posted</p>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {activities.filter(a => a.activity_type === "engagement").length}
            </p>
            <p className="text-xs text-amber-700 mt-1">Engagement Spikes</p>
          </div>
          <div className="rounded-xl bg-pink-50 border border-pink-100 p-4 text-center">
            <p className="text-2xl font-bold text-pink-600">
              {activities.filter(a => a.activity_type === "milestone").length}
            </p>
            <p className="text-xs text-pink-700 mt-1">Milestones</p>
          </div>
        </div>
      )}
    </div>
  );
}
