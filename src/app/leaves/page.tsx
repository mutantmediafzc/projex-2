"use client";

import { useEffect, useState } from "react";
import LeaveManagement from "@/app/profile/LeaveManagement";
import { supabaseClient } from "@/lib/supabaseClient";
import ExcaliburSettings from "./ExcaliburSettings";
import { useUserRole } from "@/app/profile/hooks/useUserRole";
import AdminLeavePortal from "@/app/profile/AdminLeavePortal";
import LeaveCalendar from "./LeaveCalendar";
import EmployeeLeaveTable from "./EmployeeLeaveTable";
import MaternityEligibilitySettings from "./MaternityEligibilitySettings";

type LeaveTab = "overview" | "file" | "calendar" | "employees" | "settings" | "approvals";

function LeaveSettings() {
  const { hasHrAccess, loading: roleLoading } = useUserRole();
  const [values, setValues] = useState({
    standardAnnualTotal: 30,
    standardSickTotal: 90,
    standardLieuTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setMessage({ type: "error", text: "You must be signed in to manage leave settings." });
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/leaves/settings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load leave settings.");
        setValues({
          standardAnnualTotal: data.settings.standard_annual_total,
          standardSickTotal: data.settings.standard_sick_total,
          standardLieuTotal: data.settings.standard_lieu_total,
        });
      } catch (error) {
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "Failed to load leave settings.",
        });
      } finally {
        setLoading(false);
      }
    }

    void loadSettings();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("You must be signed in to save leave settings.");

      const response = await fetch("/api/leaves/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save leave settings.");
      setMessage({ type: "success", text: "Leave settings saved successfully." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save leave settings.",
      });
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    { key: "standardAnnualTotal" as const, label: "Annual leave", description: "Paid annual leave allowance" },
    { key: "standardSickTotal" as const, label: "Sick leave", description: "Yearly sick leave allowance" },
    { key: "standardLieuTotal" as const, label: "Lieu days", description: "Time off earned in lieu" },
  ];

  if (loading) {
    return <div className="flex min-h-[30vh] items-center justify-center text-sm text-slate-500">Loading leave settings...</div>;
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-lg backdrop-blur">
      <form onSubmit={handleSubmit}>
      <div>
        <h2 className="text-base font-semibold text-slate-900">Leave Settings</h2>
        <p className="mt-1 text-sm text-slate-500">Default allowance for users who are not in Excalibur.</p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {fields.map((field) => (
          <label key={field.key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <span className="text-sm font-semibold text-slate-900">{field.label}</span>
            <span className="mt-0.5 block text-xs text-slate-500">{field.description}</span>
            <div className="relative mt-4">
              <input
                type="number"
                min="0"
                max="999"
                step="0.5"
                required
                value={values[field.key]}
                onChange={(event) => setValues((current) => ({
                  ...current,
                  [field.key]: Number(event.target.value),
                }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-14 text-sm text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">days</span>
            </div>
          </label>
        ))}
      </div>

      {message && (
        <p className={`mt-4 text-sm ${message.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-600 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
      </form>

      {!roleLoading && hasHrAccess && <ExcaliburSettings />}
      {!roleLoading && hasHrAccess && <MaternityEligibilitySettings />}
    </div>
  );
}

export default function LeavesPage() {
  const [activeTab, setActiveTab] = useState<LeaveTab>("file");
  const { hasHrAccess } = useUserRole();
  const canManageLeaves = hasHrAccess;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Leaves</h1>
        <p className="mt-1 text-sm text-slate-500">
          View your leave balance, file a request, and track its status.
        </p>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "overview"
              ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/25"
              : "bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 6h13M8 12h13M8 18h13" />
            <path d="M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
          My Leaves
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("file")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "file"
              ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/25"
              : "bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          File a Leave
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("calendar")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "calendar"
              ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/25"
              : "bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <path d="M8 2v4M16 2v4M3 10h18" />
          </svg>
          Calendar
        </button>
        {canManageLeaves && (
          <button
            type="button"
            onClick={() => setActiveTab("employees")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "employees"
                ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/25"
                : "bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M19 8v6M16 11h6" />
            </svg>
            Employee Leaves
          </button>
        )}
        {canManageLeaves && (
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "settings"
                ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/25"
                : "bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.15.38.37.72.66 1 .3.28.69.43 1.1.4H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
            </svg>
            Leave Settings
          </button>
        )}
        {canManageLeaves && (
          <button
            type="button"
            onClick={() => setActiveTab("approvals")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "approvals"
                ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/25"
                : "bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 11 3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            Leave Approvals
          </button>
        )}
      </div>

      {activeTab === "calendar" ? (
        <LeaveCalendar />
      ) : activeTab === "employees" && canManageLeaves ? (
        <EmployeeLeaveTable />
      ) : activeTab === "approvals" && canManageLeaves ? (
        <AdminLeavePortal />
      ) : activeTab === "settings" && canManageLeaves ? (
        <LeaveSettings />
      ) : (
        <LeaveManagement
          key={activeTab}
          includeRecommendation={false}
          view={activeTab === "overview" ? "overview" : "file"}
        />
      )}
    </div>
  );
}
