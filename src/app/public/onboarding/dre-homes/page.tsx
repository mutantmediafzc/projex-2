"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const LOGO_URL = "https://drehomes.com/images/dre-logo.png";
const SESSION_KEY = "dre_onboarding_auth";
const VALID_EMAIL = "dre@creamcrm.io";
const VALID_PASSWORD = "#Dre2025$012";

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

function item(id: string, label: string, description: string): ChecklistItem {
  return { id, label, description, completed: false, notes: "", last_updated: null };
}

const INITIAL_GROUPS: Group[] = [
  {
    id: "advertising",
    title: "Advertising Platforms",
    icon: "📣",
    items: [
      item("google_ads_access", "Google Ads — Manager-Level Access", "To audit and manage campaigns, please grant manager-level access to admin@mutantmedia.ae via Google Ads → Admin → Access & Security (Edit access or higher required)."),
      item("google_ads_id", "Google Ads Customer ID", "Provide your 10-digit Customer ID (format: xxx-xxx-xxxx), visible in the top-right corner of your Google Ads account."),
      item("meta_bm_access", "Meta Business Manager — Partner Access", "Add Mutant Media as a Business Partner on Meta Business Manager and invite admin@mutantmedia.ae with Admin access to your Ad Account and Pixel. Share your Business Manager ID."),
      item("meta_pixel", "Meta Pixel ID & Active Events", "Share your existing Pixel ID and confirm which events are currently firing (Lead, Contact, ViewContent, etc.). If no Pixel exists we will create and install one."),
      item("linkedin_ads", "LinkedIn Campaign Manager — Account Access", "Invite admin@mutantmedia.ae as Account Manager on LinkedIn Campaign Manager. Share the Account ID and Company Page URL."),
      item("tiktok_ads", "TikTok Ads Manager — Account Access", "Share access to your TikTok Ads Manager account. If none exists, confirm whether we should create one under your business entity."),
    ],
  },
  {
    id: "website_tracking",
    title: "Website & Tracking",
    icon: "📊",
    items: [
      item("ga4_access", "Google Analytics 4 (GA4) — Editor Access", "Add admin@mutantmedia.ae as an Editor on your GA4 property (Analytics → Admin → Account Access Management). Required for goal configuration and attribution."),
      item("gsc_access", "Google Search Console — Full User Access", "Add admin@mutantmedia.ae as a Full User on GSC for all verified domains. Used for organic baseline benchmarking."),
      item("gtm_access", "Google Tag Manager (GTM) — Publish Access", "Add admin@mutantmedia.ae with Publish access on your GTM container. If GTM is not installed, share your developer contact so we can coordinate."),
      item("website_dev_contact", "Website Developer / Tech Contact", "Name, email, and phone of your developer or IT contact for pixel installation, landing page creation, or tracking fixes."),
      item("conversion_actions", "Key Conversion Actions to Track", "List all actions that count as conversions: form submissions, WhatsApp button clicks, phone calls, enquiries, brochure downloads, etc."),
      item("call_tracking", "Call Tracking Number", "Provide the primary phone number displayed on your website and ads. If you use a call tracking solution (CallRail, Ringostat, etc.), share setup details."),
    ],
  },
  {
    id: "leads_crm",
    title: "Leads & CRM",
    icon: "🗂️",
    items: [
      item("crm_platform", "CRM Platform Name & Version", "Which CRM do you use? (e.g., Salesforce, HubSpot, Zoho, Property Finder CRM, custom). Please share the platform name and plan tier."),
      item("crm_access", "CRM — Read Access for Reporting", "Provide read-only credentials or an API key for your CRM so we can pull lead attribution, pipeline stages, and conversion outcomes. Write access is not required."),
      item("lead_status_definitions", "Lead Status Definitions", "Share how leads are categorised (e.g., New → Contacted → Site Visit → Negotiating → Closed Won/Lost) so we can accurately attribute campaign performance."),
      item("historical_leads", "Historical Lead Data (Last 6 Months)", "Export at least 6 months of lead data including source, status, and outcome as a CSV or CRM report. This baseline is essential for benchmarking."),
      item("lead_response_time", "Lead Response Time & Follow-Up Process", "How quickly do agents follow up with new leads? What is the follow-up sequence (call, WhatsApp, email)? This helps align campaign volume to sales capacity."),
    ],
  },
  {
    id: "current_performance",
    title: "Current Performance Metrics",
    icon: "📈",
    items: [
      item("current_cpl", "Current Cost Per Lead (CPL) — in AED", "What is your current average cost per lead across all channels? If tracked per channel (Google, Meta, portals), please share a breakdown. This is our starting benchmark."),
      item("current_conversion_rate", "Lead-to-Sale Conversion Rate", "Out of every 100 leads, how many result in a sale? An approximate range (e.g., 2–5%) is fine. This determines realistic ROAS and volume targets."),
      item("current_monthly_leads", "Average Monthly Lead Volume", "How many leads do you receive per month across all sources (paid, organic, referral, portals)? Split by channel where possible."),
      item("current_ad_spend", "Current Monthly Ad Spend — in AED", "Total monthly spend on paid advertising. Please break down by platform (Google, Meta, Property Finder, TikTok, etc.) if applicable."),
      item("current_portals", "Property Portal Listings (Bayut, Property Finder, Dubizzle)", "Which portals are you listed on? Share account names, any analytics access, and monthly portal spend. We will incorporate this into the overall attribution model."),
    ],
  },
  {
    id: "priority_developers",
    title: "Priority Developers to Sell",
    icon: "🏗️",
    items: [
      item("developer_1", "Priority Developer #1", "Name the first developer whose projects you actively sell. Include project names, price ranges, location, and key selling points (e.g., Emaar — Creek Harbour, AED 1.2M–3.5M, waterfront)."),
      item("developer_2", "Priority Developer #2", "Second priority developer and their key projects. Include any exclusive or super-broker agreements and the buyer profile (investor, end-user, expat)."),
      item("developer_3", "Priority Developer #3", "Third priority developer — location, unit types (apartments, villas, townhouses), payment plan highlights, and target buyer profile."),
      item("developer_4", "Priority Developer #4 (if applicable)", "Fourth developer or focus category. Include off-plan projects, payment plan details, or high-commission opportunities to prioritise in campaigns."),
      item("developer_5", "Priority Developer #5 (if applicable)", "Fifth developer or a secondary segment (e.g., secondary market / ready units, commercial, luxury). Include average transaction value."),
      item("exclusive_mandates", "Exclusive or Super-Broker Mandates", "List any exclusive or super-broker mandates with specific developers, including developer name and agreement type. These will be prioritised in campaign strategy."),
    ],
  },
  {
    id: "team_skills",
    title: "Internal Team Skills & Resources",
    icon: "👥",
    items: [
      item("developers_inhouse", "In-House Developers", "Do you have in-house web developers? List names, core skills (React, WordPress, Python, etc.), and availability for campaign-related tasks (landing pages, tracking setup)."),
      item("designers_inhouse", "In-House Designers / Creative Team", "Do you have in-house designers? List names, tools used (Adobe Suite, Figma, Canva), and capacity to produce ad creatives (static, animated, social formats) on request."),
      item("videographers_inhouse", "In-House Videographers / Production Team", "Do you have in-house videographers or production capability? List names, equipment (camera type, drone access), and typical turnaround for a property shoot."),
      item("content_writers", "Copywriters / Content Writers", "Is there someone internally who handles copywriting or content? This helps us understand how much copy and creative direction we need to supply versus what you can produce."),
      item("social_media_manager", "Social Media Manager", "Who manages your organic social channels? Provide their name and the platforms they manage (Instagram, LinkedIn, TikTok, etc.). We will coordinate paid vs. organic strategy with them."),
    ],
  },
  {
    id: "creative_assets",
    title: "Creative Assets",
    icon: "🎨",
    items: [
      item("asset_folder", "Master Asset Library — Drive / Dropbox Link", "Share a link to your shared folder with all marketing assets: property renders, photography, video walkthroughs, and any existing ad creatives."),
      item("brand_guidelines", "Brand Guidelines Document", "Share your brand book or style guide: logo files (SVG + PNG), primary/secondary colours (HEX codes), approved fonts, tone of voice, and brand do's and don'ts."),
      item("property_media", "Property Photography & Video Library", "High-resolution photography and video walkthroughs for your top 5 priority listings or projects. Include both lifestyle and unit-specific content where available."),
      item("existing_creatives", "Existing Ad Creatives & Previous Campaigns", "Share any existing ad assets (static, video, carousel) from previous campaigns. Helps us avoid duplication and understand your historical creative approach."),
    ],
  },
  {
    id: "communication",
    title: "Communication Channels",
    icon: "💬",
    items: [
      item("whatsapp_number", "WhatsApp Business Number", "Primary WhatsApp Business number for lead follow-up. Will be used in ad CTAs and click-to-WhatsApp campaigns. Confirm it is registered as a WhatsApp Business account."),
      item("whatsapp_api", "WhatsApp Business API / Automation Platform", "Do you use a WhatsApp API platform (WATI, Twilio, 360dialog, Bird)? If yes, share the platform name and whether automated follow-up sequences are active."),
      item("email_automation", "Email Marketing Platform & Automation", "Which email platform do you use (Mailchimp, HubSpot, ActiveCampaign, etc.)? Share access or describe your current lead nurture email sequences, if any."),
      item("primary_contact", "Primary Marketing Approval Contact", "Name, email, and WhatsApp of the person responsible for approving ad creatives and campaign briefs. This is our day-to-day point of contact."),
    ],
  },
  {
    id: "goals_reporting",
    title: "Goals & Reporting",
    icon: "🎯",
    items: [
      item("monthly_budget", "Monthly Paid Ad Budget — in AED", "Total monthly budget for paid ads (excluding agency fees). Break down by platform if possible (e.g., Google: AED 15,000 / Meta: AED 10,000)."),
      item("target_cpl", "Target Cost Per Lead (CPL) — in AED", "Maximum acceptable cost per lead in AED. If targets differ by platform or property type, please specify each."),
      item("target_volume", "Target Monthly Lead Volume", "How many leads per month are you aiming for through paid campaigns? How does this compare to current sales team capacity?"),
      item("reporting_frequency", "Reporting Frequency Preference", "How often do you want performance reports? Options: Weekly (every Monday), Bi-weekly (1st & 15th), or Monthly. Preferred format: PDF, dashboard link, or live call."),
      item("reporting_recipients", "Report Recipients", "Full names and email addresses of all stakeholders who should receive reports (CEO, Marketing Manager, Sales Director, etc.)."),
      item("launch_date", "Target Campaign Launch Date", "When do you want the first campaigns to go live? This helps us prioritise the onboarding checklist and allocate resources."),
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countTotals(groups: Group[]) {
  let total = 0;
  let done = 0;
  for (const g of groups) {
    for (const it of g.items) {
      total++;
      if (it.completed) done++;
    }
  }
  return { total, done };
}

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-2xl px-5 py-3 shadow-2xl text-sm font-medium ${type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
      {type === "success"
        ? <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
        : <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>}
      {message}
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onAuth }: { onAuth: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    setTimeout(() => {
      if (
        email.trim().toLowerCase() === VALID_EMAIL.toLowerCase() &&
        password === VALID_PASSWORD
      ) {
        const payload = JSON.stringify({ authed: true, ts: Date.now() });
        if (stayLoggedIn) {
          localStorage.setItem(SESSION_KEY, payload);
        } else {
          sessionStorage.setItem(SESSION_KEY, payload);
        }
        onAuth();
      } else {
        setError("Incorrect email or password. Please try again.");
        setSubmitting(false);
      }
    }, 400);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-xl">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_URL} alt="Dre Homes" className="h-14 w-auto object-contain" />
          </div>

          <h1 className="mb-1 text-center text-lg font-bold text-slate-900">Welcome back</h1>
          <p className="mb-6 text-center text-xs text-slate-500">Sign in to access your onboarding checklist</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Email address</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw
                    ? <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Stay logged in */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setStayLoggedIn(v => !v)}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${stayLoggedIn ? "border-slate-900 bg-slate-900" : "border-gray-300 bg-white"}`}
                aria-pressed={stayLoggedIn}
              >
                {stayLoggedIn && (
                  <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                )}
              </button>
              <span
                className="cursor-pointer select-none text-xs text-slate-600"
                onClick={() => setStayLoggedIn(v => !v)}
              >
                Stay logged in on this device
              </span>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                <svg className="h-4 w-4 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-lg hover:bg-slate-700 disabled:opacity-60 transition-colors"
            >
              {submitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Prepared by{" "}
          <a href="https://mutantmedia.ae" target="_blank" rel="noopener noreferrer" className="font-medium text-slate-500 hover:text-slate-700">
            Mutant Media FZC
          </a>
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DreHomesOnboarding() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(INITIAL_GROUPS.map(g => g.id)));
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auth check ────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      if (stored && JSON.parse(stored)?.authed === true) {
        setAuthed(true);
        return;
      }
    } catch {}
    setAuthed(false);
  }, []);

  // ── Load data after auth ──────────────────────────────────────────────────
  useEffect(() => {
    if (!authed) return;
    fetch("/api/onboarding/dre-homes")
      .then(r => r.json())
      .then(({ submission }) => {
        if (submission?.items && typeof submission.items === "object") {
          setGroups(prev =>
            prev.map(group => ({
              ...group,
              items: group.items.map(it => {
                const saved = submission.items[it.id];
                if (!saved) return it;
                return { ...it, completed: saved.completed ?? it.completed, notes: saved.notes ?? it.notes, last_updated: saved.last_updated ?? it.last_updated };
              }),
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authed]);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  const save = useCallback(async (currentGroups: Group[]) => {
    setSaving(true);
    const items: Record<string, { completed: boolean; notes: string; last_updated: string }> = {};
    for (const g of currentGroups) {
      for (const it of g.items) {
        items[it.id] = { completed: it.completed, notes: it.notes, last_updated: it.last_updated ?? new Date().toISOString() };
      }
    }
    try {
      const res = await fetch("/api/onboarding/dre-homes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error();
      showToast("Progress saved successfully!", "success");
    } catch {
      showToast("Failed to save. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }, []);

  function scheduleAutoSave(next: Group[]) {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => save(next), 1500);
  }

  function toggleItem(groupId: string, itemId: string) {
    const next = groups.map(g => g.id !== groupId ? g : {
      ...g,
      items: g.items.map(it => it.id !== itemId ? it : { ...it, completed: !it.completed, last_updated: new Date().toISOString() }),
    });
    setGroups(next);
    scheduleAutoSave(next);
  }

  function updateNotes(groupId: string, itemId: string, notes: string) {
    const next = groups.map(g => g.id !== groupId ? g : {
      ...g,
      items: g.items.map(it => it.id !== itemId ? it : { ...it, notes, last_updated: new Date().toISOString() }),
    });
    setGroups(next);
    scheduleAutoSave(next);
  }

  function toggleGroup(groupId: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
  }

  // ── Render states ─────────────────────────────────────────────────────────
  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-slate-700" />
      </div>
    );
  }

  if (!authed) return <LoginScreen onAuth={() => setAuthed(true)} />;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
          <p className="text-sm text-slate-500">Loading your checklist…</p>
        </div>
      </div>
    );
  }

  const { total, done } = countTotals(groups);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_URL} alt="Dre Homes" className="h-10 w-auto object-contain" />

            <div className="flex items-center gap-2">
              <button
                onClick={() => save(groups)}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                {saving
                  ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  : <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                }
                <span className="hidden sm:inline">{saving ? "Saving…" : "Save Progress"}</span>
              </button>

              <button
                onClick={handleLogout}
                title="Sign out"
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-slate-500 hover:border-slate-300 hover:text-slate-800 transition-colors"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Onboarding Progress</span>
              <span className={`text-sm font-bold ${pct === 100 ? "text-emerald-600" : "text-slate-800"}`}>
                {done}/{total} · {pct}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-emerald-500" : pct >= 60 ? "bg-blue-500" : "bg-amber-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {pct === 100 && (
              <p className="mt-1 text-center text-xs font-medium text-emerald-600">
                🎉 All items completed — we have everything we need to get started!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Intro ── */}
      <div className="mx-auto max-w-3xl px-4 pt-7 pb-4 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Performance Marketing Onboarding</h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          Welcome to Mutant Media's onboarding process for Dre Homes. Work through each section below, tick each item once information has been provided, and add your details in the notes field. Progress is auto-saved — you can return at any time to update your answers.
        </p>

        {/* Group jump pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {groups.map(g => {
            const gDone = g.items.filter(i => i.completed).length;
            const all = gDone === g.items.length;
            return (
              <button
                key={g.id}
                onClick={() => {
                  setExpandedGroups(prev => new Set([...prev, g.id]));
                  setTimeout(() => document.getElementById(`group-${g.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                }}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${all ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-white text-slate-600 hover:border-slate-300"}`}
              >
                <span>{g.icon}</span>
                <span className="hidden sm:inline">{g.title}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${all ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-slate-500"}`}>
                  {gDone}/{g.items.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Groups ── */}
      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-28 sm:px-6">
        {groups.map(group => {
          const gDone = group.items.filter(i => i.completed).length;
          const gTotal = group.items.length;
          const isOpen = expandedGroups.has(group.id);
          const allDone = gDone === gTotal;

          return (
            <div key={group.id} id={`group-${group.id}`} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {/* Header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl leading-none">{group.icon}</span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">{group.title}</h2>
                    <p className="text-[11px] text-slate-400">{gDone} of {gTotal} items provided</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {allDone && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                      <svg className="h-3.5 w-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  )}
                  <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-gray-100 sm:block">
                    <div
                      className={`h-full rounded-full transition-all ${allDone ? "bg-emerald-500" : "bg-blue-500"}`}
                      style={{ width: `${gTotal > 0 ? Math.round((gDone / gTotal) * 100) : 0}%` }}
                    />
                  </div>
                  <svg className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </button>

              {/* Items */}
              {isOpen && (
                <div className="divide-y divide-gray-100 border-t border-gray-100">
                  {group.items.map(it => (
                    <div key={it.id} className={`px-5 py-4 transition-colors ${it.completed ? "bg-emerald-50/40" : "bg-white"}`}>
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleItem(group.id, it.id)}
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${it.completed ? "border-emerald-500 bg-emerald-500" : "border-gray-300 bg-white hover:border-slate-400"}`}
                          aria-label={it.completed ? "Mark incomplete" : "Mark complete"}
                        >
                          {it.completed && (
                            <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                          )}
                        </button>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-semibold leading-snug ${it.completed ? "text-emerald-700 line-through decoration-emerald-400/60" : "text-slate-900"}`}>
                              {it.label}
                            </p>
                            {it.last_updated && it.completed && (
                              <span className="shrink-0 pt-0.5 text-[10px] text-slate-400">
                                {new Date(it.last_updated).toLocaleDateString("en-AE", { day: "numeric", month: "short" })}
                              </span>
                            )}
                          </div>
                          {it.description && (
                            <p className="mt-1 text-xs leading-relaxed text-slate-500">{it.description}</p>
                          )}
                          <div className="mt-2.5">
                            <textarea
                              value={it.notes}
                              onChange={e => updateNotes(group.id, it.id, e.target.value)}
                              placeholder="Enter your response, links, credentials, or context here…"
                              rows={it.notes.length > 80 ? 3 : 2}
                              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200 transition-colors"
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

      {/* ── Floating Save ── */}
      <div className="fixed bottom-6 right-4 z-40 sm:right-6">
        <button
          onClick={() => save(groups)}
          disabled={saving}
          className="flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-2xl hover:bg-slate-700 disabled:opacity-50 transition-all active:scale-95"
        >
          {saving
            ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            : <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          }
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
          {" "}· Data saved securely · Changes auto-save as you type
        </p>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
