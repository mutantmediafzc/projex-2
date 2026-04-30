"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { SOAInvoice } from "./ReceiptPDF";
import type { InvoiceSettings } from "./InvoiceManagement";

const SOAPDFViewer = dynamic(() => import("./ReceiptPDF").then(m => m.SOAPDFViewer), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" /></div>,
});

type Props = {
  invoices: SOAInvoice[];
  clientName: string;
  settings?: InvoiceSettings | null;
  onClose: () => void;
};

export default function SOAModal({ invoices, clientName, settings, onClose }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [dateFrom, setDateFrom] = useState(yearStart);
  const [dateTo, setDateTo] = useState(today);
  const [showPdf, setShowPdf] = useState(false);

  const filtered = invoices.filter(inv =>
    inv.invoice_type === "invoice" &&
    inv.issue_date >= dateFrom &&
    inv.issue_date <= dateTo
  );

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4 py-6">
      <button type="button" className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900">Statement of Accounts</h3>
            <p className="text-[12px] text-slate-500">{clientName}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">×</button>
        </div>

        {!showPdf ? (
          <div className="p-6 space-y-6">
            {/* Date range picker */}
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-black focus:border-violet-400 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-black focus:border-violet-400 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => { setDateFrom(`${new Date().getFullYear()}-01-01`); setDateTo(today); }}
                className="h-10 rounded-xl border border-slate-200 px-3 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
              >
                This Year
              </button>
              <button
                type="button"
                onClick={() => { const d = new Date(); const first = new Date(d.getFullYear(), d.getMonth(), 1); setDateFrom(first.toISOString().split("T")[0]); setDateTo(today); }}
                className="h-10 rounded-xl border border-slate-200 px-3 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
              >
                This Month
              </button>
            </div>

            {/* Preview table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{filtered.length} invoice{filtered.length !== 1 ? "s" : ""} in range</p>
              </div>
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-slate-400">No invoices found in this date range</p>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Number</th>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Date</th>
                      <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</th>
                      <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Total</th>
                      <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Paid</th>
                      <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(inv => {
                      const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
                      const bal = inv.total - paid;
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2 text-[12px] font-semibold text-slate-900">{inv.invoice_number}</td>
                          <td className="px-4 py-2 text-[12px] text-slate-600">{new Date(inv.issue_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                          <td className="px-4 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${inv.status === "paid" ? "bg-emerald-100 text-emerald-700" : inv.status === "partially_paid" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{inv.status}</span>
                          </td>
                          <td className="px-4 py-2 text-right text-[12px] font-semibold text-slate-900">{inv.currency} {inv.total.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right text-[12px] text-emerald-700">{inv.currency} {paid.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right text-[12px] font-semibold text-amber-700">{inv.currency} {bal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button
                type="button"
                disabled={filtered.length === 0}
                onClick={() => setShowPdf(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-[12px] font-semibold text-white shadow-lg hover:bg-violet-700 disabled:opacity-40"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Generate PDF
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-3 shrink-0">
              <button type="button" onClick={() => setShowPdf(false)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Back
              </button>
              <p className="text-[12px] text-slate-500">{filtered.length} invoices · {dateFrom} to {dateTo}</p>
            </div>
            <div className="flex-1 min-h-0">
              <SOAPDFViewer clientName={clientName} dateFrom={dateFrom} dateTo={dateTo} invoices={filtered} settings={settings} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
