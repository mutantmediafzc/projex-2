"use client";

import { useState } from "react";
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image } from "@react-pdf/renderer";

// Base64 encoded Mutant logo for reliable PDF rendering
const MUTANT_LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHMAAAAYCAYAAADJcMJ/AAAACXBIWXMAAAPoAAAD6AG1e1JrAAAKRUlEQVR4nNVaCYydVRX+3pvpTDuFQltkiyBbQRZtiBRaxLKWigsxyiIERQoRZFUJLlBEAZdGApIIRbCR2IK0DQ0uQAQVg2twJUJLy0BLy6JUhnagnXlv3ns/OZPvg4/D/0LHQlJvcvP+9/77n3vu+c757rnnfwDQYb36f963X3BbAr+87W47tajHs7WuV/eEZ6V2j/bg3BbAr+87W47tajHs7WuV/eEZ6V2j/bgCjeF3htdazE/vuAHZrJzAe6CzpHSPo1S2kfwbAIIBnAfSx9wP4G4AxyfDdZrTNbVXacXNb6AOTNYPr+S+A5wG8AGA9gKcBbPd2gbmlgHoGgMJ6i8ZYbWvqsSh4K4AsA6RzExnAI1Ndekb7oK2jZusKJ92+HZjtAN3UvqUAewoX2wQwQCALRmpPMrYMt7m0G3K62AUCKHskzSM7ZEU7lmuppE9AW17O+XWS+WRM9idflQTsCOBjATHK4DNRRotQ+AI4A8F4AW5mMtzrqT+Rih2zh8bnGZETb2vYkgSr9tffuC+ADAI4GcBCAPQCMt30tPxNtLO3VyXXG2LIW4yYBOBTAIQBG01ZjTHY8/36LxiGC+jKAZwCMKxPcRa8NpaYC+BmAuwHcD+A+AA8CuN6A2QHA7QDW2UQbAcw2wwuojwF4hPcLUsUyAIcbxcmYcwH8mnPeA+BeAL8FFMLZJGWMPA+ABAHcB+Gnq/+I8DYLY5GdE6W8o9xcAbiGgAljOdRiAhdyj6omy66TrWwFMSSCqzbZ5Qr/FtF/YAQQtqPMf3MsblLuMQdFJMHemjf+ctgyta4hzqC8BMDGD+lk+UKT+IBc+lZTVTB4jajvVaOxSowbRnfpqGlMtsrUX7X7D5E7nGGV5F9n+0bTest/8nnSQvIJzTaTMKtd+k4Hmz9SM6upmny9RLzlDtEUpiuo2NnQ//yYCRbtI3wD2AcvYyPaSTg+qUO0T7BnMMt26G+PUUviE9cBmp4RmLsDojrsXx8f3HBPIcM568qWGgxvfPce5OUlmRQCiYwb2T40Tfc0sWWCR6rXE+yRIo/bzuJWV2cu03ULcG17KR0SzwnLLdkU9N288SzvESx4qRziCjSb96Smg0bjF12otyBlJUypFaSdZaAHuL5uRd9yUlNnJxHyI1Nbj5NkuAin4ngHfYYmQEHyvAvmYRd24JJGE3Sz9hEaX9MjKC+weYRmDK+gJVxYgGdQBCm83eNk5GyARWhnln2couqGpi6LyeKcScAuDoxh9tG49YxqHZJdsos5c+8DkwlD9sAWG57jATEhvv1Es/IABXk79tLgCwD88tG73NL9oUW9x3f08aTosvAHKARFWEO5mCivacpK2Qu4LPydu/hOHcA+HfaO91Gh5qOiy1a5Bwx5juc022SgSpo6/0ZEHJKj0StWfM3M5iiiH2NNl2IIvHIegNNIpS8nL/O+CsAVAD4NYGkbMOPzTAPzdwlMXc+xqIw+2aja9/YW2eNCo0YZM+49xcx0PwAH0mBipWMAXAvgl3SUGo12nWWuh3BeGVWOEWPPMjAXtQFTGWjs958nM7j+ug6AjmImewC3KwdT4+L6OJ4SJnNNw0cbpecftYHZ62PPVOuhcXKyUdBDDrS9UEeFsig+kuPG0wEymKHD6ek8eKJFm9PVWso6zaLSaa6XBvK9N7duuUu80GnGcUXtkof9MyYdAP78NmNJBIMVRRO0jycYaV6NddHZXLqG1uLy2R5MKaU8DPdNaauelsSVgygMbTM0rZrgj24D5kiU2+/C75LmXHmylsorRvZ8j45mHKOts00Vpf8GIG00Dxae2F3fmKu93cUxk2O8ife3EkqAM6vvXOQbmQqNiT8AWWdYM0uhACZhDZBBtKzMTmC2L9NIKkCaYnxIJeeBCLk4L3s4SpJwQHGfGivbFNmA++bBEihTOYfZZxqjqyxBbt+/Y8yjvTZNTNYL1MLFQoyOfDmOcrPOf20Vj9TPb60nq1ZwqA8+1osjCxm5jm5uQwu9uWlhnucHOOD7dJftbRId7AMp0E9KGUyUqRyy2F7yENufF1LOlnJWiUlc5uTWOlfDiO2qVpjBb2V847mp9bswDhSYieuYCLn2V6q1oSY1baOVU1WQGwJ4DHShITyakZpeq3prHJF0zWHSVgRv+h2RnMT5Tx5zmnnW/GlDMwWz8lK4ODrqRLl/3CwH/AHWL2Qp1RJZW54Kb3UIkgJyx/SWCn9DQPzJ8l4AjMyQzCiqqS8DQlM0ekJHDsrJSlayxNWK/XiesWAFGCi0jms1nwCwMcBPJ4otr8EzAUGphcfFtibGpAi+9uAOY1AjmJylu0iMIP639AqTFrkxZ5lDfKeV/W/a+OcOn+e3sNtxbKYR6Xm+KTN/yczpu+HPzI6DJnfN+NoT1JWOYnjzjKwPWHQQngnq1WUUX0uGiutruAY5Uoz/e8oRlN1mMN2ZpO8PeN/BXJcSKvUZZkO9NfFKluy4vdV0X0e3n0rZqxa3hkmP6KnKeqkM5RnjnHQm3L9ECcl/ny1qTVK4n4Z6nhWWKTw65JKg+iOWDMxKUeYlr3u5h8/n0Qn89EjXFvNts00HI9PnF1hDJWDKIeVw2jMzmC+mZE09ohEEc4YdSZyJov8KwFfpKOF8w62L1Qkvt+nhB9Kbkh7Sqcp99vsDTLYq6GX1lafWTVhTej3vHEL3NQVBXee0Wy4QdqPstimZahHkpzvfX6H/h/MqOtR6NH6BznsKa7VpStSd7kpfB1Hp11mySZTKYfenUID2PMjCnGkNqTbWk6xC3gFej807bI53Db8oU+26rlviZsODEMFq6siSljv578/jJlmo7dUrJ9bw/m9mmVz5Ey3G4BylnB3smg6jnoj86/MRr+78D5JUjRUV4/8Upk66PAMzvjQDMyGYFFZrc5ke+bzaTzSuY9w0boNTAbBup5VHSMZVf57YEocViYUe1tvN9vRfk6DaPi9C7mHPltzaBFUbc53KAVzp0ROsygykLzEUp9DQ/dO9KRFHHudO6Ie9IWWosc6c0SIMma1wbMnAAVfA0nMEPut2xOX5PmKTxv2DsN8H5E+n/LbPNKHydPF5hV/pblNejhek0Gcr8Uc28rSB8BOLj4Mh0PMmOO4vgnU2Zeo9P4QX2KMYi/JcovCa6ii7G/as26DTQFz/gjAnJbAnMhXkD63HFrJ0IAieiorOqtZDF5FYzzMKohej3Uwk30OwAoaegWPNDcmMCdwb32KNLHKrqenN+uTDHgdPQpWTUIOGBnL+PwTvF5JHSekKhGo913pYO70+SydoJv9YurnIDzHWq+Y5lwmLSsY2csZqRfavDezBruaa17JHnbLYC63+96jDgyup8sAvS2BPmCRuZ5/MXk1QjpJPWPa1f34u4y2LQ+uAtoTTJTnAOL6NGc0jgV5IV6wYAMo5nkY9m4ZWUwFiIq/1z4htLMOu2Hj9eyA+I8GKqlBksVGpiZfvQWNBr/pzVzS9NYo3ICfz7xr+5l5/D4nMPvR2PfQvDemae9hBRyGBGb+HzLLxOkKpyKH/F8UcUZSJpOwSFkriFBJVt+Fq0Cu/H5WP9kn1IgAAAABJRU5ErkJggg==";

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
  logoUrl: "/logos/mutant-logo.png", // For web preview
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

// Consolidated features for compact PDF display
const COMPLETED_FEATURES = [
  {
    category: "Core Platform & Authentication",
    features: [
      "Next.js 15 App Router with React 19 and Supabase PostgreSQL with RLS",
      "Role-based authentication (admin, doctor, nurse, staff, technician)",
      "Multi-patient tab management and global patient search",
      "Real-time notifications for comments, tasks, and emails",
    ],
  },
  {
    category: "Patient & Appointment Management",
    features: [
      "Complete patient database with demographics, medical history, and intake forms",
      "Digital signature capture and document management",
      "Full appointment scheduling with calendar view and booking widget",
      "Public booking page for patient self-scheduling",
    ],
  },
  {
    category: "Medical Records & 3D Imaging",
    features: [
      "Medical consultations tracking with rich text editor (Slate-based)",
      "PDF annotation editor and document templates",
      "Crisalix 3D integration for Breast, Face, and Body reconstructions",
      "Interactive 3D player modal with measurement inputs",
    ],
  },
  {
    category: "Swiss Medical Billing (SUMEX/TarDoc)",
    features: [
      "SUMEX XML invoice generation (Swiss standard) with TarDoc codes",
      "Swiss QR-bill generation (ISO 20022) with Modulo 10 check digit",
      "Multiple billing entity support with separate IBANs",
      "Insurance billing modal with TP/TG support and ACF viewer",
    ],
  },
  {
    category: "Invoice & Payment System",
    features: [
      "PDF invoice generation with magic link payments (90-day expiration)",
      "Payrexx gateway integration with multiple payment methods",
      "Payment status tracking, webhooks, and automatic reconciliation",
    ],
  },
  {
    category: "Communication & Documents",
    features: [
      "Email system with Mailgun, template builder, and scheduled sending",
      "WhatsApp integration via Twilio with business messaging templates",
      "OnlyOffice document editing with signature capture",
      "In-app chat system with conversation history",
    ],
  },
  {
    category: "CRM & Automation",
    features: [
      "Deal management with Kanban board and lead tracking",
      "Workflow automation with stage change triggers",
      "Automatic task creation and email automation",
    ],
  },
  {
    category: "Analytics & Integrations",
    features: [
      "Financial statistics and reporting dashboard",
      "Google Gemini AI integration for intelligent assistance",
      "Medidata patient/insurer lookup and GTM tracking",
      "Embeddable forms with postMessage communication",
    ],
  },
  {
    category: "Deployment & Infrastructure",
    features: [
      "Vercel deployment (main app) and Railway (WhatsApp server)",
      "Mobile app foundation with React Native",
      "Environment-based configuration with CSP headers",
    ],
  },
];

// Documentation files provided with the project
const DOCUMENTATION = [
  { name: "CLAUDE.md", title: "Project Overview & Commands", description: "Main project documentation with architecture overview and development commands" },
  { name: "FINAL_MIGRATION_SUMMARY.md", title: "Database Migration Guide", description: "Provider/billing entity migration and database schema changes" },
  { name: "INVOICE_SYSTEM_SUMMARY.md", title: "Invoice & Payment System", description: "Complete invoice generation and payment processing documentation" },
  { name: "CRISALIX_3D_WORKFLOW.md", title: "Crisalix 3D Integration", description: "OAuth flow, API integration, and 3D reconstruction workflow" },
  { name: "WHATSAPP_SETUP.md", title: "WhatsApp Integration", description: "Twilio WhatsApp API setup and messaging templates" },
  { name: "PAYMENT_SYSTEM_IMPLEMENTATION.md", title: "Swiss QR-Bill & Payrexx", description: "Swiss payment standards and Payrexx gateway integration" },
  { name: "GTM_IMPLEMENTATION_SUMMARY.md", title: "GTM & Analytics Tracking", description: "Google Tag Manager iframe tracking implementation" },
  { name: "AUTOMATION_WORKFLOW_CONSOLE_GUIDE.md", title: "Workflow Automation", description: "Deal stage triggers and automatic task creation" },
  { name: "BILLING_ENTITIES_SETUP.md", title: "Billing Entities Setup", description: "Multi-clinic billing configuration guide" },
  { name: "MAILGUN_SETUP.md", title: "Email System Setup", description: "Mailgun integration and email template configuration" },
  { name: "DOCSPACE_SETUP_GUIDE.md", title: "Document Management", description: "OnlyOffice DocSpace integration guide" },
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

        {/* Completed Features - Compact List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completed Features & Deliverables</Text>
          {COMPLETED_FEATURES.map((category, idx) => (
            <View key={idx} style={{ marginBottom: 6 }}>
              <Text style={[styles.categoryTitle, { marginTop: 4, marginBottom: 2 }]}>✓ {category.category}</Text>
              {category.features.map((feature, fIdx) => (
                <Text key={fIdx} style={[styles.featureItem, { marginBottom: 1 }]}>• {feature}</Text>
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          {MUTANT.name} • {MUTANT.officeAddress1}, {MUTANT.officeAddress3} • {MUTANT.website}
        </Text>
        <Text style={styles.pageNumber}>Page 1 of 2</Text>
      </Page>

      {/* Page 2 - Terms & Signatures */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acceptance & Terms</Text>
          <Text style={styles.paragraph}>
            By signing below, both parties acknowledge and agree to the following:
          </Text>
          <Text style={[styles.paragraph, { fontSize: 9 }]}>
            1. Completion Acknowledgment: The Client acknowledges that the Service Provider has completed all deliverables as specified in the project scope and that the {PROJECT.name} platform is fully functional and operational.
          </Text>
          <Text style={[styles.paragraph, { fontSize: 9 }]}>
            2. Acceptance of Deliverables: The Client accepts all deliverables, including source code, documentation, and deployed applications, as satisfactory completion of the agreed project scope.
          </Text>
          <Text style={[styles.paragraph, { fontSize: 9 }]}>
            3. Intellectual Property: Upon full payment, all intellectual property rights to the custom-developed code and assets transfer to the Client, excluding any third-party libraries and frameworks used under their respective licenses.
          </Text>
          <Text style={[styles.paragraph, { fontSize: 9 }]}>
            4. Support Period: Any support, maintenance, or additional development beyond this completion date shall be subject to a separate agreement and associated fees.
          </Text>
          <Text style={[styles.paragraph, { fontSize: 9 }]}>
            5. Warranties: The Service Provider warrants that the delivered software is free from material defects at the time of delivery. Any issues discovered within 30 days of signing shall be addressed at no additional cost.
          </Text>
          <Text style={[styles.paragraph, { fontSize: 9 }]}>
            6. Final Payment: This Certificate serves as confirmation that all project milestones have been met, and any remaining balance is due upon signing.
          </Text>
        </View>

        <View style={[styles.section, { marginTop: 10 }]}>
          <Text style={styles.sectionTitle}>Documentation Provided</Text>
          <Text style={[styles.paragraph, { fontSize: 8 }]}>
            Technical documentation included: CLAUDE.md (Project overview), FINAL_MIGRATION_SUMMARY.md, INVOICE_SYSTEM_SUMMARY.md, CRISALIX_3D_WORKFLOW.md, WHATSAPP_SETUP.md, PAYMENT_SYSTEM_IMPLEMENTATION.md, GTM_IMPLEMENTATION_SUMMARY.md, AUTOMATION_WORKFLOW_CONSOLE_GUIDE.md, and additional setup guides.
          </Text>
        </View>

        <View style={[styles.signatureSection, { marginTop: 20 }]}>
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

        <View style={{ marginTop: 20 }}>
          <Text style={styles.legalText}>
            This document constitutes the entire agreement between the parties regarding the completion of the {PROJECT.name} project and supersedes all prior negotiations, representations, or agreements relating to this subject matter.
          </Text>
        </View>

        <Text style={styles.footer}>
          {MUTANT.name} • {MUTANT.officeAddress1}, {MUTANT.officeAddress3} • {MUTANT.website}
        </Text>
        <Text style={styles.pageNumber}>Page 2 of 2</Text>
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

        {/* Documentation Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">
            Documentation Provided
          </h4>
          <p className="text-slate-600 mb-4">
            The following technical documentation has been provided with the project delivery. Click to download each document.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DOCUMENTATION.map((doc, idx) => (
              <a
                key={idx}
                href={`/project-completion/aliice-docs/${doc.name}`}
                download={doc.name}
                className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-colors group"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200">
                  <svg className="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">{doc.title}</p>
                  <p className="text-xs text-slate-500 truncate">{doc.description}</p>
                </div>
                <svg className="w-4 h-4 text-slate-400 group-hover:text-purple-600 flex-shrink-0 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
              </a>
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
