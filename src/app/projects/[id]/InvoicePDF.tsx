"use client";

import { Document, Page, Text, View, StyleSheet, PDFViewer, Image } from "@react-pdf/renderer";
import type { Invoice, InvoiceSettings } from "./InvoiceManagement";

const MUTANT = {
  name: "Mutant Media Fzc.",
  trn: "104081933400003",
  // Office address for header
  officeAddress1: "Office 303, O2 Tower",
  officeAddress2: "Business District 14,",
  officeAddress3: "JVC, Dubai, UAE",
  phone: "+971 4 433 2156",
  website: "www.mutant.ae",
  email: "finance@mutant.ae",
  // Bank details for payment section
  bank: "Mashreq Bank",
  bankAddress: "Al Ghurair City, 339-C, AGC, Al Riqqa Street, Dubai, UAE",
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

// Function to create dynamic styles based on settings
function createStyles(settings?: InvoiceSettings | null, isQuote = false) {
  // For quotes, use compact single-page settings
  const padding = isQuote ? 30 : (settings?.pdf_page_padding ?? 40);
  const fontSize = isQuote ? 9 : (settings?.pdf_font_size ?? 10);
  const headerMargin = isQuote ? 12 : (settings?.pdf_header_margin ?? 24);
  const footerMargin = isQuote ? 10 : (settings?.pdf_footer_margin ?? 30);
  const logoSize = isQuote ? LOGO_SIZES.small : LOGO_SIZES[settings?.pdf_logo_size ?? "medium"];
  const headerStyle = settings?.pdf_header_style ?? "detailed";

  return StyleSheet.create({
    page: {
      padding,
      fontSize,
      fontFamily: "Helvetica",
      // For quotes, ensure content fits on single page
      ...(isQuote && {
        minHeight: "100%",
        maxHeight: "100%",
      }),
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: headerMargin,
      paddingBottom: isQuote ? 10 : 16,
      borderBottomWidth: 2,
      borderBottomColor: "#7c3aed",
    },
    headerLeft: { flexDirection: "column", alignItems: "flex-start", gap: 8 },
    headerTextBlock: { flexDirection: "column", alignItems: "flex-start" },
    headerCompanyName: { fontSize: isQuote ? 16 : 18, fontWeight: "bold", color: "#1e293b", marginBottom: 2 },
    headerTrn: { fontSize: 9, color: "#64748b", marginBottom: 6 },
    headerLine: { fontSize: isQuote ? 8 : 9, color: "#475569", marginBottom: 2 },
    logo: { width: logoSize.width, height: logoSize.height, objectFit: "contain" },
    companyInfo: { textAlign: "right" },
    companyName: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
    title: { fontSize: isQuote ? 20 : 24, fontWeight: "bold", marginBottom: isQuote ? 12 : 20, color: "#7c3aed" },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: isQuote ? 12 : 20 },
    col: { width: "48%" },
    label: { fontSize: isQuote ? 7 : 8, color: "#64748b", marginBottom: 2, textTransform: "uppercase" },
    value: { fontSize, color: "#1e293b" },
    table: { marginTop: isQuote ? 12 : 20 },
    tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: isQuote ? 6 : 8, borderRadius: 4 },
    tableHeaderCell: { fontWeight: "bold", color: "#475569", fontSize },
    tableRow: { flexDirection: "row", padding: isQuote ? 5 : 8, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
    tableCell: { color: "#334155", fontSize },
    descCol: { width: "50%" },
    qtyCol: { width: "15%", textAlign: "right" },
    priceCol: { width: "17%", textAlign: "right" },
    amountCol: { width: "18%", textAlign: "right" },
    totals: { marginTop: isQuote ? 12 : 20, alignItems: "flex-end" },
    totalRow: { flexDirection: "row", width: isQuote ? 160 : 200, justifyContent: "space-between", paddingVertical: isQuote ? 2 : 4 },
    totalLabel: { color: "#64748b", fontSize },
    totalValue: { fontWeight: "bold", color: "#1e293b", fontSize },
    grandTotal: { flexDirection: "row", width: isQuote ? 160 : 200, justifyContent: "space-between", paddingVertical: isQuote ? 6 : 8, borderTopWidth: 2, borderTopColor: "#7c3aed", marginTop: isQuote ? 2 : 4 },
    grandTotalLabel: { fontSize: isQuote ? 10 : 12, fontWeight: "bold", color: "#1e293b" },
    grandTotalValue: { fontSize: isQuote ? 10 : 12, fontWeight: "bold", color: "#7c3aed" },
    footer: { marginTop: footerMargin, paddingTop: isQuote ? 10 : 16, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
    bankTitle: { fontSize: isQuote ? 8 : 10, fontWeight: "bold", marginBottom: isQuote ? 4 : 6, color: "#475569" },
    bankRow: { fontSize: isQuote ? 7 : 9, color: "#334155", marginBottom: 3 },
    bankLabel: { fontWeight: "bold" },
    paymentNote: { marginTop: isQuote ? 6 : 10, padding: isQuote ? 6 : 10, backgroundColor: "#fef9ec", borderRadius: 4, borderLeftWidth: 3, borderLeftColor: "#f59e0b" },
    paymentNoteText: { fontSize: isQuote ? 7 : 9, color: "#78350f", lineHeight: 1.5 },
    notes: { marginTop: isQuote ? 10 : 20, padding: isQuote ? 8 : 12, backgroundColor: "#f8fafc", borderRadius: 4 },
    notesTitle: { fontSize: isQuote ? 7 : 9, fontWeight: "bold", marginBottom: isQuote ? 2 : 4, color: "#475569" },
    notesText: { fontSize: isQuote ? 7 : 9, color: "#64748b" },
    // Quote-specific compressed styles
    quoteCompactHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    quoteHeaderLeft: { flexDirection: "column", alignItems: "flex-start", gap: 6 },
    quoteHeaderRight: { alignItems: "flex-end" },
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
  const styles = createStyles(settings, isQuote);
  const headerStyle = settings?.pdf_header_style ?? "detailed";

  // Determine what to show in header based on header style
  const showBankDetails = headerStyle === "detailed";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header — Logo on top, text left-aligned */}
        <View style={styles.header}>
          <View style={isQuote ? styles.quoteHeaderLeft : styles.headerLeft}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.headerCompanyName}>{MUTANT.name}</Text>
              <Text style={styles.headerTrn}>TRN: {MUTANT.trn}</Text>
              {showBankDetails && (
                <>
                  <Text style={styles.headerLine}>{MUTANT.officeAddress1}</Text>
                  <Text style={styles.headerLine}>{MUTANT.officeAddress2}</Text>
                  <Text style={styles.headerLine}>{MUTANT.officeAddress3}</Text>
                  <Text style={styles.headerLine}>{MUTANT.phone}</Text>
                  <Text style={styles.headerLine}>{MUTANT.website}</Text>
                  <Text style={styles.headerLine}>{MUTANT.email}</Text>
                </>
              )}
            </View>
          </View>
          <View style={isQuote ? styles.quoteHeaderRight : { alignItems: "flex-end" }}>
            <Text style={{ fontSize: isQuote ? 22 : 28, fontWeight: "bold", color: "#7c3aed" }}>
              {isQuote ? "QUOTE" : "TAX INVOICE"}
            </Text>
            <Text style={{ fontSize: 16, fontWeight: "bold", marginTop: 6, color: "#1e293b" }}>{invoice.invoice_number}</Text>
          </View>
        </View>

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
          <Text style={styles.bankRow}><Text style={styles.bankLabel}>Address: </Text>{MUTANT.bankAddress}</Text>
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
