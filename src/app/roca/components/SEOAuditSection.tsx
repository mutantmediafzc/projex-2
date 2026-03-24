"use client";

import { useState } from "react";

const auditFindings = [
  {
    category: "Technical SEO",
    score: 45,
    issues: [
      { severity: "critical", issue: "Missing meta descriptions on 60% of pages", fix: "Add unique, keyword-rich meta descriptions" },
      { severity: "critical", issue: "No XML sitemap submitted", fix: "Generate and submit sitemap to Google Search Console" },
      { severity: "high", issue: "Slow page load speed (4.2s average)", fix: "Optimize images, enable caching, minify CSS/JS" },
      { severity: "medium", issue: "Missing alt tags on property images", fix: "Add descriptive alt text for all images" },
    ],
  },
  {
    category: "On-Page SEO",
    score: 38,
    issues: [
      { severity: "critical", issue: "No H1 tags on property listing pages", fix: "Add proper heading hierarchy" },
      { severity: "high", issue: "Thin content on category pages", fix: "Expand content to 500+ words with valuable info" },
      { severity: "high", issue: "Missing internal linking structure", fix: "Create topic clusters with strategic internal links" },
      { severity: "medium", issue: "URL structure not optimized", fix: "Implement clean, keyword-rich URLs" },
    ],
  },
  {
    category: "Local SEO",
    score: 52,
    issues: [
      { severity: "high", issue: "Google Business Profile incomplete", fix: "Complete all GBP fields, add photos, posts" },
      { severity: "high", issue: "Inconsistent NAP across directories", fix: "Standardize Name, Address, Phone everywhere" },
      { severity: "medium", issue: "No local schema markup", fix: "Implement LocalBusiness schema" },
      { severity: "low", issue: "Few local citations", fix: "Build citations on UAE directories" },
    ],
  },
  {
    category: "Content & Keywords",
    score: 35,
    issues: [
      { severity: "critical", issue: "Not ranking for primary keywords", fix: "Create optimized landing pages for each keyword" },
      { severity: "high", issue: "No blog or content strategy", fix: "Launch blog with 4 posts/month" },
      { severity: "high", issue: "Missing FAQ sections", fix: "Add FAQ schema for voice/AI search" },
      { severity: "medium", issue: "Competitor content gap", fix: "Create content for 50+ untapped keywords" },
    ],
  },
];

const competitorAnalysis = [
  { name: "Roca (Current)", organic: 450, keywords: 28, backlinks: 120, score: 42 },
  { name: "Competitor A", organic: 8500, keywords: 340, backlinks: 890, score: 78 },
  { name: "Competitor B", organic: 6200, keywords: 280, backlinks: 650, score: 72 },
  { name: "Competitor C", organic: 4800, keywords: 195, backlinks: 420, score: 65 },
];

export default function SEOAuditSection() {
  const [activeCategory, setActiveCategory] = useState(0);
  const overallScore = Math.round(auditFindings.reduce((acc, f) => acc + f.score, 0) / auditFindings.length);

  return (
    <section id="seo-audit" className="py-24 px-6 bg-slate-900/50">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-amber-400 text-sm font-semibold uppercase tracking-widest mb-4">
            SEO Audit Results
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Current Website Analysis
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Based on our comprehensive audit of roca.ae, we&apos;ve identified key opportunities to dramatically improve search visibility and lead generation.
          </p>
        </div>

        {/* Overall Score */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="md:col-span-1 rounded-3xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 p-8 text-center">
            <div className="relative inline-flex items-center justify-center w-40 h-40 mb-4">
              <svg className="w-40 h-40 -rotate-90">
                <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-700" />
                <circle
                  cx="80" cy="80" r="70" fill="none" stroke="url(#scoreGradient)" strokeWidth="8"
                  strokeDasharray={440} strokeDashoffset={440 - (440 * overallScore) / 100}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-white">{overallScore}</span>
                <span className="text-slate-400 text-sm">out of 100</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Overall SEO Score</h3>
            <p className="text-red-400 font-medium">Needs Improvement</p>
          </div>

          <div className="md:col-span-2 rounded-3xl bg-slate-800/50 border border-slate-700/50 p-8">
            <h3 className="text-xl font-bold text-white mb-6">Competitor Comparison</h3>
            <div className="space-y-4">
              {competitorAnalysis.map((comp, i) => (
                <div key={i} className={`rounded-xl p-4 ${i === 0 ? "bg-amber-500/10 border border-amber-500/30" : "bg-slate-800/50"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${i === 0 ? "text-amber-400" : "text-white"}`}>{comp.name}</span>
                    <span className={`text-sm font-bold ${comp.score >= 70 ? "text-green-400" : comp.score >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                      Score: {comp.score}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Monthly Traffic</span>
                      <p className="text-white font-medium">{comp.organic.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Keywords</span>
                      <p className="text-white font-medium">{comp.keywords}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Backlinks</span>
                      <p className="text-white font-medium">{comp.backlinks}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-3 mb-8">
          {auditFindings.map((cat, i) => (
            <button
              key={i}
              onClick={() => setActiveCategory(i)}
              className={`px-5 py-3 rounded-xl font-medium transition-all ${
                activeCategory === i
                  ? "bg-amber-500 text-white"
                  : "bg-slate-800/50 text-slate-400 hover:text-white"
              }`}
            >
              {cat.category}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                cat.score >= 60 ? "bg-green-500/20 text-green-400" :
                cat.score >= 40 ? "bg-yellow-500/20 text-yellow-400" :
                "bg-red-500/20 text-red-400"
              }`}>
                {cat.score}%
              </span>
            </button>
          ))}
        </div>

        {/* Issues List */}
        <div className="rounded-3xl bg-slate-800/30 border border-slate-700/50 overflow-hidden">
          <div className="p-6 border-b border-slate-700/50">
            <h3 className="text-xl font-bold text-white">{auditFindings[activeCategory].category} Issues</h3>
          </div>
          <div className="divide-y divide-slate-700/50">
            {auditFindings[activeCategory].issues.map((issue, i) => (
              <div key={i} className="p-6 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    issue.severity === "critical" ? "bg-red-500/20 text-red-400" :
                    issue.severity === "high" ? "bg-orange-500/20 text-orange-400" :
                    issue.severity === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                    "bg-blue-500/20 text-blue-400"
                  }`}>
                    {issue.severity}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium mb-1">{issue.issue}</p>
                    <p className="text-slate-400 text-sm flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Fix: {issue.fix}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Download Full Report */}
        <div className="mt-8 text-center">
          <a
            href="/roca/Roca Real Estate SEO.pdf"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-full bg-slate-800 border border-slate-700 px-6 py-3 text-white font-medium hover:bg-slate-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Full SEO Audit Report (PDF)
          </a>
        </div>
      </div>
    </section>
  );
}
