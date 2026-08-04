"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

const COLUMNS = [
  ["new_lead", "New Lead"], ["contacted_initially", "Contacted Initially"],
  ["follow_up", "Follow-up"], ["qualified", "Qualified"],
  ["call_booked", "Call Booked / Meeting Set"], ["proposal_sent", "Proposal Sent"],
  ["for_invoicing", "For Invoicing"], ["won", "Won"], ["lost", "Lost"],
] as const;

type LeadStatus = (typeof COLUMNS)[number][0];
type Answer = { id: string; question: string; answer: string | number | string[] | null };
type CRMUser = { id: string; full_name: string | null; email: string };
type StatusHistory = { id: string; submission_id: string; from_status: LeadStatus | null; to_status: LeadStatus; changed_by_email: string | null; changed_at: string };
type Lead = {
  id: string; form_slug: "mm26-aeo" | "mm26-pm"; source_url: string; website: string;
  email: string; questionnaire: Answer[]; metadata: Record<string, unknown>; created_at: string;
  lead_status: LeadStatus; lead_status_updated_at: string;
  assigned_user_id: string | null; assigned_at: string | null;
  status_history: StatusHistory[];
};

const statusLabel = (status: LeadStatus | null) => COLUMNS.find(([value]) => value === status)?.[1] || "New Lead";

function answer(lead: Lead, id: string) {
  return lead.questionnaire.find((item) => item.id === id)?.answer;
}

function leadName(lead: Lead) {
  return String(answer(lead, "fullName") || `${answer(lead, "firstName") || ""} ${answer(lead, "lastName") || ""}`.trim() || lead.email);
}

export default function LMSPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<CRMUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [answersExpanded, setAnswersExpanded] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const authFetch = useCallback(async (url: string, init?: RequestInit) => {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("You need to be signed in.");
    return fetch(url, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${token}` } });
  }, []);

  useEffect(() => {
    authFetch("/api/lms")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load leads.");
        setLeads(result.leads);
        setUsers(result.users);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load leads."))
      .finally(() => setLoading(false));
  }, [authFetch]);

  const grouped = useMemo(() => Object.fromEntries(COLUMNS.map(([status]) => [status, leads.filter((lead) => lead.lead_status === status)])), [leads]);

  async function moveLead(id: string, status: LeadStatus) {
    const previous = leads;
    setLeads((items) => items.map((lead) => lead.id === id ? { ...lead, lead_status: status } : lead));
    setDraggedId(null);
    try {
      const response = await authFetch("/api/lms", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to move lead.");
      if (result.history) {
        setLeads((items) => items.map((lead) => lead.id === id ? { ...lead, status_history: [result.history, ...lead.status_history] } : lead));
      }
    } catch (reason) {
      setLeads(previous);
      setError(reason instanceof Error ? reason.message : "Unable to move lead.");
    }
  }

  async function assignLead(lead: Lead, assignedUserId: string | null) {
    const previous = lead.assigned_user_id;
    setLeads((items) => items.map((item) => item.id === lead.id ? { ...item, assigned_user_id: assignedUserId } : item));
    setSelected((item) => item?.id === lead.id ? { ...item, assigned_user_id: assignedUserId } : item);
    setError("");
    try {
      const response = await authFetch("/api/lms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, assignedUserId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to assign lead.");
    } catch (reason) {
      setLeads((items) => items.map((item) => item.id === lead.id ? { ...item, assigned_user_id: previous } : item));
      setSelected((item) => item?.id === lead.id ? { ...item, assigned_user_id: previous } : item);
      setError(reason instanceof Error ? reason.message : "Unable to assign lead.");
    }
  }

  return (
    <main className="min-h-full bg-slate-50 px-5 py-6 sm:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">Lead Management System</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Campaign Leads</h1><p className="mt-1 text-sm text-slate-500">Drag a lead to update its pipeline stage.</p></div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm"><strong className="text-slate-900">{leads.length}</strong> total leads</div>
      </div>
      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {loading ? <div className="py-20 text-center text-sm text-slate-500">Loading leads…</div> : (
        <div className="overflow-x-auto pb-5">
          <div className="flex min-w-max gap-4">
            {COLUMNS.map(([status, label]) => (
              <section key={status} className="w-72 rounded-2xl border border-slate-200 bg-slate-100/70 p-3" onDragOver={(event) => event.preventDefault()} onDrop={() => draggedId && moveLead(draggedId, status)}>
                <header className="mb-3 flex items-center justify-between px-1"><h2 className="text-sm font-semibold text-slate-700">{label}</h2><span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 shadow-sm">{grouped[status].length}</span></header>
                <div className="min-h-32 space-y-3">
                  {grouped[status].map((lead) => (
                    <button key={lead.id} draggable onDragStart={() => setDraggedId(lead.id)} onClick={() => { setSelected(lead); setAnswersExpanded(false); }} className="block w-full cursor-grab rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md active:cursor-grabbing">
                      <div className="mb-2 flex items-start justify-between gap-2"><span className="font-semibold text-slate-900">{leadName(lead)}</span><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${lead.form_slug === "mm26-aeo" ? "bg-teal-50 text-teal-700" : "bg-orange-50 text-orange-700"}`}>{lead.form_slug.replace("mm26-", "")}</span></div>
                      <p className="truncate text-xs text-slate-500">{lead.email}</p><p className="mt-1 truncate text-xs text-slate-500">{lead.website}</p>
                      {lead.assigned_user_id && <p className="mt-2 truncate text-[11px] font-medium text-violet-600">Assigned to {users.find((user) => user.id === lead.assigned_user_id)?.full_name || users.find((user) => user.id === lead.assigned_user_id)?.email}</p>}
                      <p className="mt-3 text-[11px] text-slate-400">{new Date(lead.created_at).toLocaleDateString()}</p>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
          <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div><h2 className="text-xl font-bold text-slate-900">{leadName(selected)}</h2><p className="text-sm text-slate-500">{selected.email}</p></div>
              <button onClick={() => setSelected(null)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-500 hover:bg-slate-200">Close</button>
            </div>
            <section className="mb-5 rounded-xl border border-slate-200 bg-white">
              <button type="button" onClick={() => setAnswersExpanded((value) => !value)} aria-expanded={answersExpanded} className="flex w-full items-center justify-between gap-3 p-4 text-left"><div><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Questionnaire answers</h3><p className="mt-1 text-xs text-slate-500">{selected.questionnaire.length} submitted answers</p></div><svg className={`h-5 w-5 text-slate-500 transition-transform ${answersExpanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg></button>
              {answersExpanded && <div className="space-y-3 border-t border-slate-100 p-4">{selected.questionnaire.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-medium text-slate-500">{item.question}</p><p className="mt-1 text-sm text-slate-900">{Array.isArray(item.answer) ? item.answer.join(", ") : String(item.answer ?? "—")}</p></div>)}</div>}
            </section>
            <section className="mb-5 rounded-xl border border-violet-100 bg-violet-50/60 p-4">
              <label htmlFor="lead-assignee" className="block text-xs font-semibold uppercase tracking-wider text-violet-700">Assigned user</label><p className="mt-1 text-xs text-slate-500">Choose the team member responsible for this lead.</p><select id="lead-assignee" value={selected.assigned_user_id || ""} onChange={(event) => assignLead(selected, event.target.value || null)} className="mt-3 w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"><option value="">Unassigned</option>{users.map((user) => <option key={user.id} value={user.id}>{user.full_name || user.email}{user.full_name ? ` (${user.email})` : ""}</option>)}</select>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Status history</h3><div className="mt-4 space-y-0">{selected.status_history.map((entry) => <div key={entry.id} className="relative border-l-2 border-violet-200 pb-5 pl-5 last:pb-1"><span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-violet-500"/><p className="text-sm font-medium text-slate-800">Moved from {statusLabel(entry.from_status)} to {statusLabel(entry.to_status)}</p><p className="mt-1 text-xs text-slate-500">{new Date(entry.changed_at).toLocaleString()}{entry.changed_by_email ? ` by ${entry.changed_by_email}` : ""}</p></div>)}<div className="relative border-l-2 border-slate-200 pl-5"><span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-slate-400"/><p className="text-sm font-medium text-slate-700">Lead created in New Lead</p><p className="mt-1 text-xs text-slate-500">{new Date(selected.created_at).toLocaleString()}</p></div></div>
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
