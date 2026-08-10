"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type CalendarLeave = {
  id: string;
  user_id: string;
  leave_type: "annual" | "sick" | "unpaid" | "maternity";
  start_date: string;
  end_date: string;
  days_count: number;
  user: { id: string; full_name: string | null; email: string | null } | null;
};

type CalendarUser = { id: string; full_name: string | null; email: string | null };

const colors = [
  "bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-orange-500",
];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function userName(leave: CalendarLeave) {
  return leave.user?.full_name || leave.user?.email || "Unknown user";
}

export default function LeaveCalendar() {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [leaves, setLeaves] = useState<CalendarLeave[]>([]);
  const [users, setUsers] = useState<CalendarUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const gridStart = useMemo(() => {
    const start = new Date(month);
    start.setDate(1 - start.getDay());
    return start;
  }, [month]);
  const gridEnd = useMemo(() => {
    const end = new Date(gridStart);
    end.setDate(end.getDate() + 41);
    return end;
  }, [gridStart]);

  const loadLeaves = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setError("You must be signed in to view the leave calendar.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`/api/leaves/calendar?from=${dateKey(gridStart)}&to=${dateKey(gridEnd)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load approved leaves.");
      setLeaves(result.leaves || []);
      setUsers(result.users || []);
      setSelectedUsers((current) => current.size ? current : new Set((result.users || []).map((user: CalendarUser) => user.id)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load approved leaves.");
    } finally {
      setLoading(false);
    }
  }, [gridEnd, gridStart]);

  useEffect(() => { void loadLeaves(); }, [loadLeaves]);

  const people = useMemo(() => {
    return users
      .map((user) => ({ id: user.id, name: user.full_name || user.email || "Unnamed user" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  const visiblePeople = people.filter((person) => person.name.toLowerCase().includes(search.toLowerCase()));
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(date.getDate() + index);
    return date;
  });
  const today = dateKey(new Date());

  function colorFor(userId: string) {
    let hash = 0;
    for (const char of userId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return colors[hash % colors.length];
  }

  function eventsFor(date: Date) {
    const key = dateKey(date);
    return leaves.filter((leave) => selectedUsers.has(leave.user_id) && leave.start_date <= key && leave.end_date >= key);
  }

  function changeMonth(offset: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function goToToday() {
    const now = new Date();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className="flex min-h-[680px]">
        <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-slate-50/60 p-4 md:block">
          <button type="button" onClick={goToToday} className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 py-2.5 text-sm font-medium text-white shadow-md">
            Today
          </button>
          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Staff Calendars</p>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search staff..." className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-violet-400" />
            <div className="mt-3 max-h-[500px] space-y-2 overflow-y-auto">
              {visiblePeople.map((person) => (
                <label key={person.id} className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(person.id)}
                    onChange={() => setSelectedUsers((current) => {
                      const next = new Set(current);
                      if (next.has(person.id)) next.delete(person.id); else next.add(person.id);
                      return next;
                    })}
                    className="rounded border-slate-300"
                  />
                  <span className={`h-2 w-2 rounded-full ${colorFor(person.id)}`} />
                  <span className="truncate">{person.name}</span>
                </label>
              ))}
              {!loading && visiblePeople.length === 0 && <p className="py-4 text-center text-xs text-slate-400">No users found.</p>}
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Leave Calendar</h2>
              <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month" className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-500 hover:bg-slate-50">‹</button>
              <button type="button" onClick={() => changeMonth(1)} aria-label="Next month" className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-500 hover:bg-slate-50">›</button>
              <span className="text-sm font-medium text-slate-700">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
            </div>
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">Approved leaves</span>
          </div>

          {error && <div className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="px-2 py-2 text-center text-[10px] font-semibold uppercase text-slate-500">{day}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((date) => {
              const key = dateKey(date);
              const events = eventsFor(date);
              const inMonth = date.getMonth() === month.getMonth();
              return (
                <div key={key} className={`min-h-24 border-b border-r border-slate-200 p-1.5 sm:min-h-28 ${inMonth ? "bg-white" : "bg-slate-50/70"}`}>
                  <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full text-[11px] ${key === today ? "bg-violet-600 font-semibold text-white" : inMonth ? "text-slate-600" : "text-slate-400"}`}>{date.getDate()}</span>
                  <div className="mt-1 space-y-1">
                    {events.slice(0, 3).map((leave) => (
                      <div key={leave.id} title={`${userName(leave)} — ${leave.leave_type} leave`} className={`truncate rounded px-1.5 py-1 text-[10px] font-medium text-white ${colorFor(leave.user_id)}`}>
                        {userName(leave)} · {leave.leave_type}
                      </div>
                    ))}
                    {events.length > 3 && <p className="px-1 text-[10px] font-medium text-slate-500">+{events.length - 3} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
