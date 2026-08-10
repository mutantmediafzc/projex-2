"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type WorkforceMetrics = {
  employeeCount: number;
  monthlyEmployees: number;
  dailyEmployees: number;
  monthlyPercentage: number;
  dailyPercentage: number;
};

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthKey(date: Date) {
  return dateKey(date).slice(0, 7);
}

export default function WorkforceOverview() {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [metrics, setMetrics] = useState<WorkforceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await supabaseClient.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("You must be signed in to view workforce leave data.");

      const response = await fetch(`/api/leaves/workforce?month=${monthKey(month)}&date=${dateKey(selectedDate)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load workforce leave data.");
      setMetrics(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load workforce leave data.");
    } finally {
      setLoading(false);
    }
  }, [month, selectedDate]);

  useEffect(() => { void loadMetrics(); }, [loadMetrics]);

  function changeMonth(offset: number) {
    setMonth((current) => {
      const next = new Date(current.getFullYear(), current.getMonth() + offset, 1);
      const now = new Date();
      setSelectedDate(
        next.getFullYear() === now.getFullYear() && next.getMonth() === now.getMonth()
          ? now
          : next,
      );
      return next;
    });
  }

  const employeeCount = metrics?.employeeCount ?? 0;
  const monthlyEmployees = metrics?.monthlyEmployees ?? 0;
  const dailyEmployees = metrics?.dailyEmployees ?? 0;
  const monthlyPercentage = metrics?.monthlyPercentage ?? 0;
  const dailyPercentage = metrics?.dailyPercentage ?? 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Workforce Leave</h2>
          <p className="mt-0.5 text-xs text-slate-500">Company-wide approved leave percentages.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month" className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-500 hover:bg-slate-50">‹</button>
          <span className="min-w-32 text-center text-sm font-medium text-slate-700">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Next month" className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-500 hover:bg-slate-50">›</button>
        </div>
      </div>

      <section className="bg-gradient-to-r from-violet-50/70 via-white to-orange-50/70 p-5" aria-label="Workforce leave overview">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Overview</h3>
            <p className="text-xs text-slate-500">Approved employee leave across {employeeCount} active {employeeCount === 1 ? "employee" : "employees"}.</p>
          </div>
          <label className="text-xs font-medium text-slate-600">
            Daily date
            <input
              type="date"
              value={dateKey(selectedDate)}
              min={`${monthKey(month)}-01`}
              max={`${monthKey(month)}-${String(new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()).padStart(2, "0")}`}
              onChange={(event) => setSelectedDate(new Date(`${event.target.value}T00:00:00`))}
              className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-400"
            />
          </label>
        </div>

        {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        <div className={`grid gap-3 sm:grid-cols-2 ${loading ? "animate-pulse opacity-60" : ""}`}>
          <div className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-600">Monthly</p>
                <p className="mt-1 text-xs text-slate-500">Employees on leave in {month.toLocaleDateString(undefined, { month: "long" })}</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{monthlyPercentage}%</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-violet-100">
              <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${monthlyPercentage}%` }} />
            </div>
            <p className="mt-2 text-xs font-medium text-slate-600">{monthlyEmployees} of {employeeCount} employees</p>
          </div>

          <div className="rounded-xl border border-orange-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-600">Daily</p>
                <p className="mt-1 text-xs text-slate-500">Employees on leave on {selectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{dailyPercentage}%</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-orange-100">
              <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${dailyPercentage}%` }} />
            </div>
            <p className="mt-2 text-xs font-medium text-slate-600">{dailyEmployees} of {employeeCount} employees</p>
          </div>
        </div>
      </section>
    </div>
  );
}
