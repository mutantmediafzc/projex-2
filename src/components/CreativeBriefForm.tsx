"use client";

import { useMemo, useState } from "react";
import {
  QUESTIONNAIRE_FIELDS,
  QUESTIONNAIRE_SECTIONS,
  type QuestionnaireAnswers,
  type QuestionnaireField,
  type QuestionnaireFieldId,
} from "@/lib/creativeRequests";

type Props = {
  prefilledAnswers: QuestionnaireAnswers;
  readOnlyPrefilled?: boolean;
  onChange?: (answers: QuestionnaireAnswers) => void;
  disabled?: boolean;
};

export default function CreativeBriefForm({
  prefilledAnswers,
  readOnlyPrefilled = false,
  onChange,
  disabled = false,
}: Props) {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(prefilledAnswers);
  const [linkInputs, setLinkInputs] = useState<Record<string, string>>({});

  function update(fieldId: QuestionnaireFieldId | string, value: string | string[]) {
    const next = { ...answers, [fieldId]: value } as QuestionnaireAnswers;
    setAnswers(next);
    onChange?.(next);
  }

  function addLink(fieldId: QuestionnaireFieldId) {
    const url = (linkInputs[fieldId] || "").trim();
    if (!url) return;
    const existing = (answers[fieldId] as string[] | undefined) || [];
    if (!existing.includes(url)) {
      update(fieldId, [...existing, url]);
    }
    setLinkInputs((prev) => ({ ...prev, [fieldId]: "" }));
  }

  function removeLink(fieldId: QuestionnaireFieldId, url: string) {
    const existing = (answers[fieldId] as string[] | undefined) || [];
    update(
      fieldId,
      existing.filter((u) => u !== url),
    );
  }

  const fieldsBySection = useMemo(() => {
    const map = new Map<string, QuestionnaireField[]>();
    for (const section of QUESTIONNAIRE_SECTIONS) {
      map.set(section, []);
    }
    for (const field of QUESTIONNAIRE_FIELDS) {
      map.get(field.section)?.push(field);
    }
    return map;
  }, []);

  return (
    <div className="space-y-8">
      {QUESTIONNAIRE_SECTIONS.map((section) => {
        const fields = fieldsBySection.get(section) || [];
        if (fields.length === 0) return null;
        return (
          <section key={section}>
            <div className="mb-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
                {section === "REQUEST" ? "A. REQUEST" :
                 section === "BRAND" ? "B. BRAND" :
                 section === "MESSAGE" ? "C. MESSAGE" :
                 section === "CREATIVE" ? "D. CREATIVE" :
                 section === "CONTENT" ? "E. CONTENT" :
                 "F. OUTPUT"}
              </h3>
              <div className="mt-1 h-px bg-gradient-to-r from-violet-200 to-transparent" />
            </div>
            <div className="space-y-5">
              {fields.map((field) => {
                const isPrefilled = field.prefilled && readOnlyPrefilled;
                const value = answers[field.id];
                return (
                  <div key={field.id}>
                    <label className="block text-sm font-semibold text-slate-800">
                      {field.label}
                    </label>
                    <p className="mt-0.5 text-xs text-slate-500">{field.helper}</p>

                    {isPrefilled ? (
                      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                        {(value as string) || "—"}
                      </div>
                    ) : field.type === "textarea" ? (
                      <textarea
                        value={(value as string) || ""}
                        onChange={(e) => update(field.id, e.target.value)}
                        disabled={disabled}
                        rows={3}
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-50"
                        placeholder="Enter details..."
                      />
                    ) : field.type === "select" ? (
                      <select
                        value={(value as string) || ""}
                        onChange={(e) => update(field.id, e.target.value)}
                        disabled={disabled}
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-50"
                      >
                        <option value="">Select...</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === "date" ? (
                      <div className="mt-2 space-y-2">
                        <input
                          type="date"
                          value={(value as string) || ""}
                          onChange={(e) => update(field.id, e.target.value)}
                          disabled={disabled}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-50"
                        />
                        <input
                          type="text"
                          value={((answers as Record<string, string | string[] | undefined>)[`${field.id}_notes`] as string) || ""}
                          onChange={(e) => update(`${field.id}_notes`, e.target.value)}
                          disabled={disabled}
                          placeholder="Or add a note (e.g. TBA, October 5)"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-50"
                        />
                      </div>
                    ) : field.type === "links" ? (
                      <div className="mt-2 space-y-2">
                        {((value as string[]) || []).map((url, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 truncate rounded-lg border border-slate-200 bg-sky-50 px-3 py-2 text-sm text-sky-700 hover:bg-sky-100"
                            >
                              {url}
                            </a>
                            {!disabled && (
                              <button
                                type="button"
                                onClick={() => removeLink(field.id, url)}
                                className="rounded-lg px-2 py-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18 6 6 18M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                        {!disabled && (
                          <div className="flex items-center gap-2">
                            <input
                              type="url"
                              value={linkInputs[field.id] || ""}
                              onChange={(e) =>
                                setLinkInputs((prev) => ({ ...prev, [field.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addLink(field.id);
                                }
                              }}
                              placeholder="https://..."
                              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                            />
                            <button
                              type="button"
                              onClick={() => addLink(field.id)}
                              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
                            >
                              Add
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={(value as string) || ""}
                        onChange={(e) => update(field.id, e.target.value)}
                        disabled={disabled}
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-50"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
