"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type Company = {
  id: string;
  name: string;
  logo_url: string | null;
  industry: string | null;
  email: string | null;
  phone: string | null;
  town: string | null;
  country: string | null;
};

type MergeCompaniesModalProps = {
  companies: Company[];
  onClose: () => void;
  onMergeComplete: () => void;
};

export default function MergeCompaniesModal({
  companies,
  onClose,
  onMergeComplete,
}: MergeCompaniesModalProps) {
  const [mainCompanyId, setMainCompanyId] = useState<string>(companies[0]?.id || "");
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"select" | "confirm" | "success">("select");
  const [mergeStats, setMergeStats] = useState<{
    contacts: number;
    projects: number;
    socialProjects: number;
    invoices: number;
    quotes: number;
  } | null>(null);

  const mainCompany = companies.find((c) => c.id === mainCompanyId);
  const companiesToMerge = companies.filter((c) => c.id !== mainCompanyId);

  async function loadMergePreview() {
    const otherIds = companiesToMerge.map((c) => c.id);
    
    const [contactsRes, projectsRes, socialRes, invoicesRes, quotesRes] = await Promise.all([
      supabaseClient.from("contacts").select("id", { count: "exact" }).in("company_id", otherIds),
      supabaseClient.from("projects").select("id", { count: "exact" }).in("company_id", otherIds),
      supabaseClient.from("social_projects").select("id", { count: "exact" }).in("company_id", otherIds),
      supabaseClient.from("invoices").select("id", { count: "exact" }).in("company_id", otherIds),
      supabaseClient.from("quotes").select("id", { count: "exact" }).in("company_id", otherIds),
    ]);

    setMergeStats({
      contacts: contactsRes.count || 0,
      projects: projectsRes.count || 0,
      socialProjects: socialRes.count || 0,
      invoices: invoicesRes.count || 0,
      quotes: quotesRes.count || 0,
    });
    setStep("confirm");
  }

  async function handleMerge() {
    setMerging(true);
    setError(null);

    try {
      const otherIds = companiesToMerge.map((c) => c.id);

      // Reassign all related records to the main company
      await Promise.all([
        supabaseClient.from("contacts").update({ company_id: mainCompanyId }).in("company_id", otherIds),
        supabaseClient.from("projects").update({ company_id: mainCompanyId }).in("company_id", otherIds),
        supabaseClient.from("social_projects").update({ company_id: mainCompanyId }).in("company_id", otherIds),
        supabaseClient.from("invoices").update({ company_id: mainCompanyId }).in("company_id", otherIds),
        supabaseClient.from("quotes").update({ company_id: mainCompanyId }).in("company_id", otherIds),
      ]);

      // Delete the merged companies
      const { error: deleteError } = await supabaseClient
        .from("companies")
        .delete()
        .in("id", otherIds);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setStep("success");
      setTimeout(() => {
        onMergeComplete();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to merge companies");
    } finally {
      setMerging(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-violet-500 to-purple-600">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
            Merge Companies
          </h2>
          <p className="text-sm text-white/80 mt-1">
            {step === "select" && "Select which company will be the main record"}
            {step === "confirm" && "Review and confirm the merge"}
            {step === "success" && "Merge completed successfully!"}
          </p>
        </div>

        <div className="p-6">
          {step === "select" && (
            <>
              <p className="text-sm text-slate-600 mb-4">
                All contacts, projects, invoices, and other records from the other companies will be moved to the main company. The other companies will be deleted.
              </p>

              <div className="space-y-2 mb-6">
                <label className="text-sm font-medium text-slate-700">Select Main Company:</label>
                {companies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => setMainCompanyId(company.id)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      mainCompanyId === company.id
                        ? "border-violet-500 bg-violet-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {company.logo_url ? (
                      <img src={company.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {company.name[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{company.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {[company.industry, company.town, company.country].filter(Boolean).join(" • ") || "No details"}
                      </p>
                    </div>
                    {mainCompanyId === company.id && (
                      <span className="px-2 py-1 text-xs font-medium bg-violet-500 text-white rounded-full">
                        Main
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={loadMergePreview}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium hover:from-violet-600 hover:to-purple-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {step === "confirm" && (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 border border-violet-200 mb-4">
                  {mainCompany?.logo_url ? (
                    <img src={mainCompany.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {mainCompany?.name[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-slate-900">{mainCompany?.name}</p>
                    <p className="text-xs text-violet-600 font-medium">Main Record (will be kept)</p>
                  </div>
                </div>

                <p className="text-sm text-slate-600 mb-3">
                  The following will be merged into <strong>{mainCompany?.name}</strong>:
                </p>

                <div className="space-y-2 mb-4">
                  {companiesToMerge.map((company) => (
                    <div key={company.id} className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-100">
                      <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                      <span className="text-sm text-slate-700">{company.name}</span>
                      <span className="text-xs text-red-500">(will be deleted)</span>
                    </div>
                  ))}
                </div>

                {mergeStats && (
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900">{mergeStats.contacts}</p>
                      <p className="text-xs text-slate-500">Contacts</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900">{mergeStats.projects}</p>
                      <p className="text-xs text-slate-500">Projects</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900">{mergeStats.socialProjects}</p>
                      <p className="text-xs text-slate-500">Social Calendars</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900">{mergeStats.invoices + mergeStats.quotes}</p>
                      <p className="text-xs text-slate-500">Invoices/Quotes</p>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("select")}
                  disabled={merging}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleMerge}
                  disabled={merging}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-medium hover:from-red-600 hover:to-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {merging ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Merging...
                    </>
                  ) : (
                    "Confirm Merge"
                  )}
                </button>
              </div>
            </>
          )}

          {step === "success" && (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Merge Complete!</h3>
              <p className="text-sm text-slate-600">
                All records have been merged into {mainCompany?.name}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
