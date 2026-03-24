"use client";

import { useState } from "react";
import { usePackage } from "../context/PackageContext";

type ServiceKey = "seo" | "aeo" | "social" | "ppc" | "landing";

const services: { key: ServiceKey; name: string; color: string; icon: React.ReactNode }[] = [
  {
    key: "seo",
    name: "SEO",
    color: "from-green-500 to-emerald-500",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    key: "aeo",
    name: "AEO",
    color: "from-purple-500 to-pink-500",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key: "social",
    name: "Social Media",
    color: "from-pink-500 to-rose-500",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    ),
  },
  {
    key: "ppc",
    name: "PPC & Ads",
    color: "from-blue-500 to-cyan-500",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
      </svg>
    ),
  },
  {
    key: "landing",
    name: "Landing Pages",
    color: "from-amber-500 to-orange-500",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
];

interface TimelineItem {
  week: string;
  phase: "onboarding" | "implementation" | "optimization" | "scaling";
  tasks: { task: string; service: ServiceKey }[];
}

const timeline: TimelineItem[] = [
  {
    week: "Week 1-2",
    phase: "onboarding",
    tasks: [
      { task: "Kickoff meeting & project scope finalization", service: "seo" },
      { task: "Access credentials collection (GA4, GSC, CMS, hosting)", service: "seo" },
      { task: "Brand guidelines & asset collection", service: "social" },
      { task: "Google Ads & Meta Ads account setup/audit", service: "ppc" },
      { task: "Social media accounts audit & optimization", service: "social" },
      { task: "Competitor analysis deep dive", service: "seo" },
    ],
  },
  {
    week: "Week 3-4",
    phase: "onboarding",
    tasks: [
      { task: "Technical SEO audit completion", service: "seo" },
      { task: "Keyword research & mapping (200+ keywords)", service: "seo" },
      { task: "Content gap analysis vs competitors", service: "aeo" },
      { task: "Landing page wireframes & UX design", service: "landing" },
      { task: "Social media content strategy document", service: "social" },
      { task: "PPC campaign structure planning", service: "ppc" },
    ],
  },
  {
    week: "Week 5-6",
    phase: "implementation",
    tasks: [
      { task: "Technical SEO fixes implementation (crawl errors, speed)", service: "seo" },
      { task: "On-page SEO: meta tags, headings, schema markup", service: "seo" },
      { task: "Landing Page #1: Off-Plan Properties development", service: "landing" },
      { task: "Google Ads search campaigns launch", service: "ppc" },
      { task: "Social content calendar Month 1 execution", service: "social" },
      { task: "FAQ schema & structured data implementation", service: "aeo" },
    ],
  },
  {
    week: "Week 7-8",
    phase: "implementation",
    tasks: [
      { task: "Landing Page #2: Luxury Villas development", service: "landing" },
      { task: "Local SEO: Google Business Profile optimization", service: "seo" },
      { task: "Meta Ads (Facebook/Instagram) campaigns launch", service: "ppc" },
      { task: "Blog content production: 4 SEO-optimized articles", service: "seo" },
      { task: "Entity-based content architecture for AI", service: "aeo" },
      { task: "Reels & video content production begins", service: "social" },
    ],
  },
  {
    week: "Week 9-10",
    phase: "implementation",
    tasks: [
      { task: "Landing Page #3: Investment Calculator development", service: "landing" },
      { task: "Internal linking structure optimization", service: "seo" },
      { task: "Retargeting campaigns setup", service: "ppc" },
      { task: "Link building campaign launch (guest posts, PR)", service: "seo" },
      { task: "AI citation building & knowledge graph optimization", service: "aeo" },
      { task: "Influencer outreach & partnership negotiations", service: "social" },
    ],
  },
  {
    week: "Week 11-12",
    phase: "optimization",
    tasks: [
      { task: "Landing Page #4: International Investor Guide", service: "landing" },
      { task: "Performance analysis & A/B testing", service: "ppc" },
      { task: "Content optimization based on ranking data", service: "seo" },
      { task: "Month 1 reporting & strategy refinement", service: "seo" },
      { task: "Social media engagement analysis & optimization", service: "social" },
      { task: "AEO performance tracking (AI Overview appearances)", service: "aeo" },
    ],
  },
  {
    week: "Month 4",
    phase: "optimization",
    tasks: [
      { task: "Landing Pages #5-6: Area-specific pages (Marina, Downtown)", service: "landing" },
      { task: "Advanced keyword targeting expansion", service: "seo" },
      { task: "Campaign scaling based on top performers", service: "ppc" },
      { task: "Video content scaling (property tours, market updates)", service: "social" },
      { task: "Featured snippet optimization", service: "aeo" },
      { task: "Conversion rate optimization (CRO)", service: "landing" },
    ],
  },
  {
    week: "Month 5",
    phase: "optimization",
    tasks: [
      { task: "Landing Pages #7-8: Area-specific pages (JBR, Palm)", service: "landing" },
      { task: "Authority building: high-DA backlinks", service: "seo" },
      { task: "YouTube Ads & TikTok exploration", service: "ppc" },
      { task: "Influencer campaign execution", service: "social" },
      { task: "Conversational content for voice search", service: "aeo" },
      { task: "Lead nurturing automation setup", service: "landing" },
    ],
  },
  {
    week: "Month 6",
    phase: "scaling",
    tasks: [
      { task: "Landing Pages #9-10: Developer-specific pages", service: "landing" },
      { task: "International SEO expansion (UK, India, Russia)", service: "seo" },
      { task: "Budget scaling for top-performing campaigns", service: "ppc" },
      { task: "WhatsApp Business integration", service: "social" },
      { task: "AI visibility monitoring & optimization", service: "aeo" },
      { task: "Q2 comprehensive review & Q3 planning", service: "seo" },
    ],
  },
  {
    week: "Month 7-9",
    phase: "scaling",
    tasks: [
      { task: "Advanced personalization & dynamic content", service: "landing" },
      { task: "Competitor displacement strategies", service: "seo" },
      { task: "Performance Max campaigns launch", service: "ppc" },
      { task: "Community building & UGC campaigns", service: "social" },
      { task: "Multilingual AI content optimization", service: "aeo" },
      { task: "Attribution modeling & ROI tracking", service: "ppc" },
    ],
  },
  {
    week: "Month 10-12",
    phase: "scaling",
    tasks: [
      { task: "Full automation suite deployment", service: "landing" },
      { task: "Market leader positioning strategies", service: "seo" },
      { task: "Full-funnel advertising optimization", service: "ppc" },
      { task: "Brand ambassador program launch", service: "social" },
      { task: "Year 1 performance analysis", service: "seo" },
      { task: "Year 2 strategy development", service: "aeo" },
    ],
  },
];

const phaseColors = {
  onboarding: { bg: "bg-blue-500/20", border: "border-blue-500/50", text: "text-blue-400", label: "Onboarding" },
  implementation: { bg: "bg-green-500/20", border: "border-green-500/50", text: "text-green-400", label: "Implementation" },
  optimization: { bg: "bg-amber-500/20", border: "border-amber-500/50", text: "text-amber-400", label: "Optimization" },
  scaling: { bg: "bg-purple-500/20", border: "border-purple-500/50", text: "text-purple-400", label: "Scaling" },
};

export default function TimelineSection() {
  const [activeWeek, setActiveWeek] = useState(0);
  const [filterService, setFilterService] = useState<ServiceKey | "all">("all");
  const { packageData } = usePackage();

  // Filter services based on selected package
  const includedServices: ServiceKey[] = [
    ...(packageData.seoIncluded ? ["seo" as ServiceKey] : []),
    ...(packageData.aeoIncluded ? ["aeo" as ServiceKey] : []),
    ...(packageData.socialIncluded ? ["social" as ServiceKey] : []),
    ...(packageData.ppcIncluded ? ["ppc" as ServiceKey] : []),
    ...(packageData.landingPages > 0 ? ["landing" as ServiceKey] : []),
  ];

  // Filter timeline based on package services
  const packageTimeline = timeline.map(week => ({
    ...week,
    tasks: week.tasks.filter(task => includedServices.includes(task.service))
  }));

  // Adjust landing page tasks based on package
  const adjustedTimeline = packageTimeline.map(week => ({
    ...week,
    tasks: week.tasks.map(task => {
      if (task.service === "landing" && task.task.includes("Landing Page")) {
        const lpNum = parseInt(task.task.match(/Landing Page[s]? #(\d+)/)?.[1] || "0");
        if (lpNum > packageData.landingPages) {
          return null;
        }
      }
      return task;
    }).filter(Boolean) as typeof week.tasks
  }));

  const filteredTasks = filterService === "all" 
    ? adjustedTimeline[activeWeek].tasks 
    : adjustedTimeline[activeWeek].tasks.filter(t => t.service === filterService);

  const availableServices = services.filter(s => includedServices.includes(s.key));

  const getServiceInfo = (key: ServiceKey) => services.find(s => s.key === key)!;

  return (
    <section id="timeline" className="py-12 sm:py-16 lg:py-24 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-12">
          <span className="inline-block text-amber-400 text-xs sm:text-sm font-semibold uppercase tracking-widest mb-3 sm:mb-4">
            {packageData.name} Timeline
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
            Implementation Roadmap
          </h2>
          <p className="text-slate-400 text-sm sm:text-base lg:text-lg max-w-3xl mx-auto px-2">
            Week-by-week breakdown for <span className="text-amber-400 font-medium">{packageData.name}</span> package: 
            {includedServices.length} services, {packageData.landingPages} landing pages, results in {packageData.timeToResults}.
          </p>
        </div>

        {/* Phase Legend */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-6 sm:mb-8">
          {Object.entries(phaseColors).map(([key, value]) => (
            <div key={key} className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full ${value.bg} border ${value.border}`}>
              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${value.text.replace("text-", "bg-")}`} />
              <span className={`text-xs sm:text-sm font-medium ${value.text}`}>{value.label}</span>
            </div>
          ))}
        </div>

        {/* Service Filter */}
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-6 sm:mb-8">
          <button
            onClick={() => setFilterService("all")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
              filterService === "all"
                ? "bg-white text-slate-900"
                : "bg-slate-800/50 text-slate-400 hover:text-white"
            }`}
          >
            All
          </button>
          {availableServices.map((service) => (
            <button
              key={service.key}
              onClick={() => setFilterService(service.key)}
              className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
                filterService === service.key
                  ? `bg-gradient-to-r ${service.color} text-white`
                  : "bg-slate-800/50 text-slate-400 hover:text-white"
              }`}
            >
              <span className="hidden sm:inline">{service.icon}</span>
              <span className="sm:hidden text-[10px]">{service.key.toUpperCase()}</span>
              <span className="hidden sm:inline">{service.name}</span>
            </button>
          ))}
        </div>

        {/* Timeline Navigation */}
        <div className="relative mb-6 sm:mb-8 overflow-x-auto pb-2 sm:pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-1.5 sm:gap-2 min-w-max">
            {adjustedTimeline.map((item, i) => {
              const phase = phaseColors[item.phase];
              const taskCount = item.tasks.length;
              return (
                <button
                  key={i}
                  onClick={() => setActiveWeek(i)}
                  className={`relative px-2.5 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all min-w-[70px] sm:min-w-[100px] ${
                    activeWeek === i
                      ? `${phase.bg} border-2 ${phase.border} ${phase.text}`
                      : taskCount === 0 
                        ? "bg-slate-800/20 border border-slate-800 text-slate-600"
                        : "bg-slate-800/30 border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600"
                  }`}
                  disabled={taskCount === 0}
                >
                  <div className="text-[10px] sm:text-xs font-bold">{item.week}</div>
                  <div className={`text-[8px] sm:text-[10px] uppercase tracking-wider mt-0.5 sm:mt-1 ${activeWeek === i ? phase.text : "text-slate-500"}`}>
                    {taskCount > 0 ? item.phase.slice(0, 3) : "—"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Week Details */}
        <div className={`rounded-2xl sm:rounded-3xl ${phaseColors[adjustedTimeline[activeWeek].phase].bg} border ${phaseColors[adjustedTimeline[activeWeek].phase].border} p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8`}>
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">{adjustedTimeline[activeWeek].week}</h3>
              <span className={`text-xs sm:text-sm font-medium ${phaseColors[adjustedTimeline[activeWeek].phase].text}`}>
                {phaseColors[adjustedTimeline[activeWeek].phase].label} Phase
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs sm:text-sm">{filteredTasks.length} tasks</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredTasks.map((task, i) => {
              const service = getServiceInfo(task.service);
              return (
                <div
                  key={i}
                  className="rounded-lg sm:rounded-xl bg-slate-900/80 border border-slate-700/50 p-3 sm:p-4 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-r ${service.color} flex items-center justify-center text-white flex-shrink-0`}>
                      {service.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[10px] sm:text-xs font-medium bg-gradient-to-r ${service.color} bg-clip-text text-transparent mb-0.5 sm:mb-1`}>
                        {service.name}
                      </div>
                      <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">{task.task}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gantt-style Overview - Hidden on mobile, shown on tablet+ */}
        <div className="hidden sm:block rounded-2xl sm:rounded-3xl bg-slate-800/30 border border-slate-700/50 p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-4 sm:mb-6">Service Implementation Timeline</h3>
          <div className="space-y-3 sm:space-y-4">
            {availableServices.map((service) => (
              <div key={service.key} className="flex items-center gap-2 sm:gap-4">
                <div className="w-24 sm:w-32 flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r ${service.color} flex items-center justify-center text-white`}>
                    {service.icon}
                  </div>
                  <span className="text-white text-xs sm:text-sm font-medium truncate">{service.name}</span>
                </div>
                <div className="flex-1 flex gap-0.5 sm:gap-1">
                  {adjustedTimeline.map((week, i) => {
                    const hasTask = week.tasks.some(t => t.service === service.key);
                    return (
                      <div
                        key={i}
                        onClick={() => hasTask && setActiveWeek(i)}
                        className={`flex-1 h-6 sm:h-8 rounded transition-all ${
                          hasTask
                            ? `bg-gradient-to-r ${service.color} opacity-80 hover:opacity-100 cursor-pointer`
                            : "bg-slate-800/50"
                        } ${activeWeek === i ? "ring-2 ring-white" : ""}`}
                        title={`${week.week}: ${week.tasks.filter(t => t.service === service.key).length} tasks`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3 sm:mt-4 text-[10px] sm:text-xs text-slate-500">
            <span>Week 1</span>
            <span>Month 3</span>
            <span>Month 6</span>
            <span>Month 9</span>
            <span>Month 12</span>
          </div>
        </div>

        {/* Mobile Gantt Alternative - Compact service summary */}
        <div className="sm:hidden rounded-2xl bg-slate-800/30 border border-slate-700/50 p-4 mb-6">
          <h3 className="text-base font-bold text-white mb-4">Service Timeline</h3>
          <div className="space-y-3">
            {availableServices.map((service) => {
              const taskCount = adjustedTimeline.reduce((acc, week) => 
                acc + week.tasks.filter(t => t.service === service.key).length, 0
              );
              return (
                <div key={service.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg bg-gradient-to-r ${service.color} flex items-center justify-center text-white`}>
                      {service.icon}
                    </div>
                    <span className="text-white text-xs font-medium">{service.name}</span>
                  </div>
                  <span className="text-slate-400 text-xs">{taskCount} tasks</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Key Milestones */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[
            { week: "Week 4", milestone: "Onboarding Complete", desc: "All audits, strategies & access ready", color: "from-blue-500 to-cyan-500" },
            { week: "Month 3", milestone: "Implementation Done", desc: "All services live & generating leads", color: "from-green-500 to-emerald-500" },
            { week: "Month 6", milestone: "Optimization Peak", desc: "90+ keywords Page 1, 3,800+ traffic", color: "from-amber-500 to-orange-500" },
            { week: "Month 12", milestone: "Market Leadership", desc: "12,500+ traffic, full automation", color: "from-purple-500 to-pink-500" },
          ].map((m, i) => (
            <div key={i} className={`rounded-xl sm:rounded-2xl bg-gradient-to-br ${m.color} p-[1px]`}>
              <div className="rounded-xl sm:rounded-2xl bg-slate-900 p-3 sm:p-5 h-full">
                <div className="text-amber-400 text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1">{m.week}</div>
                <div className="text-white font-bold text-xs sm:text-base mb-1 sm:mb-2">{m.milestone}</div>
                <div className="text-slate-400 text-[10px] sm:text-xs leading-relaxed">{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
