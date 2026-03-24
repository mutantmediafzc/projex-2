"use client";

import { useState } from "react";
import Image from "next/image";

const services = [
  {
    id: "seo",
    gif: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDZhd2NkbmN1N2gzaG81ZmZwbGN0MjRnaG9sajhicW5wcTZnd3ZtayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/SvckSy7fFviqrq8ClF/giphy.gif",
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
    gif: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExYWoyODE0NG94aDV6OTNjajFvZ20xNGY5b2F3d3llZHhsaWJoOGZvdSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Sgt2De5Akb97E7QC5J/giphy.gif",
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
    gif: "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTdobTNwbDRtODd2eWo4emN0YTZsMmtiaXg4OGp6bjlycmduZG9mYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/XyJPNKBskIDWR3Md8K/giphy.gif",
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
    gif: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExd3pvbm04dmZ4c3QxZGwxZ3hkbHl0OTcwb2ZsMmZobndweTk3aG9vZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/anjQ3PkRSxPb67QTBz/giphy.gif",
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
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${active.color} overflow-hidden mb-6`}>
              <img src={active.gif} alt={active.title} className="w-full h-full object-cover" />
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
              <div className="rounded-3xl bg-slate-900 p-4 sm:p-8">
                <div className="aspect-square rounded-2xl bg-slate-800/50 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                  <img 
                    src={active.gif} 
                    alt={active.title} 
                    className="w-full h-full object-contain p-4 sm:p-8"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
