"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabaseClient";
import { useUserRole } from "@/app/profile/hooks/useUserRole";
import RequireAdmin from "@/components/RequireAdmin";
import ScorecardModal from "./ScorecardModal";

const QUARTERS = [
  { value: "Q1", label: "Q1 (Jan–Mar)", start: "01-01", end: "03-31" },
  { value: "Q2", label: "Q2 (Apr–Jun)", start: "04-01", end: "06-30" },
  { value: "Q3", label: "Q3 (Jul–Sep)", start: "07-01", end: "09-30" },
  { value: "Q4", label: "Q4 (Oct–Dec)", start: "10-01", end: "12-31" },
];

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_Q = (() => {
  const m = new Date().getMonth();
  if (m < 3) return "Q1";
  if (m < 6) return "Q2";
  if (m < 9) return "Q3";
  return "Q4";
})();

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  designation: string | null;
  avatar_url: string | null;
};

type Scorecard = {
  id: string;
  user_id: string;
  quarter: string;
  attendance_score: number;
  late_count: number;
  absent_count: number;
  delivery_score: number;
  tasks_total: number;
  tasks_on_time: number;
  on_time_pct: number;
  quality_score: number;
  satisfaction_score: number;
  revenue_score: number;
  performance_score: number;
  total_score: number;
  rating: string;
  consequence: string;
  admin_notes: string | null;
  role_addon_notes: string | null;
  is_finalized: boolean;
};

type SortKey = "name" | "score_desc" | "score_asc" | "rating";
type RatingFilter = "all" | "strong" | "stable" | "under" | "action";
type StatusFilter = "all" | "reviewed" | "pending";

function ratingColor(rating: string) {
  if (rating?.startsWith("Strong")) return "text-emerald-700 bg-emerald-100 border-emerald-200";
  if (rating?.startsWith("Stable")) return "text-sky-700 bg-sky-100 border-sky-200";
  if (rating?.startsWith("Under")) return "text-amber-700 bg-amber-100 border-amber-200";
  return "text-rose-700 bg-rose-100 border-rose-200";
}

function Avatar({ user, size = 40 }: { user: UserRow; size?: number }) {
  const initials = (user.full_name || user.email || "U")
    .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const cls = size >= 48 ? "text-base" : "text-sm";

  if (user.avatar_url) {
    return (
      <Image
        src={user.avatar_url}
        alt={user.full_name || "User"}
        width={size}
        height={size}
        className="rounded-xl object-cover"
        style={{ width: size, height: size }}
        unoptimized
      />
    );
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 font-bold text-white ${cls}`}
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}

function ScoreBar({ score, max, color }: { score: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-bold text-slate-600 w-8 text-right">{score}/{max}</span>
    </div>
  );
}

export default function ScorecardsPage() {
  const { role } = useUserRole();

  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedQ, setSelectedQ] = useState(CURRENT_Q);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<{ user: UserRow; scorecard: Scorecard | null } | null>(null);

  // Filters & view
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const quarterKey = `${selectedYear}-${selectedQ}`;
  const qInfo = QUARTERS.find(q => q.value === selectedQ)!;
  const quarterStart = `${selectedYear}-${qInfo.start}`;
  const quarterEnd = `${selectedYear}-${qInfo.end}`;

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: usersData }, scRes] = await Promise.all([
      supabaseClient
        .from("users")
        .select("id, full_name, email, designation, avatar_url")
        .eq("is_active", true)
        .order("full_name"),
      fetch(`/api/scorecards?quarter=${quarterKey}`),
    ]);
    setUsers((usersData || []) as UserRow[]);
    const scJson = await scRes.json();
    setScorecards(scJson.scorecards || []);
    setLoading(false);
  }, [quarterKey]);

  useEffect(() => { void load(); }, [load]);

  async function generateScorecard(user: UserRow) {
    setGenerating(user.id);
    await fetch("/api/scorecards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        quarter: quarterKey,
        quarter_start: quarterStart,
        quarter_end: quarterEnd,
      }),
    });
    await load();
    setGenerating(null);
  }

  const scorecardMap = useMemo(() => new Map(scorecards.map(s => [s.user_id, s])), [scorecards]);

  const designations = useMemo(() => {
    const set = new Set(users.map(u => u.designation).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [users]);

  const filtered = useMemo(() => {
    let list = users.filter(u => {
      if (search && !(u.full_name || u.email || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (designationFilter !== "all" && u.designation !== designationFilter) return false;
      const sc = scorecardMap.get(u.id);
      if (statusFilter === "reviewed" && !sc) return false;
      if (statusFilter === "pending" && sc) return false;
      if (ratingFilter !== "all") {
        if (!sc) return false;
        if (ratingFilter === "strong" && sc.total_score < 85) return false;
        if (ratingFilter === "stable" && (sc.total_score < 70 || sc.total_score >= 85)) return false;
        if (ratingFilter === "under" && (sc.total_score < 50 || sc.total_score >= 70)) return false;
        if (ratingFilter === "action" && sc.total_score >= 50) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      const scA = scorecardMap.get(a.id);
      const scB = scorecardMap.get(b.id);
      if (sortKey === "name") return (a.full_name || "").localeCompare(b.full_name || "");
      if (sortKey === "score_desc") return (scB?.total_score ?? -1) - (scA?.total_score ?? -1);
      if (sortKey === "score_asc") return (scA?.total_score ?? 101) - (scB?.total_score ?? 101);
      return (a.full_name || "").localeCompare(b.full_name || "");
    });

    return list;
  }, [users, search, designationFilter, statusFilter, ratingFilter, sortKey, scorecardMap]);

  const avgScore = scorecards.length > 0
    ? Math.round(scorecards.reduce((s, c) => s + c.total_score, 0) / scorecards.length) : 0;
  const strong = scorecards.filter(s => s.total_score >= 85).length;
  const action = scorecards.filter(s => s.total_score < 50).length;

  return (
    <RequireAdmin>
      <div className="space-y-5 pb-20">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg shadow-violet-500/25">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              </span>
              Team Scorecards
            </h1>
            <p className="text-[12px] text-slate-500 mt-0.5">Quarterly performance reviews — 100 points total</p>
          </div>

          {/* Quarter selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-black focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <div className="flex rounded-xl border border-slate-200 bg-white p-0.5">
              {QUARTERS.map(q => (
                <button key={q.value} onClick={() => setSelectedQ(q.value)}
                  className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-all ${selectedQ === q.value ? "bg-violet-600 text-white shadow" : "text-slate-500 hover:text-slate-800"}`}>
                  {q.value}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Summary stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Avg Score", value: `${avgScore}/100`, color: "text-violet-700", bg: "from-violet-50 to-purple-50", border: "border-violet-200/60" },
            { label: "Reviewed", value: `${scorecards.length}/${users.length}`, color: "text-sky-700", bg: "from-sky-50 to-cyan-50", border: "border-sky-200/60" },
            { label: "Strong Performers", value: strong, color: "text-emerald-700", bg: "from-emerald-50 to-green-50", border: "border-emerald-200/60" },
            { label: "Action Required", value: action, color: "text-rose-700", bg: "from-rose-50 to-pink-50", border: "border-rose-200/60" },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border ${s.border} bg-gradient-to-br ${s.bg} p-4 shadow-sm`}>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Filters + View Toggle ── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[180px] flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search members…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-[12px] text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          {/* Rating filter */}
          <select
            value={ratingFilter}
            onChange={e => setRatingFilter(e.target.value as RatingFilter)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-black focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            <option value="all">All Ratings</option>
            <option value="strong">Strong (85+)</option>
            <option value="stable">Stable (70–84)</option>
            <option value="under">Underperforming (50–69)</option>
            <option value="action">Action Required (&lt;50)</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-black focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            <option value="all">All Members</option>
            <option value="reviewed">Reviewed</option>
            <option value="pending">Pending Review</option>
          </select>

          {/* Designation filter */}
          {designations.length > 0 && (
            <select
              value={designationFilter}
              onChange={e => setDesignationFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-black focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              <option value="all">All Roles</option>
              {designations.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}

          {/* Sort */}
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-black focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            <option value="name">Sort: Name A–Z</option>
            <option value="score_desc">Sort: Score High–Low</option>
            <option value="score_asc">Sort: Score Low–High</option>
          </select>

          {/* Spacer */}
          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex rounded-xl border border-slate-200 bg-white p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${viewMode === "grid" ? "bg-violet-600 text-white shadow" : "text-slate-500 hover:text-slate-800"}`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${viewMode === "list" ? "bg-violet-600 text-white shadow" : "text-slate-500 hover:text-slate-800"}`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
              List
            </button>
          </div>
        </div>

        {/* Results count */}
        <p className="text-[11px] text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of {users.length} members
        </p>

        {/* ── Content ── */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-3">
              <svg className="h-8 w-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </div>
            <p className="text-[14px] font-medium text-slate-700">No members match your filters</p>
            <button onClick={() => { setSearch(""); setRatingFilter("all"); setStatusFilter("all"); setDesignationFilter("all"); }} className="mt-3 text-[12px] text-violet-600 hover:underline">Clear all filters</button>
          </div>
        ) : viewMode === "grid" ? (
          // ── GRID VIEW ──
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map(user => {
              const sc = scorecardMap.get(user.id);
              return (
                <div key={user.id} className={`relative flex flex-col rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md ${sc?.is_finalized ? "border-violet-300" : "border-slate-200/70"}`}>
                  {sc?.is_finalized && (
                    <span className="absolute top-3 right-3 rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold text-violet-700 uppercase tracking-wide">✓ Finalized</span>
                  )}

                  <div className="p-4 flex flex-col gap-4 flex-1">
                    {/* User */}
                    <div className="flex items-center gap-3">
                      <Avatar user={user} size={44} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-900 truncate">{user.full_name || "Unnamed"}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user.designation || user.email}</p>
                      </div>
                      {sc && (
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${ratingColor(sc.rating)}`}>
                          {sc.total_score}
                        </span>
                      )}
                    </div>

                    {sc ? (
                      <>
                        {/* Score bar */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Total Score</span>
                            <span className="text-lg font-extrabold text-slate-900">{sc.total_score}<span className="text-[11px] font-normal text-slate-400">/100</span></span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${sc.total_score >= 85 ? "bg-emerald-500" : sc.total_score >= 70 ? "bg-sky-500" : sc.total_score >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                              style={{ width: `${sc.total_score}%` }}
                            />
                          </div>
                        </div>

                        {/* Mini breakdown */}
                        <div className="space-y-1.5 text-[11px]">
                          <div>
                            <div className="flex justify-between text-slate-500 mb-0.5">
                              <span>Attendance</span>
                              <span className="text-[10px]">{sc.late_count} late · {sc.absent_count} absent</span>
                            </div>
                            <ScoreBar score={sc.attendance_score} max={30} color="bg-violet-500" />
                          </div>
                          <div>
                            <div className="flex justify-between text-slate-500 mb-0.5">
                              <span>On-Time Delivery</span>
                              <span className="text-[10px]">{sc.on_time_pct}%</span>
                            </div>
                            <ScoreBar score={sc.delivery_score} max={25} color="bg-sky-500" />
                          </div>
                          <div>
                            <span className="text-slate-500">Quality · Satisfaction · Revenue</span>
                            <div className="flex gap-1 mt-1">
                              {[
                                { s: sc.quality_score, m: 15, c: "bg-emerald-500" },
                                { s: sc.satisfaction_score, m: 15, c: "bg-amber-500" },
                                { s: sc.revenue_score, m: 15, c: "bg-orange-500" },
                              ].map(({ s, m, c }, i) => (
                                <div key={i} className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                  <div className={`h-full rounded-full ${c}`} style={{ width: `${(s / m) * 100}%` }} />
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-1 mt-0.5 text-[10px] text-slate-400">
                              <span className="flex-1 text-center">{sc.quality_score}/15</span>
                              <span className="flex-1 text-center">{sc.satisfaction_score}/15</span>
                              <span className="flex-1 text-center">{sc.revenue_score}/15</span>
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-auto">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ratingColor(sc.rating)}`}>{sc.rating}</span>
                          <button
                            onClick={() => setEditingUser({ user, scorecard: sc })}
                            className="rounded-lg border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-600 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-colors"
                          >Edit</button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-3 gap-2 flex-1">
                        <p className="text-[11px] text-slate-400">No scorecard yet</p>
                        <button
                          onClick={() => generateScorecard(user)}
                          disabled={generating === user.id}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors"
                        >
                          {generating === user.id
                            ? <><div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />Generating…</>
                            : <><svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>Generate</>}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // ── LIST VIEW ──
          <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_repeat(5,1fr)_auto] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              <span>Member</span>
              <span>Rating</span>
              <span className="text-center">Total</span>
              <span className="text-center">Attend.</span>
              <span className="text-center">Delivery</span>
              <span className="text-center">Quality</span>
              <span className="text-center">Revenue</span>
              <span />
            </div>

            {filtered.map((user, idx) => {
              const sc = scorecardMap.get(user.id);
              return (
                <div
                  key={user.id}
                  className={`grid grid-cols-[2fr_1fr_repeat(5,1fr)_auto] gap-3 items-center px-4 py-3 transition-colors hover:bg-slate-50 ${idx !== filtered.length - 1 ? "border-b border-slate-100" : ""}`}
                >
                  {/* Member */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar user={user} size={34} />
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-slate-900 truncate">{user.full_name || "Unnamed"}</p>
                      <p className="text-[10px] text-slate-400 truncate">{user.designation || user.email}</p>
                    </div>
                    {sc?.is_finalized && (
                      <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[8px] font-bold text-violet-700">✓</span>
                    )}
                  </div>

                  {/* Rating */}
                  <div>
                    {sc ? (
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${ratingColor(sc.rating)}`}>
                        {sc.rating.split(",")[0]}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">—</span>
                    )}
                  </div>

                  {/* Total */}
                  <div className="text-center">
                    {sc ? (
                      <span className={`text-[13px] font-extrabold ${sc.total_score >= 85 ? "text-emerald-600" : sc.total_score >= 70 ? "text-sky-600" : sc.total_score >= 50 ? "text-amber-600" : "text-rose-600"}`}>
                        {sc.total_score}
                      </span>
                    ) : <span className="text-[11px] text-slate-400">—</span>}
                  </div>

                  {/* Attendance */}
                  <div className="text-center text-[11px]">
                    {sc ? <span className="font-semibold text-slate-700">{sc.attendance_score}<span className="text-slate-400 font-normal">/30</span></span> : <span className="text-slate-400">—</span>}
                  </div>

                  {/* Delivery */}
                  <div className="text-center text-[11px]">
                    {sc ? <span className="font-semibold text-slate-700">{sc.delivery_score}<span className="text-slate-400 font-normal">/25</span></span> : <span className="text-slate-400">—</span>}
                  </div>

                  {/* Quality */}
                  <div className="text-center text-[11px]">
                    {sc ? <span className="font-semibold text-slate-700">{sc.quality_score}<span className="text-slate-400 font-normal">/15</span></span> : <span className="text-slate-400">—</span>}
                  </div>

                  {/* Revenue */}
                  <div className="text-center text-[11px]">
                    {sc ? <span className="font-semibold text-slate-700">{sc.revenue_score}<span className="text-slate-400 font-normal">/15</span></span> : <span className="text-slate-400">—</span>}
                  </div>

                  {/* Action */}
                  <div className="shrink-0">
                    {sc ? (
                      <button
                        onClick={() => setEditingUser({ user, scorecard: sc })}
                        className="rounded-lg border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-600 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-colors whitespace-nowrap"
                      >Edit</button>
                    ) : (
                      <button
                        onClick={() => generateScorecard(user)}
                        disabled={generating === user.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors whitespace-nowrap"
                      >
                        {generating === user.id
                          ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          : <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>}
                        Generate
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingUser && (
        <ScorecardModal
          user={editingUser.user}
          scorecard={editingUser.scorecard}
          quarterKey={quarterKey}
          quarterStart={quarterStart}
          quarterEnd={quarterEnd}
          onClose={() => setEditingUser(null)}
          onSaved={() => { setEditingUser(null); void load(); }}
        />
      )}
    </RequireAdmin>
  );
}
