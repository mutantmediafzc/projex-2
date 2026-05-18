"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import type { Invoice } from "./InvoiceManagement";

export type Payment = {
  id: string;
  invoice_id: string;
  receipt_number: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  created_at: string;
};

type Props = {
  invoice: Invoice;
  payments: Payment[];
  onClose: () => void;
  onSaved: () => void;
};

function formatMoney(amount: number, currency = "AED"): string {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PaymentModal({ invoice, payments, onClose, onSaved }: Props) {
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const balance = invoice.total - totalPaid;

  const [amount, setAmount] = useState<string>(balance > 0 ? balance.toFixed(2) : "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState("Bank Transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount."); return; }
    if (amt > balance + 0.01) { setError(`Amount exceeds balance of ${formatMoney(balance, invoice.currency)}.`); return; }
    setSaving(true);
    setError(null);
    try {
      // Generate receipt number: REC-YYYYMMDD-XXXXXX
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
      const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
      const receiptNumber = `REC-${dateStr}-${randomStr}`;

      const { error: insErr } = await supabaseClient.from("invoice_payments").insert({
        invoice_id: invoice.id,
        receipt_number: receiptNumber,
        amount: amt,
        payment_date: date,
        payment_method: method,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
      });
      if (insErr) throw insErr;

      const newTotalPaid = totalPaid + amt;
      const newStatus = newTotalPaid >= invoice.total - 0.01 ? "paid" : "partially_paid";
      const updates: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === "paid") updates.paid_date = date;
      await supabaseClient.from("invoices").update(updates).eq("id", invoice.id);

      onSaved();
      onClose();
    } catch (e: unknown) {
      console.error("Payment recording error:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to record payment.";
      setError(`Error: ${errorMsg}. Check console for details.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4 py-6">
      <button type="button" className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Record Payment</h3>
            <p className="text-[12px] text-slate-500">{invoice.invoice_number} · {invoice.client_name}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">×</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Balance summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Invoice Total</p>
              <p className="mt-1 text-[13px] font-bold text-slate-900">{formatMoney(invoice.total, invoice.currency)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500">Paid</p>
              <p className="mt-1 text-[13px] font-bold text-emerald-700">{formatMoney(totalPaid, invoice.currency)}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-500">Balance</p>
              <p className="mt-1 text-[13px] font-bold text-amber-700">{formatMoney(balance, invoice.currency)}</p>
            </div>
          </div>

          {/* Past payments */}
          {payments.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <p className="bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Payment History</p>
              <div className="divide-y divide-slate-100">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <p className="text-[12px] font-semibold text-slate-800">{formatMoney(p.amount, invoice.currency)}</p>
                      <p className="text-[10px] text-slate-400">{formatDate(p.payment_date)} · {p.payment_method}{p.reference ? ` · Ref: ${p.reference}` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {balance > 0.01 ? (
            <>
              {/* Amount */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">Payment Amount ({invoice.currency})</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-black focus:border-violet-400 focus:outline-none"
                />
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">Payment Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-black focus:border-violet-400 focus:outline-none"
                />
              </div>

              {/* Method */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">Payment Method</label>
                <select
                  value={method}
                  onChange={e => setMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-black focus:border-violet-400 focus:outline-none"
                >
                  <option>Bank Transfer</option>
                  <option>Cash</option>
                  <option>Cheque</option>
                  <option>Credit Card</option>
                  <option>Online Payment</option>
                  <option>Other</option>
                </select>
              </div>

              {/* Reference */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">Reference / Transaction ID <span className="font-normal text-slate-400">(optional)</span></label>
                <input
                  type="text"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder="e.g. TXN-12345"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-black placeholder:text-slate-400 focus:border-violet-400 focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">Notes <span className="font-normal text-slate-400">(optional)</span></label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-black placeholder:text-slate-400 focus:border-violet-400 focus:outline-none resize-none"
                />
              </div>

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>}
            </>
          ) : (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
              <p className="text-[13px] font-semibold text-emerald-700">Invoice fully paid ✓</p>
            </div>
          )}
        </div>

        {balance > 0.01 && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={saving} className="rounded-xl bg-violet-600 px-5 py-2 text-[12px] font-semibold text-white shadow-lg hover:bg-violet-700 disabled:opacity-50">
              {saving ? "Saving…" : "Record Payment"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
