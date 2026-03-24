"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { PackageProvider } from "./context/PackageContext";
import HeroSection from "./components/HeroSection";
import ServicesSection from "./components/ServicesSection";
import SEOAuditSection from "./components/SEOAuditSection";
import LandingPagesSection from "./components/LandingPagesSection";
import PricingSection from "./components/PricingSection";
import TimelineSection from "./components/TimelineSection";
import ResultsSection from "./components/ResultsSection";
import WebSection from "./components/WebSection";

export default function RocaProposalPage() {
  const [activeSection, setActiveSection] = useState("hero");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<"main" | "web">("main");

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / scrollHeight) * 100;
      setScrollProgress(progress);

      const sections = ["hero", "services", "seo-audit", "landing-pages", "pricing", "timeline", "results"];
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom >= 150) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const navItems = [
    { id: "hero", label: "Overview" },
    { id: "services", label: "Services" },
    { id: "seo-audit", label: "SEO Audit" },
    { id: "landing-pages", label: "Landing Pages" },
    { id: "pricing", label: "Pricing" },
    { id: "timeline", label: "Timeline" },
    { id: "results", label: "Results" },
  ];

  return (
    <PackageProvider>
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Floating Nav - Only show on main tab */}
      {activeTab === "main" && (
        <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-40 hidden lg:flex items-center gap-1 rounded-full bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 px-2 py-2 shadow-2xl">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeSection === item.id
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}

      {/* Mobile Nav - Only show on main tab */}
      {activeTab === "main" && (
        <nav className="fixed bottom-4 left-2 right-2 z-40 lg:hidden rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 px-2 py-2 shadow-2xl">
          <div className="flex items-center justify-between gap-0.5">
            {navItems.slice(0, 5).map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`flex-1 px-1.5 py-2 rounded-lg text-[10px] font-medium text-center transition-all ${
                  activeSection === item.id
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                    : "text-slate-400"
                }`}
              >
                {item.label === "Landing Pages" ? "Pages" : item.label === "SEO Audit" ? "Audit" : item.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Header with Mutant Logo and Tab Switcher */}
      <header className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between">
        <div className="rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 px-4 py-3 shadow-2xl">
          <Image src="/logos/mutant-logo.avif" alt="Mutant" width={100} height={32} className="h-7 w-auto invert" />
        </div>
        
        {/* Main Tab Switcher */}
        <div className="rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 p-1.5 shadow-2xl flex gap-1">
          <button
            onClick={() => {
              setActiveTab("main");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "main"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            <span className="hidden sm:inline">Marketing</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("web");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "web"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <span className="hidden sm:inline">Website</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {activeTab === "main" ? (
          <>
            <HeroSection />
            <ServicesSection />
            <SEOAuditSection />
            <LandingPagesSection />
            <PricingSection />
            <TimelineSection />
            <ResultsSection />
          </>
        ) : (
          <WebSection />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center mb-4">
            <Image src="/logos/mutant-logo.avif" alt="Mutant" width={120} height={40} className="h-8 w-auto invert" />
          </div>
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Mutant Digital Agency. Prepared exclusively for Roca Real Estate.
          </p>
          <p className="text-slate-600 text-xs mt-2">
            This proposal is confidential and intended solely for the recipient.
          </p>
        </div>
      </footer>
    </div>
    </PackageProvider>
  );
}
