"use client";

import { useState } from "react";

const landingPages = [
  {
    id: 1,
    title: "Off-Plan Properties Hub",
    description: "Dedicated landing page for off-plan investment opportunities with project comparisons, payment plans, and ROI calculators.",
    targetKeywords: ["off-plan properties Dubai", "Dubai off-plan investment", "new developments Dubai"],
    features: ["Interactive project comparison", "Payment plan calculator", "ROI estimator", "Developer profiles", "Lead capture form"],
    expectedLeads: "80-120/month",
    conversionRate: "8-12%",
  },
  {
    id: 2,
    title: "Luxury Villas Showcase",
    description: "Premium landing page targeting high-net-worth individuals looking for luxury villa investments in Dubai's prime locations.",
    targetKeywords: ["luxury villas Dubai", "Dubai villa investment", "Palm Jumeirah villas"],
    features: ["Virtual tour integration", "High-res gallery", "Location maps", "Lifestyle content", "Private viewing booking"],
    expectedLeads: "40-60/month",
    conversionRate: "5-8%",
  },
  {
    id: 3,
    title: "Investment Calculator Page",
    description: "Interactive tool helping investors calculate potential returns, rental yields, and capital appreciation for Dubai properties.",
    targetKeywords: ["Dubai property ROI", "real estate investment Dubai", "Dubai rental yield"],
    features: ["ROI calculator", "Rental yield estimator", "Market trends data", "Comparison tools", "Expert consultation CTA"],
    expectedLeads: "100-150/month",
    conversionRate: "10-15%",
  },
  {
    id: 4,
    title: "International Investor Guide",
    description: "Comprehensive resource for international buyers covering visa options, legal requirements, and investment benefits.",
    targetKeywords: ["buy property Dubai foreigner", "Dubai golden visa property", "invest in Dubai real estate"],
    features: ["Visa guide", "Legal requirements", "Tax benefits", "Process timeline", "Multi-language support"],
    expectedLeads: "60-90/month",
    conversionRate: "6-10%",
  },
  {
    id: 5,
    title: "Area-Specific Pages",
    description: "Targeted landing pages for each major Dubai area: Downtown, Marina, Palm, JBR, Business Bay, and emerging areas.",
    targetKeywords: ["Downtown Dubai apartments", "Dubai Marina properties", "JBR apartments for sale"],
    features: ["Area overview", "Property listings", "Amenities map", "Price trends", "Neighborhood guide"],
    expectedLeads: "150-200/month",
    conversionRate: "7-11%",
  },
];

export default function LandingPagesSection() {
  const [activePage, setActivePage] = useState(0);

  return (
    <section id="landing-pages" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-amber-400 text-sm font-semibold uppercase tracking-widest mb-4">
            Lead Generation Strategy
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            High-Converting Landing Pages
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Strategic landing pages designed to capture and convert high-intent visitors into qualified leads for Roca Real Estate.
          </p>
        </div>

        {/* Landing Page Cards */}
        <div className="grid lg:grid-cols-3 gap-6 mb-12">
          {landingPages.slice(0, 3).map((page, i) => (
            <div
              key={page.id}
              onClick={() => setActivePage(i)}
              className={`cursor-pointer rounded-2xl p-6 transition-all duration-300 ${
                activePage === i
                  ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50 scale-[1.02]"
                  : "bg-slate-800/30 border border-slate-700/50 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  activePage === i ? "bg-amber-500" : "bg-slate-700"
                }`}>
                  <span className="text-white font-bold">{page.id}</span>
                </div>
                <h3 className="text-lg font-bold text-white">{page.title}</h3>
              </div>
              <p className="text-slate-400 text-sm mb-4">{page.description}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-400 font-medium">{page.expectedLeads} leads</span>
                <span className="text-amber-400">{page.conversionRate} CVR</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-12">
          {landingPages.slice(3).map((page, i) => (
            <div
              key={page.id}
              onClick={() => setActivePage(i + 3)}
              className={`cursor-pointer rounded-2xl p-6 transition-all duration-300 ${
                activePage === i + 3
                  ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50"
                  : "bg-slate-800/30 border border-slate-700/50 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  activePage === i + 3 ? "bg-amber-500" : "bg-slate-700"
                }`}>
                  <span className="text-white font-bold">{page.id}</span>
                </div>
                <h3 className="text-lg font-bold text-white">{page.title}</h3>
              </div>
              <p className="text-slate-400 text-sm mb-4">{page.description}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-400 font-medium">{page.expectedLeads} leads</span>
                <span className="text-amber-400">{page.conversionRate} CVR</span>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Page Details */}
        <div className="rounded-3xl bg-slate-800/30 border border-slate-700/50 overflow-hidden">
          <div className="p-8 border-b border-slate-700/50">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">{landingPages[activePage].title}</h3>
                <p className="text-slate-400">{landingPages[activePage].description}</p>
              </div>
              <div className="flex gap-4">
                <div className="text-center px-6 py-3 rounded-xl bg-green-500/10 border border-green-500/30">
                  <div className="text-2xl font-bold text-green-400">{landingPages[activePage].expectedLeads}</div>
                  <div className="text-xs text-green-400/70">Expected Leads</div>
                </div>
                <div className="text-center px-6 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="text-2xl font-bold text-amber-400">{landingPages[activePage].conversionRate}</div>
                  <div className="text-xs text-amber-400/70">Conversion Rate</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 p-8">
            {/* Target Keywords */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Target Keywords
              </h4>
              <div className="flex flex-wrap gap-2">
                {landingPages[activePage].targetKeywords.map((kw, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 text-sm">
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            {/* Features */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Page Features
              </h4>
              <div className="space-y-2">
                {landingPages[activePage].features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-slate-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Total Impact */}
        <div className="mt-12 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 p-8 text-center">
          <h4 className="text-xl font-bold text-white mb-4">Combined Landing Page Impact</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-3xl font-bold text-amber-400">5</div>
              <div className="text-slate-400 text-sm">Strategic Pages</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-400">430-620</div>
              <div className="text-slate-400 text-sm">Monthly Leads</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-400">50+</div>
              <div className="text-slate-400 text-sm">Target Keywords</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400">8-12%</div>
              <div className="text-slate-400 text-sm">Avg. Conversion</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
