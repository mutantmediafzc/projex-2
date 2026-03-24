"use client";

const projectedResults = {
  traffic: [
    { month: 0, value: 450 },
    { month: 3, value: 1200 },
    { month: 6, value: 3500 },
    { month: 9, value: 7000 },
    { month: 12, value: 12000 },
  ],
  leads: [
    { month: 0, value: 15 },
    { month: 3, value: 80 },
    { month: 6, value: 200 },
    { month: 9, value: 350 },
    { month: 12, value: 500 },
  ],
  keywords: [
    { month: 0, value: 28 },
    { month: 3, value: 85 },
    { month: 6, value: 180 },
    { month: 9, value: 280 },
    { month: 12, value: 400 },
  ],
};

const kpis = [
  {
    metric: "Organic Traffic",
    current: "450/month",
    month6: "3,500/month",
    month12: "12,000/month",
    growth: "+2,567%",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    metric: "Monthly Leads",
    current: "15/month",
    month6: "200/month",
    month12: "500/month",
    growth: "+3,233%",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    metric: "Ranking Keywords",
    current: "28",
    month6: "180",
    month12: "400+",
    growth: "+1,329%",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    metric: "Domain Authority",
    current: "18",
    month6: "35",
    month12: "50+",
    growth: "+178%",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    metric: "Cost Per Lead",
    current: "AED 850",
    month6: "AED 200",
    month12: "AED 120",
    growth: "-86%",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    metric: "AI Visibility",
    current: "0%",
    month6: "25%",
    month12: "45%",
    growth: "New",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

const roiCalculation = {
  investment: 336000,
  leadsGenerated: 2500,
  avgDealValue: 50000,
  conversionRate: 0.03,
  totalRevenue: 3750000,
  roi: 1016,
};

export default function ResultsSection() {
  const maxTraffic = Math.max(...projectedResults.traffic.map((t) => t.value));

  return (
    <section id="results" className="py-24 px-6 bg-slate-900/50">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-amber-400 text-sm font-semibold uppercase tracking-widest mb-4">
            Expected Results
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Projected Growth & ROI
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Conservative projections based on industry benchmarks and our experience with real estate clients in the UAE market.
          </p>
        </div>

        {/* KPI Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {kpis.map((kpi, i) => (
            <div key={i} className="rounded-2xl bg-slate-800/30 border border-slate-700/50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white">
                  {kpi.icon}
                </div>
                <div>
                  <h3 className="text-white font-semibold">{kpi.metric}</h3>
                  <span className={`text-xs font-bold ${
                    kpi.growth.startsWith("-") ? "text-green-400" : kpi.growth === "New" ? "text-purple-400" : "text-green-400"
                  }`}>
                    {kpi.growth}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-slate-500 text-xs mb-1">Current</div>
                  <div className="text-white font-bold">{kpi.current}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs mb-1">Month 6</div>
                  <div className="text-amber-400 font-bold">{kpi.month6}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs mb-1">Month 12</div>
                  <div className="text-green-400 font-bold">{kpi.month12}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Traffic Growth Chart */}
        <div className="rounded-3xl bg-slate-800/30 border border-slate-700/50 p-8 mb-16">
          <h3 className="text-xl font-bold text-white mb-8">Projected Traffic Growth</h3>
          <div className="relative h-64">
            <div className="absolute inset-0 flex items-end justify-between gap-4">
              {projectedResults.traffic.map((point, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-amber-500 to-orange-400 rounded-t-lg transition-all duration-500 relative group"
                    style={{ height: `${(point.value / maxTraffic) * 100}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 px-2 py-1 rounded text-xs text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {point.value.toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-3 text-slate-400 text-sm">Month {point.month}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ROI Calculator */}
        <div className="rounded-3xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 p-8">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">12-Month ROI Projection</h3>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Investment Side */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white mb-4">Investment</h4>
              <div className="flex justify-between items-center p-4 rounded-xl bg-slate-800/50">
                <span className="text-slate-400">Monthly Retainer (Professional)</span>
                <span className="text-white font-bold">AED 28,000</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl bg-slate-800/50">
                <span className="text-slate-400">12-Month Total</span>
                <span className="text-white font-bold">AED {roiCalculation.investment.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl bg-slate-800/50">
                <span className="text-slate-400">Total Leads Generated</span>
                <span className="text-amber-400 font-bold">{roiCalculation.leadsGenerated.toLocaleString()}</span>
              </div>
            </div>

            {/* Returns Side */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white mb-4">Projected Returns</h4>
              <div className="flex justify-between items-center p-4 rounded-xl bg-slate-800/50">
                <span className="text-slate-400">Avg. Commission/Deal</span>
                <span className="text-white font-bold">AED {roiCalculation.avgDealValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl bg-slate-800/50">
                <span className="text-slate-400">Lead to Deal Conversion</span>
                <span className="text-white font-bold">{(roiCalculation.conversionRate * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl bg-green-500/20 border border-green-500/30">
                <span className="text-green-400 font-medium">Projected Revenue</span>
                <span className="text-green-400 font-bold text-xl">AED {roiCalculation.totalRevenue.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* ROI Result */}
          <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-center">
            <div className="text-green-100 text-sm mb-2">Projected Return on Investment</div>
            <div className="text-5xl font-bold text-white">{roiCalculation.roi}%</div>
            <div className="text-green-100 text-sm mt-2">Based on conservative estimates</div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-slate-500 text-sm mt-8">
          * Projections are estimates based on industry benchmarks and may vary based on market conditions, competition, and other factors.
        </p>
      </div>
    </section>
  );
}
