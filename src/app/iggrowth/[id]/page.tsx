"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";
import TargetingPanel from "./TargetingPanel";
import CampaignsPanel from "./CampaignsPanel";
import AnalyticsPanel from "./AnalyticsPanel";
import ActivityLog from "./ActivityLog";
import OperatorDashboard from "./OperatorDashboard";
import InfluencerPanel from "./InfluencerPanel";

type IGAccount = {
  id: string;
  username: string;
  profile_url: string | null;
  profile_pic_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  engagement_rate: number;
  niche: string | null;
  status: "active" | "paused" | "pending" | "inactive";
  plan_type: "core" | "elite";
  target_followers_monthly: number;
  company: { id: string; name: string; logo_url: string | null } | null;
  created_at: string;
};

type Tab = "overview" | "targeting" | "campaigns" | "operators" | "influencers" | "analytics" | "activity";

export default function IGAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [account, setAccount] = useState<IGAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editBio, setEditBio] = useState("");
  const [editNiche, setEditNiche] = useState("");
  const [editFollowers, setEditFollowers] = useState(0);
  const [editFollowing, setEditFollowing] = useState(0);
  const [editPosts, setEditPosts] = useState(0);
  const [editEngagement, setEditEngagement] = useState(0);

  useEffect(() => {
    loadAccount();
  }, [id]);

  async function loadAccount() {
    setLoading(true);
    const { data } = await supabaseClient
      .from("ig_accounts")
      .select(`*, company:companies(id, name, logo_url)`)
      .eq("id", id)
      .single();

    if (data) {
      setAccount(data);
      setEditBio(data.bio || "");
      setEditNiche(data.niche || "");
      setEditFollowers(data.followers_count);
      setEditFollowing(data.following_count);
      setEditPosts(data.posts_count);
      setEditEngagement(data.engagement_rate);
    }
    setLoading(false);
  }

  async function handleSaveProfile() {
    if (!account) return;
    setSaving(true);

    await supabaseClient
      .from("ig_accounts")
      .update({
        bio: editBio,
        niche: editNiche,
        followers_count: editFollowers,
        following_count: editFollowing,
        posts_count: editPosts,
        engagement_rate: editEngagement,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    await loadAccount();
    setEditing(false);
    setSaving(false);
  }

  async function updateStatus(newStatus: IGAccount["status"]) {
    if (!account) return;
    await supabaseClient
      .from("ig_accounts")
      .update({ status: newStatus })
      .eq("id", account.id);
    loadAccount();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/30 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900">Account not found</h2>
          <Link href="/iggrowth" className="mt-4 inline-block text-purple-600 hover:underline">
            ← Back to IG Growth
          </Link>
        </div>
      </div>
    );
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "overview",
      label: "Overview",
      icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
    },
    {
      key: "targeting",
      label: "Targeting",
      icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
    },
    {
      key: "campaigns",
      label: "Campaigns",
      icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
    },
    {
      key: "operators",
      label: "Operators",
      icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    },
    {
      key: "influencers",
      label: "Influencers",
      icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>,
    },
    {
      key: "analytics",
      label: "Analytics",
      icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>,
    },
    {
      key: "activity",
      label: "Activity",
      icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg>,
    },
  ];

  const STATUS_STYLES = {
    active: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
    paused: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
    pending: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
    inactive: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  };
  const statusStyle = STATUS_STYLES[account.status];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/30">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/iggrowth" className="flex items-center gap-2 text-slate-500 hover:text-slate-700">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="flex items-center gap-3">
                {account.profile_pic_url ? (
                  <img src={account.profile_pic_url} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-white shadow" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 text-lg font-bold text-white shadow">
                    {account.username[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-slate-900">@{account.username}</h1>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                      {account.status}
                    </span>
                    {account.plan_type === "elite" && (
                      <span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        ELITE
                      </span>
                    )}
                  </div>
                  {account.company && (
                    <p className="text-xs text-slate-500">{account.company.name}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {account.status === "active" ? (
                <button
                  onClick={() => updateStatus("paused")}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
                  </svg>
                  Pause
                </button>
              ) : (
                <button
                  onClick={() => updateStatus("active")}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Activate
                </button>
              )}
              <a
                href={account.profile_url || `https://instagram.com/${account.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 px-4 py-1.5 text-xs font-semibold text-white shadow"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <path d="M15 3h6v6" />
                  <path d="M10 14L21 3" />
                </svg>
                View Profile
              </a>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 -mb-px overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl bg-white border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Profile Info</h3>
                  <button
                    onClick={() => setEditing(!editing)}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    {editing ? "Cancel" : "Edit"}
                  </button>
                </div>

                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Bio</label>
                      <textarea
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-black focus:border-purple-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Niche</label>
                      <input
                        type="text"
                        value={editNiche}
                        onChange={(e) => setEditNiche(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-black focus:border-purple-400 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Followers</label>
                        <input
                          type="number"
                          value={editFollowers}
                          onChange={(e) => setEditFollowers(parseInt(e.target.value) || 0)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-black focus:border-purple-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Following</label>
                        <input
                          type="number"
                          value={editFollowing}
                          onChange={(e) => setEditFollowing(parseInt(e.target.value) || 0)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-black focus:border-purple-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Posts</label>
                        <input
                          type="number"
                          value={editPosts}
                          onChange={(e) => setEditPosts(parseInt(e.target.value) || 0)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-black focus:border-purple-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Engagement %</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editEngagement}
                          onChange={(e) => setEditEngagement(parseFloat(e.target.value) || 0)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-black focus:border-purple-400 focus:outline-none"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="w-full rounded-lg bg-purple-600 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-6">
                      {account.profile_pic_url ? (
                        <img src={account.profile_pic_url} alt="" className="h-20 w-20 rounded-full object-cover border-4 border-white shadow-lg mx-auto" />
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg mx-auto">
                          {account.username[0].toUpperCase()}
                        </div>
                      )}
                      <h4 className="mt-3 font-semibold text-slate-900">@{account.username}</h4>
                      {account.niche && (
                        <span className="inline-block mt-1 rounded-full bg-purple-100 px-3 py-0.5 text-xs font-medium text-purple-700">
                          {account.niche}
                        </span>
                      )}
                    </div>

                    {account.bio && (
                      <p className="text-sm text-slate-600 text-center mb-4">{account.bio}</p>
                    )}

                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                      <div className="text-center">
                        <p className="text-xl font-bold text-slate-900">{account.posts_count.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 uppercase">Posts</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-slate-900">{account.followers_count.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 uppercase">Followers</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-slate-900">{account.following_count.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 uppercase">Following</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Plan Info */}
              <div className="mt-4 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-500 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/80">Current Plan</p>
                    <p className="text-2xl font-bold mt-1">{account.plan_type === "elite" ? "Elite" : "Core"}</p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20">
                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/20">
                  <p className="text-sm text-white/80">Monthly Target</p>
                  <p className="text-lg font-semibold mt-1">
                    +{account.target_followers_monthly.toLocaleString()} followers
                  </p>
                </div>
              </div>
            </div>

            {/* Stats & Quick Actions */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl bg-white border border-slate-200 p-4">
                  <p className="text-xs text-slate-500 font-medium">This Week</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">+0</p>
                  <p className="text-[10px] text-slate-400 mt-1">new followers</p>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 p-4">
                  <p className="text-xs text-slate-500 font-medium">This Month</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">+0</p>
                  <p className="text-[10px] text-slate-400 mt-1">new followers</p>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 p-4">
                  <p className="text-xs text-slate-500 font-medium">Engagement</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">{account.engagement_rate}%</p>
                  <p className="text-[10px] text-slate-400 mt-1">avg rate</p>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 p-4">
                  <p className="text-xs text-slate-500 font-medium">Growth Rate</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">0%</p>
                  <p className="text-[10px] text-slate-400 mt-1">this month</p>
                </div>
              </div>

              {/* Growth Progress */}
              <div className="rounded-2xl bg-white border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Monthly Growth Progress</h3>
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">Progress</span>
                    <span className="text-sm font-semibold text-slate-900">0 / {account.target_followers_monthly.toLocaleString()}</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500" style={{ width: "0%" }} />
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  {account.target_followers_monthly.toLocaleString()} followers remaining to reach your monthly goal
                </p>
              </div>

              {/* Quick Actions */}
              <div className="rounded-2xl bg-white border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setActiveTab("targeting")}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:bg-purple-50 hover:border-purple-200 transition-all"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                      <svg className="h-5 w-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="6" />
                        <circle cx="12" cy="12" r="2" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-900">Add Targeting</p>
                      <p className="text-xs text-slate-500">Configure growth targets</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab("campaigns")}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:bg-pink-50 hover:border-pink-200 transition-all"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-100">
                      <svg className="h-5 w-5 text-pink-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-900">Create Campaign</p>
                      <p className="text-xs text-slate-500">Launch growth campaign</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab("analytics")}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:bg-emerald-50 hover:border-emerald-200 transition-all"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                      <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 3v18h18" />
                        <path d="M18 17V9" />
                        <path d="M13 17V5" />
                        <path d="M8 17v-3" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-900">View Analytics</p>
                      <p className="text-xs text-slate-500">Detailed insights</p>
                    </div>
                  </button>
                  <a
                    href={account.profile_url || `https://instagram.com/${account.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:bg-indigo-50 hover:border-indigo-200 transition-all"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                      <svg className="h-5 w-5 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-900">Open Instagram</p>
                      <p className="text-xs text-slate-500">View profile</p>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "targeting" && <TargetingPanel accountId={account.id} />}
        {activeTab === "campaigns" && <CampaignsPanel accountId={account.id} />}
        {activeTab === "operators" && <OperatorDashboard accountId={account.id} />}
        {activeTab === "influencers" && <InfluencerPanel accountId={account.id} />}
        {activeTab === "analytics" && <AnalyticsPanel accountId={account.id} />}
        {activeTab === "activity" && <ActivityLog accountId={account.id} />}
      </main>
    </div>
  );
}
