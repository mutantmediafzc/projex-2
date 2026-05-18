"use client";

import { Document, Page, Text, View, StyleSheet, PDFViewer, Image } from "@react-pdf/renderer";
import type { Invoice, InvoiceSettings } from "./InvoiceManagement";
import type { Payment } from "./PaymentModal";

const MUTANT = {
  name: "Mutant Media Fzc.",
  trn: "104081933400003",
  bank: "Mashreq Bank",
  address: "Al Ghurair City, 339-C, AGC, Al Riqqa Street, Dubai, UAE",
  account: "019100924426",
  iban: "AE320330000019100924426",
  swift: "BOMLAEAD",
  logoUrl: "https://www.creamcrm.io/logos/mutant-logo.png",
};

// Logo size mapping
const LOGO_SIZES = {
  small: { width: 60, height: 40 },
  medium: { width: 80, height: 50 },
  large: { width: 100, height: 60 },
};

function fmt(amount: number, currency = "AED") {
  return `${currency} ${amount.toFixed(2)}`;
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Receipt PDF ──────────────────────────────────────────────────────────────
function createReceiptStyles(settings?: InvoiceSettings | null) {
  const padding = settings?.pdf_page_padding ?? 40;
  const fontSize = settings?.pdf_font_size ?? 10;
  const headerMargin = settings?.pdf_header_margin ?? 24;
  const footerMargin = settings?.pdf_footer_margin ?? 30;
  const logoSize = LOGO_SIZES[settings?.pdf_logo_size ?? "medium"];
  const headerStyle = settings?.pdf_header_style ?? "detailed";

  return StyleSheet.create({
    page: { padding, fontSize, fontFamily: "Helvetica" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: headerMargin, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: "#7c3aed" },
    headerLeft: { flexDirection: "column", alignItems: "flex-start", gap: 8 },
    headerTextBlock: { flexDirection: "column", alignItems: "flex-start" },
    headerCompanyName: { fontSize: 18, fontWeight: "bold", color: "#1e293b", marginBottom: 2 },
    headerTrn: { fontSize: 9, color: "#64748b", marginBottom: 6 },
    headerLine: { fontSize: 9, color: "#475569", marginBottom: 2 },
    logo: { width: logoSize.width, height: logoSize.height, objectFit: "contain" },
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
    note: { marginTop: footerMargin, padding: 10, backgroundColor: "#f8fafc", borderRadius: 4, borderLeftWidth: 3, borderLeftColor: "#7c3aed" },
    noteText: { fontSize: 9, color: "#475569", lineHeight: 1.5 },
  });
}

function ReceiptDocument({ invoice, payment, allPayments, settings }: {
  invoice: Invoice;
  payment: Payment;
  allPayments: Payment[];
  settings?: InvoiceSettings | null;
}) {
  const totalPaid = allPayments.reduce((s, p) => s + p.amount, 0);
  const balance = invoice.total - totalPaid;
  const rStyles = createReceiptStyles(settings);
  const headerStyle = settings?.pdf_header_style ?? "detailed";
  const showBankDetails = headerStyle === "detailed";
  const showLogo = headerStyle !== "compact";

  return (
    <Document>
      <Page size="A4" style={rStyles.page}>
        {/* Header — Logo on top, text left-aligned */}
        <View style={rStyles.header}>
          <View style={rStyles.headerLeft}>
            {showLogo && <Image src={MUTANT.logoUrl} style={rStyles.logo} />}
            <View style={rStyles.headerTextBlock}>
              <Text style={rStyles.headerCompanyName}>{MUTANT.name}</Text>
              <Text style={rStyles.headerTrn}>TRN: {MUTANT.trn}</Text>
              {showBankDetails && (
                <>
                  <Text style={rStyles.headerLine}>{MUTANT.bank}</Text>
                  <Text style={rStyles.headerLine}>{MUTANT.address}</Text>
                  <Text style={rStyles.headerLine}>Account #  {MUTANT.account}</Text>
                  <Text style={rStyles.headerLine}>IBAN  {MUTANT.iban}</Text>
                  <Text style={rStyles.headerLine}>Swift Code:  {MUTANT.swift}</Text>
                </>
              )}
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={rStyles.badge}>RECEIPT</Text>
            <Text style={[rStyles.headerLine, { marginTop: 6, fontWeight: "bold", fontSize: 11, color: "#1e293b" }]}>
              {payment.receipt_number || `REC-${invoice.invoice_number}`}
            </Text>
            <Text style={rStyles.headerLine}>For Invoice: {invoice.invoice_number}</Text>
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
            <Text style={rStyles.label}>Receipt Number</Text>
            <Text style={rStyles.value}>{payment.receipt_number || `REC-${invoice.invoice_number}`}</Text>
          </View>
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

export function ReceiptPDFViewer({ invoice, payment, allPayments, settings }: {
  invoice: Invoice;
  payment: Payment;
  allPayments: Payment[];
  settings?: InvoiceSettings | null;
}) {
  return (
    <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
      <ReceiptDocument invoice={invoice} payment={payment} allPayments={allPayments} settings={settings} />
    </PDFViewer>
  );
}

// ── Statement of Accounts PDF ────────────────────────────────────────────────
function createSOAStyles(settings?: InvoiceSettings | null) {
  const padding = settings?.pdf_page_padding ?? 40;
  const fontSize = settings?.pdf_font_size ?? 10;
  const headerMargin = settings?.pdf_header_margin ?? 24;
  const footerMargin = settings?.pdf_footer_margin ?? 30;
  const logoSize = LOGO_SIZES[settings?.pdf_logo_size ?? "medium"];
  const headerStyle = settings?.pdf_header_style ?? "detailed";

  return StyleSheet.create({
    page: { padding, fontSize, fontFamily: "Helvetica" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: headerMargin, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: "#7c3aed" },
    headerLeft: { flexDirection: "column", alignItems: "flex-start", gap: 8 },
    headerTextBlock: { flexDirection: "column", alignItems: "flex-start" },
    headerCompanyName: { fontSize: 18, fontWeight: "bold", color: "#1e293b", marginBottom: 2 },
    headerTrn: { fontSize: 9, color: "#64748b", marginBottom: 6 },
    headerLine: { fontSize: 9, color: "#475569", marginBottom: 2 },
    logo: { width: logoSize.width, height: logoSize.height, objectFit: "contain" },
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
    note: { marginTop: footerMargin, padding: 10, backgroundColor: "#f8fafc", borderRadius: 4, borderLeftWidth: 3, borderLeftColor: "#7c3aed" },
    noteText: { fontSize: 9, color: "#475569", lineHeight: 1.5 },
  });
}

export type SOAInvoice = Invoice & { payments: Payment[] };

function SOADocument({ clientName, dateFrom, dateTo, invoices, settings }: {
  clientName: string;
  dateFrom: string;
  dateTo: string;
  invoices: SOAInvoice[];
  settings?: InvoiceSettings | null;
}) {
  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.payments.reduce((ps, p) => ps + p.amount, 0), 0);
  const balance = totalInvoiced - totalPaid;
  const currency = invoices[0]?.currency || "AED";
  const sStyles = createSOAStyles(settings);
  const headerStyle = settings?.pdf_header_style ?? "detailed";
  const showBankDetails = headerStyle === "detailed";
  const showLogo = headerStyle !== "compact";

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
        {/* Header with logo and TRN */}
        <View style={sStyles.header}>
          <View style={sStyles.headerLeft}>
            {showLogo && <Image src={MUTANT.logoUrl} style={sStyles.logo} />}
            <View style={sStyles.headerTextBlock}>
              <Text style={sStyles.headerCompanyName}>{MUTANT.name}</Text>
              <Text style={sStyles.headerTrn}>TRN: {MUTANT.trn}</Text>
              {showBankDetails && (
                <>
                  <Text style={sStyles.headerLine}>{MUTANT.bank}</Text>
                  <Text style={sStyles.headerLine}>{MUTANT.address}</Text>
                  <Text style={sStyles.headerLine}>IBAN  {MUTANT.iban}  |  Swift:  {MUTANT.swift}</Text>
                </>
              )}
            </View>
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

export function SOAPDFViewer({ clientName, dateFrom, dateTo, invoices, settings }: {
  clientName: string;
  dateFrom: string;
  dateTo: string;
  invoices: SOAInvoice[];
  settings?: InvoiceSettings | null;
}) {
  return (
    <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
      <SOADocument clientName={clientName} dateFrom={dateFrom} dateTo={dateTo} invoices={invoices} settings={settings} />
    </PDFViewer>
  );
}
