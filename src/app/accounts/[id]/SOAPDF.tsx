"use client";

import { Document, Image, Page, PDFDownloadLink, StyleSheet, Text, View } from "@react-pdf/renderer";

export type AccountCompanyForPDF = {
  name: string;
  legal_name: string | null;
  website: string | null;
  street_address: string | null;
  postal_code: string | null;
  trn: string | null;
  town: string | null;
  country: string | null;
};

export type AccountSOAPDFInvoice = {
  id: string;
  issue_date: string;
  invoice_number: string;
  project_name: string;
  total: number;
  currency: string;
};

export type AccountSOAPDFPayment = {
  invoice_id: string;
  amount: number;
};

const SUPPLIER = {
  name: "Mutant Media FZC",
  address: ["Office 303, O2 Tower", "Business District, JVC, UAE"],
  website: "https://www.mutant.ae/",
  trn: "104081933400003",
  email: "finance@mutant.ae",
};

const styles = StyleSheet.create({
  page: {
    padding: 7,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#000000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    minHeight: 86,
  },
  logo: {
    width: 145,
    height: 50,
    objectFit: "contain",
  },
  documentMeta: {
    width: 220,
    paddingTop: 18,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 8,
  },
  metaLabel: {
    marginRight: 6,
    fontSize: 8,
  },
  metaValue: {
    fontSize: 8,
  },
  soaNumber: {
    width: 180,
    borderWidth: 1,
    borderColor: "#16823b",
    padding: 5,
    fontSize: 8,
  },
  title: {
    marginBottom: 16,
    fontSize: 16,
    fontWeight: "bold",
    color: "#000000",
  },
  parties: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  party: {
    width: "39.5%",
  },
  partyTitle: {
    padding: 5,
    backgroundColor: "#000000",
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "bold",
  },
  partyBody: {
    paddingTop: 5,
    paddingHorizontal: 7,
    minHeight: 64,
  },
  partyName: {
    marginBottom: 5,
    fontSize: 9,
    fontWeight: "bold",
  },
  partyLine: {
    marginBottom: 5,
    fontSize: 7.5,
  },
  website: {
    color: "#1769aa",
    textDecoration: "underline",
  },
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#000000",
    color: "#ffffff",
    paddingVertical: 5,
  },
  tableHeaderCell: {
    color: "#ffffff",
    fontSize: 7.5,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    minHeight: 20,
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#b7b7b7",
  },
  tableRowAlt: {
    backgroundColor: "#e5e5e5",
  },
  tableCell: {
    fontSize: 7,
    paddingHorizontal: 4,
  },
  dateCol: { width: "10%" },
  invoiceCol: { width: "15%" },
  descriptionCol: { width: "32%" },
  amountCol: { width: "13%", textAlign: "right" },
  paymentCol: { width: "14%", textAlign: "right" },
  dueCol: { width: "16%", textAlign: "right" },
  spacer: {
    height: 32,
    borderBottomWidth: 0.5,
    borderBottomColor: "#b7b7b7",
  },
  balanceBar: {
    flexDirection: "column",
    alignItems: "flex-end",
    minHeight: 48,
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: "#000000",
  },
  balanceMetric: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: 220,
    marginBottom: 3,
  },
  balanceMetricLabel: {
    marginRight: 5,
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "bold",
  },
  balanceMetricValue: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "bold",
  },
  note: {
    marginTop: 48,
    textAlign: "center",
    fontSize: 8,
    fontWeight: "bold",
  },
  thanks: {
    marginTop: 17,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "bold",
    color: "#006b3c",
  },
  contact: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 7.5,
  },
  footer: {
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 0.5,
    borderTopColor: "#356e9b",
    textAlign: "center",
    fontSize: 7.5,
    lineHeight: 1.5,
  },
});

function formatMoney(amount: number, currency = "AED") {
  return `${currency} ${amount.toFixed(2)}`;
}

function formatLedgerDate(value: string) {
  const formatted = new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
  return formatted.replace(/^0/, "").replace(/ /g, "-");
}

function formatHeaderDate(value: Date) {
  return value.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function normalizeWebsite(value: string | null) {
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function extractTrn(company: AccountCompanyForPDF | null) {
  if (company?.trn) return company.trn.replace(/^trn\s*:\s*/i, "");
  const embeddedTrn = [company?.street_address, company?.postal_code, company?.town, company?.country]
    .find((part) => part?.match(/trn\s*:\s*([^\s]+)/i))
    ?.match(/trn\s*:\s*([^\s]+)/i)?.[1];
  return embeddedTrn || null;
}

export function SOADocument({
  clientName,
  company,
  invoices,
  payments,
  accountBalance,
  generatedAt,
}: {
  clientName: string;
  company: AccountCompanyForPDF | null;
  invoices: AccountSOAPDFInvoice[];
  payments: AccountSOAPDFPayment[];
  accountBalance: number;
  generatedAt: Date;
}) {
  const paidByInvoice = payments.reduce<Record<string, number>>((totals, payment) => {
    totals[payment.invoice_id] = (totals[payment.invoice_id] || 0) + payment.amount;
    return totals;
  }, {});
  const companyName = company?.legal_name || company?.name || clientName;
  const companyAddressParts = company
    ? [company.street_address, company.postal_code, company.town, company.country]
      .filter((part): part is string => Boolean(part && !/trn\s*:/i.test(part)))
    : [];
  const companyTrn = extractTrn(company);
  const companyWebsite = normalizeWebsite(company?.website || null);
  const series = invoices.find((invoice) => invoice.invoice_number.match(/^INV-([^-\s]+)-/))?.invoice_number.match(/^INV-([^-\s]+)-/)?.[1];
  const statementSeries = series?.endsWith("MM") ? series : `${series || generatedAt.getFullYear().toString().slice(-2)}MM`;
  const statementNumber = `SOA-${statementSeries}-${String(invoices.length).padStart(3, "0")}`;
  const logoUrl = typeof window === "undefined" ? "/logos/mutant-logo.png" : `${window.location.origin}/logos/mutant-logo.png`;
  const ledgerRows = invoices.reduce<Array<{ invoice: AccountSOAPDFInvoice; paid: number; amountDue: number }>>((rows, invoice) => {
    const paid = Math.min(invoice.total, paidByInvoice[invoice.id] || 0);
    const previousBalance = rows.length > 0 ? rows[rows.length - 1].amountDue : 0;
    return [...rows, { invoice, paid, amountDue: previousBalance + invoice.total - paid }];
  }, []);
  const totalAmount = ledgerRows.reduce((sum, row) => sum + row.invoice.total, 0);
  const totalPayments = ledgerRows.reduce((sum, row) => sum + row.paid, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={logoUrl} style={styles.logo} />
          <View style={styles.documentMeta}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>DATE:</Text>
              <Text style={styles.metaValue}>{formatHeaderDate(generatedAt)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>SOA No:</Text>
              <Text style={styles.soaNumber}>{statementNumber}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.title}>STATEMENT</Text>

        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.partyTitle}>Client</Text>
            <View style={styles.partyBody}>
              <Text style={styles.partyName}>{companyName}</Text>
              {companyAddressParts.map((part) => <Text key={part} style={styles.partyLine}>{part}</Text>)}
              {companyWebsite && <Text style={[styles.partyLine, styles.website]}>{companyWebsite}</Text>}
              {companyTrn && <Text style={styles.partyLine}>TRN: {companyTrn}</Text>}
            </View>
          </View>

          <View style={styles.party}>
            <Text style={styles.partyTitle}>Supplier</Text>
            <View style={styles.partyBody}>
              <Text style={styles.partyName}>{SUPPLIER.name}</Text>
              {SUPPLIER.address.map((line) => <Text key={line} style={styles.partyLine}>{line}</Text>)}
              <Text style={[styles.partyLine, styles.website]}>{SUPPLIER.website}</Text>
              <Text style={styles.partyLine}>TRN: {SUPPLIER.trn}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.dateCol, styles.tableCell]}>Date</Text>
            <Text style={[styles.tableHeaderCell, styles.invoiceCol, styles.tableCell]}>Invoice #</Text>
            <Text style={[styles.tableHeaderCell, styles.descriptionCol, styles.tableCell]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.amountCol, styles.tableCell]}>Amount</Text>
            <Text style={[styles.tableHeaderCell, styles.paymentCol, styles.tableCell]}>Payment</Text>
            <Text style={[styles.tableHeaderCell, styles.dueCol, styles.tableCell]}>Amount Due</Text>
          </View>
          {ledgerRows.map(({ invoice, paid, amountDue }, index) => {
            return (
              <View key={invoice.id} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.tableCell, styles.dateCol]}>{formatLedgerDate(invoice.issue_date)}</Text>
                <Text style={[styles.tableCell, styles.invoiceCol]}>{invoice.invoice_number}</Text>
                <Text style={[styles.tableCell, styles.descriptionCol]}>{invoice.project_name}</Text>
                <Text style={[styles.tableCell, styles.amountCol]}>{formatMoney(invoice.total, invoice.currency)}</Text>
                <Text style={[styles.tableCell, styles.paymentCol]}>{formatMoney(paid, invoice.currency)}</Text>
                <Text style={[styles.tableCell, styles.dueCol, { fontWeight: "bold" }]}>{formatMoney(amountDue, invoice.currency)}</Text>
              </View>
            );
          })}
          <View style={styles.spacer} />
          <View style={styles.balanceBar}>
            <View style={styles.balanceMetric}>
              <Text style={styles.balanceMetricLabel}>Total Amount</Text>
              <Text style={styles.balanceMetricValue}>{formatMoney(totalAmount)}</Text>
            </View>
            <View style={styles.balanceMetric}>
              <Text style={styles.balanceMetricLabel}>Total Payment Made</Text>
              <Text style={styles.balanceMetricValue}>{formatMoney(totalPayments)}</Text>
            </View>
            <View style={styles.balanceMetric}>
              <Text style={styles.balanceMetricLabel}>Total Amount Due</Text>
              <Text style={styles.balanceMetricValue}>{formatMoney(accountBalance)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.note}>Your account balance is {formatMoney(accountBalance)}. Please make your payment to cover the balance by the due date.</Text>
        <Text style={styles.thanks}>Thank you for your business!</Text>
        <Text style={styles.contact}>Should you have any enquiries concerning this statement, please contact {SUPPLIER.email}</Text>
        <Text style={styles.footer}>XHQ, O2 Tower, Business District 14, Jumeirah Village Circle, PO Box 413520, Dubai, UAE{"\n"}971 4 433 2156 | www.mutant.ae</Text>
      </Page>
    </Document>
  );
}

export function AccountSOAPDFDownload({
  clientName,
  company,
  invoices,
  payments,
  accountBalance,
}: {
  clientName: string;
  company: AccountCompanyForPDF | null;
  invoices: AccountSOAPDFInvoice[];
  payments: AccountSOAPDFPayment[];
  accountBalance: number;
}) {
  const generatedAt = new Date();
  const fileName = `SOA_${clientName.replace(/[^a-z0-9]+/gi, "_")}_${generatedAt.toISOString().slice(0, 10)}.pdf`;

  return (
    <PDFDownloadLink
      document={<SOADocument clientName={clientName} company={company} invoices={invoices} payments={payments} accountBalance={accountBalance} generatedAt={generatedAt} />}
      fileName={fileName}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
    >
      {({ loading }) => (
        <>
          <svg className="h-4 w-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          {loading ? "Preparing PDF..." : "Export PDF"}
        </>
      )}
    </PDFDownloadLink>
  );
}
