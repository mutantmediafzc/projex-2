"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  target_followers: number;
  achieved_followers: number;
  status: "draft" | "active" | "paused" | "completed";
  budget: number | null;
  created_at: string;
};

type Props = {
  accountId: string;
};

const STATUS_STYLES = {
  draft: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  active: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  paused: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  completed: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
};

export default function CampaignsPanel({ accountId }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetFollowers, setTargetFollowers] = useState(1000);
  const [budget, setBudget] = useState<number | "">("");

  useEffect(() => {
    loadCampaigns();
  }, [accountId]);

  async function loadCampaigns() {
    setLoading(true);
    const { data } = await supabaseClient
      .from("ig_campaigns")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });
    setCampaigns(data || []);
    setLoading(false);
  }

  async function handleCreate() {
    if (!name.trim() || !startDate) return;
    setSaving(true);

    await supabaseClient.from("ig_campaigns").insert({
      account_id: accountId,
      name: name.trim(),
      description: description.trim() || null,
      start_date: startDate,
      end_date: endDate || null,
      target_followers: targetFollowers,
      budget: budget || null,
      status: "draft",
    });

    resetForm();
    setSaving(false);
    loadCampaigns();
  }

  function resetForm() {
    setName("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setTargetFollowers(1000);
    setBudget("");
    setShowForm(false);
  }

  async function updateStatus(id: string, newStatus: Campaign["status"]) {
    await supabaseClient
      .from("ig_campaigns")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id);
    loadCampaigns();
  }

  async function deleteCampaign(id: string) {
    if (!confirm("Delete this campaign?")) return;
    await supabaseClient.from("ig_campaigns").delete().eq("id", id);
    loadCampaigns();
  }

  const activeCampaigns = campaigns.filter(c => c.status === "active");
  const totalTarget = activeCampaigns.reduce((sum, c) => sum + c.target_followers, 0);
  const totalAchieved = activeCampaigns.reduce((sum, c) => sum + c.achieved_followers, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Growth Campaigns</h2>
          <p className="text-sm text-slate-500 mt-1">Manage targeted follower acquisition campaigns</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14m-7-7h14" />
          </svg>
          New Campaign
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Total Campaigns</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{campaigns.length}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Active</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCampaigns.length}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Target Followers</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{totalTarget.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Achieved</p>
          <p className="text-2xl font-bold text-pink-600 mt-1">{totalAchieved.toLocaleString()}</p>
        </div>
      </div>

      {/* Create Campaign Form */}
      {showForm && (
        <div className="rounded-2xl bg-white border border-purple-200 p-6 shadow-lg">
          <h3 className="font-semibold text-slate-900 mb-4">Create New Campaign</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Campaign Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Summer Growth Campaign"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-400 focus:border-purple-400 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Campaign goals and strategy..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-400 focus:border-purple-400 focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black focus:border-purple-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black focus:border-purple-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Target Followers</label>
              <input
                type="number"
                value={targetFollowers}
                onChange={(e) => setTargetFollowers(parseInt(e.target.value) || 0)}
                min={100}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black focus:border-purple-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Budget (optional)</label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value ? parseFloat(e.target.value) : "")}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-400 focus:border-purple-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 mt-5">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !name.trim() || !startDate}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Campaign"}
            </button>
          </div>
        </div>
      )}

      {/* Campaigns List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pink-100">
            <svg className="h-8 w-8 text-pink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No campaigns yet</h3>
          <p className="mt-1 text-sm text-slate-500">Create your first growth campaign to start tracking progress</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => {
            const style = STATUS_STYLES[campaign.status];
            const progress = campaign.target_followers > 0
              ? Math.min(100, (campaign.achieved_followers / campaign.target_followers) * 100)
              : 0;

            return (
              <div key={campaign.id} className="rounded-2xl bg-white border border-slate-200 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{campaign.name}</h3>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                        {campaign.status}
                      </span>
                    </div>
                    {campaign.description && (
                      <p className="text-sm text-slate-500 mt-1">{campaign.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span>Started: {new Date(campaign.start_date).toLocaleDateString()}</span>
                      {campaign.end_date && (
                        <span>Ends: {new Date(campaign.end_date).toLocaleDateString()}</span>
                      )}
                      {campaign.budget && (
                        <span>Budget: ${campaign.budget.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {campaign.status === "draft" && (
                      <button
                        onClick={() => updateStatus(campaign.id, "active")}
                        className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                      >
                        Activate
                      </button>
                    )}
                    {campaign.status === "active" && (
                      <button
                        onClick={() => updateStatus(campaign.id, "paused")}
                        className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200"
                      >
                        Pause
                      </button>
                    )}
                    {campaign.status === "paused" && (
                      <button
                        onClick={() => updateStatus(campaign.id, "active")}
                        className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                      >
                        Resume
                      </button>
                    )}
                    <button
                      onClick={() => deleteCampaign(campaign.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">Progress</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {campaign.achieved_followers.toLocaleString()} / {campaign.target_followers.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{progress.toFixed(1)}% complete</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
