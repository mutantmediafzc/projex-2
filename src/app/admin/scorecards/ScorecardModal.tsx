"use client";

import { useState } from "react";

type UserRow = { id: string; full_name: string | null; email: string | null; designation: string | null; avatar_url: string | null };
type Scorecard = {
  id?: string;
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

interface Props {
  user: UserRow;
  scorecard: Scorecard | null;
  quarterKey: string;
  quarterStart: string;
  quarterEnd: string;
  onClose: () => void;
  onSaved: () => void;
}

const QUALITY_OPTIONS = [
  { value: 15, label: "15 — Minimal revisions, high standard" },
  { value: 10, label: "10 — Occasional revisions" },
  { value: 5, label: "5 — Frequent corrections needed" },
  { value: 0, label: "0 — Poor or unusable output" },
];

const SATISFACTION_OPTIONS = [
  { value: 15, label: "15 — Strong positive feedback, no issues" },
  { value: 10, label: "10 — Neutral, minor issues" },
  { value: 5, label: "5 — Repeated complaints" },
  { value: 0, label: "0 — Client risk or dissatisfaction" },
];

const REVENUE_OPTIONS = [
  { value: 15, label: "15 — Direct, measurable impact" },
  { value: 10, label: "10 — Indirect but positive contribution" },
  { value: 5, label: "5 — Minimal impact" },
  { value: 0, label: "0 — No contribution or negative impact" },
];

function getRating(total: number) {
  if (total >= 85) return "Strong performer";
  if (total >= 70) return "Stable, needs improvement";
  if (total >= 50) return "Underperforming";
  return "Action required";
}

function ratingStyle(rating: string) {
  if (rating?.startsWith("Strong")) return "text-emerald-700 bg-emerald-100 border-emerald-200";
  if (rating?.startsWith("Stable")) return "text-sky-700 bg-sky-100 border-sky-200";
  if (rating?.startsWith("Under")) return "text-amber-700 bg-amber-100 border-amber-200";
  return "text-rose-700 bg-rose-100 border-rose-200";
}

function getConsequences(totalScore: number) {
  if (totalScore >= 70) return "None";
  if (totalScore >= 50) return "Monitor closely";
  return "Verbal warning";
}

export default function ScorecardModal({ user, scorecard, quarterKey, quarterStart, quarterEnd, onClose, onSaved }: Props) {
  const [quality, setQuality] = useState(scorecard?.quality_score ?? 10);
  const [satisfaction, setSatisfaction] = useState(scorecard?.satisfaction_score ?? 10);
  const [revenue, setRevenue] = useState(scorecard?.revenue_score ?? 10);
  const [roleNotes, setRoleNotes] = useState(scorecard?.role_addon_notes ?? "");
  const [adminNotes, setAdminNotes] = useState(scorecard?.admin_notes ?? "");
  const [isFinalized, setIsFinalized] = useState(scorecard?.is_finalized ?? false);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [liveData, setLiveData] = useState<Scorecard | null>(scorecard);

  const deliveryScore = liveData?.delivery_score ?? 0;
  const attendanceScore = liveData?.attendance_score ?? 0;
  const lateCount = liveData?.late_count ?? 0;
  const absentCount = liveData?.absent_count ?? 0;
  const taskTotal = liveData?.tasks_total ?? 0;
  const taskOnTime = liveData?.tasks_on_time ?? 0;
  const onTimePct = liveData?.on_time_pct ?? 0;

  const performanceScore = deliveryScore + quality + satisfaction + revenue;
  const totalScore = attendanceScore + performanceScore;
  const rating = getRating(totalScore);

  async function recalculate() {
    setRecalculating(true);
    const res = await fetch("/api/scorecards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        quarter: quarterKey,
        quarter_start: quarterStart,
        quarter_end: quarterEnd,
        quality_score: quality,
        satisfaction_score: satisfaction,
        revenue_score: revenue,
        role_addon_notes: roleNotes,
        admin_notes: adminNotes,
        is_finalized: false,
      }),
    });
    const json = await res.json();
    if (json.scorecard) setLiveData(json.scorecard);
    setRecalculating(false);
  }

  async function save(finalize: boolean) {
    setSaving(true);
    await fetch("/api/scorecards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        quarter: quarterKey,
        quarter_start: quarterStart,
        quarter_end: quarterEnd,
        quality_score: quality,
        satisfaction_score: satisfaction,
        revenue_score: revenue,
        role_addon_notes: roleNotes,
        admin_notes: adminNotes,
        is_finalized: finalize,
      }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Scorecard — {quarterKey}</h2>
            <p className="text-[12px] text-slate-500">{user.full_name || user.email} · {user.designation || "Team Member"}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Total score hero */}
          <div className={`rounded-2xl border p-4 ${ratingStyle(rating)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wide opacity-70">Total Score</span>
              <span className="text-3xl font-extrabold">{totalScore}<span className="text-lg font-normal opacity-60">/100</span></span>
            </div>
            <div className="h-2.5 rounded-full bg-black/10 overflow-hidden">
              <div className="h-full rounded-full bg-current transition-all duration-500" style={{ width: `${totalScore}%` }} />
            </div>
            <p className="text-[12px] font-bold mt-2">{rating}</p>
            <p className="text-[11px] opacity-70 mt-0.5">Consequence: {getConsequences(totalScore)}</p>
          </div>

          {/* Auto-calculated section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[12px] font-bold text-slate-700 uppercase tracking-wide">Auto-Calculated</h3>
              <button
                onClick={recalculate}
                disabled={recalculating}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {recalculating
                  ? <><div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"/>Refreshing…</>
                  : <><svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Refresh Data</>
                }
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Attendance */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-bold text-slate-700">Attendance</p>
                  <span className="text-[13px] font-extrabold text-violet-700">{attendanceScore}/30</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-2">
                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${(attendanceScore / 30) * 100}%` }} />
                </div>
                <p className="text-[10px] text-slate-500">{absentCount} absent · {lateCount} late</p>
                <p className="text-[10px] text-slate-400 mt-0.5">From CRM status logs</p>
              </div>

              {/* On-time delivery */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-bold text-slate-700">On-Time Delivery</p>
                  <span className="text-[13px] font-extrabold text-sky-700">{deliveryScore}/25</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-2">
                  <div className="h-full rounded-full bg-sky-500" style={{ width: `${(deliveryScore / 25) * 100}%` }} />
                </div>
                <p className="text-[10px] text-slate-500">{taskOnTime}/{taskTotal} tasks on time ({onTimePct}%)</p>
                <p className="text-[10px] text-slate-400 mt-0.5">From CRM task deadlines</p>
              </div>
            </div>
          </div>

          {/* Manual scores */}
          <div>
            <h3 className="text-[12px] font-bold text-slate-700 uppercase tracking-wide mb-3">Manual Scores</h3>
            <div className="space-y-4">

              {/* Quality */}
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[12px] font-bold text-slate-700">Quality of Output</p>
                    <p className="text-[11px] text-slate-500">Reviewed by lead or account manager</p>
                  </div>
                  <span className="text-xl font-extrabold text-emerald-700">{quality}/15</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-3">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(quality / 15) * 100}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {QUALITY_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => setQuality(o.value)}
                      className={`rounded-lg border px-2.5 py-2 text-left text-[11px] transition-colors ${quality === o.value ? "border-emerald-400 bg-emerald-50 text-emerald-800 font-semibold" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Satisfaction */}
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[12px] font-bold text-slate-700">Client Satisfaction</p>
                    <p className="text-[11px] text-slate-500">Feedback or account manager input</p>
                  </div>
                  <span className="text-xl font-extrabold text-amber-700">{satisfaction}/15</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-3">
                  <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${(satisfaction / 15) * 100}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SATISFACTION_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => setSatisfaction(o.value)}
                      className={`rounded-lg border px-2.5 py-2 text-left text-[11px] transition-colors ${satisfaction === o.value ? "border-amber-400 bg-amber-50 text-amber-800 font-semibold" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Revenue Impact */}
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[12px] font-bold text-slate-700">Revenue Impact</p>
                    <p className="text-[11px] text-slate-500">Social · Design · Dev · Ads contribution</p>
                  </div>
                  <span className="text-xl font-extrabold text-orange-700">{revenue}/15</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-3">
                  <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${(revenue / 15) * 100}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {REVENUE_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => setRevenue(o.value)}
                      className={`rounded-lg border px-2.5 py-2 text-left text-[11px] transition-colors ${revenue === o.value ? "border-orange-400 bg-orange-50 text-orange-800 font-semibold" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Role-specific notes */}
          <div>
            <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Role-Specific Add-ons (optional)</label>
            <p className="text-[11px] text-slate-500 mb-2">Social: posting consistency · Content: hook strength · Design: brand alignment · Dev: bug rate · Ads: KPI achievement</p>
            <textarea
              value={roleNotes}
              onChange={e => setRoleNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Consistent posting schedule maintained. Hook strength above average. Campaign ROAS 4.2x..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
            />
          </div>

          {/* Admin notes */}
          <div>
            <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Admin Notes</label>
            <textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              rows={2}
              placeholder="Internal notes for HR records…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 border-t border-slate-100 bg-white px-6 py-4 flex items-center justify-between gap-3">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Draft"}
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="rounded-xl bg-violet-600 px-5 py-2 text-[12px] font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              {saving ? "Finalizing…" : "Finalize & Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
