"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  REQUEST_TYPES,
  type QuestionnaireAnswers,
} from "@/lib/creativeRequests";
import CreativeBriefForm from "@/components/CreativeBriefForm";

type Company = { id: string; name: string };
type User = { id: string; full_name: string | null; email: string | null };

export default function NewDesignRequestPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // Config fields
  const [companyId, setCompanyId] = useState("");
  const [requestType, setRequestType] = useState("");
  const [customRequestType, setCustomRequestType] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [deadline, setDeadline] = useState("");
  const [deadlineNotes, setDeadlineNotes] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");

  // Mode: "internal" or "public"
  const [mode, setMode] = useState<"internal" | "public" | "">("");

  // Internal answers
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});

  // Generated public link
  const [publicLink, setPublicLink] = useState("");

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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();

        // Fetch companies + users via API route (service-role client bypasses RLS)
        const res = await authFetch("/api/design-requests/options");
        const payload = await res.json();
        if (mounted) {
          setCompanies((payload.companies as Company[]) || []);
          setUsers((payload.users as User[]) || []);
        }

        // Resolve current user's name from the users list (avoids RLS on direct query)
        if (user && mounted) {
          const me = (payload.users as User[])?.find((u) => u.id === user.id);
          setCurrentUserName(me?.full_name || me?.email || user.email || "");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const finalRequestType = requestType === "Other" ? customRequestType.trim() || "Other" : requestType;

  const prefilledAnswers: QuestionnaireAnswers = {
    client_brand: companies.find((c) => c.id === companyId)?.name || "",
    request_type: finalRequestType,
    request_owner: currentUserName,
  };

  async function handleSubmit() {
    setError("");
    if (!companyId) { setError("Client / Brand is required"); return; }
    if (!requestType) { setError("Request Type is required"); return; }
    if (requestType === "Other" && !customRequestType.trim()) { setError("Please specify the custom request type"); return; }
    if (!mode) { setError("Choose Fill Internally or Share With Client"); return; }

    setSubmitting(true);
    try {
      const res = await authFetch("/api/design-requests", {
        method: "POST",
        body: JSON.stringify({
          company_id: companyId,
          request_type: finalRequestType,
          assigned_to: assignedTo || undefined,
          deadline: deadline || undefined,
          deadline_notes: deadlineNotes || undefined,
          fill_internally: mode === "internal",
          share_with_client: mode === "public",
          answers: mode === "internal" ? { ...answers } : undefined,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Unable to create request");

      if (mode === "public" && payload.public_token) {
        const url = `${window.location.origin}/forms/design-request/${payload.public_token}`;
        setPublicLink(url);
        setToast("Request created! Share the link below with your client.");
      } else {
        setToast("Request created successfully!");
        setTimeout(() => router.push(`/design-requests/${payload.id}`), 800);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create request");
    } finally {
      setSubmitting(false);
    }
  }

  function copyPublicLink() {
    navigator.clipboard.writeText(publicLink).then(() => {
      setToast("Link copied to clipboard!");
      setTimeout(() => setToast(""), 2000);
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500" />
      </div>
    );
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
            <h1 className="text-xl font-semibold text-slate-900">Generate New Design Request</h1>
            <p className="text-[13px] text-slate-500">Configure the request, then fill it internally or share with a client.</p>
          </div>
        </div>
      </div>

      {toast && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {toast}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Config section */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Request Configuration</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Client / Brand — single dropdown */}
          <div>
            <label className="block text-sm font-semibold text-slate-800">
              Client / Brand <span className="text-rose-500">*</span>
            </label>
            <p className="mt-0.5 text-xs text-slate-500">Who is this for?</p>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="">Select a company / brand...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Request Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-800">
              Request Type <span className="text-rose-500">*</span>
            </label>
            <p className="mt-0.5 text-xs text-slate-500">What are we creating?</p>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="">Select a request type...</option>
              {REQUEST_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {requestType === "Other" && (
              <input
                type="text"
                value={customRequestType}
                onChange={(e) => setCustomRequestType(e.target.value)}
                placeholder="Specify the request type..."
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            )}
          </div>

          {/* Requested By (read-only, defaults to current user) */}
          <div>
            <label className="block text-sm font-semibold text-slate-800">Requested By</label>
            <p className="mt-0.5 text-xs text-slate-500">Who should Creative go back to for questions?</p>
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              {currentUserName || "—"}
            </div>
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-semibold text-slate-800">Assigned To</label>
            <p className="mt-0.5 text-xs text-slate-500">Design or Content team member responsible</p>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email || "Unknown"}
                </option>
              ))}
            </select>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-semibold text-slate-800">Deadline</label>
            <p className="mt-0.5 text-xs text-slate-500">When is the first draft / final needed?</p>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          {/* Deadline Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-800">Deadline Notes</label>
            <p className="mt-0.5 text-xs text-slate-500">Optional — e.g. TBA, approximate date</p>
            <input
              type="text"
              value={deadlineNotes}
              onChange={(e) => setDeadlineNotes(e.target.value)}
              placeholder="e.g. TBA, 3rd week of October"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        </div>
      </section>

      {/* Mode selection */}
      {!publicLink && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">How to Complete the Brief</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("internal")}
              className={`rounded-xl border-2 p-5 text-left transition-all ${
                mode === "internal"
                  ? "border-sky-400 bg-sky-50 ring-2 ring-sky-200"
                  : "border-slate-200 bg-white hover:border-sky-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M9 13h6M9 17h6" />
                </svg>
                <h3 className="text-sm font-bold text-slate-900">Fill Internally</h3>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Complete the Creative Request Brief questionnaire directly inside Cream CRM. The request is saved and the assigned team member is notified.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("public")}
              className={`rounded-xl border-2 p-5 text-left transition-all ${
                mode === "public"
                  ? "border-violet-400 bg-violet-50 ring-2 ring-violet-200"
                  : "border-slate-200 bg-white hover:border-violet-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <h3 className="text-sm font-bold text-slate-900">Share With Client</h3>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Generate a secure public form link. The external client opens it without logging in, completes the questionnaire, and the answers appear in Cream CRM.
              </p>
            </button>
          </div>
        </section>
      )}

      {/* Internal questionnaire */}
      {mode === "internal" && !publicLink && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
            Creative Request Brief
          </h2>
          <CreativeBriefForm
            prefilledAnswers={prefilledAnswers}
            readOnlyPrefilled
            onChange={setAnswers}
            disabled={submitting}
          />
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => router.push("/design-requests")}
              className="rounded-full bg-slate-100 px-5 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-200"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-2.5 text-[13px] font-medium text-white shadow-lg shadow-sky-500/25 hover:shadow-xl disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving...
                </>
              ) : (
                "Submit Brief"
              )}
            </button>
          </div>
        </section>
      )}

      {/* Public link result */}
      {publicLink && (
        <section className="rounded-xl border border-violet-200 bg-violet-50 p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-violet-700">Public Form Link Generated</h2>
          <p className="mb-4 text-xs text-violet-600">
            Share this link with your client. They can complete the Creative Request Brief without logging in.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={publicLink}
              className="flex-1 rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-sm text-slate-800"
            />
            <button
              type="button"
              onClick={copyPublicLink}
              className="rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-600"
            >
              Copy Link
            </button>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/design-requests")}
              className="rounded-full bg-white px-5 py-2.5 text-[13px] font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Back to Design Requests
            </button>
          </div>
        </section>
      )}

      {/* Submit for public mode (no questionnaire shown) */}
      {mode === "public" && !publicLink && (
        <section className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/design-requests")}
            className="rounded-full bg-slate-100 px-5 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-200"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 px-5 py-2.5 text-[13px] font-medium text-white shadow-lg shadow-violet-500/25 hover:shadow-xl disabled:opacity-60"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Generating...
              </>
            ) : (
              "Generate Public Form Link"
            )}
          </button>
        </section>
      )}
    </main>
  );
}
