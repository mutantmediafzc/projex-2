"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  completed: boolean;
  notes: string;
  last_updated: string | null;
}

interface Group {
  id: string;
  title: string;
  icon: string;
  items: ChecklistItem[];
}

// ─── Initial Data ────────────────────────────────────────────────────────────

const INITIAL_GROUPS: Group[] = [
  {
    id: "advertising",
    title: "Advertising Platforms",
    icon: "📣",
    items: [
      { id: "google_ads_access", label: "Google Ads Account Access", description: "Grant manager access (admin@mutantmedia.ae) to your Google Ads account", completed: false, notes: "", last_updated: null },
      { id: "google_ads_id", label: "Google Ads Account ID", description: "Provide your 10-digit Google Ads Customer ID (xxx-xxx-xxxx)", completed: false, notes: "", last_updated: null },
      { id: "meta_ads_access", label: "Meta Business Manager Access", description: "Add admin@mutantmedia.ae as a partner on Meta Business Manager", completed: false, notes: "", last_updated: null },
      { id: "meta_pixel", label: "Meta Pixel ID", description: "Share your existing Meta Pixel ID or confirm if one needs to be created", completed: false, notes: "", last_updated: null },
      { id: "linkedin_ads", label: "LinkedIn Campaign Manager Access", description: "Grant account manager access on LinkedIn Campaign Manager", completed: false, notes: "", last_updated: null },
      { id: "tiktok_ads", label: "TikTok Ads Manager Access", description: "Share access to TikTok Ads account or confirm if a new one is needed", completed: false, notes: "", last_updated: null },
    ],
  },
  {
    id: "website_tracking",
    title: "Website & Tracking",
    icon: "📊",
    items: [
      { id: "ga4_access", label: "Google Analytics 4 (GA4) Access", description: "Add admin@mutantmedia.ae as an Editor to your GA4 property", completed: false, notes: "", last_updated: null },
      { id: "gsc_access", label: "Google Search Console Access", description: "Add admin@mutantmedia.ae as an Owner/Full user to GSC", completed: false, notes: "", last_updated: null },
      { id: "gtm_access", label: "Google Tag Manager (GTM) Access", description: "Add admin@mutantmedia.ae as a user to GTM container", completed: false, notes: "", last_updated: null },
      { id: "website_access", label: "Website CMS / Backend Access", description: "Provide CMS admin credentials or developer contact for tag installation", completed: false, notes: "", last_updated: null },
      { id: "conversion_actions", label: "Key Conversion Actions Defined", description: "List the key actions to track: form submissions, calls, property views, WhatsApp clicks", completed: false, notes: "", last_updated: null },
      { id: "call_tracking", label: "Call Tracking Number", description: "Provide or confirm a trackable phone number for ad campaigns", completed: false, notes: "", last_updated: null },
    ],
  },
  {
    id: "leads_crm",
    title: "Leads & CRM",
    icon: "🏠",
    items: [
      { id: "crm_access", label: "CRM System Access", description: "Provide read/write access to your CRM (e.g., Salesforce, HubSpot, custom system)", completed: false, notes: "", last_updated: null },
      { id: "lead_status", label: "Lead Status Visibility", description: "Confirm we have visibility into lead outcomes (qualified, unqualified, closed)", completed: false, notes: "", last_updated: null },
      { id: "historical_leads", label: "Historical Lead Data Export", description: "Share at least 3 months of historical lead data (CSV or CRM export)", completed: false, notes: "", last_updated: null },
      { id: "lead_routing", label: "Lead Routing / Assignment Process", description: "Describe how new leads are assigned to agents/teams", completed: false, notes: "", last_updated: null },
    ],
  },
  {
    id: "creative_assets",
    title: "Creative Assets",
    icon: "🎨",
    items: [
      { id: "asset_folder", label: "Asset Library / Drive Folder Link", description: "Share a link to your Google Drive, Dropbox, or OneDrive folder with all marketing assets", completed: false, notes: "", last_updated: null },
      { id: "brand_guidelines", label: "Brand Guidelines Document", description: "Share your brand book: colors, fonts, logo files (SVG/PNG), tone of voice", completed: false, notes: "", last_updated: null },
      { id: "property_photos", label: "Property Photography / Video Library", description: "Share high-resolution photos and/or video walkthroughs for key listings", completed: false, notes: "", last_updated: null },
      { id: "logo_files", label: "Logo Files (All Variants)", description: "Provide full-color, white, and black versions of all logo variants", completed: false, notes: "", last_updated: null },
    ],
  },
  {
    id: "communication",
    title: "Communication Channels",
    icon: "💬",
    items: [
      { id: "whatsapp_number", label: "WhatsApp Business Number", description: "Provide the primary WhatsApp Business number used for lead follow-up", completed: false, notes: "", last_updated: null },
      { id: "whatsapp_api", label: "WhatsApp Business API Access", description: "Confirm if you use WhatsApp API (e.g., WATI, Twilio) and share API credentials", completed: false, notes: "", last_updated: null },
      { id: "sms_flow", label: "SMS / Email Automation Flow", description: "Share existing SMS or email sequences used in follow-up (if any)", completed: false, notes: "", last_updated: null },
      { id: "primary_contact", label: "Primary Marketing Contact", description: "Name, email, and WhatsApp of the internal point-of-contact for campaign approvals", completed: false, notes: "", last_updated: null },
    ],
  },
  {
    id: "goals_reporting",
    title: "Goals & Reporting",
    icon: "🎯",
    items: [
      { id: "monthly_budget", label: "Monthly Ad Spend Budget", description: "Confirm the total monthly budget (AED) allocated for paid advertising", completed: false, notes: "", last_updated: null },
      { id: "kpi_targets", label: "KPI Targets", description: "Define targets: cost-per-lead (AED), leads per month, qualified lead rate, ROAS", completed: false, notes: "", last_updated: null },
      { id: "priority_projects", label: "Priority Properties / Projects", description: "List the top 3–5 developments or property types to focus campaigns on", completed: false, notes: "", last_updated: null },
      { id: "reporting_frequency", label: "Reporting Frequency", description: "Preferred reporting cadence: Weekly, Bi-weekly, or Monthly", completed: false, notes: "", last_updated: null },
      { id: "reporting_recipients", label: "Report Recipients", description: "Names and emails of stakeholders who should receive performance reports", completed: false, notes: "", last_updated: null },
    ],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function countTotals(groups: Group[]) {
  let total = 0;
  let done = 0;
  for (const g of groups) {
    for (const item of g.items) {
      total++;
      if (item.completed) done++;
    }
  }
  return { total, done };
}

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-2xl px-5 py-3 shadow-2xl text-sm font-medium transition-all ${
        type === "success"
          ? "bg-emerald-600 text-white"
          : "bg-red-600 text-white"
      }`}
    >
      {type === "success" ? (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
      ) : (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
      )}
      {message}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function DreHomesOnboarding() {
  const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(INITIAL_GROUPS.map(g => g.id)));
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load existing data ────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/onboarding/dre-homes")
      .then(r => r.json())
      .then(({ submission }) => {
        if (submission?.items && typeof submission.items === "object") {
          setGroups(prev =>
            prev.map(group => ({
              ...group,
              items: group.items.map(item => {
                const saved = submission.items[item.id];
                if (!saved) return item;
                return {
                  ...item,
                  completed: saved.completed ?? item.completed,
                  notes: saved.notes ?? item.notes,
                  last_updated: saved.last_updated ?? item.last_updated,
                };
              }),
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Show toast helper ─────────────────────────────────────────────────────
  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Save to API ───────────────────────────────────────────────────────────
  const save = useCallback(async (currentGroups: Group[]) => {
    setSaving(true);
    const items: Record<string, { completed: boolean; notes: string; last_updated: string }> = {};
    for (const g of currentGroups) {
      for (const item of g.items) {
        items[item.id] = {
          completed: item.completed,
          notes: item.notes,
          last_updated: item.last_updated ?? new Date().toISOString(),
        };
      }
    }
    try {
      const res = await fetch("/api/onboarding/dre-homes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("Save failed");
      showToast("Progress saved successfully!", "success");
    } catch {
      showToast("Failed to save. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Auto-save with debounce ───────────────────────────────────────────────
  function scheduleAutoSave(nextGroups: Group[]) {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => save(nextGroups), 1500);
  }

  // ── Item handlers ─────────────────────────────────────────────────────────
  function toggleItem(groupId: string, itemId: string) {
    const next = groups.map(g =>
      g.id !== groupId ? g : {
        ...g,
        items: g.items.map(item =>
          item.id !== itemId ? item : {
            ...item,
            completed: !item.completed,
            last_updated: new Date().toISOString(),
          }
        ),
      }
    );
    setGroups(next);
    scheduleAutoSave(next);
  }

  function updateNotes(groupId: string, itemId: string, notes: string) {
    const next = groups.map(g =>
      g.id !== groupId ? g : {
        ...g,
        items: g.items.map(item =>
          item.id !== itemId ? item : {
            ...item,
            notes,
            last_updated: new Date().toISOString(),
          }
        ),
      }
    );
    setGroups(next);
    scheduleAutoSave(next);
  }

  function toggleGroup(groupId: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const { total, done } = countTotals(groups);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
          <p className="text-sm text-slate-500">Loading your checklist…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://drehomes.com/admin_nsrdwsc/assets/media/header/header_logo_7708_dre-logo-b.png"
                alt="Dre Homes"
                className="h-10 w-auto object-contain"
              />
            </div>

            {/* Save button */}
            <button
              onClick={() => save(groups)}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              )}
              {saving ? "Saving…" : "Save Progress"}
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Onboarding Progress
              </span>
              <span className={`text-sm font-bold ${pct === 100 ? "text-emerald-600" : "text-slate-800"}`}>
                {done}/{total} completed · {pct}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pct === 100
                    ? "bg-emerald-500"
                    : pct >= 60
                    ? "bg-blue-500"
                    : "bg-amber-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {pct === 100 && (
              <p className="mt-1.5 text-center text-xs font-medium text-emerald-600">
                🎉 All items completed! We have everything we need to get started.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Intro ── */}
      <div className="mx-auto max-w-3xl px-4 pt-8 pb-4 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Performance Marketing Onboarding
        </h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          Welcome to Mutant Media's onboarding process for Dre Homes. Please complete all items below to help us launch your campaigns faster. Your progress is saved automatically — you can return to this page at any time to update your answers.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {groups.map(g => {
            const groupDone = g.items.filter(i => i.completed).length;
            const groupTotal = g.items.length;
            const all = groupDone === groupTotal;
            return (
              <button
                key={g.id}
                onClick={() => {
                  setExpandedGroups(prev => new Set([...prev, g.id]));
                  document.getElementById(`group-${g.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  all
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <span>{g.icon}</span>
                <span>{g.title}</span>
                <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${all ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-slate-500"}`}>
                  {groupDone}/{groupTotal}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Checklist Groups ── */}
      <div className="mx-auto max-w-3xl px-4 pb-24 sm:px-6 space-y-4">
        {groups.map(group => {
          const groupDone = group.items.filter(i => i.completed).length;
          const groupTotal = group.items.length;
          const isOpen = expandedGroups.has(group.id);
          const allDone = groupDone === groupTotal;

          return (
            <div
              key={group.id}
              id={`group-${group.id}`}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{group.icon}</span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">{group.title}</h2>
                    <p className="text-[11px] text-slate-500">{groupDone} of {groupTotal} items completed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {allDone && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                      <svg className="h-3.5 w-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  )}
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all ${allDone ? "bg-emerald-500" : "bg-blue-500"}`}
                      style={{ width: `${groupTotal > 0 ? Math.round((groupDone / groupTotal) * 100) : 0}%` }}
                    />
                  </div>
                  <svg
                    className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </button>

              {/* Group items */}
              {isOpen && (
                <div className="divide-y divide-gray-100 border-t border-gray-100">
                  {group.items.map(item => (
                    <div
                      key={item.id}
                      className={`px-5 py-4 transition-colors ${item.completed ? "bg-emerald-50/50" : "bg-white"}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleItem(group.id, item.id)}
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
                            item.completed
                              ? "border-emerald-500 bg-emerald-500"
                              : "border-gray-300 bg-white hover:border-slate-400"
                          }`}
                          aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
                        >
                          {item.completed && (
                            <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                          )}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-semibold leading-snug ${item.completed ? "text-emerald-700 line-through decoration-emerald-400" : "text-slate-900"}`}>
                              {item.label}
                            </p>
                            {item.last_updated && item.completed && (
                              <span className="shrink-0 text-[10px] text-slate-400">
                                {new Date(item.last_updated).toLocaleDateString("en-AE", { day: "numeric", month: "short" })}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{item.description}</p>
                          )}

                          {/* Notes input */}
                          <div className="mt-2.5">
                            <textarea
                              value={item.notes}
                              onChange={e => updateNotes(group.id, item.id, e.target.value)}
                              placeholder="Add access details, links, credentials, or context…"
                              rows={item.notes.length > 80 ? 3 : 1}
                              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Floating Save CTA ── */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => save(groups)}
          disabled={saving}
          className="flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-2xl hover:bg-slate-700 disabled:opacity-50 transition-all active:scale-95"
        >
          {saving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          )}
          {saving ? "Saving…" : "Save Progress"}
        </button>
      </div>

      {/* ── Footer ── */}
      <div className="mx-auto max-w-3xl px-4 py-8 text-center sm:px-6">
        <p className="text-xs text-slate-400">
          Prepared by{" "}
          <a href="https://mutantmedia.ae" target="_blank" rel="noopener noreferrer" className="font-medium text-slate-500 hover:text-slate-700">
            Mutant Media FZC
          </a>
          {" "}· Your data is saved securely · Changes auto-save as you type
        </p>
      </div>

      {/* ── Toast ── */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
