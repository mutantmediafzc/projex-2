"use client";

import { useState, useRef } from "react";
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image, Font } from "@react-pdf/renderer";

// Mutant Media details from invoices
const MUTANT = {
  name: "Mutant Media Fzc.",
  trn: "104081933400003",
  officeAddress1: "Office 303, O2 Tower",
  officeAddress2: "Business District 14,",
  officeAddress3: "JVC, Dubai, UAE",
  phone: "+971 4 433 2156",
  website: "www.mutant.ae",
  email: "finance@mutant.ae",
  logoUrl: "https://www.creamcrm.io/logos/mutant-logo.png",
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
  startDate: "2024",
  completionDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
};

// Complete list of finished features from the aesthetic-clinic project
const COMPLETED_FEATURES = [
  {
    category: "Core Platform",
    features: [
      "Next.js 15 App Router with React 19 frontend architecture",
      "Supabase PostgreSQL database with Row Level Security (RLS)",
      "Role-based authentication system (admin, doctor, nurse, staff, technician)",
      "Multi-patient tab management for simultaneous patient access",
      "Real-time notifications system for comments, tasks, and emails",
      "Global patient search functionality",
      "Responsive design with Tailwind CSS 4",
    ],
  },
  {
    category: "Patient Management",
    features: [
      "Complete patient database with demographics and contact information",
      "Patient profile with medical history tracking",
      "Patient intake forms with digital signature capture",
      "Address autocomplete integration",
      "Patient document management and storage",
      "Patient merge functionality for duplicate records",
      "HEIC and TIFF image preview support",
    ],
  },
  {
    category: "Appointment System",
    features: [
      "Full appointment scheduling with calendar view",
      "Appointment booking widget for website embedding",
      "Appointment categories and service types management",
      "Appointment reminders and confirmations",
      "Public booking page for patient self-scheduling",
      "Appointment notes and documentation",
    ],
  },
  {
    category: "Medical Records & Consultations",
    features: [
      "Medical consultations tracking and documentation",
      "Rich text editor for medical notes (Slate-based)",
      "PDF annotation editor for medical documents",
      "Document templates panel with pre-built templates",
      "Medication templates management",
      "Medical records API with secure access",
    ],
  },
  {
    category: "Crisalix 3D Integration",
    features: [
      "Complete OAuth authentication with Crisalix API",
      "3D reconstruction creation for Breast, Face, and Body",
      "Image upload workflow with preview",
      "Measurement input (nipple-to-nipple, pupillary distance, hipline)",
      "Interactive 3D player modal for viewing simulations",
      "Existing reconstruction detection and reuse",
      "Consultation tracking for 3D sessions",
    ],
  },
  {
    category: "Swiss Medical Billing (SUMEX/TarDoc)",
    features: [
      "SUMEX XML invoice generation (Swiss standard)",
      "TarDoc medical procedure codes integration",
      "Swiss QR-bill generation (ISO 20022 standard)",
      "QR Reference with Modulo 10 check digit calculation",
      "Multiple billing entity support with separate IBANs",
      "Doctor/Provider GLN and ZSR number management",
      "Insurance billing modal with TP/TG support",
      "ACF (Assura Claims Format) accordion tree viewer",
      "TarDoc groups management and code lookup",
    ],
  },
  {
    category: "Invoice & Payment System",
    features: [
      "PDF invoice generation with QR codes",
      "Magic link payment system (90-day expiration, no login required)",
      "Payrexx payment gateway integration",
      "Swiss QR-bill for bank transfers",
      "Multiple payment methods: Cash, Online, Bank Transfer, Insurance",
      "Payment status tracking and webhooks",
      "Invoice status badges and management",
      "Automatic payment reconciliation via QR references",
    ],
  },
  {
    category: "Communication System",
    features: [
      "Email system with Mailgun integration (EU region)",
      "Email template builder with visual editor",
      "Scheduled email sending with cron jobs",
      "WhatsApp integration via Twilio API",
      "WhatsApp Web conversation interface",
      "WhatsApp message templates for business messaging",
      "In-app chat system for internal communication",
      "Chat logs and conversation history",
    ],
  },
  {
    category: "Document Management",
    features: [
      "OnlyOffice integration for document editing",
      "DOCX editor with rich text capabilities",
      "Document preview (DOCX, PDF, images)",
      "Signature editor for electronic signatures",
      "Document templates with variable substitution",
      "Supabase storage bucket integration",
      "Secure document access via tokens",
    ],
  },
  {
    category: "Automation & Workflows",
    features: [
      "Workflow automation engine",
      "Deal stage change triggers",
      "Automatic task creation based on triggers",
      "Email automation with templates",
      "Workflow enrollment tracking",
      "Template variables for patient/deal context",
    ],
  },
  {
    category: "CRM & Sales Pipeline",
    features: [
      "Deal management with Kanban board",
      "Deal notifications and alerts",
      "Lead import functionality",
      "Lead management and conversion tracking",
      "Deal pipeline customization",
      "Activity tracking for deals",
    ],
  },
  {
    category: "Analytics & Reporting",
    features: [
      "Financial statistics dashboard",
      "Email reports and analytics",
      "Appointment statistics",
      "Revenue tracking and reporting",
    ],
  },
  {
    category: "User & Team Management",
    features: [
      "User management with role assignment",
      "Multi-user search and selection",
      "User profile management",
      "Provider and billing entity settings",
      "Team task assignment",
    ],
  },
  {
    category: "Integration & Embedding",
    features: [
      "Embeddable forms for external websites",
      "Google Tag Manager integration for conversion tracking",
      "postMessage communication for iframe events",
      "Client onboarding workflow",
      "Aliice Chat embed widget",
      "Aliice Story feature",
    ],
  },
  {
    category: "AI & Intelligence",
    features: [
      "Google Gemini AI integration",
      "AI-powered prompt system",
      "Intelligent form assistance",
    ],
  },
  {
    category: "Mobile & Deployment",
    features: [
      "Mobile app foundation (React Native)",
      "Vercel deployment configuration",
      "Railway deployment for WhatsApp server",
      "Environment-based configuration",
      "CSP headers for embed security",
    ],
  },
  {
    category: "Medidata Integration",
    features: [
      "Medidata patient lookup API",
      "Medidata insurer search",
      "Insurance provider database integration",
    ],
  },
];

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#7c3aed",
  },
  logo: {
    width: 120,
    height: 40,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#7c3aed",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#64748b",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.6,
    color: "#475569",
    marginBottom: 8,
  },
  partyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  partyBox: {
    width: "48%",
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
  },
  partyLabel: {
    fontSize: 8,
    color: "#64748b",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  partyName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 2,
  },
  partyDetail: {
    fontSize: 9,
    color: "#475569",
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#7c3aed",
    marginTop: 12,
    marginBottom: 6,
  },
  featureItem: {
    fontSize: 9,
    color: "#475569",
    marginBottom: 3,
    paddingLeft: 12,
  },
  signatureSection: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  signatureBox: {
    width: "45%",
  },
  signatureLabel: {
    fontSize: 8,
    color: "#64748b",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    marginBottom: 8,
    height: 40,
  },
  signatureName: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1e293b",
  },
  signatureTitle: {
    fontSize: 9,
    color: "#64748b",
  },
  dateLine: {
    marginTop: 20,
    fontSize: 9,
    color: "#475569",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#94a3b8",
  },
  legalText: {
    fontSize: 8,
    color: "#64748b",
    lineHeight: 1.5,
    marginTop: 10,
  },
  projectInfo: {
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 4,
    marginBottom: 20,
  },
  projectName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  projectDesc: {
    fontSize: 9,
    color: "#475569",
  },
  checkmark: {
    color: "#22c55e",
    marginRight: 4,
  },
  pageNumber: {
    position: "absolute",
    bottom: 20,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
  },
});

// PDF Document Component
function CompletionDocument() {
  return (
    <Document>
      {/* Page 1 - Cover & Parties */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={MUTANT.logoUrl} style={styles.logo} />
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
            This Project Completion Certificate ("Certificate") is entered into as of {PROJECT.completionDate} by and between the parties identified below, confirming the successful completion and delivery of the project known as "{PROJECT.name}".
          </Text>
        </View>

        <View style={styles.partyRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Service Provider (Agency)</Text>
            <Text style={styles.partyName}>{MUTANT.name}</Text>
            <Text style={styles.partyDetail}>{MUTANT.officeAddress1}</Text>
            <Text style={styles.partyDetail}>{MUTANT.officeAddress2}</Text>
            <Text style={styles.partyDetail}>{MUTANT.officeAddress3}</Text>
            <Text style={styles.partyDetail}>{MUTANT.phone}</Text>
            <Text style={styles.partyDetail}>{MUTANT.email}</Text>
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
          <Text style={styles.sectionTitle}>Project Scope Confirmation</Text>
          <Text style={styles.paragraph}>
            The Service Provider has completed the development and delivery of the {PROJECT.name} platform, a comprehensive CRM/ERP system designed specifically for Swiss aesthetic medical clinics. The system includes patient management, appointment scheduling, Swiss medical billing (SUMEX/TarDoc), insurance processing, document editing, and multi-channel communication capabilities.
          </Text>
          <Text style={styles.paragraph}>
            The Client acknowledges that all features and functionalities outlined in the original project scope have been delivered, tested, and are operational as of the date of this Certificate.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Technology Stack</Text>
          <Text style={styles.paragraph}>
            • Frontend/Backend: Next.js 15 App Router with React 19{"\n"}
            • Database: Supabase (PostgreSQL) with Row Level Security{"\n"}
            • Styling: Tailwind CSS 4{"\n"}
            • AI Integration: Google Gemini{"\n"}
            • Email: Mailgun (EU region){"\n"}
            • Messaging: Twilio (SMS/WhatsApp){"\n"}
            • Payments: Payrexx{"\n"}
            • 3D Imaging: Crisalix OAuth Integration{"\n"}
            • Deployment: Vercel (Main App), Railway (WhatsApp Server)
          </Text>
        </View>

        <Text style={styles.footer}>
          {MUTANT.name} • {MUTANT.officeAddress1}, {MUTANT.officeAddress3} • {MUTANT.website}
        </Text>
        <Text style={styles.pageNumber}>Page 1</Text>
      </Page>

      {/* Page 2 - Features Part 1 */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completed Features & Deliverables</Text>
          <Text style={styles.paragraph}>
            The following features have been successfully developed, tested, and delivered as part of the {PROJECT.name} project:
          </Text>
        </View>

        {COMPLETED_FEATURES.slice(0, 9).map((category, idx) => (
          <View key={idx} wrap={false}>
            <Text style={styles.categoryTitle}>✓ {category.category}</Text>
            {category.features.map((feature, fIdx) => (
              <Text key={fIdx} style={styles.featureItem}>• {feature}</Text>
            ))}
          </View>
        ))}

        <Text style={styles.footer}>
          {MUTANT.name} • {MUTANT.officeAddress1}, {MUTANT.officeAddress3} • {MUTANT.website}
        </Text>
        <Text style={styles.pageNumber}>Page 2</Text>
      </Page>

      {/* Page 3 - Features Part 2 */}
      <Page size="A4" style={styles.page}>
        {COMPLETED_FEATURES.slice(9).map((category, idx) => (
          <View key={idx} wrap={false}>
            <Text style={styles.categoryTitle}>✓ {category.category}</Text>
            {category.features.map((feature, fIdx) => (
              <Text key={fIdx} style={styles.featureItem}>• {feature}</Text>
            ))}
          </View>
        ))}

        <View style={[styles.section, { marginTop: 20 }]}>
          <Text style={styles.sectionTitle}>Documentation Provided</Text>
          <Text style={styles.paragraph}>
            The following technical documentation has been provided with the project delivery:{"\n\n"}
            • CLAUDE.md - Project overview and commands{"\n"}
            • FINAL_MIGRATION_SUMMARY.md - Database migration guide{"\n"}
            • INVOICE_SYSTEM_SUMMARY.md - Invoice and payment system documentation{"\n"}
            • CRISALIX_3D_WORKFLOW.md - 3D integration workflow{"\n"}
            • WHATSAPP_SETUP.md - WhatsApp integration guide{"\n"}
            • PAYMENT_SYSTEM_IMPLEMENTATION.md - Swiss QR-bill and Payrexx documentation{"\n"}
            • GTM_IMPLEMENTATION_SUMMARY.md - Analytics tracking setup{"\n"}
            • AUTOMATION_WORKFLOW_CONSOLE_GUIDE.md - Workflow automation guide{"\n"}
            • Additional setup and configuration guides
          </Text>
        </View>

        <Text style={styles.footer}>
          {MUTANT.name} • {MUTANT.officeAddress1}, {MUTANT.officeAddress3} • {MUTANT.website}
        </Text>
        <Text style={styles.pageNumber}>Page 3</Text>
      </Page>

      {/* Page 4 - Terms & Signatures */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acceptance & Terms</Text>
          <Text style={styles.paragraph}>
            By signing below, both parties acknowledge and agree to the following:
          </Text>
          <Text style={styles.paragraph}>
            1. <Text style={{ fontWeight: "bold" }}>Completion Acknowledgment:</Text> The Client acknowledges that the Service Provider has completed all deliverables as specified in the project scope and that the {PROJECT.name} platform is fully functional and operational.
          </Text>
          <Text style={styles.paragraph}>
            2. <Text style={{ fontWeight: "bold" }}>Acceptance of Deliverables:</Text> The Client accepts all deliverables, including source code, documentation, and deployed applications, as satisfactory completion of the agreed project scope.
          </Text>
          <Text style={styles.paragraph}>
            3. <Text style={{ fontWeight: "bold" }}>Intellectual Property:</Text> Upon full payment, all intellectual property rights to the custom-developed code and assets transfer to the Client, excluding any third-party libraries and frameworks used under their respective licenses.
          </Text>
          <Text style={styles.paragraph}>
            4. <Text style={{ fontWeight: "bold" }}>Support Period:</Text> Any support, maintenance, or additional development beyond this completion date shall be subject to a separate agreement and associated fees.
          </Text>
          <Text style={styles.paragraph}>
            5. <Text style={{ fontWeight: "bold" }}>Warranties:</Text> The Service Provider warrants that the delivered software is free from material defects at the time of delivery. Any issues discovered within 30 days of signing shall be addressed at no additional cost.
          </Text>
          <Text style={styles.paragraph}>
            6. <Text style={{ fontWeight: "bold" }}>Final Payment:</Text> This Certificate serves as confirmation that all project milestones have been met, and any remaining balance is due upon signing.
          </Text>
        </View>

        <View style={styles.signatureSection}>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Signatures</Text>
          <Text style={styles.legalText}>
            IN WITNESS WHEREOF, the parties have executed this Project Completion Certificate as of the date written below.
          </Text>

          <View style={styles.signatureRow}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Service Provider</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>Authorized Signatory</Text>
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

        <View style={{ marginTop: 30 }}>
          <Text style={styles.legalText}>
            This document constitutes the entire agreement between the parties regarding the completion of the {PROJECT.name} project and supersedes all prior negotiations, representations, or agreements relating to this subject matter.
          </Text>
        </View>

        <Text style={styles.footer}>
          {MUTANT.name} • {MUTANT.officeAddress1}, {MUTANT.officeAddress3} • {MUTANT.website}
        </Text>
        <Text style={styles.pageNumber}>Page 4</Text>
      </Page>
    </Document>
  );
}

export default function AliiceProjectCompletionPage() {
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on client side for PDF rendering
  useState(() => {
    setIsClient(true);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={MUTANT.logoUrl} alt="Mutant Logo" className="h-10" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Project Completion Certificate</h1>
              <p className="text-sm text-slate-500">{PROJECT.fullName}</p>
            </div>
          </div>
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
        </div>
      </div>

      {/* Preview Content */}
      <div className="max-w-5xl mx-auto py-8 px-6">
        {/* Cover Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6">
          <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-purple-600">
            <img src={MUTANT.logoUrl} alt="Mutant Logo" className="h-12" />
            <div className="text-right">
              <h2 className="text-3xl font-bold text-purple-600">PROJECT COMPLETION</h2>
              <p className="text-slate-500">Certificate & Deliverables</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-bold text-slate-900">{PROJECT.fullName}</h3>
            <p className="text-slate-600">{PROJECT.description}</p>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">Agreement</h4>
            <p className="text-slate-600 leading-relaxed">
              This Project Completion Certificate ("Certificate") is entered into as of <strong>{PROJECT.completionDate}</strong> by and between the parties identified below, confirming the successful completion and delivery of the project known as "<strong>{PROJECT.name}</strong>".
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Service Provider (Agency)</p>
              <p className="font-bold text-slate-900">{MUTANT.name}</p>
              <p className="text-sm text-slate-600">{MUTANT.officeAddress1}</p>
              <p className="text-sm text-slate-600">{MUTANT.officeAddress2}</p>
              <p className="text-sm text-slate-600">{MUTANT.officeAddress3}</p>
              <p className="text-sm text-slate-600">{MUTANT.phone}</p>
              <p className="text-sm text-slate-600">{MUTANT.email}</p>
              <p className="text-sm text-slate-600">TRN: {MUTANT.trn}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Client</p>
              <p className="font-bold text-slate-900">{CLIENT.name}</p>
              <p className="text-sm text-slate-600">{CLIENT.company}</p>
              <p className="text-sm text-slate-600">{CLIENT.address}</p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">
            Completed Features & Deliverables
          </h4>
          <p className="text-slate-600 mb-6">
            The following features have been successfully developed, tested, and delivered as part of the {PROJECT.name} project:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {COMPLETED_FEATURES.map((category, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-4">
                <h5 className="font-semibold text-purple-600 mb-3 flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  {category.category}
                </h5>
                <ul className="space-y-1">
                  {category.features.map((feature, fIdx) => (
                    <li key={fIdx} className="text-sm text-slate-600 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-slate-400">
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Signatures Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h4 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">
            Acceptance & Signatures
          </h4>
          
          <div className="space-y-4 mb-8">
            <p className="text-slate-600">
              <strong>1. Completion Acknowledgment:</strong> The Client acknowledges that the Service Provider has completed all deliverables as specified in the project scope.
            </p>
            <p className="text-slate-600">
              <strong>2. Acceptance of Deliverables:</strong> The Client accepts all deliverables, including source code, documentation, and deployed applications.
            </p>
            <p className="text-slate-600">
              <strong>3. Intellectual Property:</strong> Upon full payment, all intellectual property rights transfer to the Client.
            </p>
            <p className="text-slate-600">
              <strong>4. Warranties:</strong> The Service Provider warrants that the delivered software is free from material defects at the time of delivery.
            </p>
          </div>

          <p className="text-sm text-slate-500 italic mb-6">
            IN WITNESS WHEREOF, the parties have executed this Project Completion Certificate as of the date written below.
          </p>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Service Provider</p>
              <div className="h-16 border-b border-slate-900 mb-2"></div>
              <p className="font-semibold text-slate-900">Authorized Signatory</p>
              <p className="text-sm text-slate-600">{MUTANT.name}</p>
              <p className="text-sm text-slate-500 mt-4">Date: _______________________</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Client</p>
              <div className="h-16 border-b border-slate-900 mb-2"></div>
              <p className="font-semibold text-slate-900">{CLIENT.name}</p>
              <p className="text-sm text-slate-600">{CLIENT.company}</p>
              <p className="text-sm text-slate-500 mt-4">Date: _______________________</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-6 text-sm text-slate-500">
          {MUTANT.name} • {MUTANT.officeAddress1}, {MUTANT.officeAddress3} • {MUTANT.website}
        </div>
      </div>
    </div>
  );
}
