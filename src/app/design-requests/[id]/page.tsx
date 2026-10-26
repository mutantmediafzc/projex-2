"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  DESIGN_REQUEST_STATUSES,
  DESIGN_REQUEST_STATUS_LABELS,
  DESIGN_REQUEST_STATUS_COLORS,
  QUESTIONNAIRE_FIELDS,
  QUESTIONNAIRE_SECTIONS,
  isValidDeliverableUrl,
  type CreativeRequestRow,
  type CreativeRequestResponseRow,
  type DesignRequestStatus,
  type QuestionnaireField,
} from "@/lib/creativeRequests";

export default function DesignRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<CreativeRequestRow | null>(null);
  const [responses, setResponses] = useState<CreativeRequestResponseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // Response form
  const [comment, setComment] = useState("");
  const [deliverableUrl, setDeliverableUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Internal notes editing
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const authFetch = useCallback(async (url: string, init?: RequestInit) => {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    return fetch(url, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`/api/design-requests/${params.id}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Unable to load request");
      setRequest(payload.request);
      setResponses(payload.responses || []);
      setNotesValue(payload.request?.internal_notes || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load request");
    } finally {
      setLoading(false);
    }
  }, [authFetch, params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(id);
  }, [toast]);

  async function handleStatusChange(status: DesignRequestStatus) {
    setUpdatingStatus(true);
    try {
      const res = await authFetch(`/api/design-requests/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Update failed");
      setRequest((prev) => prev ? { ...prev, status } : prev);
      setToast("Status updated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      const res = await authFetch(`/api/design-requests/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify({ internal_notes: notesValue }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Update failed");
      setRequest((prev) => prev ? { ...prev, internal_notes: notesValue } : prev);
      setEditingNotes(false);
      setToast("Internal notes saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleAddResponse() {
    const c = comment.trim();
    const url = deliverableUrl.trim();
    if (!c && !url) { setError("Provide a comment or deliverable link"); return; }
    if (url && !isValidDeliverableUrl(url)) {
      setError("Deliverable link must be a valid HTTPS URL from Dropbox, Google Drive, Google Sheets, OneDrive, SharePoint, WeTransfer, or Box.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await authFetch(`/api/design-requests/${params.id}/responses`, {
        method: "POST",
        body: JSON.stringify({ comment: c || undefined, deliverable_url: url || undefined }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Unable to save response");
      setResponses((prev) => [...prev, payload.response]);
      setComment("");
      setDeliverableUrl("");
      setToast("Response saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save response");
    } finally {
      setSubmitting(false);
    }
  }

  function copyPublicLink() {
    if (!request?.public_token) return;
    const url = `${window.location.origin}/forms/design-request/${request.public_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setToast("Public link copied!");
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500" />
      </div>
    );
  }

  if (error && !request) {
    return (
      <main className="space-y-4">
        <button
          type="button"
          onClick={() => router.push("/design-requests")}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      </main>
    );
  }

  if (!request) return null;

  const answers = request.answers || {};
  const fieldsBySection = QUESTIONNAIRE_SECTIONS.map((section) => ({
    section,
    fields: QUESTIONNAIRE_FIELDS.filter((f) => f.section === section),
  }));

  function renderAnswer(field: QuestionnaireField) {
    const value = answers[field.id];
    if (field.type === "links" && Array.isArray(value)) {
      return (
        <div className="space-y-1">
          {value.map((url, idx) => (
            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block truncate text-sky-600 hover:text-sky-700 hover:underline">
              {url}
            </a>
          ))}
        </div>
      );
    }
    if (!value) return <span className="text-slate-400">—</span>;
    return <span className="whitespace-pre-wrap text-slate-700">{String(value)}</span>;
  }

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/design-requests")}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {request.company_name || "Design Request"}
            </h1>
            <p className="text-[13px] text-slate-500">
              Request ID: <span className="font-mono">{request.id.slice(0, 8)}</span>
              {" • "}
              {request.submission_source === "public" ? "Public submission" : "Internal submission"}
            </p>
          </div>
        </div>
        {request.public_token && (
          <button
            type="button"
            onClick={copyPublicLink}
            className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-2 text-[13px] font-medium text-violet-700 hover:bg-violet-200"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Copy Public Link
          </button>
        )}
      </div>

      {toast && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{toast}</div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {/* Summary card */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Client / Brand</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{request.company_name || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Request Type</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{request.request_type}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Requested By</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{request.requested_by_name || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Assigned To</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{request.assigned_to_name || "Unassigned"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Deadline</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {request.deadline ? new Date(request.deadline).toLocaleDateString() : request.deadline_notes || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Submitted</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {request.submitted_at ? new Date(request.submitted_at).toLocaleString() : "Not yet submitted"}
            </dd>
          </div>
        </div>

        {/* Status control */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</span>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${DESIGN_REQUEST_STATUS_COLORS[request.status as DesignRequestStatus]}`}>
              {DESIGN_REQUEST_STATUS_LABELS[request.status as DesignRequestStatus]}
            </span>
            <select
              value={request.status}
              onChange={(e) => void handleStatusChange(e.target.value as DesignRequestStatus)}
              disabled={updatingStatus}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              {DESIGN_REQUEST_STATUSES.map((s) => (
                <option key={s} value={s}>{DESIGN_REQUEST_STATUS_LABELS[s]}</option>
              ))}
            </select>
            {updatingStatus && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-200 border-t-sky-500" />
            )}
          </div>
        </div>
      </section>

      {/* Questionnaire answers */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
          Creative Request Brief
        </h2>
        {request.submitted_at ? (
          <div className="space-y-8">
            {fieldsBySection.map(({ section, fields }) => (
              <div key={section}>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
                  {section === "REQUEST" ? "A. REQUEST" :
                   section === "BRAND" ? "B. BRAND" :
                   section === "MESSAGE" ? "C. MESSAGE" :
                   section === "CREATIVE" ? "D. CREATIVE" :
                   section === "CONTENT" ? "E. CONTENT" :
                   "F. OUTPUT"}
                </h3>
                <dl className="space-y-3">
                  {fields.map((field) => (
                    <div key={field.id}>
                      <dt className="text-sm font-semibold text-slate-800">{field.label}</dt>
                      <dd className="mt-0.5 text-sm">{renderAnswer(field)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
            This request is <strong>Waiting for Brief</strong>. The questionnaire has not been submitted yet.
            {request.public_token && (
              <>
                {" "}Share the public form link with the client so they can complete it.
              </>
            )}
          </div>
        )}
      </section>

      {/* Internal notes */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Internal Notes</h2>
          {!editingNotes && (
            <button
              type="button"
              onClick={() => { setNotesValue(request.internal_notes || ""); setEditingNotes(true); }}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100"
            >
              Edit
            </button>
          )}
        </div>
        {editingNotes ? (
          <div className="mt-3 space-y-3">
            <textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              rows={4}
              placeholder="Internal notes visible only to authorized CRM users..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="rounded-full bg-sky-500 px-4 py-2 text-[13px] font-medium text-white hover:bg-sky-600 disabled:opacity-60"
              >
                {savingNotes ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditingNotes(false)}
                className="rounded-full bg-slate-100 px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
            {request.internal_notes || <span className="text-slate-400">No internal notes yet.</span>}
          </p>
        )}
      </section>

      {/* Responses (comments + deliverable links) */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
          Comments & Deliverable Links
        </h2>

        {/* Existing responses */}
        {responses.length > 0 ? (
          <div className="space-y-3">
            {responses.map((r) => (
              <div key={r.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">{r.user_name || "Unknown"}</span>
                  <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                {r.comment && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{r.comment}</p>
                )}
                {r.deliverable_url && (
                  <a
                    href={r.deliverable_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-2 rounded-lg bg-sky-100 px-3 py-1.5 text-sm text-sky-700 hover:bg-sky-200"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    View Deliverable
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No responses yet.</p>
        )}

        {/* Add response form */}
        <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Add a comment..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={deliverableUrl}
              onChange={(e) => setDeliverableUrl(e.target.value)}
              placeholder="Deliverable link (Dropbox, Google Drive, etc.)"
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
            <button
              type="button"
              onClick={handleAddResponse}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-2.5 text-[13px] font-medium text-white shadow-lg shadow-sky-500/25 hover:shadow-xl disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving...
                </>
              ) : (
                "Save Response"
              )}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
