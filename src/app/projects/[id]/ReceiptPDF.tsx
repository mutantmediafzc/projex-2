"use client";

import { Document, Page, Text, View, StyleSheet, PDFViewer } from "@react-pdf/renderer";
import type { Invoice } from "./InvoiceManagement";
import type { Payment } from "./PaymentModal";

const MUTANT = {
  name: "Mutant Media Fzc.",
  bank: "Mashreq Bank",
  address: "Al Ghurair City, 339-C, AGC, Al Riqqa Street, Dubai, UAE",
  account: "019100924426",
  iban: "AE320330000019100924426",
  swift: "BOMLAEAD",
};

function fmt(amount: number, currency = "AED") {
  return `${currency} ${amount.toFixed(2)}`;
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Receipt PDF ──────────────────────────────────────────────────────────────
const rStyles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: "#7c3aed" },
  headerCompanyName: { fontSize: 18, fontWeight: "bold", color: "#1e293b", marginBottom: 3 },
  headerLine: { fontSize: 9, color: "#475569", marginBottom: 2 },
  badge: { fontSize: 28, fontWeight: "bold", color: "#059669" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 9, fontWeight: "bold", color: "#64748b", textTransform: "uppercase", marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  label: { fontSize: 10, color: "#475569" },
  value: { fontSize: 10, fontWeight: "bold", color: "#1e293b" },
  totalBox: { marginTop: 20, backgroundColor: "#f0fdf4", borderRadius: 6, padding: 12 },
  totalLabel: { fontSize: 12, fontWeight: "bold", color: "#059669" },
  totalValue: { fontSize: 14, fontWeight: "bold", color: "#059669" },
  balanceBox: { marginTop: 8, backgroundColor: "#fffbeb", borderRadius: 6, padding: 12 },
  balanceLabel: { fontSize: 10, color: "#92400e" },
  balanceValue: { fontSize: 12, fontWeight: "bold", color: "#92400e" },
  note: { marginTop: 24, padding: 10, backgroundColor: "#f8fafc", borderRadius: 4, borderLeftWidth: 3, borderLeftColor: "#7c3aed" },
  noteText: { fontSize: 9, color: "#475569", lineHeight: 1.5 },
});

function ReceiptDocument({ invoice, payment, allPayments }: {
  invoice: Invoice;
  payment: Payment;
  allPayments: Payment[];
}) {
  const totalPaid = allPayments.reduce((s, p) => s + p.amount, 0);
  const balance = invoice.total - totalPaid;

  return (
    <Document>
      <Page size="A4" style={rStyles.page}>
        {/* Header */}
        <View style={rStyles.header}>
          <View>
            <Text style={rStyles.headerCompanyName}>{MUTANT.name}</Text>
            <Text style={rStyles.headerLine}>{MUTANT.bank}</Text>
            <Text style={rStyles.headerLine}>{MUTANT.address}</Text>
            <Text style={rStyles.headerLine}>Account #  {MUTANT.account}</Text>
            <Text style={rStyles.headerLine}>IBAN  {MUTANT.iban}</Text>
            <Text style={rStyles.headerLine}>Swift Code:  {MUTANT.swift}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={rStyles.badge}>RECEIPT</Text>
            <Text style={[rStyles.headerLine, { marginTop: 6 }]}>For: {invoice.invoice_number}</Text>
            <Text style={rStyles.headerLine}>Date: {fmtDate(payment.payment_date)}</Text>
          </View>
        </View>

        {/* Received from */}
        <View style={rStyles.section}>
          <Text style={rStyles.sectionTitle}>Received From</Text>
          <View style={rStyles.row}>
            <Text style={rStyles.label}>Client</Text>
            <Text style={rStyles.value}>{invoice.client_name}</Text>
          </View>
          {invoice.client_email && (
            <View style={rStyles.row}>
              <Text style={rStyles.label}>Email</Text>
              <Text style={rStyles.value}>{invoice.client_email}</Text>
            </View>
          )}
        </View>

        {/* Payment details */}
        <View style={rStyles.section}>
          <Text style={rStyles.sectionTitle}>Payment Details</Text>
          <View style={rStyles.row}>
            <Text style={rStyles.label}>Invoice Number</Text>
            <Text style={rStyles.value}>{invoice.invoice_number}</Text>
          </View>
          <View style={rStyles.row}>
            <Text style={rStyles.label}>Invoice Total</Text>
            <Text style={rStyles.value}>{fmt(invoice.total, invoice.currency)}</Text>
          </View>
          <View style={rStyles.row}>
            <Text style={rStyles.label}>Payment Method</Text>
            <Text style={rStyles.value}>{payment.payment_method}</Text>
          </View>
          {payment.reference && (
            <View style={rStyles.row}>
              <Text style={rStyles.label}>Reference</Text>
              <Text style={rStyles.value}>{payment.reference}</Text>
            </View>
          )}
          {payment.notes && (
            <View style={rStyles.row}>
              <Text style={rStyles.label}>Notes</Text>
              <Text style={rStyles.value}>{payment.notes}</Text>
            </View>
          )}
        </View>

        {/* Amount received */}
        <View style={[rStyles.totalBox, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
          <Text style={rStyles.totalLabel}>Amount Received</Text>
          <Text style={rStyles.totalValue}>{fmt(payment.amount, invoice.currency)}</Text>
        </View>

        {/* Balance */}
        {balance > 0.01 && (
          <View style={[rStyles.balanceBox, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
            <Text style={rStyles.balanceLabel}>Outstanding Balance</Text>
            <Text style={rStyles.balanceValue}>{fmt(balance, invoice.currency)}</Text>
          </View>
        )}
        {balance <= 0.01 && (
          <View style={[rStyles.balanceBox, { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f0fdf4" }]}>
            <Text style={[rStyles.balanceLabel, { color: "#059669" }]}>Invoice Status</Text>
            <Text style={[rStyles.balanceValue, { color: "#059669" }]}>FULLY PAID</Text>
          </View>
        )}

        {/* Footer note */}
        <View style={rStyles.note}>
          <Text style={rStyles.noteText}>This receipt confirms payment received by {MUTANT.name}. Please retain this document for your records.</Text>
        </View>
      </Page>
    </Document>
  );
}

export function ReceiptPDFViewer({ invoice, payment, allPayments }: {
  invoice: Invoice;
  payment: Payment;
  allPayments: Payment[];
}) {
  return (
    <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
      <ReceiptDocument invoice={invoice} payment={payment} allPayments={allPayments} />
    </PDFViewer>
  );
}

// ── Statement of Accounts PDF ────────────────────────────────────────────────
const sStyles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: "#7c3aed" },
  headerCompanyName: { fontSize: 18, fontWeight: "bold", color: "#1e293b", marginBottom: 3 },
  headerLine: { fontSize: 9, color: "#475569", marginBottom: 2 },
  badge: { fontSize: 22, fontWeight: "bold", color: "#7c3aed" },
  clientBox: { marginBottom: 20, padding: 12, backgroundColor: "#f8fafc", borderRadius: 6 },
  clientTitle: { fontSize: 9, fontWeight: "bold", color: "#64748b", textTransform: "uppercase", marginBottom: 4 },
  clientName: { fontSize: 12, fontWeight: "bold", color: "#1e293b" },
  clientSub: { fontSize: 9, color: "#475569" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: 8, borderRadius: 4, marginBottom: 2 },
  tableHeaderCell: { fontWeight: "bold", color: "#475569", fontSize: 9 },
  tableRow: { flexDirection: "row", padding: 8, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  tableCell: { color: "#334155", fontSize: 9 },
  dateCol: { width: "14%" },
  numCol: { width: "18%" },
  descCol: { width: "28%" },
  statusCol: { width: "13%" },
  debitCol: { width: "13%", textAlign: "right" },
  creditCol: { width: "14%", textAlign: "right" },
  summaryBox: { marginTop: 24, borderTopWidth: 2, borderTopColor: "#7c3aed", paddingTop: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 4 },
  summaryLabel: { fontSize: 10, color: "#64748b", width: 140, textAlign: "right", marginRight: 12 },
  summaryValue: { fontSize: 10, fontWeight: "bold", color: "#1e293b", width: 100, textAlign: "right" },
  balanceRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 6, padding: 8, backgroundColor: "#f0f9ff", borderRadius: 4 },
  balanceLabel: { fontSize: 12, fontWeight: "bold", color: "#0369a1", width: 140, textAlign: "right", marginRight: 12 },
  balanceValue: { fontSize: 12, fontWeight: "bold", color: "#0369a1", width: 100, textAlign: "right" },
  note: { marginTop: 20, padding: 10, backgroundColor: "#f8fafc", borderRadius: 4, borderLeftWidth: 3, borderLeftColor: "#7c3aed" },
  noteText: { fontSize: 9, color: "#475569", lineHeight: 1.5 },
});

export type SOAInvoice = Invoice & { payments: Payment[] };

function SOADocument({ clientName, dateFrom, dateTo, invoices }: {
  clientName: string;
  dateFrom: string;
  dateTo: string;
  invoices: SOAInvoice[];
}) {
  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.payments.reduce((ps, p) => ps + p.amount, 0), 0);
  const balance = totalInvoiced - totalPaid;
  const currency = invoices[0]?.currency || "AED";

  // Build ledger rows: invoices + payments sorted by date
  type LedgerRow = { date: string; number: string; desc: string; status: string; debit: number | null; credit: number | null };
  const rows: LedgerRow[] = [];
  for (const inv of invoices) {
    rows.push({ date: inv.issue_date, number: inv.invoice_number, desc: inv.invoice_type === "quote" ? "Quote" : "Invoice", status: inv.status, debit: inv.total, credit: null });
    for (const p of inv.payments) {
      rows.push({ date: p.payment_date, number: inv.invoice_number, desc: `Payment (${p.payment_method})`, status: "paid", debit: null, credit: p.amount });
    }
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Document>
      <Page size="A4" style={sStyles.page}>
        {/* Header */}
        <View style={sStyles.header}>
          <View>
            <Text style={sStyles.headerCompanyName}>{MUTANT.name}</Text>
            <Text style={sStyles.headerLine}>{MUTANT.bank}</Text>
            <Text style={sStyles.headerLine}>{MUTANT.address}</Text>
            <Text style={sStyles.headerLine}>IBAN  {MUTANT.iban}  |  Swift:  {MUTANT.swift}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={sStyles.badge}>STATEMENT OF ACCOUNT</Text>
            <Text style={[sStyles.headerLine, { marginTop: 6 }]}>Period: {fmtDate(dateFrom)} – {fmtDate(dateTo)}</Text>
          </View>
        </View>

        {/* Client */}
        <View style={sStyles.clientBox}>
          <Text style={sStyles.clientTitle}>Prepared for</Text>
          <Text style={sStyles.clientName}>{clientName}</Text>
          {invoices[0]?.client_email && <Text style={sStyles.clientSub}>{invoices[0].client_email}</Text>}
        </View>

        {/* Table */}
        <View style={sStyles.tableHeader}>
          <Text style={[sStyles.tableHeaderCell, sStyles.dateCol]}>Date</Text>
          <Text style={[sStyles.tableHeaderCell, sStyles.numCol]}>Ref #</Text>
          <Text style={[sStyles.tableHeaderCell, sStyles.descCol]}>Description</Text>
          <Text style={[sStyles.tableHeaderCell, sStyles.statusCol]}>Status</Text>
          <Text style={[sStyles.tableHeaderCell, sStyles.debitCol]}>Debit</Text>
          <Text style={[sStyles.tableHeaderCell, sStyles.creditCol]}>Credit</Text>
        </View>
        {rows.map((r, i) => (
          <View key={i} style={sStyles.tableRow}>
            <Text style={[sStyles.tableCell, sStyles.dateCol]}>{fmtDate(r.date)}</Text>
            <Text style={[sStyles.tableCell, sStyles.numCol]}>{r.number}</Text>
            <Text style={[sStyles.tableCell, sStyles.descCol]}>{r.desc}</Text>
            <Text style={[sStyles.tableCell, sStyles.statusCol]}>{r.status}</Text>
            <Text style={[sStyles.tableCell, sStyles.debitCol]}>{r.debit != null ? fmt(r.debit, currency) : ""}</Text>
            <Text style={[sStyles.tableCell, sStyles.creditCol]}>{r.credit != null ? fmt(r.credit, currency) : ""}</Text>
          </View>
        ))}

        {/* Summary */}
        <View style={sStyles.summaryBox}>
          <View style={sStyles.summaryRow}>
            <Text style={sStyles.summaryLabel}>Total Invoiced</Text>
            <Text style={sStyles.summaryValue}>{fmt(totalInvoiced, currency)}</Text>
          </View>
          <View style={sStyles.summaryRow}>
            <Text style={sStyles.summaryLabel}>Total Paid</Text>
            <Text style={sStyles.summaryValue}>{fmt(totalPaid, currency)}</Text>
          </View>
          <View style={sStyles.balanceRow}>
            <Text style={sStyles.balanceLabel}>Outstanding Balance</Text>
            <Text style={sStyles.balanceValue}>{fmt(balance, currency)}</Text>
          </View>
        </View>

        <View style={sStyles.note}>
          <Text style={sStyles.noteText}>This statement was generated on {fmtDate(new Date().toISOString().split("T")[0])} and covers the period {fmtDate(dateFrom)} to {fmtDate(dateTo)}. Please contact us if you have any queries.</Text>
        </View>
      </Page>
    </Document>
  );
}

export function SOAPDFViewer({ clientName, dateFrom, dateTo, invoices }: {
  clientName: string;
  dateFrom: string;
  dateTo: string;
  invoices: SOAInvoice[];
}) {
  return (
    <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
      <SOADocument clientName={clientName} dateFrom={dateFrom} dateTo={dateTo} invoices={invoices} />
    </PDFViewer>
  );
}
