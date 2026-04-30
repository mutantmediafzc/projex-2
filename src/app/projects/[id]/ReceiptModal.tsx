"use client";

import dynamic from "next/dynamic";
import type { Invoice, InvoiceSettings } from "./InvoiceManagement";
import type { Payment } from "./PaymentModal";

const ReceiptPDFViewer = dynamic(() => import("./ReceiptPDF").then(m => m.ReceiptPDFViewer), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" /></div>,
});

type Props = {
  invoice: Invoice;
  payment: Payment;
  allPayments: Payment[];
  settings?: InvoiceSettings | null;
  onClose: () => void;
};

export default function ReceiptModal({ invoice, payment, allPayments, settings, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4 py-6">
      <button type="button" className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Payment Receipt</h3>
            <p className="text-xs text-slate-500">{invoice.invoice_number} · {invoice.client_name}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">×</button>
        </div>
        <div className="flex-1 overflow-hidden min-h-0">
          <ReceiptPDFViewer invoice={invoice} payment={payment} allPayments={allPayments} settings={settings} />
        </div>
      </div>
    </div>
  );
}
