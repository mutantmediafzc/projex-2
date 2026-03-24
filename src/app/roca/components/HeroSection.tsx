"use client";

import Image from "next/image";

export default function HeroSection() {
  return (
    <section id="hero" className="min-h-screen flex items-center justify-center px-6 py-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="max-w-5xl mx-auto text-center relative z-10">
        {/* Client Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-800/50 border border-slate-700/50 px-4 py-2 mb-8 backdrop-blur-sm">
          <span className="text-amber-400 text-sm font-medium">Prepared for</span>
          <span className="text-white font-bold">Roca Real Estate</span>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
          360° Digital Growth
          <br />
          <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
            Strategy & Proposal
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto mb-12 leading-relaxed">
          A comprehensive digital marketing solution designed to position Roca Real Estate as Dubai&apos;s premier luxury property investment partner, driving qualified leads and maximizing ROI through SEO, AEO, Social Media, and targeted landing pages.
        </p>

        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
          {[
            { value: "6-12", label: "Month Timeline", suffix: "" },
            { value: "300", label: "Expected Traffic Growth", suffix: "%" },
            { value: "5x", label: "Lead Generation", suffix: "" },
            { value: "24/7", label: "AI Visibility", suffix: "" },
          ].map((stat, i) => (
            <div key={i} className="rounded-2xl bg-slate-800/30 border border-slate-700/30 p-6 backdrop-blur-sm">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                {stat.value}{stat.suffix}
              </div>
              <div className="text-slate-400 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#pricing"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-4 text-lg font-semibold text-white shadow-2xl shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 hover:scale-105"
          >
            View Pricing
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <a
            href="#services"
            className="inline-flex items-center gap-2 rounded-full border border-slate-600 px-8 py-4 text-lg font-medium text-white hover:bg-slate-800 transition-all"
          >
            Explore Services
          </a>
        </div>
      </div>

      {/* Scroll Indicator - positioned relative to section, not content */}
      <button
        onClick={() => {
          const servicesSection = document.getElementById("services");
          if (servicesSection) {
            servicesSection.scrollIntoView({ behavior: "smooth" });
          }
        }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce cursor-pointer z-20 hover:scale-110 transition-transform"
        aria-label="Scroll to services section"
      >
        <span className="text-slate-500 text-xs uppercase tracking-widest">Scroll to explore</span>
        <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>
    </section>
  );
}
