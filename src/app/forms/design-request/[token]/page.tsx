"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  type QuestionnaireAnswers,
} from "@/lib/creativeRequests";
import CreativeBriefForm from "@/components/CreativeBriefForm";

type FormConfig = {
  request_id: string;
  request_type: string;
  company_name: string;
  prefilled_answers: QuestionnaireAnswers;
  already_submitted: boolean;
};

export default function PublicDesignRequestForm() {
  const params = useParams<{ token: string }>();
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/forms/design-request/${params.token}`);
        const payload = await res.json();
        if (!mounted) return;
        if (!res.ok) {
          setError(payload.error || "Unable to load form");
          return;
        }
        setConfig(payload);
        setAnswers(payload.prefilled_answers || {});
        if (payload.already_submitted) {
          setSubmitted(true);
        }
      } catch {
        if (!mounted) return;
        setError("Unable to load form");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [params.token]);

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`/api/forms/design-request/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Unable to submit form");
      }
      setSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Unable to submit form");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
            <svg className="h-6 w-6 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6M9 9l6 6" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Form Unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-xl border border-emerald-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-6 w-6 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Thank You!</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your Creative Request Brief has been submitted successfully. The team will be in touch soon.
          </p>
        </div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-sky-50/30 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 shadow-lg shadow-sky-500/25">
            <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Creative Request Brief</h1>
          <p className="mt-1 text-sm text-slate-500">
            Fill as much as you can to prevent multiple revisions.
          </p>
        </div>

        {/* Read-only summary */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Client / Brand</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{config.company_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Request Type</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{config.request_type}</dd>
            </div>
          </div>
        </div>

        {/* Questionnaire */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <CreativeBriefForm
            prefilledAnswers={answers}
            readOnlyPrefilled
            onChange={setAnswers}
            disabled={submitting}
          />

          {submitError && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {submitError}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 hover:shadow-xl disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Submitting...
                </>
              ) : (
                "Submit Brief"
              )}
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          This form is secure and scoped to this request only.
        </p>
      </div>
    </div>
  );
}
