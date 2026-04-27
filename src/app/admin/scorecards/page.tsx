"use client";

import { useState, useEffect, useCallback } from "react";
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

type UserRow = { id: string; full_name: string | null; email: string | null; designation: string | null };
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
  user?: UserRow;
};

function ratingColor(rating: string) {
  if (rating?.startsWith("Strong")) return "text-emerald-700 bg-emerald-100";
  if (rating?.startsWith("Stable")) return "text-sky-700 bg-sky-100";
  if (rating?.startsWith("Under")) return "text-amber-700 bg-amber-100";
  return "text-rose-700 bg-rose-100";
}

function scoreBar(score: number, max: number, color: string) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-bold text-slate-700 w-8 text-right">{score}/{max}</span>
    </div>
  );
}

export default function ScorecardsPage() {
  const { role } = useUserRole();
  const isAdmin = role === "admin" || role === "hr";

  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedQ, setSelectedQ] = useState(CURRENT_Q);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<{ user: UserRow; scorecard: Scorecard | null } | null>(null);
  const [search, setSearch] = useState("");

  const quarterKey = `${selectedYear}-${selectedQ}`;
  const qInfo = QUARTERS.find(q => q.value === selectedQ)!;
  const quarterStart = `${selectedYear}-${qInfo.start}`;
  const quarterEnd = `${selectedYear}-${qInfo.end}`;

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: usersData }, scRes] = await Promise.all([
      supabaseClient.from("users").select("id, full_name, email, designation").eq("is_active", true).order("full_name"),
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

  const filtered = users.filter(u =>
    !search || (u.full_name || u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const scorecardMap = new Map(scorecards.map(s => [s.user_id, s]));

  const avgScore = scorecards.length > 0
    ? Math.round(scorecards.reduce((s, c) => s + c.total_score, 0) / scorecards.length)
    : 0;

  const strong = scorecards.filter(s => s.total_score >= 85).length;
  const action = scorecards.filter(s => s.total_score < 50).length;

  return (
    <RequireAdmin>
      <div className="space-y-6 pb-20">
        {/* Header */}
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
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
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

        {/* Summary stats */}
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

        {/* Search */}
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search members…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>

        {/* Scoring legend */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
          <h3 className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-3">Scoring Structure</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
            <div className="rounded-xl bg-slate-50 p-3 space-y-1">
              <p className="font-bold text-slate-700">Attendance <span className="text-slate-400 font-normal">/30</span></p>
              <p className="text-slate-500">30 — Perfect</p>
              <p className="text-slate-500">25 — 1–2 late</p>
              <p className="text-slate-500">20 — 3–4 late / 1 absent</p>
              <p className="text-slate-500">10 — 2 absent</p>
              <p className="text-slate-500">0 — 3+ absent</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 space-y-1">
              <p className="font-bold text-slate-700">On-Time Delivery <span className="text-slate-400 font-normal">/25</span></p>
              <p className="text-slate-500">25 — 95–100%</p>
              <p className="text-slate-500">20 — 85–94%</p>
              <p className="text-slate-500">15 — 70–84%</p>
              <p className="text-slate-500">5 — Below 70%</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 space-y-1">
              <p className="font-bold text-slate-700">Quality <span className="text-slate-400 font-normal">/15</span></p>
              <p className="text-slate-500">15 — Minimal revisions</p>
              <p className="text-slate-500">10 — Occasional</p>
              <p className="text-slate-500">5 — Frequent corrections</p>
              <p className="text-slate-500">0 — Poor output</p>
              <p className="font-bold text-slate-700 mt-2">Satisfaction <span className="text-slate-400 font-normal">/15</span></p>
              <p className="text-slate-500">15 — Strong positive</p>
              <p className="text-slate-500">10 — Neutral / minor</p>
              <p className="text-slate-500">5 — Complaints</p>
              <p className="text-slate-500">0 — Client risk</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 space-y-1">
              <p className="font-bold text-slate-700">Revenue Impact <span className="text-slate-400 font-normal">/15</span></p>
              <p className="text-slate-500">15 — Direct, measurable</p>
              <p className="text-slate-500">10 — Indirect positive</p>
              <p className="text-slate-500">5 — Minimal impact</p>
              <p className="text-slate-500">0 — No contribution</p>
              <div className="border-t border-slate-200 mt-2 pt-2 space-y-1">
                <p className="font-bold text-slate-700">Final Rating</p>
                <p className="text-emerald-600">85–100 Strong</p>
                <p className="text-sky-600">70–84 Stable</p>
                <p className="text-amber-600">50–69 Under</p>
                <p className="text-rose-600">&lt;50 Action req.</p>
              </div>
            </div>
          </div>
        </div>

        {/* User list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map(user => {
              const sc = scorecardMap.get(user.id);
              const initials = (user.full_name || user.email || "U").slice(0, 2).toUpperCase();
              return (
                <div key={user.id} className={`relative rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md ${sc?.is_finalized ? "border-violet-200" : "border-slate-200/60"}`}>
                  {sc?.is_finalized && (
                    <div className="absolute top-2 right-2">
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold text-violet-700 uppercase tracking-wide">Finalized</span>
                    </div>
                  )}
                  <div className="p-4">
                    {/* User info */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 text-sm font-bold text-white">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-900 truncate">{user.full_name || "Unnamed"}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user.designation || user.email}</p>
                      </div>
                    </div>

                    {sc ? (
                      <div className="space-y-2.5">
                        {/* Total score ring */}
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-slate-500">Total Score</span>
                          <span className="text-xl font-extrabold text-slate-900">{sc.total_score}<span className="text-[13px] font-normal text-slate-400">/100</span></span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-3">
                          <div
                            className={`h-full rounded-full transition-all ${sc.total_score >= 85 ? "bg-emerald-500" : sc.total_score >= 70 ? "bg-sky-500" : sc.total_score >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                            style={{ width: `${sc.total_score}%` }}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-0.5">
                            <span>Attendance</span>
                            <span className="text-[10px]">{sc.absent_count} absent · {sc.late_count} late</span>
                          </div>
                          {scoreBar(sc.attendance_score, 30, "bg-violet-500")}

                          <div className="text-[11px] text-slate-500 mt-1">On-Time Delivery <span className="text-[10px]">({sc.on_time_pct}% · {sc.tasks_on_time}/{sc.tasks_total} tasks)</span></div>
                          {scoreBar(sc.delivery_score, 25, "bg-sky-500")}

                          <div className="text-[11px] text-slate-500 mt-1">Quality of Output</div>
                          {scoreBar(sc.quality_score, 15, "bg-emerald-500")}

                          <div className="text-[11px] text-slate-500 mt-1">Client Satisfaction</div>
                          {scoreBar(sc.satisfaction_score, 15, "bg-amber-500")}

                          <div className="text-[11px] text-slate-500 mt-1">Revenue Impact</div>
                          {scoreBar(sc.revenue_score, 15, "bg-orange-500")}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${ratingColor(sc.rating)}`}>
                            {sc.rating}
                          </span>
                          <button
                            onClick={() => setEditingUser({ user, scorecard: sc })}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-colors"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-4 text-center gap-3">
                        <p className="text-[11px] text-slate-400">No scorecard for {quarterKey}</p>
                        <button
                          onClick={() => generateScorecard(user)}
                          disabled={generating === user.id}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors shadow-sm"
                        >
                          {generating === user.id ? (
                            <><div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />Generating…</>
                          ) : (
                            <><svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>Generate Scorecard</>
                          )}
                        </button>
                      </div>
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
