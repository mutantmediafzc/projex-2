"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { DOCUMENT_TYPES, DocumentType } from "@/lib/documentRequests";
import { supabaseClient } from "@/lib/supabaseClient";

type DocumentRequest = {
  id: string;
  user_id?: string;
  document_type: DocumentType;
  addressed_to: string | null;
  status: "pending" | "processing" | "completed" | "rejected";
  pdf_path?: string | null;
  approved_at?: string | null;
  denial_reason?: string | null;
  created_at: string;
  user?: { full_name: string | null; email: string | null } | null;
};

const statusStyles: Record<DocumentRequest["status"], string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  processing: "bg-blue-50 text-blue-700 ring-blue-600/20",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  rejected: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

type ApprovalStatus = "pending" | "completed" | "rejected";

async function getAccessToken() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session?.access_token;
}

export default function RequestDocumentsPage() {
  const [documentType, setDocumentType] = useState<DocumentType>(DOCUMENT_TYPES[0]);
  const [addressedTo, setAddressedTo] = useState("");
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<DocumentRequest[]>([]);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>("pending");
  const [approvalPage, setApprovalPage] = useState(1);
  const [approvalTotalPages, setApprovalTotalPages] = useState(1);
  const [approvalCounts, setApprovalCounts] = useState<Record<ApprovalStatus, number>>({ pending: 0, completed: 0, rejected: 0 });
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  const [activeTab, setActiveTab] = useState<"requests" | "approvals">("requests");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("You must be signed in to view document requests.");

      const response = await fetch("/api/document-requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load requests.");
      setRequests(result.requests || []);
      setCanApprove(result.canApprove === true);
      if (result.canApprove === true) {
        if (new URLSearchParams(window.location.search).get("tab") === "approvals") {
          setActiveTab("approvals");
        }
      }
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to load requests." });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadApprovals = useCallback(async () => {
    if (!canApprove) return;
    setLoadingApprovals(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("You must be signed in to view approvals.");
      const response = await fetch(`/api/document-requests?scope=approvals&status=${approvalStatus}&page=${approvalPage}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load approvals.");
      setApprovalRequests(result.requests || []);
      setApprovalTotalPages(result.pagination?.totalPages || 1);
      setApprovalCounts(result.statusCounts || { pending: 0, completed: 0, rejected: 0 });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to load approvals." });
    } finally {
      setLoadingApprovals(false);
    }
  }, [approvalPage, approvalStatus, canApprove]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    void loadApprovals();
  }, [loadApprovals]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("You must be signed in to request a document.");

      const response = await fetch("/api/document-requests", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documentType, addressedTo }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to submit request.");

      setRequests((current) => [result.request, ...current]);
      setAddressedTo("");
      setMessage({ type: "success", text: "Your document request has been submitted." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to submit request." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApproval(requestId: string, file: File | null) {
    if (!file) {
      setMessage({ type: "error", text: "Select a PDF before approving the request." });
      return;
    }
    setApprovingId(requestId);
    setMessage(null);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("You must be signed in to approve a request.");
      const formData = new FormData();
      formData.append("requestId", requestId);
      formData.append("action", "approve");
      formData.append("file", file);

      const response = await fetch("/api/document-requests", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to approve request.");

      setApprovalRequests((current) => current.filter((request) => request.id !== requestId));
      setApprovalCounts((current) => ({ ...current, pending: Math.max(0, current.pending - 1), completed: current.completed + 1 }));
      setMessage({ type: "success", text: "The PDF was attached and the request was approved." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to approve request." });
    } finally {
      setApprovingId(null);
    }
  }

  async function handleDenial(requestId: string, reason: string) {
    setApprovingId(requestId);
    setMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("You must be signed in to deny a request.");
      const formData = new FormData();
      formData.append("requestId", requestId);
      formData.append("action", "deny");
      formData.append("denialReason", reason);

      const response = await fetch("/api/document-requests", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to deny request.");

      setApprovalRequests((current) => current.filter((request) => request.id !== requestId));
      setApprovalCounts((current) => ({ ...current, pending: Math.max(0, current.pending - 1), rejected: current.rejected + 1 }));
      setMessage({ type: "success", text: "The request was denied and the employee was notified." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to deny request." });
    } finally {
      setApprovingId(null);
    }
  }

  async function downloadPdf(request: DocumentRequest) {
    setMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("You must be signed in to download the PDF.");
      const response = await fetch(`/api/document-requests/${request.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Unable to download PDF.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${request.document_type}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to download PDF." });
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-sm font-semibold text-blue-600">Employee services</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Request Documents</h1>
        <p className="mt-2 text-sm text-slate-500">Request an employment document and track its status.</p>
      </header>

      <div className="flex border-b border-slate-200" role="tablist" aria-label="Document requests">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "requests"}
          onClick={() => setActiveTab("requests")}
          className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === "requests" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          My Requests
        </button>
        {canApprove && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "approvals"}
            onClick={() => setActiveTab("approvals")}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === "approvals" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            Approvals
            {approvalCounts.pending > 0 && (
              <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                {approvalCounts.pending}
              </span>
            )}
          </button>
        )}
      </div>

      {activeTab === "requests" ? <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">New request</h2>

          <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="document-type">Document type</label>
          <select
            id="document-type"
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value as DocumentType)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            {DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>

          <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="addressed-to">
            To whom it may concern <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="addressed-to"
            value={addressedTo}
            onChange={(event) => setAddressedTo(event.target.value)}
            maxLength={200}
            placeholder="Company, embassy, bank, or person"
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          <p className="mt-2 text-xs text-slate-500">Leave this blank for a general “To Whom It May Concern” document.</p>

          {message && (
            <div className={`mt-5 rounded-xl px-4 py-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`} role="status">
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit request"}
          </button>
        </form>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">My requests</h2>
          {loading ? (
            <p className="mt-5 text-sm text-slate-500">Loading requests...</p>
          ) : requests.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">No document requests yet.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {requests.map((request) => (
                <article key={request.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{request.document_type}</h3>
                      <p className="mt-1 text-xs text-slate-500">{request.addressed_to || "General addressee"}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${statusStyles[request.status]}`}>{request.status}</span>
                  </div>
                  <p className="mt-3 text-xs text-slate-400">Requested {new Date(request.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</p>
                  {request.status === "completed" && request.pdf_path && (
                    <button
                      type="button"
                      onClick={() => void downloadPdf(request)}
                      className="mt-3 inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Download PDF
                    </button>
                  )}
                  {request.status === "rejected" && request.denial_reason && (
                    <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      <span className="font-semibold">Reason:</span> {request.denial_reason}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div> : (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Document approvals</h2>
            <p className="mt-1 text-sm text-slate-500">Review pending requests and refer back to completed approvals.</p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Approval status">
            {(["pending", "completed", "rejected"] as ApprovalStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => { setApprovalStatus(status); setApprovalPage(1); }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize transition ${approvalStatus === status ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {status} <span className={`ml-1 text-xs ${approvalStatus === status ? "text-white/70" : "text-slate-400"}`}>{approvalCounts[status]}</span>
              </button>
            ))}
          </div>

          {message && (
            <div className={`mt-5 rounded-xl px-4 py-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`} role="status">
              {message.text}
            </div>
          )}

          {loading || loadingApprovals ? (
            <p className="mt-5 text-sm text-slate-500">Loading approvals...</p>
          ) : approvalRequests.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">No document requests yet.</div>
          ) : (
            <div className="mt-5 space-y-4">
              {approvalRequests.map((request) => (
                <ApprovalRequestCard
                  key={request.id}
                  request={request}
                  submitting={approvingId === request.id}
                  onApprove={handleApproval}
                  onDeny={handleDenial}
                  onDownload={downloadPdf}
                />
              ))}
            </div>
          )}
          {!loadingApprovals && approvalTotalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={approvalPage === 1}
                onClick={() => setApprovalPage((page) => Math.max(1, page - 1))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500">Page {approvalPage} of {approvalTotalPages}</span>
              <button
                type="button"
                disabled={approvalPage === approvalTotalPages}
                onClick={() => setApprovalPage((page) => Math.min(approvalTotalPages, page + 1))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ApprovalRequestCard({
  request,
  submitting,
  onApprove,
  onDeny,
  onDownload,
}: {
  request: DocumentRequest;
  submitting: boolean;
  onApprove: (requestId: string, file: File | null) => Promise<void>;
  onDeny: (requestId: string, reason: string) => Promise<void>;
  onDownload: (request: DocumentRequest) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [showDenial, setShowDenial] = useState(false);
  const [denialReason, setDenialReason] = useState("");

  return (
    <article className="rounded-xl border border-slate-200 p-4 sm:p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h3 className="font-semibold text-slate-900">{request.document_type}</h3>
          <p className="mt-1 text-sm text-slate-600">{request.user?.full_name || request.user?.email || "Employee"}</p>
          <p className="mt-1 text-xs text-slate-500">Addressee: {request.addressed_to || "General addressee"}</p>
          <p className="mt-1 text-xs text-slate-400">Requested {new Date(request.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</p>
        </div>
        <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${statusStyles[request.status]}`}>{request.status}</span>
      </div>

      {request.status === "pending" ? <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm font-medium text-slate-700">
          Attach completed PDF
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:font-medium file:text-blue-700"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => setShowDenial((current) => !current)}
            className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
          >
            Deny
          </button>
          <button
            type="button"
            disabled={submitting || !file}
            onClick={() => void onApprove(request.id, file)}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Approve & upload"}
          </button>
        </div>
      </div> : request.status === "completed" && request.pdf_path ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            Approved {request.approved_at ? new Date(request.approved_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : ""}
          </p>
          <button
            type="button"
            onClick={() => void onDownload(request)}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
          >
            Download PDF
          </button>
        </div>
      ) : request.status === "rejected" ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-xs font-medium text-slate-500">Reason for denial</p>
          <p className="mt-1 text-sm text-slate-700">{request.denial_reason}</p>
        </div>
      ) : null}

      {request.status === "pending" && showDenial && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/50 p-4">
          <label className="text-sm font-medium text-slate-700" htmlFor={`denial-${request.id}`}>Reason for denial</label>
          <textarea
            id={`denial-${request.id}`}
            value={denialReason}
            onChange={(event) => setDenialReason(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Explain why this request is being denied"
            className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setShowDenial(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white">Cancel</button>
            <button
              type="button"
              disabled={submitting || !denialReason.trim()}
              onClick={() => void onDeny(request.id, denialReason.trim())}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Denying..." : "Confirm denial"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
