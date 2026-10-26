"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  DESIGN_REQUEST_STATUSES,
  DESIGN_REQUEST_STATUS_LABELS,
  DESIGN_REQUEST_STATUS_COLORS,
  type CreativeRequestRow,
  type DesignRequestStatus,
} from "@/lib/creativeRequests";

export default function DesignRequestsPage() {
  const [requests, setRequests] = useState<CreativeRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [sortBy, setSortBy] = useState<"created_at" | "deadline">("created_at");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const authFetch = useCallback(async (url: string, init?: RequestInit) => {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    return fetch(url, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (assigneeFilter) params.set("assigned_to", assigneeFilter);
      params.set("sort", sortBy);
      const res = await authFetch(`/api/design-requests?${params}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Unable to load requests");
      setRequests(payload.requests || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load requests");
    } finally {
      setLoading(false);
    }
  }, [authFetch, search, statusFilter, assigneeFilter, sortBy]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [load]);

  const assignees = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of requests) {
      if (r.assigned_to && r.assigned_to_name) {
        map.set(r.assigned_to, r.assigned_to_name);
      }
    }
    return Array.from(map.entries());
  }, [requests]);

  function copyLink(req: CreativeRequestRow) {
    if (!req.public_token) return;
    const url = `${window.location.origin}/forms/design-request/${req.public_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(req.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="relative">
        <div className="pointer-events-none absolute -top-10 right-0 h-[300px] w-[400px] overflow-hidden opacity-50">
          <div className="absolute top-0 right-0 h-[250px] w-[350px] rounded-full bg-gradient-to-br from-sky-200/60 to-cyan-200/40 blur-3xl" />
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 shadow-lg shadow-sky-500/30">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                <path d="M2 2l7.586 7.586" />
                <circle cx="11" cy="11" r="2" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Design Requests</h1>
              <p className="text-[13px] text-slate-500">
                {requests.length} creative request{requests.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Link
            href="/design-requests/new"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2 text-[13px] font-medium text-white shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/30 transition-all"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Generate New Design Request
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Client / Brand or request type..."
            className="h-9 w-64 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-black placeholder:text-slate-400 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-slate-500">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-black shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="">All Statuses</option>
            {DESIGN_REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>{DESIGN_REQUEST_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-slate-500">Assigned</span>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-black shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="">All Assignees</option>
            {assignees.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-slate-500">Sort</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "created_at" | "deadline")}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-black shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="created_at">Created (newest)</option>
            <option value="deadline">Deadline (soonest)</option>
          </select>
        </div>
        {(search || statusFilter || assigneeFilter) && (
          <button
            type="button"
            onClick={() => { setSearch(""); setStatusFilter(""); setAssigneeFilter(""); }}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Request ID</th>
                <th className="px-4 py-3">Client / Brand</th>
                <th className="px-4 py-3">Request Type</th>
                <th className="px-4 py-3">Requested By</th>
                <th className="px-4 py-3">Assigned To</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">Loading...</td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-rose-600">{error}</td>
                </tr>
              )}
              {!loading && !error && requests.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No design requests yet. Click <strong>Generate New Design Request</strong> to create one.
                  </td>
                </tr>
              )}
              {!loading && !error && requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {req.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {req.company_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{req.request_type}</td>
                  <td className="px-4 py-3 text-slate-700">{req.requested_by_name || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{req.assigned_to_name || "—"}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {req.deadline
                      ? new Date(req.deadline).toLocaleDateString()
                      : req.deadline_notes || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${DESIGN_REQUEST_STATUS_COLORS[req.status as DesignRequestStatus] || "bg-slate-100 text-slate-700"}`}>
                      {DESIGN_REQUEST_STATUS_LABELS[req.status as DesignRequestStatus] || req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(req.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/design-requests/${req.id}`}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-sky-50 hover:text-sky-600"
                        title="View"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </Link>
                      {req.public_token && (
                        <button
                          type="button"
                          onClick={() => copyLink(req)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-violet-50 hover:text-violet-600"
                          title="Copy public form link"
                        >
                          {copiedId === req.id ? (
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
