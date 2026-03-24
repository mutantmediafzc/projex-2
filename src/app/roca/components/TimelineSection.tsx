"use client";

import { useState } from "react";

const phases = [
  {
    month: "Month 1",
    phase: "Foundation & Setup",
    color: "from-blue-500 to-cyan-500",
    tasks: [
      { task: "Comprehensive website audit & technical SEO fixes", status: "setup" },
      { task: "Google Analytics 4 & Search Console setup", status: "setup" },
      { task: "Competitor analysis & keyword research", status: "research" },
      { task: "Social media account optimization", status: "setup" },
      { task: "Content strategy development", status: "strategy" },
      { task: "Landing page #1 & #2 design & development", status: "build" },
    ],
    deliverables: ["Technical SEO audit report", "Keyword strategy document", "2 landing pages live", "Social profiles optimized"],
    expectedResults: "Foundation laid, tracking in place",
  },
  {
    month: "Month 2-3",
    phase: "Growth Activation",
    color: "from-purple-500 to-pink-500",
    tasks: [
      { task: "On-page SEO implementation across all pages", status: "seo" },
      { task: "Google Ads campaign launch", status: "ads" },
      { task: "Social media content calendar execution", status: "social" },
      { task: "Blog content production (4 posts/month)", status: "content" },
      { task: "Landing pages #3, #4, #5 development", status: "build" },
      { task: "Link building campaign initiation", status: "seo" },
    ],
    deliverables: ["All pages optimized", "Ads live & optimized", "8 blog posts published", "3 additional landing pages"],
    expectedResults: "First leads coming in, 50-100 leads",
  },
  {
    month: "Month 4-6",
    phase: "Scale & Optimize",
    color: "from-amber-500 to-orange-500",
    tasks: [
      { task: "AEO optimization & AI visibility push", status: "aeo" },
      { task: "Performance analysis & campaign optimization", status: "optimize" },
      { task: "Retargeting campaigns launch", status: "ads" },
      { task: "Video content production", status: "content" },
      { task: "PR & media outreach", status: "pr" },
      { task: "Conversion rate optimization", status: "optimize" },
    ],
    deliverables: ["AEO strategy implemented", "Retargeting live", "4 videos produced", "Media coverage secured"],
    expectedResults: "150-250 leads/month, rankings improving",
  },
  {
    month: "Month 7-9",
    phase: "Market Leadership",
    color: "from-green-500 to-emerald-500",
    tasks: [
      { task: "Advanced link building & authority development", status: "seo" },
      { task: "Influencer partnership campaigns", status: "social" },
      { task: "International targeting expansion", status: "ads" },
      { task: "WhatsApp marketing integration", status: "automation" },
      { task: "Lead nurturing automation", status: "automation" },
      { task: "Advanced analytics & attribution", status: "optimize" },
    ],
    deliverables: ["Domain authority increased", "Influencer campaigns live", "WhatsApp automation active", "Attribution model implemented"],
    expectedResults: "300-400 leads/month, top 5 rankings",
  },
  {
    month: "Month 10-12",
    phase: "Dominance & Expansion",
    color: "from-red-500 to-rose-500",
    tasks: [
      { task: "Market share expansion strategies", status: "strategy" },
      { task: "New platform exploration (TikTok, YouTube)", status: "social" },
      { task: "Advanced personalization implementation", status: "automation" },
      { task: "Comprehensive performance review", status: "optimize" },
      { task: "Year 2 strategy planning", status: "strategy" },
      { task: "ROI analysis & success documentation", status: "report" },
    ],
    deliverables: ["Market leader position", "Multi-platform presence", "Full automation suite", "Year 2 roadmap"],
    expectedResults: "400-600 leads/month, market leader status",
  },
];

const statusColors: Record<string, string> = {
  setup: "bg-blue-500/20 text-blue-400",
  research: "bg-purple-500/20 text-purple-400",
  strategy: "bg-amber-500/20 text-amber-400",
  build: "bg-cyan-500/20 text-cyan-400",
  seo: "bg-green-500/20 text-green-400",
  ads: "bg-red-500/20 text-red-400",
  social: "bg-pink-500/20 text-pink-400",
  content: "bg-orange-500/20 text-orange-400",
  aeo: "bg-violet-500/20 text-violet-400",
  optimize: "bg-emerald-500/20 text-emerald-400",
  pr: "bg-indigo-500/20 text-indigo-400",
  automation: "bg-teal-500/20 text-teal-400",
  report: "bg-slate-500/20 text-slate-400",
};

export default function TimelineSection() {
  const [activePhase, setActivePhase] = useState(0);

  return (
    <section id="timeline" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-amber-400 text-sm font-semibold uppercase tracking-widest mb-4">
            Project Timeline
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            12-Month Growth Roadmap
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            A phased approach to building Roca&apos;s digital dominance in the Dubai real estate market.
          </p>
        </div>

        {/* Timeline Navigation */}
        <div className="relative mb-12">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -translate-y-1/2 hidden lg:block" />
          <div className="flex flex-wrap lg:flex-nowrap justify-between gap-4">
            {phases.map((phase, i) => (
              <button
                key={i}
                onClick={() => setActivePhase(i)}
                className={`relative flex-1 min-w-[150px] p-4 rounded-2xl transition-all ${
                  activePhase === i
                    ? `bg-gradient-to-r ${phase.color} text-white shadow-lg`
                    : "bg-slate-800/50 text-slate-400 hover:text-white"
                }`}
              >
                <div className="text-xs uppercase tracking-widest mb-1 opacity-70">{phase.month}</div>
                <div className="font-semibold text-sm">{phase.phase}</div>
                {activePhase === i && (
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-current hidden lg:block" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Active Phase Details */}
        <div className={`rounded-3xl bg-gradient-to-br ${phases[activePhase].color} p-[1px]`}>
          <div className="rounded-3xl bg-slate-900 p-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Tasks */}
              <div>
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Key Tasks
                </h3>
                <div className="space-y-3">
                  {phases[activePhase].tasks.map((task, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50">
                      <div className={`px-2 py-1 rounded-lg text-xs font-medium ${statusColors[task.status]}`}>
                        {task.status.toUpperCase()}
                      </div>
                      <span className="text-slate-300 text-sm">{task.task}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deliverables & Results */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Deliverables
                  </h3>
                  <div className="space-y-2">
                    {phases[activePhase].deliverables.map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-400" />
                        <span className="text-slate-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`rounded-2xl bg-gradient-to-r ${phases[activePhase].color} p-[1px]`}>
                  <div className="rounded-2xl bg-slate-900 p-6 text-center">
                    <div className="text-sm text-slate-400 mb-2">Expected Results</div>
                    <div className="text-2xl font-bold text-white">{phases[activePhase].expectedResults}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Milestone Summary */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Month 3", milestone: "First 100 Leads", icon: "🎯" },
            { label: "Month 6", milestone: "Page 1 Rankings", icon: "📈" },
            { label: "Month 9", milestone: "300+ Leads/Month", icon: "🚀" },
            { label: "Month 12", milestone: "Market Leader", icon: "👑" },
          ].map((m, i) => (
            <div key={i} className="rounded-2xl bg-slate-800/30 border border-slate-700/50 p-6 text-center">
              <div className="text-3xl mb-2">{m.icon}</div>
              <div className="text-amber-400 text-sm font-medium mb-1">{m.label}</div>
              <div className="text-white font-bold">{m.milestone}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
