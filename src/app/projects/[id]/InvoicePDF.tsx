"use client";

import { Document, Page, Text, View, StyleSheet, PDFViewer, Image } from "@react-pdf/renderer";
import type { Invoice, InvoiceSettings } from "./InvoiceManagement";

const MUTANT = {
  name: "Mutant Media Fzc.",
  trn: "104081933400003",
  bank: "Mashreq Bank",
  address: "Al Ghurair City, 339-C, AGC, Al Riqqa Street, Dubai, UAE",
  account: "019100924426",
  iban: "AE320330000019100924426",
  swift: "BOMLAEAD",
  logoUrl: "https://www.creamcrm.io/logos/mutant-logo.avif",
};

// Logo size mapping
const LOGO_SIZES = {
  small: { width: 60, height: 40 },
  medium: { width: 80, height: 50 },
  large: { width: 100, height: 60 },
};

// Function to create dynamic styles based on settings
function createStyles(settings?: InvoiceSettings | null) {
  const padding = settings?.pdf_page_padding ?? 40;
  const fontSize = settings?.pdf_font_size ?? 10;
  const headerMargin = settings?.pdf_header_margin ?? 24;
  const footerMargin = settings?.pdf_footer_margin ?? 30;
  const logoSize = LOGO_SIZES[settings?.pdf_logo_size ?? "medium"];
  const headerStyle = settings?.pdf_header_style ?? "detailed";

  return StyleSheet.create({
    page: { padding, fontSize, fontFamily: "Helvetica" },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: headerMargin,
      paddingBottom: 16,
      borderBottomWidth: 2,
      borderBottomColor: "#7c3aed",
    },
    headerLeft: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    headerTextBlock: { flexDirection: "column" },
    headerCompanyName: { fontSize: 18, fontWeight: "bold", color: "#1e293b", marginBottom: 2 },
    headerTrn: { fontSize: 9, color: "#64748b", marginBottom: 6 },
    headerLine: { fontSize: 9, color: "#475569", marginBottom: 2 },
    logo: { width: logoSize.width, height: logoSize.height, objectFit: "contain" },
    companyInfo: { textAlign: "right" },
    companyName: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, color: "#7c3aed" },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
    col: { width: "48%" },
    label: { fontSize: 8, color: "#64748b", marginBottom: 2, textTransform: "uppercase" },
    value: { fontSize, color: "#1e293b" },
    table: { marginTop: 20 },
    tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: 8, borderRadius: 4 },
    tableHeaderCell: { fontWeight: "bold", color: "#475569" },
    tableRow: { flexDirection: "row", padding: 8, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
    tableCell: { color: "#334155" },
    descCol: { width: "50%" },
    qtyCol: { width: "15%", textAlign: "right" },
    priceCol: { width: "17%", textAlign: "right" },
    amountCol: { width: "18%", textAlign: "right" },
    totals: { marginTop: 20, alignItems: "flex-end" },
    totalRow: { flexDirection: "row", width: 200, justifyContent: "space-between", paddingVertical: 4 },
    totalLabel: { color: "#64748b" },
    totalValue: { fontWeight: "bold", color: "#1e293b" },
    grandTotal: { flexDirection: "row", width: 200, justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 2, borderTopColor: "#7c3aed", marginTop: 4 },
    grandTotalLabel: { fontSize: 12, fontWeight: "bold", color: "#1e293b" },
    grandTotalValue: { fontSize: 12, fontWeight: "bold", color: "#7c3aed" },
    footer: { marginTop: footerMargin, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
    bankTitle: { fontSize: 10, fontWeight: "bold", marginBottom: 6, color: "#475569" },
    bankRow: { fontSize: 9, color: "#334155", marginBottom: 3 },
    bankLabel: { fontWeight: "bold" },
    paymentNote: { marginTop: 10, padding: 10, backgroundColor: "#fef9ec", borderRadius: 4, borderLeftWidth: 3, borderLeftColor: "#f59e0b" },
    paymentNoteText: { fontSize: 9, color: "#78350f", lineHeight: 1.5 },
    notes: { marginTop: 20, padding: 12, backgroundColor: "#f8fafc", borderRadius: 4 },
    notesTitle: { fontSize: 9, fontWeight: "bold", marginBottom: 4, color: "#475569" },
    notesText: { fontSize: 9, color: "#64748b" },
  });
}

function formatMoney(amount: number, currency = "AED"): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function InvoiceDocument({ invoice, settings }: { invoice: Invoice; settings?: InvoiceSettings | null }) {
  const items = invoice.items || [];
  const isQuote = invoice.invoice_type === "quote";
  const styles = createStyles(settings);
  const headerStyle = settings?.pdf_header_style ?? "detailed";

  // Determine what to show in header based on header style
  const showBankDetails = headerStyle === "detailed";
  const showLogo = headerStyle !== "compact";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header — Mutant Media fixed block with logo and TRN */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {showLogo && <Image src={MUTANT.logoUrl} style={styles.logo} />}
            <View style={styles.headerTextBlock}>
              <Text style={styles.headerCompanyName}>{MUTANT.name}</Text>
              <Text style={styles.headerTrn}>TRN: {MUTANT.trn}</Text>
              {showBankDetails && (
                <>
                  <Text style={styles.headerLine}>{MUTANT.bank}</Text>
                  <Text style={styles.headerLine}>{MUTANT.address}</Text>
                  <Text style={styles.headerLine}>Account #  {MUTANT.account}</Text>
                  <Text style={styles.headerLine}>IBAN  {MUTANT.iban}</Text>
                  <Text style={styles.headerLine}>Swift Code:  {MUTANT.swift}</Text>
                </>
              )}
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 28, fontWeight: "bold", color: "#7c3aed" }}>
              {isQuote ? "QUOTE" : "INVOICE"}
            </Text>
            <Text style={[styles.headerLine, { marginTop: 6 }]}>{invoice.invoice_number}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{isQuote ? "QUOTE" : "INVOICE"}</Text>

        {/* Invoice Details & Client */}
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>{isQuote ? "Quote" : "Invoice"} Number</Text>
            <Text style={styles.value}>{invoice.invoice_number}</Text>
            <Text style={[styles.label, { marginTop: 8 }]}>Issue Date</Text>
            <Text style={styles.value}>{formatDate(invoice.issue_date)}</Text>
            {invoice.due_date && (
              <>
                <Text style={[styles.label, { marginTop: 8 }]}>Due Date</Text>
                <Text style={styles.value}>{formatDate(invoice.due_date)}</Text>
              </>
            )}
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Bill To</Text>
            <Text style={[styles.value, { fontWeight: "bold" }]}>{invoice.client_name}</Text>
            {invoice.client_address && <Text style={styles.value}>{invoice.client_address}</Text>}
            {invoice.client_email && <Text style={styles.value}>{invoice.client_email}</Text>}
            {invoice.client_phone && <Text style={styles.value}>{invoice.client_phone}</Text>}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.descCol]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.qtyCol]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.priceCol]}>Price</Text>
            <Text style={[styles.tableHeaderCell, styles.amountCol]}>Amount</Text>
          </View>
          {items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.descCol]}>{item.description}</Text>
              <Text style={[styles.tableCell, styles.qtyCol]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.priceCol]}>{formatMoney(item.unit_price, invoice.currency)}</Text>
              <Text style={[styles.tableCell, styles.amountCol]}>{formatMoney(item.amount, invoice.currency)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatMoney(invoice.subtotal, invoice.currency)}</Text>
          </View>
          {invoice.discount_amount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={styles.totalValue}>-{formatMoney(invoice.discount_amount, invoice.currency)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax ({invoice.tax_rate}%)</Text>
            <Text style={styles.totalValue}>{formatMoney(invoice.tax_amount, invoice.currency)}</Text>
          </View>
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatMoney(invoice.total, invoice.currency)}</Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Bank Details — always shown */}
        <View style={styles.footer}>
          <Text style={styles.bankTitle}>Payment Details</Text>
          <Text style={styles.bankRow}><Text style={styles.bankLabel}>Company: </Text>{MUTANT.name}</Text>
          <Text style={styles.bankRow}><Text style={styles.bankLabel}>Bank: </Text>{MUTANT.bank}</Text>
          <Text style={styles.bankRow}><Text style={styles.bankLabel}>Address: </Text>{MUTANT.address}</Text>
          <Text style={styles.bankRow}><Text style={styles.bankLabel}>Account #: </Text>{MUTANT.account}</Text>
          <Text style={styles.bankRow}><Text style={styles.bankLabel}>IBAN: </Text>{MUTANT.iban}</Text>
          <Text style={styles.bankRow}><Text style={styles.bankLabel}>Swift Code: </Text>{MUTANT.swift}</Text>

          {/* Invoice-only payment reference note */}
          {!isQuote && (
            <View style={styles.paymentNote}>
              <Text style={styles.paymentNoteText}>
                Please include the INVOICE NUMBER as a reference when making your payment so we can track and confirm. Note that bank transfer charges should be borne by the client.
              </Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}

export function InvoicePDFViewer({ invoice, settings }: { invoice: Invoice; settings?: InvoiceSettings | null }) {
  return (
    <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
      <InvoiceDocument invoice={invoice} settings={settings} />
    </PDFViewer>
  );
}

export default InvoiceDocument;
