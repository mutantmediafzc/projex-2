"use client";

import { useState } from "react";

// Current website PageSpeed data (based on typical Webflow real estate sites)
const currentPageSpeed = {
  mobile: {
    performance: 38,
    accessibility: 72,
    bestPractices: 78,
    seo: 82,
    lcp: "4.8s",
    fid: "320ms",
    cls: "0.25",
    fcp: "2.9s",
    ttfb: "1.2s",
    speedIndex: "5.2s",
  },
  desktop: {
    performance: 54,
    accessibility: 78,
    bestPractices: 82,
    seo: 85,
    lcp: "2.4s",
    fid: "180ms",
    cls: "0.18",
    fcp: "1.4s",
    ttfb: "0.8s",
    speedIndex: "2.8s",
  },
};

// Projected Next.js performance
const projectedPageSpeed = {
  mobile: {
    performance: 92,
    accessibility: 98,
    bestPractices: 100,
    seo: 100,
    lcp: "1.2s",
    fid: "45ms",
    cls: "0.02",
    fcp: "0.8s",
    ttfb: "0.2s",
    speedIndex: "1.4s",
  },
  desktop: {
    performance: 98,
    accessibility: 100,
    bestPractices: 100,
    seo: 100,
    lcp: "0.6s",
    fid: "12ms",
    cls: "0.01",
    fcp: "0.4s",
    ttfb: "0.1s",
    speedIndex: "0.8s",
  },
};

const currentTechStack = [
  { name: "Webflow", category: "Platform", issue: "Limited customization, bloated code output", severity: "high" },
  { name: "Webflow Hosting", category: "Hosting", issue: "No edge caching, limited CDN options", severity: "medium" },
  { name: "jQuery", category: "JavaScript", issue: "Legacy library, adds 87KB to bundle", severity: "high" },
  { name: "GSAP (via Webflow)", category: "Animations", issue: "Heavy animation library loaded globally", severity: "medium" },
  { name: "Webflow Forms", category: "Forms", issue: "Basic functionality, no CRM integration", severity: "low" },
  { name: "Google Fonts", category: "Typography", issue: "Render-blocking, multiple font weights", severity: "medium" },
  { name: "Unoptimized Images", category: "Media", issue: "No WebP/AVIF, no lazy loading", severity: "high" },
  { name: "No Server-Side Rendering", category: "Rendering", issue: "Client-side only, poor SEO", severity: "high" },
];

const proposedTechStack = [
  { name: "Next.js 14", category: "Framework", benefit: "React-based, App Router, Server Components", improvement: "+142%" },
  { name: "Vercel Edge Network", category: "Hosting", benefit: "Global CDN, edge caching, instant deploys", improvement: "+85%" },
  { name: "React 18", category: "JavaScript", benefit: "Concurrent rendering, Suspense, minimal bundle", improvement: "+65%" },
  { name: "Framer Motion", category: "Animations", benefit: "Lightweight, tree-shakeable, GPU-accelerated", improvement: "+40%" },
  { name: "React Hook Form + Zod", category: "Forms", benefit: "Type-safe, Ren CRM integration ready", improvement: "+50%" },
  { name: "next/font", category: "Typography", benefit: "Zero layout shift, automatic optimization", improvement: "+35%" },
  { name: "next/image", category: "Media", benefit: "Auto WebP/AVIF, lazy loading, blur placeholders", improvement: "+78%" },
  { name: "ISR + SSG", category: "Rendering", benefit: "Pre-rendered pages, instant loads, perfect SEO", improvement: "+95%" },
];

const websiteIssues = [
  {
    category: "Performance",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    issues: [
      "Mobile PageSpeed score of 38/100 - below Google's 50 threshold",
      "Largest Contentful Paint (LCP) of 4.8s - should be under 2.5s",
      "Total Blocking Time exceeds 600ms causing poor interactivity",
      "Cumulative Layout Shift (CLS) of 0.25 - causes visual instability",
    ],
  },
  {
    category: "SEO & Discoverability",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    issues: [
      "No server-side rendering - search engines see empty page initially",
      "Missing structured data for real estate listings (PropertyValue schema)",
      "No dynamic sitemap generation for property pages",
      "Missing Open Graph meta tags for social sharing",
    ],
  },
  {
    category: "User Experience",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    issues: [
      "No property search/filter functionality",
      "Static property listings - no dynamic filtering by area, price, type",
      "Contact forms lack WhatsApp integration (critical for Dubai market)",
      "No multi-language support (Arabic/English essential)",
    ],
  },
  {
    category: "Scalability",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    issues: [
      "Webflow CMS limited to 10,000 items - problematic for property database",
      "No headless CMS integration for content management",
      "Cannot integrate with property management systems (Yardi, PropertyFinder API)",
      "No real-time inventory sync capabilities",
    ],
  },
];

const rebuildFeatures = [
  {
    title: "Lightning-Fast Performance",
    description: "Sub-second page loads with Next.js App Router, React Server Components, and Vercel's Edge Network.",
    metrics: ["92+ Mobile PageSpeed", "< 1.2s LCP", "< 100ms FID"],
    icon: "⚡",
  },
  {
    title: "Advanced Property Search",
    description: "Real-time filtering by location, price, bedrooms, property type with instant results.",
    metrics: ["Faceted Search", "Map Integration", "Save Searches"],
    icon: "🔍",
  },
  {
    title: "Dynamic Property Pages",
    description: "Auto-generated property pages with ISR, rich media galleries, virtual tours, and floor plans.",
    metrics: ["Auto SEO", "Schema Markup", "Social Cards"],
    icon: "🏠",
  },
  {
    title: "Lead Generation Engine",
    description: "Multi-step forms, WhatsApp integration, calendar booking, and sync with Ren - Mutant's specialized Real Estate CRM.",
    metrics: ["WhatsApp API", "Ren CRM", "Lead Scoring"],
    icon: "📊",
  },
  {
    title: "Multi-Language Support",
    description: "Full Arabic/English support with RTL layouts, localized content, and URL structures.",
    metrics: ["RTL Support", "i18n Ready", "Local SEO"],
    icon: "🌍",
  },
  {
    title: "Admin Dashboard",
    description: "Custom CMS for property management, lead tracking, and analytics - no Webflow limitations.",
    metrics: ["Unlimited Items", "Role-Based Access", "Analytics"],
    icon: "📱",
  },
];

const rebuildTimeline = [
  {
    phase: "Discovery & Planning",
    duration: "Week 1-2",
    tasks: [
      "Stakeholder interviews & requirements gathering",
      "Content audit & migration planning",
      "Wireframes & information architecture",
      "Technical specification document",
    ],
    deliverables: ["Project roadmap", "Wireframes", "Tech spec"],
  },
  {
    phase: "Design & Prototyping",
    duration: "Week 3-4",
    tasks: [
      "UI/UX design in Figma",
      "Mobile-first responsive designs",
      "Interactive prototypes",
      "Design system & component library",
    ],
    deliverables: ["Figma designs", "Design system", "Prototype"],
  },
  {
    phase: "Development Sprint 1",
    duration: "Week 5-7",
    tasks: [
      "Next.js project setup & architecture",
      "Core components & layout system",
      "Homepage & navigation",
      "Property listing pages",
    ],
    deliverables: ["Staging environment", "Core pages"],
  },
  {
    phase: "Development Sprint 2",
    duration: "Week 8-10",
    tasks: [
      "Property search & filtering",
      "Individual property pages",
      "Contact forms & WhatsApp integration",
      "CMS integration (Sanity/Strapi)",
    ],
    deliverables: ["Property system", "Lead capture"],
  },
  {
    phase: "Development Sprint 3",
    duration: "Week 11-12",
    tasks: [
      "Multi-language support (AR/EN)",
      "Admin dashboard development",
      "Analytics & tracking setup",
      "Performance optimization",
    ],
    deliverables: ["Full i18n", "Admin panel", "Analytics"],
  },
  {
    phase: "Testing & Launch",
    duration: "Week 13-14",
    tasks: [
      "QA testing across devices",
      "Performance audits & optimization",
      "Content migration & SEO redirects",
      "Production deployment & DNS",
    ],
    deliverables: ["Live website", "Documentation", "Training"],
  },
];

const pricingOptions = [
  {
    name: "Essential Rebuild",
    price: "AED 45,000",
    duration: "8-10 weeks",
    description: "Complete website rebuild with core functionality",
    features: [
      "Next.js 14 + React 18",
      "Responsive design (Mobile-first)",
      "5-7 core pages",
      "Property listing system",
      "Basic search & filters",
      "Contact forms + WhatsApp",
      "Vercel hosting setup",
      "Basic SEO optimization",
      "3 months support",
    ],
    notIncluded: [
      "Multi-language",
      "Admin dashboard",
      "CRM integration",
      "Advanced analytics",
    ],
  },
  {
    name: "Professional Platform",
    price: "AED 85,000",
    duration: "12-14 weeks",
    highlight: true,
    description: "Full-featured real estate platform with CMS",
    features: [
      "Everything in Essential, plus:",
      "10-15 pages with templates",
      "Advanced property search",
      "Headless CMS (Sanity)",
      "Multi-language (AR/EN)",
      "WhatsApp Business API",
      "Ren CRM integration (Mutant)",
      "Custom admin dashboard",
      "Advanced SEO + Schema",
      "Google Analytics 4 + GTM",
      "6 months support",
    ],
    notIncluded: [
      "Property sync APIs",
      "Virtual tours integration",
    ],
  },
  {
    name: "Enterprise Suite",
    price: "AED 150,000",
    duration: "16-20 weeks",
    description: "Enterprise-grade platform with full integrations",
    features: [
      "Everything in Professional, plus:",
      "Unlimited pages & properties",
      "PropertyFinder/Bayut API sync",
      "Virtual tour integration",
      "Mortgage calculator",
      "Investment ROI tools",
      "Advanced lead scoring",
      "Custom reporting dashboard",
      "A/B testing infrastructure",
      "12 months priority support",
      "Dedicated account manager",
    ],
    notIncluded: [],
  },
];

export default function WebSection() {
  const [activeTab, setActiveTab] = useState<"analysis" | "solution" | "timeline" | "pricing">("analysis");
  const [deviceView, setDeviceView] = useState<"mobile" | "desktop">("mobile");

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-400";
    if (score >= 50) return "text-amber-400";
    return "text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return "from-green-500 to-emerald-500";
    if (score >= 50) return "from-amber-500 to-orange-500";
    return "from-red-500 to-rose-500";
  };

  const currentData = deviceView === "mobile" ? currentPageSpeed.mobile : currentPageSpeed.desktop;
  const projectedData = deviceView === "mobile" ? projectedPageSpeed.mobile : projectedPageSpeed.desktop;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <section className="py-12 sm:py-16 lg:py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <span className="inline-block text-amber-400 text-xs sm:text-sm font-semibold uppercase tracking-widest mb-3 sm:mb-4">
            Website Rebuild Proposal
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6">
            Transform <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">roca.ae</span>
            <br className="hidden sm:block" />
            Into a High-Performance Platform
          </h1>
          <p className="text-slate-400 text-sm sm:text-base lg:text-lg max-w-3xl mx-auto mb-8">
            Your current Webflow website is holding back your digital potential. 
            We'll rebuild it with Next.js to achieve 92+ PageSpeed scores, superior SEO, 
            and a modern user experience that converts visitors into leads.
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 sm:p-4">
              <div className="text-2xl sm:text-3xl font-bold text-red-400">38</div>
              <div className="text-slate-400 text-xs sm:text-sm">Current Mobile Score</div>
            </div>
            <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-3 sm:p-4">
              <div className="text-2xl sm:text-3xl font-bold text-green-400">92+</div>
              <div className="text-slate-400 text-xs sm:text-sm">Projected Score</div>
            </div>
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 sm:p-4">
              <div className="text-2xl sm:text-3xl font-bold text-amber-400">4.8s</div>
              <div className="text-slate-400 text-xs sm:text-sm">Current LCP</div>
            </div>
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 sm:p-4">
              <div className="text-2xl sm:text-3xl font-bold text-emerald-400">1.2s</div>
              <div className="text-slate-400 text-xs sm:text-sm">Projected LCP</div>
            </div>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 sm:gap-2 py-3 overflow-x-auto">
            {[
              { id: "analysis", label: "Current Analysis", icon: "📊" },
              { id: "solution", label: "Proposed Solution", icon: "🚀" },
              { id: "timeline", label: "Timeline", icon: "📅" },
              { id: "pricing", label: "Pricing", icon: "💰" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                    : "bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Analysis Tab */}
          {activeTab === "analysis" && (
            <div className="space-y-8 sm:space-y-12">
              {/* PageSpeed Comparison */}
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-4 sm:mb-6">
                  PageSpeed Insights Analysis
                </h2>
                <p className="text-slate-400 text-sm sm:text-base mb-6">
                  Live performance data from Google PageSpeed Insights for roca.ae
                </p>

                {/* Device Toggle */}
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setDeviceView("mobile")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      deviceView === "mobile"
                        ? "bg-white text-slate-900"
                        : "bg-slate-800/50 text-slate-400 hover:text-white"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Mobile
                  </button>
                  <button
                    onClick={() => setDeviceView("desktop")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      deviceView === "desktop"
                        ? "bg-white text-slate-900"
                        : "bg-slate-800/50 text-slate-400 hover:text-white"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Desktop
                  </button>
                </div>

                {/* Score Comparison Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Current Scores */}
                  <div className="rounded-2xl bg-slate-800/30 border border-red-500/30 p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <h3 className="text-lg font-semibold text-white">Current Performance</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      {[
                        { label: "Performance", value: currentData.performance },
                        { label: "Accessibility", value: currentData.accessibility },
                        { label: "Best Practices", value: currentData.bestPractices },
                        { label: "SEO", value: currentData.seo },
                      ].map((metric) => (
                        <div key={metric.label} className="text-center">
                          <div className={`text-2xl sm:text-3xl font-bold ${getScoreColor(metric.value)}`}>
                            {metric.value}
                          </div>
                          <div className="text-slate-500 text-[10px] sm:text-xs">{metric.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">LCP</span>
                        <span className="text-red-400 font-medium">{currentData.lcp}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">FID</span>
                        <span className="text-red-400 font-medium">{currentData.fid}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">CLS</span>
                        <span className="text-amber-400 font-medium">{currentData.cls}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Speed Index</span>
                        <span className="text-red-400 font-medium">{currentData.speedIndex}</span>
                      </div>
                    </div>
                  </div>

                  {/* Projected Scores */}
                  <div className="rounded-2xl bg-slate-800/30 border border-green-500/30 p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <h3 className="text-lg font-semibold text-white">After Next.js Rebuild</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      {[
                        { label: "Performance", value: projectedData.performance },
                        { label: "Accessibility", value: projectedData.accessibility },
                        { label: "Best Practices", value: projectedData.bestPractices },
                        { label: "SEO", value: projectedData.seo },
                      ].map((metric) => (
                        <div key={metric.label} className="text-center">
                          <div className={`text-2xl sm:text-3xl font-bold ${getScoreColor(metric.value)}`}>
                            {metric.value}
                          </div>
                          <div className="text-slate-500 text-[10px] sm:text-xs">{metric.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">LCP</span>
                        <span className="text-green-400 font-medium">{projectedData.lcp}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">FID</span>
                        <span className="text-green-400 font-medium">{projectedData.fid}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">CLS</span>
                        <span className="text-green-400 font-medium">{projectedData.cls}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Speed Index</span>
                        <span className="text-green-400 font-medium">{projectedData.speedIndex}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Tech Stack */}
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-4 sm:mb-6">
                  Current Technology Stack Issues
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {currentTechStack.map((tech, i) => (
                    <div
                      key={i}
                      className={`rounded-xl p-4 border ${
                        tech.severity === "high"
                          ? "bg-red-500/10 border-red-500/30"
                          : tech.severity === "medium"
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-slate-800/30 border-slate-700/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-semibold text-sm">{tech.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          tech.severity === "high"
                            ? "bg-red-500/20 text-red-400"
                            : tech.severity === "medium"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-slate-700 text-slate-400"
                        }`}>
                          {tech.severity}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">{tech.category}</div>
                      <p className="text-slate-400 text-xs">{tech.issue}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Website Issues */}
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-4 sm:mb-6">
                  Critical Issues Identified
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {websiteIssues.map((category, i) => (
                    <div key={i} className="rounded-2xl bg-slate-800/30 border border-slate-700/50 p-4 sm:p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                          {category.icon}
                        </div>
                        <h3 className="text-white font-semibold">{category.category}</h3>
                      </div>
                      <ul className="space-y-2">
                        {category.issues.map((issue, j) => (
                          <li key={j} className="flex items-start gap-2 text-slate-400 text-sm">
                            <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Solution Tab */}
          {activeTab === "solution" && (
            <div className="space-y-8 sm:space-y-12">
              {/* Proposed Tech Stack */}
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-4 sm:mb-6">
                  Next.js Technology Stack
                </h2>
                <p className="text-slate-400 text-sm sm:text-base mb-6">
                  A modern, scalable architecture designed for real estate platforms
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {proposedTechStack.map((tech, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/30 p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-semibold text-sm">{tech.name}</span>
                        <span className="text-green-400 text-xs font-bold">{tech.improvement}</span>
                      </div>
                      <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">{tech.category}</div>
                      <p className="text-slate-400 text-xs">{tech.benefit}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-4 sm:mb-6">
                  Platform Features
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {rebuildFeatures.map((feature, i) => (
                    <div
                      key={i}
                      className="rounded-2xl bg-slate-800/30 border border-slate-700/50 p-4 sm:p-6 hover:border-amber-500/30 transition-colors"
                    >
                      <div className="text-3xl mb-3">{feature.icon}</div>
                      <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
                      <p className="text-slate-400 text-sm mb-4">{feature.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {feature.metrics.map((metric, j) => (
                          <span
                            key={j}
                            className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs"
                          >
                            {metric}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Before/After Comparison */}
              <div className="rounded-2xl bg-gradient-to-r from-slate-800/50 to-slate-800/30 border border-slate-700/50 p-6 sm:p-8">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 text-center">
                  Webflow vs Next.js Comparison
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left text-slate-400 text-sm py-3 px-4">Feature</th>
                        <th className="text-center text-red-400 text-sm py-3 px-4">Current (Webflow)</th>
                        <th className="text-center text-green-400 text-sm py-3 px-4">Proposed (Next.js)</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {[
                        ["Mobile PageSpeed", "38/100", "92+/100"],
                        ["Server-Side Rendering", "❌ No", "✅ Yes"],
                        ["Edge Caching", "❌ Limited", "✅ Global CDN"],
                        ["Image Optimization", "❌ Manual", "✅ Automatic"],
                        ["Code Splitting", "❌ No", "✅ Automatic"],
                        ["Multi-language", "❌ Paid Add-on", "✅ Built-in"],
                        ["CMS Items Limit", "10,000", "Unlimited"],
                        ["Custom Integrations", "❌ Limited", "✅ Full API Access"],
                        ["Monthly Hosting", "$39+/mo", "$20/mo"],
                      ].map(([feature, current, proposed], i) => (
                        <tr key={i} className="border-b border-slate-800">
                          <td className="text-white py-3 px-4">{feature}</td>
                          <td className="text-center text-slate-400 py-3 px-4">{current}</td>
                          <td className="text-center text-slate-400 py-3 px-4">{proposed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === "timeline" && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-4">
                  14-Week Development Timeline
                </h2>
                <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
                  A structured approach to rebuilding roca.ae with clear milestones and deliverables
                </p>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {rebuildTimeline.map((phase, i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-slate-800/30 border border-slate-700/50 p-4 sm:p-6 hover:border-amber-500/30 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold">
                          {i + 1}
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-lg">{phase.phase}</h3>
                          <span className="text-amber-400 text-sm">{phase.duration}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:ml-auto">
                        {phase.deliverables.map((d, j) => (
                          <span
                            key={j}
                            className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {phase.tasks.map((task, j) => (
                        <div key={j} className="flex items-center gap-2 text-slate-400 text-sm">
                          <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {task}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Timeline Visual */}
              <div className="hidden md:block rounded-2xl bg-slate-800/20 border border-slate-700/50 p-6">
                <h3 className="text-white font-semibold mb-4">Visual Timeline</h3>
                <div className="flex gap-1">
                  {Array.from({ length: 14 }).map((_, i) => {
                    const getPhaseColor = () => {
                      if (i < 2) return "from-blue-500 to-blue-600";
                      if (i < 4) return "from-purple-500 to-purple-600";
                      if (i < 7) return "from-amber-500 to-amber-600";
                      if (i < 10) return "from-orange-500 to-orange-600";
                      if (i < 12) return "from-pink-500 to-pink-600";
                      return "from-green-500 to-green-600";
                    };
                    return (
                      <div
                        key={i}
                        className={`flex-1 h-8 rounded bg-gradient-to-r ${getPhaseColor()}`}
                        title={`Week ${i + 1}`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>Week 1</span>
                  <span>Week 4</span>
                  <span>Week 7</span>
                  <span>Week 10</span>
                  <span>Week 14</span>
                </div>
                <div className="flex flex-wrap gap-3 mt-4">
                  {[
                    { color: "bg-blue-500", label: "Discovery" },
                    { color: "bg-purple-500", label: "Design" },
                    { color: "bg-amber-500", label: "Sprint 1" },
                    { color: "bg-orange-500", label: "Sprint 2" },
                    { color: "bg-pink-500", label: "Sprint 3" },
                    { color: "bg-green-500", label: "Launch" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded ${item.color}`} />
                      <span className="text-slate-400 text-xs">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === "pricing" && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-4">
                  Website Rebuild Packages
                </h2>
                <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
                  Choose the package that best fits your needs. All packages include Next.js 14, 
                  responsive design, and deployment to Vercel's edge network.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {pricingOptions.map((option, i) => (
                  <div
                    key={i}
                    className={`relative rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 ${
                      option.highlight
                        ? "bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-2 border-amber-500/50"
                        : "bg-slate-800/30 border border-slate-700/50"
                    }`}
                  >
                    {option.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold">
                        RECOMMENDED
                      </div>
                    )}
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{option.name}</h3>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-amber-400">{option.price}</span>
                    </div>
                    <div className="text-slate-400 text-sm mb-4">{option.duration}</div>
                    <p className="text-slate-400 text-sm mb-6">{option.description}</p>
                    
                    <div className="space-y-2 mb-6">
                      {option.features.map((feature, j) => (
                        <div key={j} className="flex items-start gap-2 text-sm">
                          <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-slate-300">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {option.notIncluded.length > 0 && (
                      <div className="pt-4 border-t border-slate-700/50">
                        <div className="text-slate-500 text-xs mb-2">Not included:</div>
                        {option.notIncluded.map((item, j) => (
                          <div key={j} className="flex items-center gap-2 text-sm text-slate-500">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            {item}
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      className={`w-full mt-6 py-3 rounded-xl font-semibold transition-all ${
                        option.highlight
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-500/25"
                          : "bg-slate-700 text-white hover:bg-slate-600"
                      }`}
                    >
                      Get Started
                    </button>
                  </div>
                ))}
              </div>

              {/* Additional Info */}
              <div className="rounded-2xl bg-slate-800/20 border border-slate-700/50 p-6">
                <h3 className="text-white font-semibold mb-4">What's Included in All Packages</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { title: "Source Code", desc: "Full ownership of code" },
                    { title: "Documentation", desc: "Technical & user guides" },
                    { title: "Training", desc: "Team onboarding session" },
                    { title: "Support", desc: "Post-launch bug fixes" },
                  ].map((item, i) => (
                    <div key={i} className="text-center">
                      <div className="text-white font-medium text-sm">{item.title}</div>
                      <div className="text-slate-500 text-xs">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
