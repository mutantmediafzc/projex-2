"use client";

import { useState } from "react";
import { usePackage, PackageId } from "../context/PackageContext";

const packages = [
  {
    id: "starter",
    name: "Growth Starter",
    description: "Essential digital presence for emerging real estate brands",
    monthlyPrice: 15000,
    features: [
      { name: "SEO Optimization", included: true, detail: "Basic on-page SEO" },
      { name: "Social Media", included: true, detail: "2 platforms, 12 posts/month" },
      { name: "Google Ads Management", included: true, detail: "Up to AED 5,000 ad spend" },
      { name: "Landing Pages", included: true, detail: "2 custom pages" },
      { name: "AEO Optimization", included: false },
      { name: "Content Marketing", included: false },
      { name: "Video Production", included: false },
      { name: "Dedicated Account Manager", included: false },
    ],
    results: "50-80 leads/month",
    timeline: "3-4 months to results",
    highlight: false,
  },
  {
    id: "professional",
    name: "Professional",
    description: "Comprehensive solution for established real estate agencies",
    monthlyPrice: 28000,
    features: [
      { name: "SEO Optimization", included: true, detail: "Full technical + on-page SEO" },
      { name: "Social Media", included: true, detail: "4 platforms, 20 posts/month" },
      { name: "Google Ads Management", included: true, detail: "Up to AED 15,000 ad spend" },
      { name: "Landing Pages", included: true, detail: "5 custom pages" },
      { name: "AEO Optimization", included: true, detail: "AI search visibility" },
      { name: "Content Marketing", included: true, detail: "4 blog posts/month" },
      { name: "Video Production", included: false },
      { name: "Dedicated Account Manager", included: true },
    ],
    results: "150-250 leads/month",
    timeline: "2-3 months to results",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise 360°",
    description: "Full-service digital dominance for market leaders",
    monthlyPrice: 45000,
    features: [
      { name: "SEO Optimization", included: true, detail: "Enterprise SEO + link building" },
      { name: "Social Media", included: true, detail: "All platforms, 30+ posts/month" },
      { name: "Google Ads Management", included: true, detail: "Unlimited ad spend management" },
      { name: "Landing Pages", included: true, detail: "10+ custom pages" },
      { name: "AEO Optimization", included: true, detail: "Full AI visibility strategy" },
      { name: "Content Marketing", included: true, detail: "8 blog posts + PR" },
      { name: "Video Production", included: true, detail: "4 videos/month" },
      { name: "Dedicated Account Manager", included: true, detail: "Senior strategist" },
    ],
    results: "400-600 leads/month",
    timeline: "1-2 months to results",
    highlight: false,
  },
];

const addOns = [
  { name: "Additional Landing Page", price: 3500, unit: "per page" },
  { name: "Video Production", price: 5000, unit: "per video" },
  { name: "Influencer Campaign", price: 8000, unit: "per campaign" },
  { name: "PR & Media Coverage", price: 12000, unit: "per month" },
  { name: "WhatsApp Marketing Setup", price: 6000, unit: "one-time" },
  { name: "Ren CRM Integration", price: 4500, unit: "one-time" },
];

export default function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly">("monthly");
  const { selectedPackage, setSelectedPackage } = usePackage();
  const discount = billingCycle === "quarterly" ? 0.1 : 0;

  const handleSelectPackage = (pkgId: string) => {
    setSelectedPackage(pkgId as PackageId);
    // Scroll to results section to show dynamic data
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="pricing" className="py-24 px-6 bg-slate-900/50">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-amber-400 text-sm font-semibold uppercase tracking-widest mb-4">
            Investment & Pricing
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Transparent Retainer Packages
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
            Flexible packages designed to match your growth ambitions. All prices in AED with no hidden fees.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 rounded-full bg-slate-800/50 p-2">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-amber-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("quarterly")}
              className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${
                billingCycle === "quarterly"
                  ? "bg-amber-500 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Quarterly
              <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
                Save 10%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-6 mb-16">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative rounded-3xl overflow-hidden ${
                pkg.highlight
                  ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50"
                  : "bg-slate-800/30 border border-slate-700/50"
              }`}
            >
              {pkg.highlight && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-center py-2 text-sm font-bold text-white">
                  RECOMMENDED FOR ROCA
                </div>
              )}

              <div className={`p-8 ${pkg.highlight ? "pt-14" : ""}`}>
                <h3 className="text-2xl font-bold text-white mb-2">{pkg.name}</h3>
                <p className="text-slate-400 text-sm mb-6">{pkg.description}</p>

                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">
                      AED {Math.round(pkg.monthlyPrice * (1 - discount)).toLocaleString()}
                    </span>
                    <span className="text-slate-400">/month</span>
                  </div>
                  {discount > 0 && (
                    <div className="text-green-400 text-sm mt-1">
                      Save AED {Math.round(pkg.monthlyPrice * discount * 3).toLocaleString()} quarterly
                    </div>
                  )}
                </div>

                <div className="space-y-3 mb-8">
                  {pkg.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      {feature.included ? (
                        <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <div>
                        <span className={feature.included ? "text-white" : "text-slate-500"}>
                          {feature.name}
                        </span>
                        {feature.included && feature.detail && (
                          <p className="text-slate-400 text-xs">{feature.detail}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 p-4 rounded-xl bg-slate-800/50">
                  <div>
                    <div className="text-green-400 font-bold">{pkg.results}</div>
                    <div className="text-slate-500 text-xs">Expected Results</div>
                  </div>
                  <div>
                    <div className="text-amber-400 font-bold">{pkg.timeline}</div>
                    <div className="text-slate-500 text-xs">Time to Results</div>
                  </div>
                </div>

                <button
                  onClick={() => handleSelectPackage(pkg.id)}
                  className={`w-full block text-center py-3 rounded-xl font-semibold transition-all ${
                    selectedPackage === pkg.id
                      ? "bg-green-500 text-white ring-2 ring-green-400"
                      : pkg.highlight
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-500/25"
                        : "bg-slate-700 text-white hover:bg-slate-600"
                  }`}
                >
                  {selectedPackage === pkg.id ? "✓ Selected" : "Choose Package"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add-Ons */}
        <div className="rounded-3xl bg-slate-800/30 border border-slate-700/50 p-8">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">Optional Add-Ons</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {addOns.map((addon, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50">
                <div>
                  <div className="text-white font-medium">{addon.name}</div>
                  <div className="text-slate-500 text-xs">{addon.unit}</div>
                </div>
                <div className="text-amber-400 font-bold">AED {addon.price.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Terms */}
        <div className="mt-12 text-center text-slate-400 text-sm">
          <p>All packages require a 3-month minimum commitment. Setup fee of AED 5,000 applies to all new accounts.</p>
          <p className="mt-2">Ad spend budget is separate and billed directly by platforms (Google, Meta).</p>
        </div>
      </div>
    </section>
  );
}
