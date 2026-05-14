"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import InvoiceCreateModal from "./InvoiceCreateModal";
import InvoiceSettingsModal from "./InvoiceSettingsModal";
import InvoicePdfModal from "./InvoicePdfModal";
import PaymentModal, { type Payment } from "./PaymentModal";
import ReceiptModal from "./ReceiptModal";
import SOAModal from "./SOAModal";
import InvoiceEditModal from "./InvoiceEditModal";
import type { SOAInvoice } from "./ReceiptPDF";

export type InvoiceStatus = "draft" | "sent" | "paid" | "unpaid" | "overdue" | "cancelled" | "accepted" | "rejected" | "partially_paid";
export type InvoiceType = "quote" | "invoice";

export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  sort_order: number;
};

export type Invoice = {
  id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  status: InvoiceStatus;
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
};

export type InvoiceSettings = {
  company_name: string | null;
  company_logo_url: string | null;
  company_address: string | null;
  company_phone: string | null;
  company_email: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_iban: string | null;
  invoice_prefix: string;
  quote_prefix: string;
  currency: string;
  tax_rate: number;
  // PDF Layout Settings
  pdf_page_padding?: number;
  pdf_font_size?: number;
  pdf_header_margin?: number;
  pdf_footer_margin?: number;
  pdf_line_spacing?: number;
  pdf_logo_size?: "small" | "medium" | "large";
  pdf_header_style?: "compact" | "standard" | "detailed";
};

type FinancialSummary = { quoted: number; invoiced: number; paid: number; overdue: number };

function formatMoney(amount: number, currency = "AED"): string {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const statusColors: Record<InvoiceStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  unpaid: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  partially_paid: "bg-blue-100 text-blue-700",
};

export default function InvoiceManagement({ projectId, projectName, clientName }: { projectId: string; projectName: string; clientName?: string }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [createType, setCreateType] = useState<InvoiceType>("invoice");
  const [summary, setSummary] = useState<FinancialSummary>({ quoted: 0, invoiced: 0, paid: 0, overdue: 0 });

  // Payments
  const [paymentsMap, setPaymentsMap] = useState<Record<string, Payment[]>>({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  // Receipt
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null);
  // SOA
  const [showSOAModal, setShowSOAModal] = useState(false);
  // Cancel confirm
  const [cancelTarget, setCancelTarget] = useState<Invoice | null>(null);
  // Edit
  const [editTarget, setEditTarget] = useState<Invoice | null>(null);

  useEffect(() => { loadInvoices(); loadSettings(); }, [projectId]);

  async function loadInvoices() {
    try {
      setLoading(true);
      const { data } = await supabaseClient.from("invoices").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
      const invoiceList = (data as Invoice[]) || [];
      setInvoices(invoiceList);

      // Load all payments for these invoices
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

        const newSummary: FinancialSummary = { quoted: 0, invoiced: 0, paid: 0, overdue: 0 };
        for (const inv of invoiceList) {
          if (inv.invoice_type === "quote" && inv.status !== "cancelled") newSummary.quoted += inv.total;
          if (inv.invoice_type === "invoice" && inv.status !== "cancelled") {
            newSummary.invoiced += inv.total;
            const invPaid = (map[inv.id] || []).reduce((s, p) => s + p.amount, 0);
            newSummary.paid += invPaid;
            if (inv.status === "overdue") newSummary.overdue += inv.total;
          }
        }
        setSummary(newSummary);
      }
    } finally { setLoading(false); }
  }

  async function loadSettings() {
    const { data: authData } = await supabaseClient.auth.getUser();
    if (!authData?.user) return;
    const { data } = await supabaseClient.from("invoice_settings").select("*").eq("user_id", authData.user.id).single();
    if (data) setSettings(data as InvoiceSettings);
  }

  async function handleViewPdf(invoice: Invoice) {
    const { data } = await supabaseClient.from("invoice_items").select("*").eq("invoice_id", invoice.id).order("sort_order");
    setSelectedInvoice({ ...invoice, items: (data as InvoiceItem[]) || [] });
    setShowPdfModal(true);
  }

  async function handleUpdateStatus(invoice: Invoice, newStatus: InvoiceStatus) {
    const updates: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "paid") updates.paid_date = new Date().toISOString().split("T")[0];
    await supabaseClient.from("invoices").update(updates).eq("id", invoice.id);
    loadInvoices();
  }

  async function handleCreateInvoiceFromQuote(quote: Invoice) {
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      if (!authData?.user) return;

      // Get quote items
      const { data: items } = await supabaseClient.from("invoice_items").select("*").eq("invoice_id", quote.id).order("sort_order");

      // Generate new invoice number
      const prefix = settings?.invoice_prefix || "INV";
      const invoiceNumber = `${prefix}-${Date.now().toString().slice(-6)}`;

      // Create invoice from quote
      const { data: invoice, error } = await supabaseClient.from("invoices").insert({
        project_id: projectId,
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

      // Copy items to new invoice
      if (items && items.length > 0) {
        const newItems = items.map((item: InvoiceItem) => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          sort_order: item.sort_order,
        }));
        await supabaseClient.from("invoice_items").insert(newItems);
      }

      // Mark quote as accepted
      await supabaseClient.from("invoices").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", quote.id);

      loadInvoices();
    } catch (err) {
      console.error("Failed to create invoice from quote:", err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-4 text-white shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Quoted</p>
          <p className="mt-1 text-2xl font-bold">{formatMoney(summary.quoted)}</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-4 text-white shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Invoiced</p>
          <p className="mt-1 text-2xl font-bold">{formatMoney(summary.invoiced)}</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Paid</p>
          <p className="mt-1 text-2xl font-bold">{formatMoney(summary.paid)}</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 p-4 text-white shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Overdue</p>
          <p className="mt-1 text-2xl font-bold">{formatMoney(summary.overdue)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => { setCreateType("quote"); setShowCreateModal(true); }} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[12px] font-semibold text-white shadow-lg hover:bg-blue-700">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14" /></svg>
            New Quote
          </button>
          <button type="button" onClick={() => { setCreateType("invoice"); setShowCreateModal(true); }} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-[12px] font-semibold text-white shadow-lg hover:bg-violet-700">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14" /></svg>
            New Invoice
          </button>
          <button type="button" onClick={() => setShowSOAModal(true)} disabled={invoices.filter(i => i.invoice_type === "invoice").length === 0} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 17H7A5 5 0 017 7h2M15 7h2a5 5 0 010 10h-2M11 12h2"/></svg>
            Statement of Accounts
          </button>
        </div>
        <button type="button" onClick={() => setShowSettingsModal(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
          Settings
        </button>
      </div>

      {/* Invoice List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" /></div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700">No invoices yet</p>
            <p className="mt-1 text-xs text-slate-400">Create a quote or invoice to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {invoices.map((inv) => {
              const invPayments = paymentsMap[inv.id] || [];
              const totalPaid = invPayments.reduce((s, p) => s + p.amount, 0);
              const balance = inv.total - totalPaid;
              const paidPct = inv.total > 0 ? Math.min(100, (totalPaid / inv.total) * 100) : 0;
              const isInvoice = inv.invoice_type === "invoice";

              return (
                <div key={inv.id} className="p-5 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${inv.invoice_type === "quote" ? "bg-blue-100 text-blue-600" : "bg-violet-100 text-violet-600"}`}>
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[13px] font-semibold text-slate-900">{inv.invoice_number}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusColors[inv.status]}`}>
                            {inv.status === "partially_paid" ? "Partial" : inv.status}
                          </span>
                        </div>
                        <p className="text-[12px] text-slate-500">{inv.client_name}</p>
                        <p className="text-[11px] text-slate-400">{formatDate(inv.issue_date)}{inv.due_date ? ` · Due ${formatDate(inv.due_date)}` : ""}</p>

                        {/* Payment progress for invoices with any payments */}
                        {isInvoice && invPayments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-emerald-600 font-semibold">Paid {formatMoney(totalPaid, inv.currency)}</span>
                              {balance > 0.01 && <span className="text-amber-600 font-semibold">Balance {formatMoney(balance, inv.currency)}</span>}
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-100">
                              <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${paidPct}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-[15px] font-bold text-slate-900">{formatMoney(inv.total, inv.currency)}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{inv.invoice_type}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {/* View PDF */}
                        <button type="button" onClick={() => handleViewPdf(inv)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" title="View PDF">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        {/* Edit */}
                        <button type="button" onClick={() => setEditTarget(inv)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" title="Edit">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>

                        {/* Draft actions */}
                        {inv.status === "draft" && <button type="button" onClick={() => handleUpdateStatus(inv, "sent")} className="h-9 rounded-lg bg-blue-50 px-3 text-[11px] font-semibold text-blue-700 hover:bg-blue-100">Send</button>}

                        {/* Quote actions */}
                        {inv.invoice_type === "quote" && inv.status === "sent" && (
                          <>
                            <button type="button" onClick={() => handleUpdateStatus(inv, "accepted")} className="h-9 rounded-lg bg-emerald-50 px-3 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100">Accept</button>
                            <button type="button" onClick={() => handleUpdateStatus(inv, "rejected")} className="h-9 rounded-lg bg-red-50 px-3 text-[11px] font-semibold text-red-700 hover:bg-red-100">Reject</button>
                          </>
                        )}
                        {inv.invoice_type === "quote" && inv.status === "accepted" && (
                          <button type="button" onClick={() => handleCreateInvoiceFromQuote(inv)} className="h-9 rounded-lg bg-violet-50 px-3 text-[11px] font-semibold text-violet-700 hover:bg-violet-100">→ Invoice</button>
                        )}

                        {/* Invoice payment actions */}
                        {isInvoice && inv.status !== "paid" && inv.status !== "cancelled" && (
                          <button
                            type="button"
                            onClick={() => { setPaymentInvoice(inv); setShowPaymentModal(true); }}
                            className="h-9 rounded-lg bg-emerald-50 px-3 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            {invPayments.length > 0 ? "+ Payment" : "Record Payment"}
                          </button>
                        )}

                        {/* Cancel button — available on non-terminal statuses */}
                        {inv.status !== "paid" && inv.status !== "cancelled" && inv.status !== "rejected" && (
                          <button
                            type="button"
                            onClick={() => setCancelTarget(inv)}
                            className="h-9 rounded-lg bg-red-50 px-3 text-[11px] font-semibold text-red-600 hover:bg-red-100"
                            title="Cancel this invoice"
                          >
                            Cancel
                          </button>
                        )}

                        {/* Receipt buttons — one per payment */}
                        {isInvoice && invPayments.length > 0 && (
                          <div className="flex items-center gap-1">
                            {invPayments.map((p, idx) => (
                              <button
                                key={p.id}
                                type="button"
                                title={`Receipt for payment ${idx + 1}`}
                                onClick={() => { setReceiptInvoice(inv); setReceiptPayment(p); setShowReceiptModal(true); }}
                                className="inline-flex h-9 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100"
                              >
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/></svg>
                                {invPayments.length > 1 ? `R${idx + 1}` : "Receipt"}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && <InvoiceCreateModal projectId={projectId} projectName={projectName} clientName={clientName} type={createType} settings={settings} onClose={() => setShowCreateModal(false)} onCreated={loadInvoices} />}
      {showSettingsModal && <InvoiceSettingsModal settings={settings} onClose={() => setShowSettingsModal(false)} onSaved={loadSettings} />}
      {showPdfModal && selectedInvoice && <InvoicePdfModal invoice={selectedInvoice} settings={settings} onClose={() => setShowPdfModal(false)} />}
      {showPaymentModal && paymentInvoice && (
        <PaymentModal
          invoice={paymentInvoice}
          payments={paymentsMap[paymentInvoice.id] || []}
          onClose={() => { setShowPaymentModal(false); setPaymentInvoice(null); }}
          onSaved={loadInvoices}
        />
      )}
      {showReceiptModal && receiptInvoice && receiptPayment && (
        <ReceiptModal
          invoice={receiptInvoice}
          payment={receiptPayment}
          allPayments={paymentsMap[receiptInvoice.id] || []}
          settings={settings}
          onClose={() => { setShowReceiptModal(false); setReceiptInvoice(null); setReceiptPayment(null); }}
        />
      )}
      {/* Cancel Confirmation Dialog */}
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

      {showSOAModal && (
        <SOAModal
          invoices={invoices.filter(i => i.invoice_type === "invoice").map(i => ({ ...i, payments: paymentsMap[i.id] || [] })) as SOAInvoice[]}
          clientName={clientName || invoices[0]?.client_name || "Client"}
          settings={settings}
          onClose={() => setShowSOAModal(false)}
        />
      )}

      {editTarget && (
        <InvoiceEditModal
          invoice={editTarget}
          settings={settings}
          onClose={() => setEditTarget(null)}
          onSaved={() => { loadInvoices(); setEditTarget(null); }}
        />
      )}
    </div>
  );
}
