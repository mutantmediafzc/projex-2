export type SocialKpiPerformance = {
  id: string;
  sm_impressions_kpi: string | null;
  sm_reach_kpi: string | null;
  sm_engagement_kpi: string | null;
  sm_followers_kpi: string | null;
  sm_clicks_kpi: string | null;
};

type KpiCard = {
  key: keyof Omit<SocialKpiPerformance, "id">;
  title: string;
};

const KPI_CARDS: KpiCard[] = [
  { key: "sm_impressions_kpi", title: "Views/Impressions" },
  { key: "sm_reach_kpi", title: "Reach" },
  { key: "sm_engagement_kpi", title: "Engagement" },
  { key: "sm_followers_kpi", title: "Followers" },
  { key: "sm_clicks_kpi", title: "Clicks" },
];

function hasKpiContent(kpi: SocialKpiPerformance) {
  return KPI_CARDS.some((card) => kpi[card.key]?.trim());
}

export default function SocialKpiPerformanceCards({ kpis }: { kpis: SocialKpiPerformance[] }) {
  const visibleKpis = kpis.filter(hasKpiContent);

  if (visibleKpis.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 text-white">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
          </svg>
        </span>
        <h2 className="text-lg font-bold text-slate-900">KPIs &amp; Performance</h2>
      </div>

      <div className="space-y-4">
        {visibleKpis.map((kpi) => (
          <div key={kpi.id} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {KPI_CARDS.map((card) => (
              <div key={card.key} className="rounded-xl bg-gradient-to-b from-purple-700 to-purple-900 p-4 text-white shadow-sm">
                <p className="mb-4 text-sm font-bold">{card.title}</p>
                <div
                  className="strategy-content whitespace-pre-wrap break-words text-xs leading-relaxed text-white [&_*]:text-white"
                  style={{ wordWrap: "break-word", overflowWrap: "break-word" }}
                  dangerouslySetInnerHTML={{ __html: kpi[card.key] || "&mdash;" }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
