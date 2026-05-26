"use client";

import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image } from "@react-pdf/renderer";

// Base64 encoded Mutant logo for reliable PDF rendering
const MUTANT_LOGO_BASE64 = "data:image/png;base64,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";

// Mutant Media details
const MUTANT = {
  name: "Mutant Media Fzc.",
  trn: "104081933400003",
  officeAddress1: "Office 303, O2 Tower",
  officeAddress2: "Business District 14,",
  officeAddress3: "JVC, Dubai, UAE",
  phone: "+971 4 433 2156",
  website: "www.mutant.ae",
  email: "finance@mutant.ae",
};

const CLIENT = {
  name: "Dr. Xavier Tenorio",
  company: "Aesthetics Clinic XT SA",
  address: "Chemin Rieu 18, 1208 Genève, Switzerland",
};

const PROJECT = {
  name: "Aliice",
  fullName: "Aliice - Aesthetic Clinic CRM/ERP System",
  description: "A comprehensive CRM/ERP system for Swiss aesthetic medical clinics",
  completionDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
};

// Consolidated features for compact PDF display
const COMPLETED_FEATURES = [
  { category: "Core Platform & Authentication", features: ["Next.js 15 App Router with React 19 and Supabase PostgreSQL with RLS", "Role-based authentication and multi-patient tab management"] },
  { category: "Patient & Appointment Management", features: ["Complete patient database with intake forms and digital signatures", "Full appointment scheduling with calendar and booking widget"] },
  { category: "Medical Records & 3D Imaging", features: ["Medical consultations with rich text editor and PDF annotation", "Crisalix 3D integration for Breast, Face, and Body reconstructions"] },
  { category: "Swiss Medical Billing", features: ["SUMEX XML invoicing with TarDoc codes and Swiss QR-bills (ISO 20022)", "Insurance billing with TP/TG support"] },
  { category: "Invoice & Payment System", features: ["PDF invoices with magic link payments and Payrexx integration", "Multiple payment methods with automatic reconciliation"] },
  { category: "Communication & Documents", features: ["Email (Mailgun), WhatsApp (Twilio), and in-app chat", "OnlyOffice document editing with signature capture"] },
  { category: "CRM & Automation", features: ["Deal management with Kanban board and workflow automation", "Automatic task creation and email automation"] },
  { category: "Analytics & Integrations", features: ["Financial statistics, Medidata integration, and GTM tracking", "Embeddable forms with AI assistance (Google Gemini)"] },
];

// Legal clauses for Terms & Conditions
const LEGAL_CLAUSES = [
  { title: "1. Project Acceptance", content: "By approving this handover, the Client confirms that the project has been reviewed, tested internally where applicable, and accepted in accordance with the agreed scope, approved deliverables, and documented revisions throughout the project lifecycle.\n\nCompleted and approved deliverables shall be considered accepted in their delivered state at the time of handover." },
  { title: "2. Scope of Delivery", content: "The Client acknowledges that the agreed project scope and deliverables have been completed based on the approved proposal, discussions, and documented requirements.\n\nAny future enhancements, feature additions, workflow changes, integrations, revisions, optimisations, or functionality changes outside the approved scope may be treated as separate work and assessed accordingly." },
  { title: "3. Project Closure", content: "Upon approval of this handover, the project shall be considered formally completed from Mutant Media FZC's delivery side.\n\nAny future development, support, maintenance, optimisation, troubleshooting, or enhancement requests may be handled under a separate agreement or support arrangement where required." },
  { title: "4. Handover Confirmation", content: "The Client confirms receipt of the agreed project assets, credentials, files, documentation, source materials, and access details relevant to the project handover.\n\nFollowing handover, day-to-day operational management, administration, access control, and internal handling of the platform shall transition to the Client." },
  { title: "5. Responsibility Following Handover", content: "From the handover approval date onwards, responsibility for ongoing management, administration, operational handling, infrastructure decisions, security management, and future technical decisions relating to the platform shall rest with the Client or its appointed representatives.\n\nMutant Media FZC's responsibility remains limited to the agreed and approved delivery completed up to the handover date." },
  { title: "6. Internal & Third-Party Modifications", content: "Mutant Media FZC cannot assume responsibility for issues arising from: internal modifications, third-party development, hosting or infrastructure changes, platform or plugin updates, external integrations, server configurations, deployment changes, database modifications, operational handling after handover, unauthorised access or misuse." },
  { title: "7. Developer / Technical Resource Transition", content: "Where technical personnel, developers, consultants, or project resources continue directly with the Client after handover, such work shall be considered independent from Mutant Media FZC moving forward.\n\nAny future modifications, deployments, operational decisions, technical developments, code changes, infrastructure adjustments, or implementations carried out after the transition date shall fall outside Mutant Media FZC's project delivery responsibility." },
  { title: "8. Maintenance & Ongoing Support", content: "Unless otherwise agreed in writing, project approval and handover conclude the original delivery phase.\n\nMutant Media FZC is under no obligation to provide ongoing support, maintenance, troubleshooting, monitoring, updates, bug fixing, enhancements, or technical assistance following project completion unless covered under a separate written agreement." },
  { title: "9. Third-Party Services & Infrastructure", content: "The Client acknowledges that certain areas of the project may rely on third-party providers, platforms, APIs, hosting services, cloud infrastructure, plugins, payment gateways, or external systems outside the direct control of Mutant Media FZC.\n\nFuture changes, interruptions, compatibility issues, service limitations, pricing changes, deprecated functionality, or outages relating to third-party systems may affect functionality over time." },
  { title: "10. Platform Evolution & Compatibility", content: "The Client understands that digital platforms, browsers, operating systems, APIs, frameworks, hosting environments, and external technologies naturally evolve over time.\n\nMutant Media FZC cannot guarantee indefinite compatibility, uninterrupted functionality, or long-term platform stability where future environmental, infrastructure, or third-party changes occur after project completion." },
  { title: "11. Client Review & Testing", content: "The Client confirms that appropriate internal review, operational checks, user acceptance testing, and internal approvals have been carried out prior to final approval and handover.\n\nAny items requiring adjustment prior to handover should be documented during the project closure process." },
  { title: "12. Outstanding Items", content: "Any agreed pending items or snagging points identified before handover shall be documented separately and handled in accordance with mutual agreement between both parties.\n\nItems not formally documented prior to handover approval shall be considered accepted upon project completion." },
  { title: "13. Commercial Completion", content: "Project approval and handover confirm acceptance of the delivered work and completion of the agreed delivery phase.\n\nFollowing approval and handover, the completed project scope shall be considered accepted by the Client. Any future revisions, support, enhancements, technical requests, operational assistance, or additional development shall fall outside the original project scope unless otherwise agreed in writing.\n\nNo refund, reimbursement, reversal, or compensation claims shall apply relating to approved and accepted deliverables following project handover." },
  { title: "14. Intellectual Property & Ownership", content: "Ownership of final approved deliverables transfers upon settlement of all agreed project payments and outstanding balances.\n\nMutant Media FZC retains ownership of its internal methodologies, frameworks, reusable systems, proprietary structures, development approaches, and pre-existing intellectual property." },
  { title: "15. Limitation of Responsibility", content: "Mutant Media FZC's responsibility remains limited to the agreed scope and approved deliverables completed up to the formal handover date.\n\nMutant Media FZC shall not be responsible for: indirect losses, operational interruptions, commercial losses, reputational impact, loss of revenue, downtime, loss of data, third-party failures, post-handover modifications, infrastructure issues, future operational management decisions." },
  { title: "16. Confidentiality", content: "Both parties agree to maintain reasonable confidentiality regarding proprietary information, credentials, technical systems, operational processes, and business information shared throughout the project." },
  { title: "17. Entire Agreement", content: "These terms form part of the overall agreement and should be read alongside approved quotations, proposals, contracts, invoices, emails, WhatsApp approvals, and documented discussions exchanged throughout the project lifecycle." },
  { title: "18. Governing Law", content: "These terms shall be governed in accordance with the laws and regulations of the United Arab Emirates." },
];

// PDF Styles
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, paddingBottom: 15, borderBottomWidth: 2, borderBottomColor: "#7c3aed" },
  logo: { width: 100, height: 33 },
  headerRight: { alignItems: "flex-end" },
  title: { fontSize: 20, fontWeight: "bold", color: "#7c3aed", marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#64748b" },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", color: "#1e293b", marginBottom: 6, paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  paragraph: { fontSize: 9, lineHeight: 1.5, color: "#475569", marginBottom: 4 },
  partyRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  partyBox: { width: "48%", padding: 8, backgroundColor: "#f8fafc", borderRadius: 3 },
  partyLabel: { fontSize: 7, color: "#64748b", marginBottom: 2, textTransform: "uppercase" },
  partyName: { fontSize: 10, fontWeight: "bold", color: "#1e293b", marginBottom: 1 },
  partyDetail: { fontSize: 8, color: "#475569" },
  categoryTitle: { fontSize: 9, fontWeight: "bold", color: "#7c3aed", marginTop: 6, marginBottom: 2 },
  featureItem: { fontSize: 8, color: "#475569", marginBottom: 1, paddingLeft: 8 },
  signatureSection: { marginTop: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  signatureRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  signatureBox: { width: "45%" },
  signatureLabel: { fontSize: 7, color: "#64748b", marginBottom: 2, textTransform: "uppercase" },
  signatureLine: { borderBottomWidth: 1, borderBottomColor: "#1e293b", marginBottom: 4, height: 30 },
  signatureName: { fontSize: 9, fontWeight: "bold", color: "#1e293b" },
  signatureTitle: { fontSize: 8, color: "#64748b" },
  dateLine: { marginTop: 10, fontSize: 8, color: "#475569" },
  footer: { position: "absolute", bottom: 25, left: 40, right: 40, textAlign: "center", fontSize: 7, color: "#94a3b8" },
  legalText: { fontSize: 7, color: "#64748b", lineHeight: 1.4, marginTop: 6 },
  projectInfo: { backgroundColor: "#f1f5f9", padding: 8, borderRadius: 3, marginBottom: 12 },
  projectName: { fontSize: 11, fontWeight: "bold", color: "#1e293b", marginBottom: 2 },
  projectDesc: { fontSize: 8, color: "#475569" },
  pageNumber: { position: "absolute", bottom: 15, right: 40, fontSize: 7, color: "#94a3b8" },
  clauseTitle: { fontSize: 9, fontWeight: "bold", color: "#1e293b", marginTop: 8, marginBottom: 3 },
  clauseContent: { fontSize: 8, lineHeight: 1.4, color: "#475569", marginBottom: 2 },
  pageHeader: { marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  pageHeaderTitle: { fontSize: 14, fontWeight: "bold", color: "#7c3aed" },
  pageHeaderSub: { fontSize: 8, color: "#64748b", marginTop: 2 },
});

// PDF Document Component
function CompletionDocument() {
  const totalPages = 5;
  return (
    <Document>
      {/* Page 1: Cover with project info, parties, and features */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={MUTANT_LOGO_BASE64} style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.title}>PROJECT COMPLETION</Text>
            <Text style={styles.subtitle}>Certificate & Deliverables</Text>
          </View>
        </View>

        <View style={styles.projectInfo}>
          <Text style={styles.projectName}>{PROJECT.fullName}</Text>
          <Text style={styles.projectDesc}>{PROJECT.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agreement</Text>
          <Text style={styles.paragraph}>
            This Project Completion Certificate is entered into as of {PROJECT.completionDate} by and between the parties below, confirming the successful completion and delivery of the project known as "{PROJECT.name}".
          </Text>
        </View>

        <View style={styles.partyRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Service Provider (Agency)</Text>
            <Text style={styles.partyName}>{MUTANT.name}</Text>
            <Text style={styles.partyDetail}>{MUTANT.officeAddress1}, {MUTANT.officeAddress2}</Text>
            <Text style={styles.partyDetail}>{MUTANT.officeAddress3}</Text>
            <Text style={styles.partyDetail}>{MUTANT.phone} | {MUTANT.email}</Text>
            <Text style={styles.partyDetail}>TRN: {MUTANT.trn}</Text>
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Client</Text>
            <Text style={styles.partyName}>{CLIENT.name}</Text>
            <Text style={styles.partyDetail}>{CLIENT.company}</Text>
            <Text style={styles.partyDetail}>{CLIENT.address}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completed Features & Deliverables</Text>
          {COMPLETED_FEATURES.map((category, idx) => (
            <View key={idx}>
              <Text style={styles.categoryTitle}>✓ {category.category}</Text>
              {category.features.map((feature, fIdx) => (
                <Text key={fIdx} style={styles.featureItem}>• {feature}</Text>
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.footer}>{MUTANT.name} • {MUTANT.officeAddress1}, {MUTANT.officeAddress3} • {MUTANT.website}</Text>
        <Text style={styles.pageNumber}>Page 1 of {totalPages}</Text>
      </Page>

      {/* Page 2: Terms & Conditions - Clauses 1-6 */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderTitle}>Terms & Conditions</Text>
          <Text style={styles.pageHeaderSub}>{PROJECT.fullName} - Project Handover Agreement</Text>
        </View>

        {LEGAL_CLAUSES.slice(0, 6).map((clause, idx) => (
          <View key={idx} style={{ marginBottom: 6 }}>
            <Text style={styles.clauseTitle}>{clause.title}</Text>
            <Text style={styles.clauseContent}>{clause.content}</Text>
          </View>
        ))}

        <Text style={styles.footer}>{MUTANT.name} • {MUTANT.officeAddress1}, {MUTANT.officeAddress3} • {MUTANT.website}</Text>
        <Text style={styles.pageNumber}>Page 2 of {totalPages}</Text>
      </Page>

      {/* Page 3: Terms & Conditions - Clauses 7-12 */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderTitle}>Terms & Conditions (continued)</Text>
          <Text style={styles.pageHeaderSub}>{PROJECT.fullName} - Project Handover Agreement</Text>
        </View>

        {LEGAL_CLAUSES.slice(6, 12).map((clause, idx) => (
          <View key={idx} style={{ marginBottom: 6 }}>
            <Text style={styles.clauseTitle}>{clause.title}</Text>
            <Text style={styles.clauseContent}>{clause.content}</Text>
          </View>
        ))}

        <Text style={styles.footer}>{MUTANT.name} • {MUTANT.officeAddress1}, {MUTANT.officeAddress3} • {MUTANT.website}</Text>
        <Text style={styles.pageNumber}>Page 3 of {totalPages}</Text>
      </Page>

      {/* Page 4: Terms & Conditions - Clauses 13-18 */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderTitle}>Terms & Conditions (continued)</Text>
          <Text style={styles.pageHeaderSub}>{PROJECT.fullName} - Project Handover Agreement</Text>
        </View>

        {LEGAL_CLAUSES.slice(12, 18).map((clause, idx) => (
          <View key={idx} style={{ marginBottom: 6 }}>
            <Text style={styles.clauseTitle}>{clause.title}</Text>
            <Text style={styles.clauseContent}>{clause.content}</Text>
          </View>
        ))}

        <Text style={styles.footer}>{MUTANT.name} • {MUTANT.officeAddress1}, {MUTANT.officeAddress3} • {MUTANT.website}</Text>
        <Text style={styles.pageNumber}>Page 4 of {totalPages}</Text>
      </Page>

      {/* Page 5: Documentation & Signatures */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderTitle}>Documentation & Signatures</Text>
          <Text style={styles.pageHeaderSub}>{PROJECT.fullName} - Project Handover Agreement</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documentation Provided</Text>
          <Text style={styles.paragraph}>
            The following technical documentation has been provided with the project delivery:
          </Text>
          <Text style={[styles.clauseContent, { marginTop: 4 }]}>
            CLAUDE.md (Project Overview), FINAL_MIGRATION_SUMMARY.md (Database Migration Guide), INVOICE_SYSTEM_SUMMARY.md (Invoice & Payment System), CRISALIX_3D_WORKFLOW.md (3D Integration), WHATSAPP_SETUP.md (WhatsApp Integration), PAYMENT_SYSTEM_IMPLEMENTATION.md (Swiss QR-Bill & Payrexx), GTM_IMPLEMENTATION_SUMMARY.md (Analytics Tracking), AUTOMATION_WORKFLOW_CONSOLE_GUIDE.md (Workflow Automation), BILLING_ENTITIES_SETUP.md (Multi-clinic Billing), MAILGUN_SETUP.md (Email System), DOCSPACE_SETUP_GUIDE.md (Document Management).
          </Text>
        </View>

        <View style={[styles.signatureSection, { marginTop: 20 }]}>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Signatures</Text>
          <Text style={styles.legalText}>
            IN WITNESS WHEREOF, the parties have executed this Project Completion Certificate and agree to the Terms & Conditions outlined in this document as of the date written below.
          </Text>

          <View style={styles.signatureRow}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Service Provider</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>Jeano Pangan</Text>
              <Text style={styles.signatureTitle}>{MUTANT.name}</Text>
              <Text style={styles.dateLine}>Date: _______________________</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Client</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>{CLIENT.name}</Text>
              <Text style={styles.signatureTitle}>{CLIENT.company}</Text>
              <Text style={styles.dateLine}>Date: _______________________</Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={styles.legalText}>
            By signing above, both parties acknowledge receipt of all deliverables and documentation, and agree to the Terms & Conditions set forth in this Project Completion Certificate.
          </Text>
          <Text style={[styles.legalText, { marginTop: 8 }]}>
            This document constitutes the entire agreement between the parties regarding the completion of the {PROJECT.name} project and supersedes all prior negotiations.
          </Text>
        </View>

        <Text style={styles.footer}>{MUTANT.name} • {MUTANT.officeAddress1}, {MUTANT.officeAddress3} • {MUTANT.website}</Text>
        <Text style={styles.pageNumber}>Page 5 of {totalPages}</Text>
      </Page>
    </Document>
  );
}

export default function PDFDownloadButton() {
  return (
    <PDFDownloadLink
      document={<CompletionDocument />}
      fileName={`MUTANT-Aliice-ProjectCompletion-${new Date().toISOString().split("T")[0]}.pdf`}
      className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
    >
      {({ loading }) => (
        <>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          {loading ? "Generating PDF..." : "Download PDF"}
        </>
      )}
    </PDFDownloadLink>
  );
}
