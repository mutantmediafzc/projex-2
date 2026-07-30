"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type Employee = { id: string; full_name: string | null; email: string | null; maternity_leave_eligible: boolean };

async function getToken() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session?.access_token || null;
}

export default function MaternityEligibilitySettings() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      if (!token) return;
      const response = await fetch("/api/leaves/maternity-eligibility", { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (response.ok) setEmployees(data.employees || []);
      else setError(data.error || "Failed to load employees.");
      setLoading(false);
    }
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return employees.filter((employee) => [employee.full_name, employee.email].filter(Boolean).join(" ").toLowerCase().includes(term));
  }, [employees, search]);

  async function toggle(employee: Employee) {
    setSavingId(employee.id);
    setError(null);
    const eligible = !employee.maternity_leave_eligible;
    try {
      const token = await getToken();
      if (!token) throw new Error("You must be signed in.");
      const response = await fetch("/api/leaves/maternity-eligibility", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: employee.id, eligible }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update eligibility.");
      setEmployees((current) => current.map((item) => item.id === employee.id ? { ...item, maternity_leave_eligible: eligible } : item));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update eligibility.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="mt-6 border-t border-slate-200 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Maternity Leave Eligibility</h3>
          <p className="mt-1 text-sm text-slate-500">Maternity leave is fixed at 90 days and available only to selected employees.</p>
        </div>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employees..." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm sm:w-64" />
      </div>
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? <p className="col-span-full py-6 text-center text-sm text-slate-500">Loading employees...</p> : filtered.map((employee) => (
          <label key={employee.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-slate-900">{employee.full_name || employee.email || "Unnamed employee"}</span>
              <span className="block truncate text-xs text-slate-500">{employee.email}</span>
            </span>
            <input type="checkbox" checked={employee.maternity_leave_eligible} disabled={savingId === employee.id} onChange={() => void toggle(employee)} className="ml-3 h-4 w-4 rounded border-slate-300 text-violet-600" />
          </label>
        ))}
      </div>
    </section>
  );
}
