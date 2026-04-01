"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type Subscription = {
  id: string;
  project_id: string;
  name: string;
  amount: number;
  start_month: number;
  start_year: number;
  end_month: number;
  end_year: number;
  created_at: string;
};

type Props = {
  projectId: string;
  projectName: string;
};

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export default function SubscriptionsTab({ projectId, projectName }: Props) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [startMonth, setStartMonth] = useState(new Date().getMonth() + 1);
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState(new Date().getMonth() + 1);
  const [endYear, setEndYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadSubscriptions();
  }, [projectId]);

  async function loadSubscriptions() {
    setLoading(true);
    const { data, error } = await supabaseClient
      .from("project_subscriptions")
      .select("*")
      .eq("project_id", projectId)
      .order("start_year", { ascending: false })
      .order("start_month", { ascending: false });

    if (data) setSubscriptions(data as Subscription[]);
    setLoading(false);
  }

  function openAddModal() {
    setEditingSubscription(null);
    setName("");
    setAmount("");
    setStartMonth(new Date().getMonth() + 1);
    setStartYear(new Date().getFullYear());
    setEndMonth(new Date().getMonth() + 1);
    setEndYear(new Date().getFullYear());
    setShowModal(true);
  }

  function openEditModal(sub: Subscription) {
    setEditingSubscription(sub);
    setName(sub.name);
    setAmount(String(sub.amount));
    setStartMonth(sub.start_month);
    setStartYear(sub.start_year);
    setEndMonth(sub.end_month);
    setEndYear(sub.end_year);
    setShowModal(true);
  }

  async function handleSave() {
    if (!name.trim() || !amount) return;

    setSaving(true);
    const data = {
      project_id: projectId,
      name: name.trim(),
      amount: parseFloat(amount),
      start_month: startMonth,
      start_year: startYear,
      end_month: endMonth,
      end_year: endYear,
    };

    if (editingSubscription) {
      await supabaseClient
        .from("project_subscriptions")
        .update(data)
        .eq("id", editingSubscription.id);
    } else {
      await supabaseClient.from("project_subscriptions").insert(data);
    }

    setSaving(false);
    setShowModal(false);
    loadSubscriptions();
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this subscription?")) return;
    await supabaseClient.from("project_subscriptions").delete().eq("id", id);
    loadSubscriptions();
  }

  function downloadCSV() {
    if (subscriptions.length === 0) {
      alert("No subscriptions to export");
      return;
    }

    const headers = ["Name", "Amount", "Start Month", "Start Year", "End Month", "End Year"];
    const rows = subscriptions.map((sub) => [
      sub.name,
      sub.amount.toFixed(2),
      MONTHS.find((m) => m.value === sub.start_month)?.label || sub.start_month,
      sub.start_year,
      MONTHS.find((m) => m.value === sub.end_month)?.label || sub.end_month,
      sub.end_year,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${projectName.replace(/\s+/g, "_")}_subscriptions.csv`;
    link.click();
  }

  const totalAmount = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Subscriptions</h3>
          <p className="text-xs text-slate-500">Manage subscription payments for this project</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download CSV
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-fuchsia-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-pink-500/25 hover:shadow-xl"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Subscription
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-violet-600">Total Subscriptions</p>
            <p className="text-2xl font-bold text-violet-700">{subscriptions.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-violet-600">Total Amount</p>
            <p className="text-2xl font-bold text-violet-700">AED {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="rounded-xl bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-500">No subscriptions added yet.</p>
          <p className="text-xs text-slate-400 mt-1">Click "Add Subscription" to create one.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-2 text-xs font-semibold text-slate-600">Name</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-slate-600">Amount</th>
                <th className="text-center py-3 px-2 text-xs font-semibold text-slate-600">Period</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-2 font-medium text-slate-900">{sub.name}</td>
                  <td className="py-3 px-2 text-right text-slate-700">AED {sub.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-2 text-center text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      {MONTHS.find((m) => m.value === sub.start_month)?.label?.slice(0, 3)} {sub.start_year}
                      <svg className="h-3 w-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      {MONTHS.find((m) => m.value === sub.end_month)?.label?.slice(0, 3)} {sub.end_year}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(sub)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        title="Edit"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingSubscription ? "Edit Subscription" : "Add Subscription"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Name of Subscription</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-black focus:border-pink-300 focus:outline-none"
                  placeholder="e.g., Meta Ads, Google Workspace"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Amount (AED)</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-black focus:border-pink-300 focus:outline-none"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-3">
                <label className="block text-xs font-medium text-slate-700">Subscription Period</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-[10px] font-medium text-slate-500 uppercase mb-2">Start</p>
                    <div className="flex gap-2">
                      <select
                        value={startMonth}
                        onChange={(e) => setStartMonth(parseInt(e.target.value))}
                        className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-black focus:border-pink-300 focus:outline-none"
                      >
                        {MONTHS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label.slice(0, 3)}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={startYear}
                        onChange={(e) => setStartYear(parseInt(e.target.value))}
                        className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-black focus:border-pink-300 focus:outline-none"
                        min="2020"
                        max="2100"
                      />
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-[10px] font-medium text-slate-500 uppercase mb-2">End</p>
                    <div className="flex gap-2">
                      <select
                        value={endMonth}
                        onChange={(e) => setEndMonth(parseInt(e.target.value))}
                        className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-black focus:border-pink-300 focus:outline-none"
                      >
                        {MONTHS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label.slice(0, 3)}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={endYear}
                        onChange={(e) => setEndYear(parseInt(e.target.value))}
                        className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-black focus:border-pink-300 focus:outline-none"
                        min="2020"
                        max="2100"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 p-6">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim() || !amount}
                className="rounded-lg bg-gradient-to-r from-pink-500 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-pink-500/25 disabled:opacity-50"
              >
                {saving ? "Saving..." : editingSubscription ? "Save Changes" : "Add Subscription"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
