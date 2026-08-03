"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type EmployeeLeaveRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_excalibur: boolean;
  annual_leave_used: number;
  annual_leave_total: number;
  sick_leave_used: number;
  sick_leave_total: number;
  lieu_leave_used: number;
  lieu_leave_total: number;
  maternity_leave_eligible: boolean;
  maternity_leave_used: number;
  maternity_leave_total: number;
  ticket_price: number;
  ticket_price_claimed: number;
};

async function accessToken() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session?.access_token || null;
}

export default function EmployeeLeaveTable() {
  const [employees, setEmployees] = useState<EmployeeLeaveRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      const token = await accessToken();
      if (!token) {
        setMessage({ type: "error", text: "You must be signed in." });
        setLoading(false);
        return;
      }
      try {
        const response = await fetch("/api/leaves/employees", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load employee leave records.");
        setEmployees(data.employees || []);
      } catch (error) {
        setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to load employees." });
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((employee) =>
      [employee.full_name, employee.email].filter(Boolean).join(" ").toLowerCase().includes(term),
    );
  }, [employees, search]);

  function updateValue(id: string, key: keyof EmployeeLeaveRow, value: number) {
    setEmployees((current) => current.map((employee) =>
      employee.id === id ? { ...employee, [key]: value } : employee,
    ));
  }

  async function saveEmployee(employee: EmployeeLeaveRow) {
    setSavingId(employee.id);
    setMessage(null);
    try {
      const token = await accessToken();
      if (!token) throw new Error("You must be signed in.");
      const response = await fetch("/api/leaves/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId: employee.id,
          annualLeaveUsed: employee.annual_leave_used,
          sickLeaveUsed: employee.sick_leave_used,
          lieuLeaveUsed: employee.lieu_leave_used,
          lieuLeaveTotal: employee.lieu_leave_total,
          ...(employee.maternity_leave_eligible
            ? { maternityLeaveUsed: employee.maternity_leave_used }
            : {}),
          ticketPrice: employee.ticket_price,
          ticketPriceClaimed: employee.ticket_price_claimed,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save employee.");
      setMessage({ type: "success", text: `${employee.full_name || employee.email || "Employee"} updated.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to save employee." });
    } finally {
      setSavingId(null);
    }
  }

  const editableColumns = [
    { key: "annual_leave_used" as const, label: "Annual", total: "annual_leave_total" as const },
    { key: "sick_leave_used" as const, label: "Sick", total: "sick_leave_total" as const },
    { key: "lieu_leave_used" as const, label: "Lieu", total: "lieu_leave_total" as const },
    { key: "maternity_leave_used" as const, label: "Maternity", total: "maternity_leave_total" as const },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Employee Leave Records</h2>
          <p className="mt-1 text-sm text-slate-500">Edit used leave balances and employee ticket amounts.</p>
        </div>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employees..." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400 sm:w-64" />
      </div>

      {message && <div className={`m-4 rounded-lg p-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-[1050px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Employee</th>
              <th className="px-3 py-3 font-semibold">Policy</th>
              {editableColumns.map((column) => <th key={column.key} className="px-3 py-3 font-semibold">{column.label} used / total</th>)}
              <th className="px-3 py-3 font-semibold">Ticket price</th>
              <th className="px-3 py-3 font-semibold">Ticket price claimed</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">Loading employees...</td></tr>
            ) : filteredEmployees.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">No employees found.</td></tr>
            ) : filteredEmployees.map((employee) => (
              <tr key={employee.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{employee.full_name || employee.email || "Unnamed employee"}</p>
                  <p className="text-xs text-slate-500">{employee.email}</p>
                </td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${employee.is_excalibur ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"}`}>
                    {employee.is_excalibur ? "Excalibur" : "Standard"}
                  </span>
                </td>
                {editableColumns.map((column) => (
                  <td key={column.key} className="px-3 py-3">
                    {column.key === "maternity_leave_used" && !employee.maternity_leave_eligible ? (
                      <span className="text-xs text-slate-400">Not applicable</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" step="0.5" value={employee[column.key]} onChange={(event) => updateValue(employee.id, column.key, Number(event.target.value))} className="w-20 rounded-lg border border-slate-200 px-2 py-2 text-sm" />
                        <span className="text-xs text-slate-400">/</span>
                        {column.key === "lieu_leave_used" ? (
                          <input
                            aria-label={`${employee.full_name || employee.email || "Employee"} lieu total`}
                            type="number"
                            min="0"
                            max="999"
                            step="0.5"
                            value={employee.lieu_leave_total}
                            onChange={(event) => updateValue(employee.id, "lieu_leave_total", Number(event.target.value))}
                            className="w-20 rounded-lg border border-slate-200 px-2 py-2 text-sm"
                          />
                        ) : (
                          <span className="text-xs text-slate-400">{employee[column.total]}</span>
                        )}
                      </div>
                    )}
                  </td>
                ))}
                <td className="px-3 py-3">
                  <input type="number" min="0" step="0.01" value={employee.ticket_price} onChange={(event) => updateValue(employee.id, "ticket_price", Number(event.target.value))} className="w-28 rounded-lg border border-slate-200 px-2 py-2 text-sm" />
                </td>
                <td className="px-3 py-3">
                  <input type="number" min="0" step="0.01" value={employee.ticket_price_claimed} onChange={(event) => updateValue(employee.id, "ticket_price_claimed", Number(event.target.value))} className="w-28 rounded-lg border border-slate-200 px-2 py-2 text-sm" />
                </td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => void saveEmployee(employee)} disabled={savingId === employee.id} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50">
                    {savingId === employee.id ? "Saving..." : "Save"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
