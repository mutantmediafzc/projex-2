"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import Link from "next/link";

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

type Props = {
  account: IGAccount;
  onClick: () => void;
  onRefresh: () => void;
};

const STATUS_STYLES = {
  active: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  paused: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  pending: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  inactive: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
};

export default function AccountCard({ account, onClick, onRefresh }: Props) {
  const [updating, setUpdating] = useState(false);
  const style = STATUS_STYLES[account.status];

  async function toggleStatus() {
    setUpdating(true);
    const newStatus = account.status === "active" ? "paused" : "active";
    await supabaseClient
      .from("ig_accounts")
      .update({ status: newStatus })
      .eq("id", account.id);
    setUpdating(false);
    onRefresh();
  }

  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-lg hover:border-purple-200">
      {/* Plan Badge */}
      {account.plan_type === "elite" && (
        <div className="absolute -top-2 -right-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-lg">
          ELITE
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        {/* Profile Picture */}
        <div className="relative">
          {account.profile_pic_url ? (
            <img
              src={account.profile_pic_url}
              alt={account.username}
              className="h-14 w-14 rounded-full object-cover border-2 border-white shadow-lg"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 text-xl font-bold text-white shadow-lg">
              {account.username[0].toUpperCase()}
            </div>
          )}
          <div className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full ${style.dot} border-2 border-white`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 truncate">@{account.username}</h3>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
              {account.status}
            </span>
          </div>
          {account.company && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{account.company.name}</p>
          )}
          {account.niche && (
            <p className="text-[10px] text-purple-600 font-medium mt-1">{account.niche}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-100">
        <div className="text-center">
          <p className="text-lg font-bold text-slate-900">{account.followers_count.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Followers</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-slate-900">{account.following_count.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Following</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-slate-900">{account.engagement_rate}%</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Engagement</p>
        </div>
      </div>

      {/* Growth Target */}
      <div className="mt-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-purple-700">Monthly Target</span>
          <span className="text-xs font-bold text-purple-700">
            +{account.target_followers_monthly.toLocaleString()} followers
          </span>
        </div>
        <div className="h-2 rounded-full bg-purple-100 overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
            style={{ width: "0%" }}
          />
        </div>
        <p className="text-[10px] text-purple-600 mt-1.5">0 followers gained this month</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4">
        <Link
          href={`/iggrowth/${account.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-500/20 transition-all hover:shadow-xl"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
          </svg>
          View Dashboard
        </Link>
        <button
          onClick={toggleStatus}
          disabled={updating}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
            account.status === "active"
              ? "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"
              : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
          }`}
          title={account.status === "active" ? "Pause" : "Activate"}
        >
          {updating ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : account.status === "active" ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <a
          href={account.profile_url || `https://instagram.com/${account.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-purple-200 hover:bg-purple-50 hover:text-purple-600"
          title="View on Instagram"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <path d="M15 3h6v6" />
            <path d="M10 14L21 3" />
          </svg>
        </a>
      </div>
    </div>
  );
}
