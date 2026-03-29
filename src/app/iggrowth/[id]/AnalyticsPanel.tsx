"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type GrowthMetric = {
  id: string;
  date: string;
  followers_gained: number;
  followers_lost: number;
  net_followers: number;
  engagement_count: number;
  profile_visits: number;
  reach: number;
  impressions: number;
  website_clicks: number;
};

type FollowerSource = {
  source_type: string;
  source_value: string | null;
  follower_count: number;
};

type Props = {
  accountId: string;
};

export default function AnalyticsPanel({ accountId }: Props) {
  const [metrics, setMetrics] = useState<GrowthMetric[]>([]);
  const [sources, setSources] = useState<FollowerSource[]>([]);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [accountId, timeRange]);

  async function loadData() {
    setLoading(true);
    
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [metricsRes, sourcesRes] = await Promise.all([
      supabaseClient
        .from("ig_growth_metrics")
        .select("*")
        .eq("account_id", accountId)
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date", { ascending: true }),
      supabaseClient
        .from("ig_follower_sources")
        .select("source_type, source_value, follower_count")
        .eq("account_id", accountId)
        .gte("date", startDate.toISOString().split("T")[0]),
    ]);

    setMetrics(metricsRes.data || []);
    setSources(sourcesRes.data || []);
    setLoading(false);
  }

  // Calculate totals
  const totalGained = metrics.reduce((sum, m) => sum + m.followers_gained, 0);
  const totalLost = metrics.reduce((sum, m) => sum + m.followers_lost, 0);
  const netGrowth = metrics.reduce((sum, m) => sum + m.net_followers, 0);
  const totalEngagement = metrics.reduce((sum, m) => sum + m.engagement_count, 0);
  const totalReach = metrics.reduce((sum, m) => sum + m.reach, 0);
  const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0);
  const totalProfileVisits = metrics.reduce((sum, m) => sum + m.profile_visits, 0);
  const totalWebsiteClicks = metrics.reduce((sum, m) => sum + m.website_clicks, 0);

  // Use actual metrics data only - no sample/hardcoded data
  const chartData = metrics;
  const maxFollowers = chartData.length > 0 ? Math.max(...chartData.map(d => d.followers_gained), 1) : 1;
  const maxEngagement = chartData.length > 0 ? Math.max(...chartData.map(d => d.engagement_count), 1) : 1;

  // Aggregate sources
  const sourceAggregates = sources.reduce((acc, s) => {
    acc[s.source_type] = (acc[s.source_type] || 0) + s.follower_count;
    return acc;
  }, {} as Record<string, number>);

  // Use actual source data only - no hardcoded fallback
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Analytics & Insights</h2>
          <p className="text-sm text-slate-500 mt-1">Track your Instagram growth performance</p>
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                  <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 6l-9.5 9.5-5-5L1 18" />
                  </svg>
                </div>
                <span className="text-xs text-slate-500">Gained</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">+{totalGained.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                  <svg className="h-4 w-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 18l-9.5-9.5-5 5L1 6" />
                  </svg>
                </div>
                <span className="text-xs text-slate-500">Lost</span>
              </div>
              <p className="text-2xl font-bold text-red-600">-{totalLost.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                  <svg className="h-4 w-4 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <span className="text-xs text-slate-500">Net Growth</span>
              </div>
              <p className={`text-2xl font-bold ${netGrowth >= 0 ? "text-purple-600" : "text-red-600"}`}>
                {netGrowth >= 0 ? "+" : ""}{netGrowth.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                  <svg className="h-4 w-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
                <span className="text-xs text-slate-500">Engagement</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">{totalEngagement.toLocaleString()}</p>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4">
              <p className="text-xs text-blue-600 font-medium">Total Reach</p>
              <p className="text-xl font-bold text-blue-700 mt-1">{totalReach.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 p-4">
              <p className="text-xs text-pink-600 font-medium">Impressions</p>
              <p className="text-xl font-bold text-pink-700 mt-1">{totalImpressions.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-4">
              <p className="text-xs text-emerald-600 font-medium">Profile Visits</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">{totalProfileVisits.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 p-4">
              <p className="text-xs text-violet-600 font-medium">Website Clicks</p>
              <p className="text-xl font-bold text-violet-700 mt-1">{totalWebsiteClicks.toLocaleString()}</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Follower Growth Chart */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Follower Growth</h3>
              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <svg className="h-10 w-10 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
                  </svg>
                  <p className="text-sm">No growth data available</p>
                </div>
              ) : (
                <>
                  <div className="h-48">
                    <div className="flex items-end justify-between h-full gap-0.5">
                      {chartData.slice(-30).map((data, idx) => (
                        <div
                          key={idx}
                          className="flex-1 rounded-t bg-gradient-to-t from-purple-500 to-pink-400 transition-all hover:from-purple-600 hover:to-pink-500 cursor-pointer"
                          style={{ height: `${(data.followers_gained / maxFollowers) * 100}%`, minHeight: "4px" }}
                          title={`${data.date}: +${data.followers_gained} followers`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-slate-400">
                    <span>{chartData[0]?.date}</span>
                    <span>{chartData[chartData.length - 1]?.date}</span>
                  </div>
                </>
              )}
            </div>

            {/* Engagement Chart */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Daily Engagement</h3>
              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <svg className="h-10 w-10 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <p className="text-sm">No engagement data available</p>
                </div>
              ) : (
                <>
                  <div className="h-48">
                    <div className="flex items-end justify-between h-full gap-0.5">
                      {chartData.slice(-30).map((data, idx) => (
                        <div
                          key={idx}
                          className="flex-1 rounded-t bg-gradient-to-t from-amber-500 to-orange-400 transition-all hover:from-amber-600 hover:to-orange-500 cursor-pointer"
                          style={{ height: `${(data.engagement_count / maxEngagement) * 100}%`, minHeight: "4px" }}
                          title={`${data.date}: ${data.engagement_count} engagements`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-slate-400">
                    <span>{chartData[0]?.date}</span>
                    <span>{chartData[chartData.length - 1]?.date}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Follower Sources */}
          <div className="rounded-2xl bg-white border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Follower Sources</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <div className="space-y-3">
                {sourceData.sort((a, b) => b.count - a.count).map((source) => {
                  const percent = totalSourceCount > 0 ? (source.count / totalSourceCount) * 100 : 0;
                  return (
                    <div key={source.type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-700 capitalize">{source.type}</span>
                        <span className="text-sm font-semibold text-slate-900">{percent.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${SOURCE_COLORS[source.type] || "bg-slate-400"}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5">
                <h4 className="font-medium text-slate-900 mb-3">Key Insights</h4>
                {sourceData.length === 0 && metrics.length === 0 ? (
                  <p className="text-sm text-slate-500">Start tracking data to see insights</p>
                ) : (
                  <ul className="space-y-2 text-sm text-slate-600">
                    {sourceData.length > 0 && sourceData.sort((a, b) => b.count - a.count).slice(0, 2).map((source, idx) => (
                      <li key={source.type} className="flex items-start gap-2">
                        <svg className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        <span className="capitalize">
                          {source.type} drives {source.count} followers 
                          ({totalSourceCount > 0 ? ((source.count / totalSourceCount) * 100).toFixed(0) : 0}%)
                        </span>
                      </li>
                    ))}
                    {metrics.length > 0 && (
                      <>
                        <li className="flex items-start gap-2">
                          <svg className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          <span>
                            Average daily growth: +{(totalGained / metrics.length).toFixed(0)} followers
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <svg className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 6l-9.5 9.5-5-5L1 18" />
                          </svg>
                          <span>
                            Net growth rate: {totalGained > 0 ? ((netGrowth / totalGained) * 100).toFixed(1) : 0}%
                          </span>
                        </li>
                      </>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
