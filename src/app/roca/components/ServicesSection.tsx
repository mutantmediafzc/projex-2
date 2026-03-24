"use client";

import { useState } from "react";

const services = [
  {
    id: "seo",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: "Search Engine Optimization",
    subtitle: "Dominate Google Rankings",
    description: "Comprehensive SEO strategy to rank Roca for high-intent keywords like 'Dubai luxury apartments', 'off-plan properties Dubai', and 'Dubai real estate investment'.",
    features: [
      "Technical SEO audit & fixes",
      "On-page optimization for 50+ pages",
      "Local SEO for Dubai market",
      "Link building & authority development",
      "Content strategy & blog optimization",
      "Monthly ranking reports",
    ],
    results: "Expected: Page 1 rankings for 30+ keywords within 6 months",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "aeo",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-2.498.47a1.812 1.812 0 01-2.11-1.474l-.377-2.825m0 0l-.463-3.478a.75.75 0 00-.893-.625l-2.826.377a1.812 1.812 0 01-1.474-2.11l.47-2.498c.293-1.717 2.38-2.299 3.611-1.067L12 8.5" />
      </svg>
    ),
    title: "Answer Engine Optimization",
    subtitle: "AI-First Visibility",
    description: "Position Roca as the authoritative source for Dubai real estate queries in ChatGPT, Google AI Overview, Perplexity, and other AI search engines.",
    features: [
      "Entity-based content architecture",
      "FAQ schema implementation",
      "Conversational content optimization",
      "AI citation building",
      "Knowledge graph optimization",
      "Featured snippet targeting",
    ],
    results: "Expected: 40%+ AI Overview appearances within 4 months",
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "social",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
      </svg>
    ),
    title: "Social Media Marketing",
    subtitle: "Build Trust & Authority",
    description: "Strategic social presence across Instagram, LinkedIn, TikTok, and YouTube to showcase properties, build brand awareness, and generate qualified investor leads.",
    features: [
      "Content calendar & strategy",
      "20 posts/month across platforms",
      "Reels & video production",
      "Community management",
      "Influencer partnerships",
      "Paid social campaigns",
    ],
    results: "Expected: 10K+ followers & 500+ leads within 6 months",
    color: "from-orange-500 to-red-500",
  },
  {
    id: "ppc",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
      </svg>
    ),
    title: "Performance Marketing",
    subtitle: "Paid Ads & Lead Gen",
    description: "Data-driven Google Ads and Meta Ads campaigns targeting high-net-worth individuals interested in Dubai property investment with measurable ROI.",
    features: [
      "Google Search & Display ads",
      "Meta (Facebook/Instagram) ads",
      "Retargeting campaigns",
      "A/B testing & optimization",
      "Conversion tracking setup",
      "Weekly performance reports",
    ],
    results: "Expected: 200+ qualified leads/month at <AED 150 CPL",
    color: "from-green-500 to-emerald-500",
  },
];

export default function ServicesSection() {
  const [activeService, setActiveService] = useState("seo");
  const active = services.find((s) => s.id === activeService) || services[0];

  return (
    <section id="services" className="py-24 px-6 relative">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-amber-400 text-sm font-semibold uppercase tracking-widest mb-4">
            Our Services
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Comprehensive 360° Digital Solutions
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            An integrated approach combining SEO, AEO, Social Media, and Performance Marketing to maximize Roca&apos;s digital presence and lead generation.
          </p>
        </div>

        {/* Service Tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => setActiveService(service.id)}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                activeService === service.id
                  ? `bg-gradient-to-r ${service.color} text-white shadow-lg`
                  : "bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {service.title.split(" ")[0]}
            </button>
          ))}
        </div>

        {/* Active Service Detail */}
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left: Info */}
          <div className="order-2 lg:order-1">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${active.color} text-white mb-6`}>
              {active.icon}
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">{active.title}</h3>
            <p className={`text-lg font-medium bg-gradient-to-r ${active.color} bg-clip-text text-transparent mb-4`}>
              {active.subtitle}
            </p>
            <p className="text-slate-400 text-lg mb-8">{active.description}</p>

            <div className="space-y-3 mb-8">
              {active.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full bg-gradient-to-r ${active.color} flex items-center justify-center flex-shrink-0`}>
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-300">{feature}</span>
                </div>
              ))}
            </div>

            <div className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r ${active.color} bg-opacity-10 border border-current/20 px-4 py-3`}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-white font-medium">{active.results}</span>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="order-1 lg:order-2">
            <div className={`relative rounded-3xl bg-gradient-to-br ${active.color} p-[1px] overflow-hidden`}>
              <div className="rounded-3xl bg-slate-900 p-8">
                <div className="aspect-square rounded-2xl bg-slate-800/50 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                  <div className={`w-32 h-32 rounded-3xl bg-gradient-to-r ${active.color} flex items-center justify-center shadow-2xl`}>
                    <div className="scale-150 text-white">{active.icon}</div>
                  </div>
                  {/* Decorative elements */}
                  <div className="absolute top-4 left-4 w-20 h-20 rounded-xl bg-white/5" />
                  <div className="absolute bottom-4 right-4 w-16 h-16 rounded-full bg-white/5" />
                  <div className="absolute top-1/2 right-8 w-2 h-24 rounded-full bg-white/10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
