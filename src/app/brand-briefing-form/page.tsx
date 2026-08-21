"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type Submission = {
  id: string;
  company: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_country_code: string | null;
  mobile: string | null;
  mobile_with_country_code: string | null;
  brand_brief: Record<string, unknown>;
  objectives: Record<string, unknown>;
  challenges: Record<string, unknown>;
  current_marketing_activities: Record<string, unknown>;
  goals: Record<string, unknown>;
  service_requirements: Record<string, unknown>;
  question_answers: QuestionAnswer[];
  metadata: Record<string, unknown>;
  created_at: string;
};

type QuestionAnswer = {
  id: string;
  sectionKey: string;
  sectionTitle: string;
  question: string;
  answer: unknown;
};

function labelize(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

function renderValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function Section({
  title,
  data,
}: {
  title: string;
  data: Record<string, unknown>;
}) {
  const entries = Object.entries(data || {});
  if (entries.length === 0) return null;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      <dl className="space-y-2.5">
        {entries.map(([key, value]) => (
          <div key={key}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {labelize(key)}
            </dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">
              {renderValue(value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function QuestionAnswerSection({
  title,
  entries,
}: {
  title: string;
  entries: QuestionAnswer[];
}) {
  if (entries.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      <dl className="space-y-2.5">
        {entries.map((entry) => (
          <div key={entry.id}>
            <dt className="text-xs font-semibold text-slate-500">
              {entry.question}
            </dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">
              {renderValue(entry.answer)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function BrandBriefingFormPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Submission | null>(null);

  const authFetch = useCallback(async (url: string) => {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    return fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await authFetch("/api/brand-briefing-form-fetch");
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to load submissions");
      }
      setSubmissions(payload.submissions || []);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to load submissions",
      );
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return submissions;
    return submissions.filter((submission) =>
      [submission.company, submission.full_name, submission.email]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query)),
    );
  }, [submissions, search]);

  const selectedQuestionSections = useMemo(() => {
    const sections = new Map<string, { title: string; entries: QuestionAnswer[] }>();
    for (const entry of selected?.question_answers || []) {
      const current = sections.get(entry.sectionKey);
      if (current) {
        current.entries.push(entry);
      } else {
        sections.set(entry.sectionKey, {
          title: entry.sectionTitle,
          entries: [entry],
        });
      }
    }
    return Array.from(sections.values());
  }, [selected]);

  return (
    <main className="min-h-full bg-slate-50 px-5 py-6 sm:px-8">
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
              Brand Briefing Form
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Submissions
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Submissions received from the brand briefing form.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
              <strong className="text-slate-900">{filtered.length}</strong>
              {filtered.length !== submissions.length
                ? ` of ${submissions.length}`
                : ""}{" "}
              submissions
            </div>
          </div>
        </div>

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by company, name, or email..."
          className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-violet-400 focus:outline-none"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Mobile</th>
              <th className="px-4 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No submissions yet.
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((submission) => (
                <tr
                  key={submission.id}
                  onClick={() => setSelected(submission)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {submission.company || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {submission.full_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {submission.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {submission.mobile_with_country_code || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(submission.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {selected.company || selected.full_name || "Submission"}
                </h2>
                <p className="text-sm text-slate-500">
                  Submitted {new Date(selected.created_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <Section
                title="Contact"
                data={{
                  fullName: selected.full_name,
                  email: selected.email,
                  mobile: selected.mobile_with_country_code,
                }}
              />
              {selectedQuestionSections.length > 0 ? (
                selectedQuestionSections.map((section) => (
                  <QuestionAnswerSection
                    key={section.title}
                    title={section.title}
                    entries={section.entries}
                  />
                ))
              ) : (
                <>
                  <Section title="Brand Brief" data={selected.brand_brief} />
                  <Section title="Objectives" data={selected.objectives} />
                  <Section title="Challenges" data={selected.challenges} />
                  <Section
                    title="Current Marketing Activities"
                    data={selected.current_marketing_activities}
                  />
                  <Section title="Goals" data={selected.goals} />
                  <Section
                    title="Service Requirements"
                    data={selected.service_requirements}
                  />
                </>
              )}
              <Section title="Metadata" data={selected.metadata} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
