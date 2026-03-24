"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type Post = {
  id: string;
  subject: string | null;
  caption: string | null;
  platforms: string[];
  scheduled_date: string | null;
  post_type: "organic" | "boosted";
  platform_budgets: Record<string, number>;
  workflow_status: string;
};

type Props = {
  projectId: string;
};

export default function BoostedDownload({ projectId }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);

    try {
      const { data: posts } = await supabaseClient
        .from("social_posts")
        .select("id, subject, caption, platforms, scheduled_date, post_type, platform_budgets, workflow_status")
        .eq("project_id", projectId)
        .eq("post_type", "boosted")
        .gte("scheduled_date", startDate)
        .lte("scheduled_date", endDate + "T23:59:59")
        .order("scheduled_date", { ascending: true });

      if (!posts || posts.length === 0) {
        alert("No boosted posts found in the selected date range.");
        setDownloading(false);
        return;
      }

      // Generate CSV content
      const headers = ["Date", "Subject", "Platforms", "Status", "Instagram Budget", "Facebook Budget", "LinkedIn Budget", "TikTok Budget", "X Budget", "YouTube Budget", "Total Budget"];
      const rows = (posts as Post[]).map((post) => {
        const budgets = post.platform_budgets || {};
        const totalBudget = Object.values(budgets).reduce((sum, val) => sum + (val || 0), 0);
        return [
          post.scheduled_date ? new Date(post.scheduled_date).toLocaleDateString() : "",
          `"${(post.subject || post.caption?.slice(0, 50) || "No subject").replace(/"/g, '""')}"`,
          `"${(post.platforms || []).join(", ")}"`,
          post.workflow_status || "draft",
          budgets.instagram || 0,
          budgets.facebook || 0,
          budgets.linkedin || 0,
          budgets.tiktok || 0,
          budgets.x || 0,
          budgets.youtube || 0,
          totalBudget,
        ].join(",");
      });

      // Calculate totals
      const totals = (posts as Post[]).reduce(
        (acc, post) => {
          const budgets = post.platform_budgets || {};
          acc.instagram += budgets.instagram || 0;
          acc.facebook += budgets.facebook || 0;
          acc.linkedin += budgets.linkedin || 0;
          acc.tiktok += budgets.tiktok || 0;
          acc.x += budgets.x || 0;
          acc.youtube += budgets.youtube || 0;
          acc.total += Object.values(budgets).reduce((sum, val) => sum + (val || 0), 0);
          return acc;
        },
        { instagram: 0, facebook: 0, linkedin: 0, tiktok: 0, x: 0, youtube: 0, total: 0 }
      );

      const totalRow = [
        "TOTAL",
        `"${posts.length} posts"`,
        "",
        "",
        totals.instagram,
        totals.facebook,
        totals.linkedin,
        totals.tiktok,
        totals.x,
        totals.youtube,
        totals.total,
      ].join(",");

      const csvContent = [headers.join(","), ...rows, "", totalRow].join("\n");

      // Download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `boosted-posts-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setShowModal(false);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download. Please try again.");
    }

    setDownloading(false);
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
        title="Download Boosted Posts Report"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Boosted Report
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Download Boosted Posts Report</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black focus:border-pink-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black focus:border-pink-300 focus:outline-none"
                />
              </div>

              <div className="rounded-xl bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-amber-600 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-amber-800">CSV Export</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Downloads all boosted posts with platform budgets for the selected date range.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDownload}
                disabled={downloading || !startDate || !endDate}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-amber-500/25 hover:shadow-xl disabled:opacity-50"
              >
                {downloading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download CSV
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
