"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabaseClient";

interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type: "annual" | "sick" | "unpaid" | "maternity";
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  review_notes?: string | null;
  user?: { id: string; full_name: string; email: string; avatar_url: string | null };
}

export default function AdminLeavePortal() {
  const [userId, setUserId] = useState<string | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rejectingLeave, setRejectingLeave] = useState<LeaveRequest | null>(null);
  const [deletingLeave, setDeletingLeave] = useState<LeaveRequest | null>(null);
  const [denialReason, setDenialReason] = useState("");

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) setUserId(user.id);
    }
    loadUser();
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchLeaves();
  }, [userId, filter]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const statusParam = filter === "all" ? "" : `&status=${filter}`;
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch(`/api/leaves?all=true${statusParam}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to fetch leave requests");
      } else if (data.leaves) {
        setLeaves(data.leaves);
      }
    } catch (err) {
      console.error("Error fetching leaves:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (leaveId: string, action: "approved" | "rejected", reviewNotes?: string) => {
    if (!userId) return;
    setProcessing(leaveId);
    setError(null);
    setSuccess(null);
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch("/api/leaves", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ leaveId, status: action, reviewedBy: userId, reviewNotes }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Failed to process request"); return; }
      setSuccess(`Leave request ${action}!`);
      setRejectingLeave(null);
      setDenialReason("");
      fetchLeaves();
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingLeave) return;
    setProcessing(deletingLeave.id);
    setError(null);
    setSuccess(null);

    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch(`/api/leaves?leaveId=${encodeURIComponent(deletingLeave.id)}`, {
        method: "DELETE",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to delete leave request");
        return;
      }

      setSuccess(data.balanceRestored
        ? "Approved leave deleted and the used leave balance was restored."
        : "Leave request deleted.");
      setDeletingLeave(null);
      await fetchLeaves();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return "bg-emerald-100 text-emerald-700";
      case "rejected": return "bg-red-100 text-red-700";
      default: return "bg-amber-100 text-amber-700";
    }
  };

  const getLeaveTypeBadge = (type: string) => {
    switch (type) {
      case "annual": return "bg-sky-100 text-sky-700";
      case "sick": return "bg-rose-100 text-rose-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-indigo-200/50 bg-gradient-to-br from-indigo-50 via-purple-50 to-violet-50 p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-400/30">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Admin Leave Portal</h2>
            <p className="text-sm text-slate-500">Review and manage employee leave requests</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${filter === f ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/25" : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      {success && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-600">{success}</div>}

      {/* Leave Requests Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 shadow-lg backdrop-blur overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-500">Loading requests...</div>
        ) : leaves.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-500">No {filter === "all" ? "" : filter} leave requests found.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {leaves.map((leave) => (
              <div key={leave.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-100 to-purple-100 text-sm font-bold text-violet-600">
                      {leave.user?.avatar_url ? (
                        <Image src={leave.user.avatar_url} alt={leave.user.full_name || "User"} width={40} height={40} className="h-full w-full object-cover" />
                      ) : (
                        <span>{(leave.user?.full_name || "U").charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{leave.user?.full_name || leave.user?.email || "Unknown User"}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getLeaveTypeBadge(leave.leave_type)}`}>
                          {leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1)}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusBadge(leave.status)}`}>
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(leave.start_date).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" })} — {new Date(leave.end_date).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" })}
                        <span className="mx-2">•</span>
                        <span className="font-medium">{leave.days_count} day(s)</span>
                      </p>
                      {leave.reason && <p className="mt-1 text-xs text-slate-600 italic">&ldquo;{leave.reason}&rdquo;</p>}
                      {leave.status === "rejected" && leave.review_notes && (
                        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                          <span className="font-semibold">Reason for denial:</span> {leave.review_notes}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-slate-400">Submitted: {new Date(leave.created_at).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {leave.status === "pending" && (
                      <>
                      <button onClick={() => handleAction(leave.id, "approved")} disabled={processing === leave.id} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:from-emerald-600 hover:to-green-600 disabled:opacity-50">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        Approve
                      </button>
                      <button onClick={() => { setRejectingLeave(leave); setDenialReason(""); setError(null); }} disabled={processing === leave.id} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-red-500 to-rose-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:from-red-600 hover:to-rose-600 disabled:opacity-50">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        Reject
                      </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => { setDeletingLeave(leave); setError(null); }}
                      disabled={processing === leave.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-50"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" /></svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {rejectingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="deny-leave-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 id="deny-leave-title" className="text-base font-semibold text-slate-900">Deny leave request</h3>
            <p className="mt-1 text-sm text-slate-500">
              Explain why {rejectingLeave.user?.full_name || "this user"}&apos;s request is being denied.
            </p>
            <label className="mt-5 block">
              <span className="text-xs font-medium text-slate-700">Reason for denial</span>
              <textarea
                autoFocus
                required
                rows={4}
                value={denialReason}
                onChange={(event) => setDenialReason(event.target.value)}
                placeholder="Enter a clear reason for denying this request..."
                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setRejectingLeave(null); setDenialReason(""); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button
                type="button"
                disabled={!denialReason.trim() || processing === rejectingLeave.id}
                onClick={() => void handleAction(rejectingLeave.id, "rejected", denialReason)}
                className="rounded-lg bg-gradient-to-r from-red-500 to-rose-500 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processing === rejectingLeave.id ? "Denying..." : "Deny Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-leave-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 id="delete-leave-title" className="text-base font-semibold text-slate-900">Delete leave request?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This permanently deletes {deletingLeave.user?.full_name || "this user"}&apos;s {deletingLeave.leave_type} leave request for {deletingLeave.days_count} day(s).
              {deletingLeave.status === "approved" && ["annual", "sick", "maternity"].includes(deletingLeave.leave_type)
                ? " The days will be returned to their unused leave balance."
                : ""}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeletingLeave(null)} disabled={processing === deletingLeave.id} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={() => void handleDelete()} disabled={processing === deletingLeave.id} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                {processing === deletingLeave.id ? "Deleting..." : "Delete Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Calendar Summary */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-lg backdrop-blur">
        <h3 className="text-sm font-semibold text-slate-900">Team Availability Overview</h3>
        <p className="mt-1 text-xs text-slate-500">Quick view of approved leaves for this month</p>
        <div className="mt-4 rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">
          <svg className="mx-auto h-8 w-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          <p className="mt-2">Team calendar integration coming soon</p>
        </div>
      </div>
    </div>
  );
}
