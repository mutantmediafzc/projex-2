"use client";

import dynamic from "next/dynamic";

// Dynamically import PDF component with SSR disabled to avoid build errors
const PDFDownloadButton = dynamic(() => import("./PDFDownloadButton"), { 
  ssr: false,
  loading: () => (
    <button className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white opacity-50 cursor-wait">
      Loading PDF...
    </button>
  )
});

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
  logoUrl: "/logos/mutant-logo.png",
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

// Features for web preview
const COMPLETED_FEATURES = [
  { category: "Core Platform & Authentication", features: ["Next.js 15 App Router with React 19 and Supabase PostgreSQL with RLS", "Role-based authentication (admin, doctor, nurse, staff, technician)", "Multi-patient tab management and global patient search", "Real-time notifications for comments, tasks, and emails"] },
  { category: "Patient & Appointment Management", features: ["Complete patient database with demographics, medical history, and intake forms", "Digital signature capture and document management", "Full appointment scheduling with calendar view and booking widget", "Public booking page for patient self-scheduling"] },
  { category: "Medical Records & 3D Imaging", features: ["Medical consultations tracking with rich text editor (Slate-based)", "PDF annotation editor and document templates", "Crisalix 3D integration for Breast, Face, and Body reconstructions", "Interactive 3D player modal with measurement inputs"] },
  { category: "Swiss Medical Billing (SUMEX/TarDoc)", features: ["SUMEX XML invoice generation (Swiss standard) with TarDoc codes", "Swiss QR-bill generation (ISO 20022) with Modulo 10 check digit", "Multiple billing entity support with separate IBANs", "Insurance billing modal with TP/TG support and ACF viewer"] },
  { category: "Invoice & Payment System", features: ["PDF invoice generation with magic link payments (90-day expiration)", "Payrexx gateway integration with multiple payment methods", "Payment status tracking, webhooks, and automatic reconciliation"] },
  { category: "Communication & Documents", features: ["Email system with Mailgun, template builder, and scheduled sending", "WhatsApp integration via Twilio with business messaging templates", "OnlyOffice document editing with signature capture", "In-app chat system with conversation history"] },
  { category: "CRM & Automation", features: ["Deal management with Kanban board and lead tracking", "Workflow automation with stage change triggers", "Automatic task creation and email automation"] },
  { category: "Analytics & Integrations", features: ["Financial statistics and reporting dashboard", "Google Gemini AI integration for intelligent assistance", "Medidata patient/insurer lookup and GTM tracking", "Embeddable forms with postMessage communication"] },
  { category: "Deployment & Infrastructure", features: ["Vercel deployment (main app) and Railway (WhatsApp server)", "Mobile app foundation with React Native", "Environment-based configuration with CSP headers"] },
];

// Documentation files
const DOCUMENTATION = [
  { name: "CLAUDE.md", title: "Project Overview & Commands", description: "Main project documentation with architecture overview" },
  { name: "FINAL_MIGRATION_SUMMARY.md", title: "Database Migration Guide", description: "Provider/billing entity migration and schema changes" },
  { name: "INVOICE_SYSTEM_SUMMARY.md", title: "Invoice & Payment System", description: "Complete invoice generation and payment processing" },
  { name: "CRISALIX_3D_WORKFLOW.md", title: "Crisalix 3D Integration", description: "OAuth flow, API integration, and 3D workflow" },
  { name: "WHATSAPP_SETUP.md", title: "WhatsApp Integration", description: "Twilio WhatsApp API setup and messaging templates" },
  { name: "PAYMENT_SYSTEM_IMPLEMENTATION.md", title: "Swiss QR-Bill & Payrexx", description: "Swiss payment standards and Payrexx integration" },
  { name: "GTM_IMPLEMENTATION_SUMMARY.md", title: "GTM & Analytics Tracking", description: "Google Tag Manager iframe tracking" },
  { name: "AUTOMATION_WORKFLOW_CONSOLE_GUIDE.md", title: "Workflow Automation", description: "Deal stage triggers and automatic task creation" },
  { name: "BILLING_ENTITIES_SETUP.md", title: "Billing Entities Setup", description: "Multi-clinic billing configuration guide" },
  { name: "MAILGUN_SETUP.md", title: "Email System Setup", description: "Mailgun integration and email template config" },
  { name: "DOCSPACE_SETUP_GUIDE.md", title: "Document Management", description: "OnlyOffice DocSpace integration guide" },
];

export default function AliiceProjectCompletionPage() {
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
          <PDFDownloadButton />
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
