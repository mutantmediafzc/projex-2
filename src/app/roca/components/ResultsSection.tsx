"use client";

import { useState } from "react";
import { usePackage, packageDataMap, PackageId } from "../context/PackageContext";

// Traffic data scales based on package
const getTrafficData = (packageId: PackageId) => {
  const pkg = packageDataMap[packageId];
  const scale = {
    starter: 0.35,
    professional: 0.75,
    enterprise: 1.0,
  }[packageId];

  const baseData = [
    { month: "Current", organic: 450, paid: 200, direct: 150, referral: 80 },
    { month: "Month 1", organic: 620, paid: 350, direct: 180, referral: 120 },
    { month: "Month 2", organic: 890, paid: 500, direct: 220, referral: 180 },
    { month: "Month 3", organic: 1350, paid: 650, direct: 280, referral: 250 },
    { month: "Month 4", organic: 1980, paid: 750, direct: 350, referral: 340 },
    { month: "Month 5", organic: 2750, paid: 800, direct: 420, referral: 450 },
    { month: "Month 6", organic: 3800, paid: 850, direct: 520, referral: 580 },
    { month: "Month 7", organic: 4950, paid: 900, direct: 640, referral: 720 },
    { month: "Month 8", organic: 6200, paid: 950, direct: 780, referral: 880 },
    { month: "Month 9", organic: 7600, paid: 1000, direct: 940, referral: 1050 },
    { month: "Month 10", organic: 9100, paid: 1050, direct: 1120, referral: 1240 },
    { month: "Month 11", organic: 10700, paid: 1100, direct: 1320, referral: 1450 },
    { month: "Month 12", organic: 12500, paid: 1150, direct: 1540, referral: 1680 },
  ];

  return baseData.map((d, i) => ({
    ...d,
    organic: i === 0 ? d.organic : Math.round(d.organic * scale),
    paid: i === 0 ? d.paid : Math.round(d.paid * scale),
    direct: i === 0 ? d.direct : Math.round(d.direct * scale),
    referral: i === 0 ? d.referral : Math.round(d.referral * scale),
    total: i === 0 
      ? d.organic + d.paid + d.direct + d.referral 
      : Math.round((d.organic + d.paid + d.direct + d.referral) * scale),
  }));
};

const kpis = [
  {
    metric: "Organic Traffic Growth",
    current: "450/month",
    month6: "3,800/month",
    month12: "12,500/month",
    growth: "+2,678%",
    benchmark: "Industry avg: 220% in 6 months",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    metric: "Qualified Property Inquiries",
    current: "~15/month",
    month6: "120-180/month",
    month12: "300-400/month",
    growth: "+180%",
    benchmark: "Based on 3-5% conversion rate",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    metric: "Page 1 Keywords",
    current: "~28",
    month6: "90+",
    month12: "180+",
    growth: "+543%",
    benchmark: "90+ high-intent keywords typical",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    metric: "Local Search Visibility",
    current: "Limited",
    month6: "+120%",
    month12: "+160%",
    growth: "+160%",
    benchmark: "Google Maps & local pack",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    metric: "Domain Authority",
    current: "18",
    month6: "32-38",
    month12: "45-55",
    growth: "+150%",
    benchmark: "Competitor avg: 45-60",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    metric: "AI Search Visibility",
    current: "0%",
    month6: "15-25%",
    month12: "35-45%",
    growth: "New Channel",
    benchmark: "ChatGPT, Perplexity, Google AI",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

const marketContext = {
  dubaiTransactions2025: "AED 917 billion",
  totalDeals: "270,000+",
  yoyGrowth: "20%",
  googleMarketShare: "96%",
  internetPenetration: "99%",
};

export default function ResultsSection() {
  const [activeMetric, setActiveMetric] = useState<"organic" | "total">("total");
  const { selectedPackage, packageData } = usePackage();
  
  const trafficData = getTrafficData(selectedPackage);
  const maxTraffic = Math.max(...trafficData.map((t) => t.total));

  // Dynamic KPIs based on selected package
  const dynamicKpis = [
    {
      metric: "Organic Traffic Growth",
      current: "450/month",
      month6: `${packageData.organicMonth6.toLocaleString()}/month`,
      month12: `${packageData.organicMonth12.toLocaleString()}/month`,
      growth: `+${Math.round((packageData.organicMonth12 / 450 - 1) * 100)}%`,
      benchmark: "Industry avg: 220% in 6 months",
      icon: kpis[0].icon,
    },
    {
      metric: "Qualified Property Inquiries",
      current: "~15/month",
      month6: `${Math.round(parseInt(packageData.leadsPerMonth.split("-")[0]) * 0.5)}-${Math.round(parseInt(packageData.leadsPerMonth.split("-")[1]) * 0.6)}/month`,
      month12: `${packageData.leadsPerMonth}/month`,
      growth: `+${Math.round((parseInt(packageData.leadsPerMonth.split("-")[1]) / 15 - 1) * 100)}%`,
      benchmark: "Based on 3-5% conversion rate",
      icon: kpis[1].icon,
    },
    {
      metric: "Page 1 Keywords",
      current: "~28",
      month6: `${packageData.keywordsPage1Month6}+`,
      month12: `${packageData.keywordsPage1Month12}+`,
      growth: `+${Math.round((packageData.keywordsPage1Month12 / 28 - 1) * 100)}%`,
      benchmark: `${packageData.keywordsPage1Month6}+ high-intent keywords typical`,
      icon: kpis[2].icon,
    },
    {
      metric: "Local Search Visibility",
      current: "Limited",
      month6: packageData.id === "starter" ? "+80%" : packageData.id === "professional" ? "+120%" : "+160%",
      month12: packageData.id === "starter" ? "+100%" : packageData.id === "professional" ? "+140%" : "+160%",
      growth: packageData.id === "starter" ? "+100%" : packageData.id === "professional" ? "+140%" : "+160%",
      benchmark: "Google Maps & local pack",
      icon: kpis[3].icon,
    },
    {
      metric: "Domain Authority",
      current: "18",
      month6: packageData.id === "starter" ? "25-30" : packageData.id === "professional" ? "32-38" : "35-42",
      month12: packageData.domainAuthorityMonth12,
      growth: `+${Math.round((parseInt(packageData.domainAuthorityMonth12.split("-")[0]) / 18 - 1) * 100)}%`,
      benchmark: "Competitor avg: 45-60",
      icon: kpis[4].icon,
    },
    {
      metric: "AI Search Visibility",
      current: "0%",
      month6: packageData.aeoIncluded ? (packageData.id === "professional" ? "10-18%" : "15-25%") : "N/A",
      month12: packageData.aeoIncluded ? packageData.aiVisibilityMonth12 : "N/A (not included)",
      growth: packageData.aeoIncluded ? "New Channel" : "Add AEO",
      benchmark: packageData.aeoIncluded ? "ChatGPT, Perplexity, Google AI" : "Upgrade for AI visibility",
      icon: kpis[5].icon,
    },
  ];

  const trafficSources = [
    { key: "organic", label: "Organic Search", color: "from-green-500 to-emerald-500" },
    { key: "paid", label: "Paid Ads", color: "from-blue-500 to-cyan-500" },
    { key: "direct", label: "Direct", color: "from-purple-500 to-pink-500" },
    { key: "referral", label: "Referral", color: "from-amber-500 to-orange-500" },
  ];

  return (
    <section id="results" className="py-12 sm:py-16 lg:py-24 px-4 sm:px-6 bg-slate-900/50">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-12">
          <span className="inline-block text-amber-400 text-xs sm:text-sm font-semibold uppercase tracking-widest mb-3 sm:mb-4">
            {packageData.name} Package Projections
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
            Expected Traffic & Growth
          </h2>
          <p className="text-slate-400 text-sm sm:text-base lg:text-lg max-w-3xl mx-auto px-2">
            Projections for <span className="text-amber-400 font-medium">{packageData.name}</span> package: 
            {packageData.leadsPerMonth} leads/month, {packageData.keywordsPage1Month12}+ Page 1 keywords, 
            results in {packageData.timeToResults}.
          </p>
        </div>

        {/* Market Context Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 p-4 sm:p-6 mb-8 sm:mb-12">
          <h4 className="text-base sm:text-lg font-semibold text-white mb-4 text-center">Dubai Real Estate Market Context (2025)</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 text-center">
            <div className="col-span-2 sm:col-span-1">
              <div className="text-lg sm:text-2xl font-bold text-amber-400">{marketContext.dubaiTransactions2025}</div>
              <div className="text-slate-400 text-[10px] sm:text-xs">Total Transactions</div>
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-bold text-green-400">{marketContext.totalDeals}</div>
              <div className="text-slate-400 text-[10px] sm:text-xs">Property Deals</div>
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-bold text-blue-400">{marketContext.yoyGrowth}</div>
              <div className="text-slate-400 text-[10px] sm:text-xs">YoY Growth</div>
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-bold text-purple-400">{marketContext.googleMarketShare}</div>
              <div className="text-slate-400 text-[10px] sm:text-xs">Google Market Share</div>
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-bold text-cyan-400">{marketContext.internetPenetration}</div>
              <div className="text-slate-400 text-[10px] sm:text-xs">Internet Penetration</div>
            </div>
          </div>
        </div>

        {/* Interactive Traffic Chart */}
        <div className="rounded-2xl sm:rounded-3xl bg-slate-800/30 border border-slate-700/50 p-4 sm:p-6 lg:p-8 mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-bold text-white">12-Month Traffic Projection</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveMetric("total")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeMetric === "total"
                    ? "bg-amber-500 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                Total Traffic
              </button>
              <button
                onClick={() => setActiveMetric("organic")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeMetric === "organic"
                    ? "bg-green-500 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                Organic Only
              </button>
            </div>
          </div>

          {/* Chart */}
          <div className="relative h-48 sm:h-64 lg:h-72 mb-4 sm:mb-6">
            <div className="absolute inset-0 flex items-end gap-[2px] sm:gap-1 md:gap-2">
              {trafficData.map((point, i) => {
                const value = activeMetric === "organic" ? point.organic : point.total;
                const maxVal = activeMetric === "organic" 
                  ? Math.max(...trafficData.map(t => t.organic))
                  : maxTraffic;
                const height = (value / maxVal) * 100;
                
                return (
                  <div key={i} className="flex-1 flex flex-col items-center group">
                    <div className="w-full relative">
                      {/* Tooltip - hidden on mobile, shown on hover for tablet+ */}
                      <div className="hidden sm:block absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
                        <div className="text-white font-bold text-sm">{value.toLocaleString()}</div>
                        <div className="text-slate-400 text-xs">{point.month}</div>
                        {activeMetric === "total" && (
                          <div className="text-xs text-slate-500 mt-1">
                            Organic: {point.organic.toLocaleString()}
                          </div>
                        )}
                      </div>
                      
                      {/* Bar */}
                      <div
                        className={`w-full rounded-t transition-all duration-500 ${
                          activeMetric === "organic"
                            ? "bg-gradient-to-t from-green-600 to-emerald-400"
                            : "bg-gradient-to-t from-amber-600 to-orange-400"
                        }`}
                        style={{ height: `${height * 2.5}px`, minHeight: "4px" }}
                      />
                    </div>
                    <div className="mt-1 sm:mt-2 text-slate-500 text-[8px] sm:text-[10px] md:text-xs text-center truncate w-full">
                      {point.month.replace("Month ", "M")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-6 pt-3 sm:pt-4 border-t border-slate-700/50">
            {trafficSources.map((source) => (
              <div key={source.key} className="flex items-center gap-1.5 sm:gap-2">
                <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gradient-to-r ${source.color}`} />
                <span className="text-slate-400 text-xs sm:text-sm">{source.label}</span>
              </div>
            ))}
          </div>

          {/* Growth Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-700/50">
            <div className="text-center">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{trafficData[0].total.toLocaleString()}</div>
              <div className="text-slate-500 text-xs sm:text-sm">Current Monthly</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-400">{trafficData[6].total.toLocaleString()}</div>
              <div className="text-slate-500 text-xs sm:text-sm">Month 6</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-400">{trafficData[12].total.toLocaleString()}</div>
              <div className="text-slate-500 text-xs sm:text-sm">Month 12</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-400">
                +{Math.round((trafficData[12].total / trafficData[0].total - 1) * 100)}%
              </div>
              <div className="text-slate-500 text-xs sm:text-sm">Total Growth</div>
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {dynamicKpis.map((kpi, i) => (
            <div key={i} className="rounded-xl sm:rounded-2xl bg-slate-800/30 border border-slate-700/50 p-4 sm:p-6 hover:border-amber-500/30 transition-colors">
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white flex-shrink-0">
                  {kpi.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-semibold text-sm sm:text-base truncate">{kpi.metric}</h3>
                  <span className={`text-xs font-bold ${
                    kpi.growth.includes("Add") ? "text-slate-400" : kpi.growth === "New Channel" ? "text-purple-400" : "text-green-400"
                  }`}>
                    {kpi.growth}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center mb-3">
                <div>
                  <div className="text-slate-500 text-[10px] sm:text-xs mb-1">Current</div>
                  <div className="text-white font-bold text-xs sm:text-sm">{kpi.current}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px] sm:text-xs mb-1">Month 6</div>
                  <div className="text-amber-400 font-bold text-xs sm:text-sm">{kpi.month6}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px] sm:text-xs mb-1">Month 12</div>
                  <div className="text-green-400 font-bold text-xs sm:text-sm">{kpi.month12}</div>
                </div>
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 text-center pt-2 sm:pt-3 border-t border-slate-700/50">
                {kpi.benchmark}
              </div>
            </div>
          ))}
        </div>

        {/* Research Sources */}
        <div className="rounded-xl sm:rounded-2xl bg-slate-800/20 border border-slate-700/30 p-4 sm:p-6">
          <h4 className="text-xs sm:text-sm font-semibold text-slate-400 mb-2 sm:mb-3">Data Sources & Benchmarks</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-[10px] sm:text-xs text-slate-500">
            <div className="space-y-1">
              <p>• Dubai Land Department 2025 transaction reports</p>
              <p>• Property Finder 2025 market analysis</p>
              <p>• Real estate SEO case studies (220% growth in 6 months)</p>
            </div>
            <div className="space-y-1">
              <p>• Industry benchmarks: 90+ keywords on Page 1 in 6 months</p>
              <p>• Lead conversion rates: 3-5% for qualified traffic</p>
              <p>• Local search visibility improvements: 160% typical</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
