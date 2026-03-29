"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type IGAccount = {
  id: string;
  username: string;
  profile_pic_url: string | null;
  followers_count: number;
  engagement_rate: number;
  status: string;
  plan_type: string;
};

type GrowthMetric = {
  date: string;
  followers_gained: number;
  followers_lost: number;
  net_followers: number;
  engagement_count: number;
};

type FollowerSource = {
  source_type: string;
  follower_count: number;
};

type Props = {
  accounts: IGAccount[];
};

export default function GrowthDashboard({ accounts }: Props) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<GrowthMetric[]>([]);
  const [sources, setSources] = useState<FollowerSource[]>([]);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const [loading, setLoading] = useState(false);
  const [accountNiche, setAccountNiche] = useState<string | null>(null);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts]);

  useEffect(() => {
    if (selectedAccountId) {
      loadMetrics();
    }
  }, [selectedAccountId, timeRange]);

  async function loadMetrics() {
    if (!selectedAccountId) return;
    setLoading(true);

    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [metricsRes, sourcesRes, accountRes] = await Promise.all([
      supabaseClient
        .from("ig_growth_metrics")
        .select("*")
        .eq("account_id", selectedAccountId)
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date", { ascending: true }),
      supabaseClient
        .from("ig_follower_sources")
        .select("source_type, follower_count")
        .eq("account_id", selectedAccountId)
        .gte("date", startDate.toISOString().split("T")[0]),
      supabaseClient
        .from("ig_accounts")
        .select("niche")
        .eq("id", selectedAccountId)
        .single(),
    ]);

    setMetrics(metricsRes.data || []);
    setSources(sourcesRes.data || []);
    setAccountNiche(accountRes.data?.niche || null);
    setLoading(false);
  }

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const totalGained = metrics.reduce((sum, m) => sum + m.followers_gained, 0);
  const totalLost = metrics.reduce((sum, m) => sum + m.followers_lost, 0);
  const netGrowth = metrics.reduce((sum, m) => sum + m.net_followers, 0);
  const avgEngagement = metrics.length > 0
    ? (metrics.reduce((sum, m) => sum + m.engagement_count, 0) / metrics.length).toFixed(0)
    : "0";

  // Use actual metrics data only
  const chartData = metrics;
  const maxValue = Math.max(...chartData.map(d => d.followers_gained), 1);

  // Aggregate follower sources from database
  const sourceAggregates = sources.reduce((acc, s) => {
    acc[s.source_type] = (acc[s.source_type] || 0) + s.follower_count;
    return acc;
  }, {} as Record<string, number>);

  const sourceData = Object.entries(sourceAggregates).map(([type, count]) => ({ type, count }));
  const totalSourceCount = sourceData.reduce((sum, s) => sum + s.count, 0);

  const SOURCE_COLORS: Record<string, string> = {
    hashtag: "bg-purple-500",
    explore: "bg-pink-500",
    reels: "bg-indigo-500",
    profile: "bg-amber-500",
    stories: "bg-emerald-500",
    direct: "bg-blue-500",
    other: "bg-slate-400",
  };

  return (
    <div className="space-y-6">
      {/* Account Selector & Time Range */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Account:</label>
          <select
            value={selectedAccountId || ""}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-black focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                @{account.username}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 p-1">
          {(["7d", "30d", "90d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                timeRange === range
                  ? "bg-purple-100 text-purple-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "90 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Followers Gained</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">+{totalGained.toLocaleString()}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
              <svg className="h-6 w-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 6l-9.5 9.5-5-5L1 18" />
                <path d="M17 6h6v6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Followers Lost</p>
              <p className="text-2xl font-bold text-red-600 mt-1">-{totalLost.toLocaleString()}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
              <svg className="h-6 w-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 18l-9.5-9.5-5 5L1 6" />
                <path d="M17 18h6v-6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Net Growth</p>
              <p className={`text-2xl font-bold mt-1 ${netGrowth >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {netGrowth >= 0 ? "+" : ""}{netGrowth.toLocaleString()}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
              <svg className="h-6 w-6 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20V10" />
                <path d="M18 20V4" />
                <path d="M6 20v-4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Avg Engagement</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{avgEngagement}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
              <svg className="h-6 w-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Growth Chart */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Follower Growth</h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-slate-600">Gained</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <span className="text-slate-600">Lost</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <svg className="h-12 w-12 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
            </svg>
            <p className="text-sm">No growth data available yet</p>
            <p className="text-xs mt-1">Data will appear as metrics are tracked</p>
          </div>
        ) : (
          <div className="h-64">
            {/* Simple bar chart */}
            <div className="flex items-end justify-between h-full gap-1">
              {chartData.slice(-30).map((data, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all hover:from-emerald-600 hover:to-emerald-500"
                    style={{ height: `${(data.followers_gained / maxValue) * 100}%`, minHeight: "4px" }}
                    title={`${data.date}: +${data.followers_gained} followers`}
                  />
                  {data.followers_lost > 0 && (
                    <div
                      className="w-full rounded-b bg-red-400"
                      style={{ height: `${(data.followers_lost / maxValue) * 30}%`, minHeight: "2px" }}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-slate-400">
              <span>{chartData[0]?.date}</span>
              <span>{chartData[chartData.length - 1]?.date}</span>
            </div>
          </div>
        )}
      </div>

      {/* Engagement Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Follower Sources</h3>
          {sourceData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <svg className="h-10 w-10 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
              </svg>
              <p className="text-sm">No source data available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sourceData.sort((a, b) => b.count - a.count).map((item) => {
                const percent = totalSourceCount > 0 ? (item.count / totalSourceCount) * 100 : 0;
                return (
                  <div key={item.type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700 capitalize">{item.type}</span>
                      <span className="text-sm font-semibold text-slate-900">{percent.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full ${SOURCE_COLORS[item.type] || "bg-slate-400"}`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Growth Summary</h3>
          {metrics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <svg className="h-10 w-10 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M23 6l-9.5 9.5-5-5L1 18" />
              </svg>
              <p className="text-sm">No metrics data available</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📈</span>
                  <span className="text-sm font-medium text-slate-700">Best Day</span>
                </div>
                <span className="text-sm font-bold text-emerald-600">
                  +{Math.max(...metrics.map(m => m.followers_gained))} followers
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📊</span>
                  <span className="text-sm font-medium text-slate-700">Avg Daily Growth</span>
                </div>
                <span className="text-sm font-bold text-purple-600">
                  +{(totalGained / metrics.length).toFixed(0)} followers
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50">
                <div className="flex items-center gap-3">
                  <span className="text-xl">💬</span>
                  <span className="text-sm font-medium text-slate-700">Avg Engagement</span>
                </div>
                <span className="text-sm font-bold text-amber-600">
                  {avgEngagement} interactions/day
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-pink-50">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎯</span>
                  <span className="text-sm font-medium text-slate-700">Net Growth Rate</span>
                </div>
                <span className="text-sm font-bold text-pink-600">
                  {totalGained > 0 ? ((netGrowth / totalGained) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Insights */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
              <path d="M12 2a10 10 0 0 1 10 10" />
              <circle cx="12" cy="12" r="6" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Growth Insights</h3>
            <p className="text-white/80 text-sm mt-1">
              {accountNiche ? `Based on your ${accountNiche} niche` : "Based on your account data"}
            </p>
            <ul className="mt-4 space-y-2">
              {metrics.length > 0 ? (
                <>
                  <li className="flex items-start gap-2 text-sm">
                    <svg className="h-5 w-5 flex-shrink-0 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <span>
                      {netGrowth >= 0 
                        ? `You gained ${netGrowth.toLocaleString()} net followers in the selected period`
                        : `You lost ${Math.abs(netGrowth).toLocaleString()} followers - consider refreshing your content strategy`
                      }
                    </span>
                  </li>
                  {sourceData.length > 0 && (
                    <li className="flex items-start gap-2 text-sm">
                      <svg className="h-5 w-5 flex-shrink-0 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      <span>
                        Top source: {sourceData[0]?.type} ({((sourceData[0]?.count || 0) / totalSourceCount * 100).toFixed(0)}% of followers)
                      </span>
                    </li>
                  )}
                  <li className="flex items-start gap-2 text-sm">
                    <svg className="h-5 w-5 flex-shrink-0 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <span>
                      Average daily engagement: {avgEngagement} interactions
                    </span>
                  </li>
                </>
              ) : (
                <li className="flex items-start gap-2 text-sm">
                  <svg className="h-5 w-5 flex-shrink-0 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <span>Start tracking metrics to see personalized insights and recommendations</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
