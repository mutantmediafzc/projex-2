"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";
import RequireAdmin from "@/components/RequireAdmin";
import InvoiceCreateModal from "@/app/projects/[id]/InvoiceCreateModal";
import InvoicePdfModal from "@/app/projects/[id]/InvoicePdfModal";
import InvoiceSettingsModal from "@/app/projects/[id]/InvoiceSettingsModal";
import InvoiceEditModal from "@/app/projects/[id]/InvoiceEditModal";
import PaymentModal, { type Payment } from "@/app/projects/[id]/PaymentModal";
import ReceiptModal from "@/app/projects/[id]/ReceiptModal";
import type { InvoiceType, InvoiceSettings, InvoiceItem, Invoice as MgmtInvoice } from "@/app/projects/[id]/InvoiceManagement";

type Invoice = {
  id: string;
  project_id: string | null;
  invoice_number: string;
  invoice_type: "quote" | "invoice";
  status: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  issue_date: string;
  due_date: string | null;
  paid_date: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  currency: string;
  notes: string | null;
  company_name: string | null;
  company_logo_url: string | null;
  company_address: string | null;
  company_phone: string | null;
  company_email: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_iban: string | null;
  created_at: string;
  items?: InvoiceItem[];
  project?: { id: string; name: string; company_id: string } | null;
};

type Project = {
  id: string;
  company_id: string;
  name: string;
  value: number | null;
  status: string | null;
  company?: { id: string; name: string } | null;
};

type Company = {
  id: string;
  name: string;
};

function formatMoney(amount: number, currency = "AED"): string {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency, minimumFractionDigits: 0 }).format(amount);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  unpaid: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

// ── Searchable dropdown ──────────────────────────────────────────────────────
function SearchableDropdown({
  value, onChange, options, placeholder, label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string; sub?: string }[];
  placeholder: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()) || o.sub?.toLowerCase().includes(query.toLowerCase()));
  const selected = options.find(o => o.id === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); setQuery(""); }}
        className={`flex h-9 min-w-[155px] items-center gap-2 rounded-xl border px-3 text-[12px] font-medium shadow-sm transition-all ${
          value !== "all" ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        <span className="flex-1 truncate text-left">{selected ? selected.label : label}</span>
        <svg className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-[9999] mt-1 w-64 rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Search ${placeholder}...`}
                className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-[12px] text-black placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => { onChange("all"); setOpen(false); }}
              className={`w-full rounded-lg px-3 py-2 text-left text-[12px] transition-colors ${value === "all" ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-600 hover:bg-slate-50"}`}
            >
              All {placeholder}
            </button>
            {filtered.map(o => (
              <button
                key={o.id}
                type="button"
                onClick={() => { onChange(o.id); setOpen(false); setQuery(""); }}
                className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${value === o.id ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"}`}
              >
                <p className="text-[12px] font-medium truncate">{o.label}</p>
                {o.sub && <p className="text-[10px] text-slate-400 truncate">{o.sub}</p>}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-3 text-[12px] text-slate-400 text-center">No results</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Project Picker Modal (wraps InvoiceCreateModal) ────────────────────────
function ProjectPickerModal({
  projects,
  type,
  settings,
  onClose,
  onCreated,
}: {
  projects: Project[];
  type: InvoiceType;
  settings: InvoiceSettings | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState<"pick" | "create">("pick");
  const [query, setQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    (typeof p.company === "object" && p.company !== null && !Array.isArray(p.company) && (p.company as { name: string }).name?.toLowerCase().includes(query.toLowerCase()))
  );

  if (step === "create" && selectedProject) {
    const companyName = (typeof selectedProject.company === "object" && selectedProject.company !== null && !Array.isArray(selectedProject.company))
      ? (selectedProject.company as { name: string }).name
      : undefined;
    return (
      <InvoiceCreateModal
        projectId={selectedProject.id}
        projectName={selectedProject.name}
        clientName={companyName}
        type={type}
        settings={settings}
        onClose={onClose}
        onCreated={onCreated}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4 py-6">
      <button type="button" className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              New {type === "quote" ? "Quote" : "Invoice"}
            </h3>
            <p className="text-[12px] text-slate-500">Select a project to attach it to</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">×</button>
        </div>
        <div className="p-4 space-y-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search projects..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-[13px] text-black placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none"
            />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-slate-400">No projects found</p>
            ) : filtered.map(p => {
              const co = (typeof p.company === "object" && p.company !== null && !Array.isArray(p.company))
                ? (p.company as { name: string }).name
                : null;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setSelectedProject(p); setStep("create"); }}
                  className="w-full flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-sm"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 text-[11px] font-bold">
                    {p.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900 truncate">{p.name}</p>
                    {co && <p className="text-[11px] text-slate-400 truncate">{co}</p>}
                  </div>
                  <svg className="h-4 w-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FinancialsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);

  // Modals
  const [createType, setCreateType] = useState<InvoiceType>("invoice");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Invoice | null>(null);
  const [editTarget, setEditTarget] = useState<Invoice | null>(null);

  // Payments & Receipts
  const [paymentsMap, setPaymentsMap] = useState<Record<string, Payment[]>>({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null);

  // Filters
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "quote" | "invoice">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  async function loadAll() {
    try {
      setLoading(true);
      setError(null);
      const [invoicesRes, projectsRes, companiesRes] = await Promise.all([
        supabaseClient.from("invoices").select("*, project:projects(id, name, company_id)").order("created_at", { ascending: false }),
        supabaseClient.from("projects").select("id, company_id, name, value, status, company:companies(id, name)").eq("is_archived", false),
        supabaseClient.from("companies").select("id, name").order("name"),
      ]);
      if (invoicesRes.error) { setError(invoicesRes.error.message); setLoading(false); return; }
      const invoiceList = (invoicesRes.data as unknown as Invoice[]) || [];
      setInvoices(invoiceList);
      setProjects((projectsRes.data as unknown as Project[]) || []);
      setCompanies((companiesRes.data as Company[]) || []);

      // Load payments for all invoices
      if (invoiceList.length > 0) {
        const invoiceIds = invoiceList.map(i => i.id);
        const { data: pData } = await supabaseClient
          .from("invoice_payments")
          .select("*")
          .in("invoice_id", invoiceIds)
          .order("payment_date", { ascending: true });
        const map: Record<string, Payment[]> = {};
        for (const p of (pData || []) as Payment[]) {
          if (!map[p.invoice_id]) map[p.invoice_id] = [];
          map[p.invoice_id].push(p);
        }
        setPaymentsMap(map);
      }

      setLoading(false);
    } catch {
      setError("Failed to load financial data.");
      setLoading(false);
    }
  }

  async function loadSettings() {
    const { data: authData } = await supabaseClient.auth.getUser();
    if (!authData?.user) return;
    const { data } = await supabaseClient.from("invoice_settings").select("*").eq("user_id", authData.user.id).single();
    if (data) setSettings(data as InvoiceSettings);
  }

  useEffect(() => {
    void loadAll();
    void loadSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleViewPdf(inv: Invoice) {
    const { data } = await supabaseClient.from("invoice_items").select("*").eq("invoice_id", inv.id).order("sort_order");
    setSelectedInvoice({ ...inv, items: (data as InvoiceItem[]) || [] });
    setShowPdfModal(true);
  }

  async function handleUpdateStatus(inv: Invoice, newStatus: string) {
    const updates: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "paid") updates.paid_date = new Date().toISOString().split("T")[0];
    await supabaseClient.from("invoices").update(updates).eq("id", inv.id);
    void loadAll();
  }

  async function handleCreateInvoiceFromQuote(quote: Invoice) {
    const { data: authData } = await supabaseClient.auth.getUser();
    if (!authData?.user) return;
    const { data: items } = await supabaseClient.from("invoice_items").select("*").eq("invoice_id", quote.id).order("sort_order");
    const invoiceNumber = `${settings?.invoice_prefix || "INV"}-${Date.now().toString().slice(-6)}`;
    const { data: invoice, error } = await supabaseClient.from("invoices").insert({
      project_id: quote.project_id,
      invoice_number: invoiceNumber,
      invoice_type: "invoice",
      status: "unpaid",
      client_name: quote.client_name,
      client_email: quote.client_email,
      client_phone: quote.client_phone,
      client_address: quote.client_address,
      issue_date: new Date().toISOString().split("T")[0],
      subtotal: quote.subtotal,
      tax_rate: quote.tax_rate,
      tax_amount: quote.tax_amount,
      discount_amount: quote.discount_amount,
      total: quote.total,
      currency: quote.currency,
      notes: quote.notes,
      company_name: quote.company_name,
      company_logo_url: quote.company_logo_url,
      company_address: quote.company_address,
      company_phone: quote.company_phone,
      company_email: quote.company_email,
      bank_name: quote.bank_name,
      bank_account_number: quote.bank_account_number,
      bank_iban: quote.bank_iban,
      created_by: authData.user.id,
    }).select().single();
    if (error || !invoice) return;
    if (items && items.length > 0) {
      await supabaseClient.from("invoice_items").insert(
        (items as InvoiceItem[]).map(item => ({
          invoice_id: invoice.id, description: item.description,
          quantity: item.quantity, unit_price: item.unit_price,
          amount: item.amount, sort_order: item.sort_order,
        }))
      );
    }
    await supabaseClient.from("invoices").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", quote.id);
    void loadAll();
  }

  // Filtered
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (typeFilter !== "all" && inv.invoice_type !== typeFilter) return false;
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (projectFilter !== "all" && inv.project_id !== projectFilter) return false;
      if (companyFilter !== "all") {
        const proj = projects.find((p) => p.id === inv.project_id);
        if (!proj || proj.company_id !== companyFilter) return false;
      }
      if (dateFromFilter || dateToFilter) {
        const ymd = inv.issue_date?.slice(0, 10);
        if (dateFromFilter && ymd && ymd < dateFromFilter) return false;
        if (dateToFilter && ymd && ymd > dateToFilter) return false;
      }
      return true;
    });
  }, [invoices, typeFilter, statusFilter, projectFilter, companyFilter, dateFromFilter, dateToFilter, projects]);

  const summary = useMemo(() => {
    let totalQuoted = 0, totalInvoiced = 0, totalPaid = 0, totalOverdue = 0;
    for (const inv of filteredInvoices) {
      if (inv.invoice_type === "quote" && inv.status !== "cancelled") totalQuoted += inv.total;
      if (inv.invoice_type === "invoice" && inv.status !== "cancelled") {
        totalInvoiced += inv.total;
        if (inv.status === "paid") totalPaid += inv.total;
        if (inv.status === "overdue") totalOverdue += inv.total;
      }
    }
    return { totalQuoted, totalInvoiced, totalPaid, totalOverdue };
  }, [filteredInvoices]);

  const projectSummary = useMemo(() => {
    let totalValue = 0;
    for (const proj of projects) { if (proj.value) totalValue += proj.value; }
    return { totalValue, totalCount: projects.length };
  }, [projects]);

  function clearFilters() {
    setDateFromFilter(""); setDateToFilter(""); setTypeFilter("all"); setStatusFilter("all"); setCompanyFilter("all"); setProjectFilter("all");
  }

  const hasActiveFilters = dateFromFilter || dateToFilter || typeFilter !== "all" || statusFilter !== "all" || companyFilter !== "all" || projectFilter !== "all";

  const companyOptions = companies.map(c => ({ id: c.id, label: c.name }));
  const projectOptions = projects
    .filter(p => companyFilter === "all" || p.company_id === companyFilter)
    .map(p => {
      const co = (typeof p.company === "object" && p.company !== null && !Array.isArray(p.company))
        ? (p.company as { name: string }).name : undefined;
      return { id: p.id, label: p.name, sub: co };
    });

  return (
    <RequireAdmin>
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Financial Summary</h1>
          <p className="mt-0.5 text-sm text-slate-500">Overview of all projects, companies, quotes, and invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setCreateType("quote"); setShowCreateModal(true); }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[12px] font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14"/></svg>
            New Quote
          </button>
          <button
            type="button"
            onClick={() => { setCreateType("invoice"); setShowCreateModal(true); }}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-[12px] font-semibold text-white shadow-lg hover:bg-violet-700 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14"/></svg>
            New Invoice
          </button>
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            Settings
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-5 text-white shadow-xl">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">Total Quoted</p>
          <p className="mt-2 text-2xl font-bold">{formatMoney(summary.totalQuoted)}</p>
          <p className="mt-1 text-[11px] text-white/60">{filteredInvoices.filter(i => i.invoice_type === "quote").length} quotes</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-5 text-white shadow-xl">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">Total Invoiced</p>
          <p className="mt-2 text-2xl font-bold">{formatMoney(summary.totalInvoiced)}</p>
          <p className="mt-1 text-[11px] text-white/60">{filteredInvoices.filter(i => i.invoice_type === "invoice").length} invoices</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-xl">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">Paid</p>
          <p className="mt-2 text-2xl font-bold">{formatMoney(summary.totalPaid)}</p>
          <p className="mt-1 text-[11px] text-white/60">{filteredInvoices.filter(i => i.status === "paid").length} paid</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 p-5 text-white shadow-xl">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">Overdue</p>
          <p className="mt-2 text-2xl font-bold">{formatMoney(summary.totalOverdue)}</p>
          <p className="mt-1 text-[11px] text-white/60">{filteredInvoices.filter(i => i.status === "overdue").length} overdue</p>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 text-amber-600">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div><p className="text-[11px] font-medium text-slate-500">Projects</p><p className="text-lg font-bold text-slate-900">{projectSummary.totalCount}</p></div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Total value: {formatMoney(projectSummary.totalValue)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-blue-100 text-sky-600">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4z"/></svg>
            </div>
            <div><p className="text-[11px] font-medium text-slate-500">Companies</p><p className="text-lg font-bold text-slate-900">{companies.length}</p></div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div><p className="text-[11px] font-medium text-slate-500">Collection Rate</p><p className="text-lg font-bold text-slate-900">{summary.totalInvoiced > 0 ? Math.round((summary.totalPaid / summary.totalInvoiced) * 100) : 0}%</p></div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/60 bg-gradient-to-r from-slate-50/80 to-white/80 p-3 shadow-sm">

        {/* Type toggle pills */}
        <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
          {(["all", "quote", "invoice"] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`rounded-[10px] px-3 py-1.5 text-[11px] font-semibold transition-all ${
                typeFilter === t
                  ? t === "quote" ? "bg-blue-600 text-white shadow-sm"
                    : t === "invoice" ? "bg-violet-600 text-white shadow-sm"
                    : "bg-slate-800 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "all" ? "All" : t === "quote" ? "Quotes" : "Invoices"}
            </button>
          ))}
        </div>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-black shadow-sm focus:border-indigo-400 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="overdue">Overdue</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Searchable company dropdown */}
        <SearchableDropdown
          value={companyFilter}
          onChange={v => { setCompanyFilter(v); setProjectFilter("all"); }}
          options={companyOptions}
          placeholder="Companies"
          label="All Companies"
        />

        {/* Searchable project dropdown */}
        <SearchableDropdown
          value={projectFilter}
          onChange={setProjectFilter}
          options={projectOptions}
          placeholder="Projects"
          label="All Projects"
        />

        {/* Date range */}
        <input type="date" value={dateFromFilter} onChange={e => setDateFromFilter(e.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-[11px] shadow-sm focus:border-indigo-400 focus:outline-none" />
        <span className="text-[10px] text-slate-400">to</span>
        <input type="date" value={dateToFilter} onChange={e => setDateToFilter(e.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-[11px] shadow-sm focus:border-indigo-400 focus:outline-none" />

        {hasActiveFilters && (
          <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-100">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            Clear
          </button>
        )}
        <div className="ml-auto text-[11px] text-slate-400">{filteredInvoices.length} records</div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-500" /></div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
      ) : filteredInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-violet-50/30 py-16">
          <p className="text-sm font-semibold text-slate-700">No records found</p>
          <p className="mt-1 text-xs text-slate-400">Try adjusting your filters or create a new quote/invoice</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 shadow-xl overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-4 hover:bg-slate-50/80 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${inv.invoice_type === "quote" ? "bg-blue-100 text-blue-600" : "bg-violet-100 text-violet-600"}`}>
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold text-slate-900">{inv.invoice_number}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusColors[inv.status] || "bg-slate-100 text-slate-600"}`}>{inv.status}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${inv.invoice_type === "quote" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"}`}>{inv.invoice_type}</span>
                    </div>
                    <p className="text-[12px] text-slate-500">{inv.client_name}</p>
                    <div className="mt-0.5 flex items-center gap-3 text-[10px] text-slate-400">
                      <span>{formatDate(inv.issue_date)}</span>
                      {inv.project && (
                        <Link href={`/projects/${inv.project.id}`} className="text-indigo-600 hover:underline">
                          {inv.project.name}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-[15px] font-bold text-slate-900">{formatMoney(inv.total, inv.currency)}</p>
                    {inv.invoice_type === "invoice" && (paymentsMap[inv.id] || []).length > 0 && (() => {
                      const totalPaid = (paymentsMap[inv.id] || []).reduce((s, p) => s + p.amount, 0);
                      const balance = inv.total - totalPaid;
                      return (
                        <div className="flex items-center gap-2 text-[10px] mt-0.5">
                          <span className="text-emerald-600 font-medium">Paid: {formatMoney(totalPaid, inv.currency)}</span>
                          {balance > 0.01 && <span className="text-amber-600 font-medium">Balance: {formatMoney(balance, inv.currency)}</span>}
                        </div>
                      );
                    })()}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleViewPdf(inv)}
                      title="View PDF"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditTarget(inv)}
                      title="Edit"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    {inv.status === "draft" && (
                      <button type="button" onClick={() => handleUpdateStatus(inv, "sent")} className="h-8 rounded-lg bg-blue-50 px-2.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100">Send</button>
                    )}
                    {inv.invoice_type === "quote" && inv.status === "sent" && (
                      <>
                        <button type="button" onClick={() => handleUpdateStatus(inv, "accepted")} className="h-8 rounded-lg bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100">Accept</button>
                        <button type="button" onClick={() => handleUpdateStatus(inv, "rejected")} className="h-8 rounded-lg bg-red-50 px-2.5 text-[11px] font-semibold text-red-700 hover:bg-red-100">Reject</button>
                      </>
                    )}
                    {inv.invoice_type === "quote" && inv.status === "accepted" && (
                      <button type="button" onClick={() => handleCreateInvoiceFromQuote(inv)} className="h-8 rounded-lg bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100">→ Invoice</button>
                    )}
                    {/* Payment recording for invoices */}
                    {inv.invoice_type === "invoice" && inv.status !== "paid" && inv.status !== "cancelled" && (
                      <button
                        type="button"
                        onClick={() => { setPaymentInvoice(inv); setShowPaymentModal(true); }}
                        className="h-8 rounded-lg bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        {(paymentsMap[inv.id] || []).length > 0 ? "+ Payment" : "Record Payment"}
                      </button>
                    )}
                    {/* Receipt buttons for each payment */}
                    {inv.invoice_type === "invoice" && (paymentsMap[inv.id] || []).length > 0 && (
                      <div className="flex items-center gap-1">
                        {(paymentsMap[inv.id] || []).map((p, idx) => (
                          <button
                            key={p.id}
                            type="button"
                            title={`Receipt for payment ${idx + 1}`}
                            onClick={() => { setReceiptInvoice(inv); setReceiptPayment(p); setShowReceiptModal(true); }}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/></svg>
                            {(paymentsMap[inv.id] || []).length > 1 ? `R${idx + 1}` : "Receipt"}
                          </button>
                        ))}
                      </div>
                    )}
                    {inv.status !== "paid" && inv.status !== "cancelled" && inv.status !== "rejected" && (
                      <button
                        type="button"
                        onClick={() => setCancelTarget(inv)}
                        className="h-8 rounded-lg bg-red-50 px-2.5 text-[11px] font-semibold text-red-600 hover:bg-red-100"
                        title="Cancel"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* Modals */}
    {showCreateModal && (
      <ProjectPickerModal
        projects={projects}
        type={createType}
        settings={settings}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => { void loadAll(); setShowCreateModal(false); }}
      />
    )}
    {showSettingsModal && (
      <InvoiceSettingsModal
        settings={settings}
        onClose={() => setShowSettingsModal(false)}
        onSaved={() => { void loadSettings(); setShowSettingsModal(false); }}
      />
    )}
    {cancelTarget && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
            <svg className="h-6 w-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900">Cancel {cancelTarget.invoice_type === "quote" ? "Quote" : "Invoice"}?</h3>
          <p className="mt-1.5 text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{cancelTarget.invoice_number}</span> will be marked as cancelled. This cannot be undone.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => setCancelTarget(null)}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Keep
            </button>
            <button
              type="button"
              onClick={async () => {
                await handleUpdateStatus(cancelTarget, "cancelled");
                setCancelTarget(null);
              }}
              className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              Yes, Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    {showPdfModal && selectedInvoice && (
      <InvoicePdfModal
        invoice={selectedInvoice as Parameters<typeof InvoicePdfModal>[0]["invoice"]}
        onClose={() => setShowPdfModal(false)}
      />
    )}
    {editTarget && (
      <InvoiceEditModal
        invoice={editTarget}
        settings={settings}
        onClose={() => setEditTarget(null)}
        onSaved={() => { void loadAll(); setEditTarget(null); }}
      />
    )}
    {showPaymentModal && paymentInvoice && (
      <PaymentModal
        invoice={paymentInvoice as unknown as MgmtInvoice}
        payments={paymentsMap[paymentInvoice.id] || []}
        onClose={() => { setShowPaymentModal(false); setPaymentInvoice(null); }}
        onSaved={() => { void loadAll(); }}
      />
    )}
    {showReceiptModal && receiptInvoice && receiptPayment && (
      <ReceiptModal
        invoice={receiptInvoice as unknown as MgmtInvoice}
        payment={receiptPayment}
        allPayments={paymentsMap[receiptInvoice.id] || []}
        settings={settings}
        onClose={() => { setShowReceiptModal(false); setReceiptInvoice(null); setReceiptPayment(null); }}
      />
    )}
    </RequireAdmin>
  );
}
