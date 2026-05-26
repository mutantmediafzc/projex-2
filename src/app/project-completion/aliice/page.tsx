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

// Legal clauses for Terms & Conditions
const LEGAL_CLAUSES = [
  { title: "1. Project Acceptance", content: "By approving this handover, the Client confirms that the project has been reviewed, tested internally where applicable, and accepted in accordance with the agreed scope, approved deliverables, and documented revisions throughout the project lifecycle. Completed and approved deliverables shall be considered accepted in their delivered state at the time of handover." },
  { title: "2. Scope of Delivery", content: "The Client acknowledges that the agreed project scope and deliverables have been completed based on the approved proposal, discussions, and documented requirements. Any future enhancements, feature additions, workflow changes, integrations, revisions, optimisations, or functionality changes outside the approved scope may be treated as separate work and assessed accordingly." },
  { title: "3. Project Closure", content: "Upon approval of this handover, the project shall be considered formally completed from Mutant Media FZC's delivery side. Any future development, support, maintenance, optimisation, troubleshooting, or enhancement requests may be handled under a separate agreement or support arrangement where required." },
  { title: "4. Handover Confirmation", content: "The Client confirms receipt of the agreed project assets, credentials, files, documentation, source materials, and access details relevant to the project handover. Following handover, day-to-day operational management, administration, access control, and internal handling of the platform shall transition to the Client." },
  { title: "5. Responsibility Following Handover", content: "From the handover approval date onwards, responsibility for ongoing management, administration, operational handling, infrastructure decisions, security management, and future technical decisions relating to the platform shall rest with the Client or its appointed representatives. Mutant Media FZC's responsibility remains limited to the agreed and approved delivery completed up to the handover date." },
  { title: "6. Internal & Third-Party Modifications", content: "Mutant Media FZC cannot assume responsibility for issues arising from: internal modifications, third-party development, hosting or infrastructure changes, platform or plugin updates, external integrations, server configurations, deployment changes, database modifications, operational handling after handover, unauthorised access or misuse." },
  { title: "7. Developer / Technical Resource Transition", content: "Where technical personnel, developers, consultants, or project resources continue directly with the Client after handover, such work shall be considered independent from Mutant Media FZC moving forward. Any future modifications, deployments, operational decisions, technical developments, code changes, infrastructure adjustments, or implementations carried out after the transition date shall fall outside Mutant Media FZC's project delivery responsibility." },
  { title: "8. Maintenance & Ongoing Support", content: "Unless otherwise agreed in writing, project approval and handover conclude the original delivery phase. Mutant Media FZC is under no obligation to provide ongoing support, maintenance, troubleshooting, monitoring, updates, bug fixing, enhancements, or technical assistance following project completion unless covered under a separate written agreement." },
  { title: "9. Third-Party Services & Infrastructure", content: "The Client acknowledges that certain areas of the project may rely on third-party providers, platforms, APIs, hosting services, cloud infrastructure, plugins, payment gateways, or external systems outside the direct control of Mutant Media FZC. Future changes, interruptions, compatibility issues, service limitations, pricing changes, deprecated functionality, or outages relating to third-party systems may affect functionality over time." },
  { title: "10. Platform Evolution & Compatibility", content: "The Client understands that digital platforms, browsers, operating systems, APIs, frameworks, hosting environments, and external technologies naturally evolve over time. Mutant Media FZC cannot guarantee indefinite compatibility, uninterrupted functionality, or long-term platform stability where future environmental, infrastructure, or third-party changes occur after project completion." },
  { title: "11. Client Review & Testing", content: "The Client confirms that appropriate internal review, operational checks, user acceptance testing, and internal approvals have been carried out prior to final approval and handover. Any items requiring adjustment prior to handover should be documented during the project closure process." },
  { title: "12. Outstanding Items", content: "Any agreed pending items or snagging points identified before handover shall be documented separately and handled in accordance with mutual agreement between both parties. Items not formally documented prior to handover approval shall be considered accepted upon project completion." },
  { title: "13. Commercial Completion", content: "Project approval and handover confirm acceptance of the delivered work and completion of the agreed delivery phase. Following approval and handover, the completed project scope shall be considered accepted by the Client. Any future revisions, support, enhancements, technical requests, operational assistance, or additional development shall fall outside the original project scope unless otherwise agreed in writing. No refund, reimbursement, reversal, or compensation claims shall apply relating to approved and accepted deliverables following project handover." },
  { title: "14. Intellectual Property & Ownership", content: "Ownership of final approved deliverables transfers upon settlement of all agreed project payments and outstanding balances. Mutant Media FZC retains ownership of its internal methodologies, frameworks, reusable systems, proprietary structures, development approaches, and pre-existing intellectual property." },
  { title: "15. Limitation of Responsibility", content: "Mutant Media FZC's responsibility remains limited to the agreed scope and approved deliverables completed up to the formal handover date. Mutant Media FZC shall not be responsible for: indirect losses, operational interruptions, commercial losses, reputational impact, loss of revenue, downtime, loss of data, third-party failures, post-handover modifications, infrastructure issues, future operational management decisions." },
  { title: "16. Confidentiality", content: "Both parties agree to maintain reasonable confidentiality regarding proprietary information, credentials, technical systems, operational processes, and business information shared throughout the project." },
  { title: "17. Entire Agreement", content: "These terms form part of the overall agreement and should be read alongside approved quotations, proposals, contracts, invoices, emails, WhatsApp approvals, and documented discussions exchanged throughout the project lifecycle." },
  { title: "18. Governing Law", content: "These terms shall be governed in accordance with the laws and regulations of the United Arab Emirates." },
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

        {/* Terms & Conditions Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6">
          <h4 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">
            Terms & Conditions
          </h4>
          <p className="text-slate-600 mb-6">
            By signing this Project Completion Certificate, both parties acknowledge and agree to the following terms:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LEGAL_CLAUSES.map((clause, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-4">
                <h5 className="font-semibold text-slate-900 text-sm mb-2">{clause.title}</h5>
                <p className="text-xs text-slate-600 leading-relaxed">{clause.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Signatures Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h4 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">
            Signatures
          </h4>

          <p className="text-sm text-slate-500 italic mb-6">
            IN WITNESS WHEREOF, the parties have executed this Project Completion Certificate and agree to the Terms & Conditions outlined above as of the date written below.
          </p>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Service Provider</p>
              <div className="h-16 border-b border-slate-900 mb-2"></div>
              <p className="font-semibold text-slate-900">Jeano Pangan</p>
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
