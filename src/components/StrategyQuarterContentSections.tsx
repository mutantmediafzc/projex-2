import Image from "next/image";

export type StrategyContentPost = {
  id: string;
  scheduled_date: string | null;
  platforms: string[];
  content_type: string | null;
  subject: string | null;
  caption: string | null;
  image_url: string | null;
  workflow_status: string | null;
  post_type: string | null;
  platform_budgets?: Record<string, number> | null;
};

export type StrategyEmailCampaign = {
  id: string;
  campaign_type: string;
  status: string;
  scheduled_date: string | null;
  title: string;
  image_url: string | null;
};

export type StrategyBlogArticle = {
  id: string;
  publication_type: string;
  status: string;
  scheduled_date: string | null;
  title: string;
  image_url: string | null;
};

const WORKFLOW_LABELS: Record<string, string> = {
  creatives_approval: "Creative Development",
  creative_approval: "Creative Approval",
  captions: "Copywriting",
  final_approval: "Final Approval",
  for_publishing: "Scheduled",
  published: "Live",
};

function formatDate(date: string | null) {
  return date ? new Date(date).toLocaleDateString() : "-";
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

function getBoostedSpendTotal(posts: StrategyContentPost[]) {
  return posts.reduce((total, post) => {
    if (post.post_type !== "boosted") return total;
    return total + Object.values(post.platform_budgets || {}).reduce((sum, amount) => sum + amount, 0);
  }, 0);
}

export default function StrategyQuarterContentSections({
  quarter,
  socialPosts,
  emailCampaigns,
  blogArticles,
}: {
  quarter: string;
  socialPosts: StrategyContentPost[];
  emailCampaigns: StrategyEmailCampaign[];
  blogArticles: StrategyBlogArticle[];
}) {
  const boostedPosts = socialPosts.filter((post) => post.post_type === "boosted");
  const boostedSpendTotal = getBoostedSpendTotal(socialPosts);

  return (
    <>
      <section>
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 text-sm text-white">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4" />
              <path d="M8 2v4" />
              <path d="M3 10h18" />
            </svg>
          </span>
          <h2 className="text-lg font-bold text-slate-900">Social Media Content</h2>
        </div>

        {socialPosts.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:shadow-none">
            <div className="border-b border-slate-100 bg-gradient-to-r from-pink-50 to-rose-50 p-4 sm:p-6">
              <p className="text-sm text-slate-600">Content for <span className="font-semibold">{quarter}</span></p>
            </div>
            <div className="divide-y divide-slate-100">
              {socialPosts.map((post) => (
                <div key={post.id} className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-pink-100 to-rose-100 sm:h-12 sm:w-16">
                    {post.image_url ? (
                      <Image src={post.image_url} alt="" width={64} height={48} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-base sm:text-lg">IMG</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 line-clamp-1 text-xs font-medium text-slate-900 sm:text-sm">
                      {post.subject || post.caption || "Untitled"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-medium capitalize text-pink-700 sm:text-xs">
                        {post.platforms.join(", ") || "-"}
                      </span>
                      <span className="text-[10px] text-slate-400 sm:text-xs">{post.content_type || "Post"}</span>
                      {post.workflow_status && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 sm:text-xs">
                          {WORKFLOW_LABELS[post.workflow_status] || post.workflow_status}
                        </span>
                      )}
                      {post.post_type === "boosted" && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700 sm:text-xs">Boosted</span>
                      )}
                    </div>
                  </div>
                  <p className="hidden flex-shrink-0 text-xs text-slate-500 sm:block">{formatDate(post.scheduled_date)}</p>
                </div>
              ))}
            </div>
            {boostedSpendTotal > 0 && (
              <div className="flex items-center justify-between bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 sm:px-6">
                <span>Total ({boostedPosts.length} boosted {boostedPosts.length === 1 ? "post" : "posts"})</span>
                <span>AED {boostedSpendTotal.toLocaleString()}</span>
              </div>
            )}
          </div>
        ) : (
          <EmptyState label="No social media content for this quarter." />
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 text-sm text-white">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16v16H4z" />
              <path d="m22 6-10 7L2 6" />
            </svg>
          </span>
          <h2 className="text-lg font-bold text-slate-900">Email &amp; WhatsApp Campaigns</h2>
        </div>

        {emailCampaigns.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:shadow-none">
            <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-green-50 p-4 sm:p-6">
              <p className="text-sm text-slate-600">Campaigns for <span className="font-semibold">{quarter}</span></p>
            </div>
            <div className="divide-y divide-slate-100">
              {emailCampaigns.map((campaign) => (
                <div key={campaign.id} className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-emerald-100 to-green-100 sm:h-12 sm:w-16">
                    {campaign.image_url ? <Image src={campaign.image_url} alt="" width={64} height={48} className="h-full w-full object-cover" /> : <span className="text-sm">MAIL</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="mb-1 inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium capitalize text-green-700 sm:text-xs">
                      {campaign.campaign_type === "email" ? "Email" : "WhatsApp"}
                    </span>
                    <p className="line-clamp-1 text-xs font-medium text-slate-700 sm:text-sm">{campaign.title}</p>
                  </div>
                  <div className="hidden flex-shrink-0 text-right sm:block">
                    <p className="text-xs text-slate-500">{formatDate(campaign.scheduled_date)}</p>
                    <span className="text-xs font-medium capitalize text-slate-500">{campaign.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState label="No campaigns for this quarter." />
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 text-sm text-white">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" />
            </svg>
          </span>
          <h2 className="text-lg font-bold text-slate-900">Blogs &amp; Articles</h2>
        </div>

        {blogArticles.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:shadow-none">
            <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 p-4 sm:p-6">
              <p className="text-sm text-slate-600">Articles for <span className="font-semibold">{quarter}</span></p>
            </div>
            <div className="divide-y divide-slate-100">
              {blogArticles.map((blog) => (
                <div key={blog.id} className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 sm:h-12 sm:w-16">
                    {blog.image_url ? <Image src={blog.image_url} alt="" width={64} height={48} className="h-full w-full object-cover" /> : <span className="text-sm">DOC</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="mb-1 inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 sm:text-xs">
                      {blog.publication_type === "website_blog" ? "Blog" : "LinkedIn"}
                    </span>
                    <p className="line-clamp-1 text-xs font-medium text-slate-700 sm:text-sm">{blog.title}</p>
                  </div>
                  <div className="hidden flex-shrink-0 text-right sm:block">
                    <p className="text-xs text-slate-500">{formatDate(blog.scheduled_date)}</p>
                    <span className="text-xs font-medium capitalize text-slate-500">{blog.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState label="No articles for this quarter." />
        )}
      </section>
    </>
  );
}
