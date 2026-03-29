"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type Partnership = {
  id: string;
  influencer_username: string;
  influencer_profile_url: string | null;
  influencer_followers: number;
  influencer_niche: string | null;
  influencer_engagement_rate: number | null;
  partnership_type: string | null;
  agreed_rate: number | null;
  currency: string;
  scheduled_date: string | null;
  status: string;
  followers_gained: number;
  reach_achieved: number;
  proof_url: string | null;
  notes: string | null;
  created_at: string;
};

type Props = {
  accountId: string;
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  negotiating: { bg: "bg-amber-100", text: "text-amber-700" },
  pending: { bg: "bg-blue-100", text: "text-blue-700" },
  scheduled: { bg: "bg-purple-100", text: "text-purple-700" },
  live: { bg: "bg-emerald-100", text: "text-emerald-700" },
  completed: { bg: "bg-green-100", text: "text-green-700" },
  cancelled: { bg: "bg-red-100", text: "text-red-700" },
};

const PARTNERSHIP_TYPES = [
  { value: "shoutout", label: "Shoutout", icon: "📣" },
  { value: "story_mention", label: "Story Mention", icon: "📱" },
  { value: "reel_collab", label: "Reel Collaboration", icon: "🎬" },
  { value: "giveaway", label: "Giveaway", icon: "🎁" },
  { value: "takeover", label: "Account Takeover", icon: "🔄" },
  { value: "ambassador", label: "Brand Ambassador", icon: "🌟" },
];

export default function InfluencerPanel({ accountId }: Props) {
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [username, setUsername] = useState("");
  const [followers, setFollowers] = useState<number | "">("");
  const [niche, setNiche] = useState("");
  const [engagementRate, setEngagementRate] = useState<number | "">("");
  const [partnershipType, setPartnershipType] = useState("shoutout");
  const [rate, setRate] = useState<number | "">("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadPartnerships();
  }, [accountId]);

  async function loadPartnerships() {
    setLoading(true);
    const { data } = await supabaseClient
      .from("ig_influencer_partnerships")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });
    setPartnerships(data || []);
    setLoading(false);
  }

  async function handleCreate() {
    if (!username.trim()) return;
    setSaving(true);

    await supabaseClient.from("ig_influencer_partnerships").insert({
      account_id: accountId,
      influencer_username: username.replace("@", "").trim(),
      influencer_profile_url: `https://instagram.com/${username.replace("@", "").trim()}`,
      influencer_followers: followers || 0,
      influencer_niche: niche || null,
      influencer_engagement_rate: engagementRate || null,
      partnership_type: partnershipType,
      agreed_rate: rate || null,
      scheduled_date: scheduledDate || null,
      notes: notes || null,
      status: "negotiating",
    });

    resetForm();
    setSaving(false);
    loadPartnerships();
  }

  function resetForm() {
    setUsername("");
    setFollowers("");
    setNiche("");
    setEngagementRate("");
    setPartnershipType("shoutout");
    setRate("");
    setScheduledDate("");
    setNotes("");
    setShowForm(false);
  }

  async function updateStatus(id: string, newStatus: string) {
    await supabaseClient
      .from("ig_influencer_partnerships")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id);
    loadPartnerships();
  }

  async function recordResults(id: string, followersGained: number, reach: number) {
    await supabaseClient
      .from("ig_influencer_partnerships")
      .update({
        status: "completed",
        followers_gained: followersGained,
        reach_achieved: reach,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    loadPartnerships();
  }

  async function deletePartnership(id: string) {
    if (!confirm("Delete this partnership?")) return;
    await supabaseClient.from("ig_influencer_partnerships").delete().eq("id", id);
    loadPartnerships();
  }

  // Stats
  const totalSpent = partnerships.reduce((sum, p) => sum + (p.agreed_rate || 0), 0);
  const totalFollowersGained = partnerships.reduce((sum, p) => sum + p.followers_gained, 0);
  const totalReach = partnerships.reduce((sum, p) => sum + p.reach_achieved, 0);
  const activePartnerships = partnerships.filter(p => ["scheduled", "live"].includes(p.status)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Influencer Partnerships</h2>
          <p className="text-sm text-slate-500 mt-1">Manage shoutouts, collaborations, and promotions</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14m-7-7h14" />
          </svg>
          Add Partnership
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Total Partnerships</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{partnerships.length}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Active</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{activePartnerships}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Followers Gained</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">+{totalFollowersGained.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Total Spend</p>
          <p className="text-2xl font-bold text-pink-600 mt-1">${totalSpent.toLocaleString()}</p>
        </div>
      </div>

      {/* Add Partnership Form */}
      {showForm && (
        <div className="rounded-2xl bg-white border border-purple-200 p-6 shadow-lg">
          <h3 className="font-semibold text-slate-900 mb-4">Add New Partnership</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Username *</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@influencer"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-400 focus:border-purple-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Followers</label>
              <input
                type="number"
                value={followers}
                onChange={(e) => setFollowers(e.target.value ? parseInt(e.target.value) : "")}
                placeholder="50000"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-400 focus:border-purple-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Niche</label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Fitness, Lifestyle"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-400 focus:border-purple-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Partnership Type</label>
              <select
                value={partnershipType}
                onChange={(e) => setPartnershipType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black focus:border-purple-400 focus:outline-none"
              >
                {PARTNERSHIP_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Agreed Rate ($)</label>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value ? parseFloat(e.target.value) : "")}
                placeholder="500"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-400 focus:border-purple-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Scheduled Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black focus:border-purple-400 focus:outline-none"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Partnership details, requirements..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-400 focus:border-purple-400 focus:outline-none resize-none"
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
              disabled={saving || !username.trim()}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Partnership"}
            </button>
          </div>
        </div>
      )}

      {/* Partnerships List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        </div>
      ) : partnerships.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pink-100">
            <span className="text-3xl">🤝</span>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No partnerships yet</h3>
          <p className="mt-1 text-sm text-slate-500">Add influencer partnerships to boost your growth</p>
        </div>
      ) : (
        <div className="space-y-4">
          {partnerships.map((partnership) => {
            const typeConfig = PARTNERSHIP_TYPES.find(t => t.value === partnership.partnership_type);
            const statusStyle = STATUS_STYLES[partnership.status] || STATUS_STYLES.pending;

            return (
              <div key={partnership.id} className="rounded-2xl bg-white border border-slate-200 p-5">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 text-xl font-bold text-white flex-shrink-0">
                    {partnership.influencer_username[0].toUpperCase()}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={partnership.influencer_profile_url || `https://instagram.com/${partnership.influencer_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-slate-900 hover:text-purple-600"
                      >
                        @{partnership.influencer_username}
                      </a>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                        {partnership.status}
                      </span>
                      {typeConfig && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {typeConfig.icon} {typeConfig.label}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      {partnership.influencer_followers > 0 && (
                        <span>{partnership.influencer_followers.toLocaleString()} followers</span>
                      )}
                      {partnership.influencer_niche && (
                        <span>{partnership.influencer_niche}</span>
                      )}
                      {partnership.agreed_rate && (
                        <span className="font-medium text-emerald-600">${partnership.agreed_rate}</span>
                      )}
                      {partnership.scheduled_date && (
                        <span>📅 {new Date(partnership.scheduled_date).toLocaleDateString()}</span>
                      )}
                    </div>

                    {partnership.notes && (
                      <p className="mt-2 text-sm text-slate-600">{partnership.notes}</p>
                    )}

                    {/* Results */}
                    {partnership.status === "completed" && (
                      <div className="mt-3 flex items-center gap-4 rounded-lg bg-emerald-50 p-2">
                        <span className="text-xs text-emerald-700">
                          <strong>+{partnership.followers_gained}</strong> followers
                        </span>
                        <span className="text-xs text-emerald-700">
                          <strong>{partnership.reach_achieved.toLocaleString()}</strong> reach
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {partnership.status === "negotiating" && (
                      <button
                        onClick={() => updateStatus(partnership.id, "scheduled")}
                        className="rounded-lg bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-200"
                      >
                        Confirm
                      </button>
                    )}
                    {partnership.status === "scheduled" && (
                      <button
                        onClick={() => updateStatus(partnership.id, "live")}
                        className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                      >
                        Go Live
                      </button>
                    )}
                    {partnership.status === "live" && (
                      <button
                        onClick={() => {
                          const followers = parseInt(prompt("Followers gained:") || "0");
                          const reach = parseInt(prompt("Total reach:") || "0");
                          if (followers >= 0) recordResults(partnership.id, followers, reach);
                        }}
                        className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200"
                      >
                        Record Results
                      </button>
                    )}
                    <button
                      onClick={() => deletePartnership(partnership.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ROI Summary */}
      {partnerships.length > 0 && totalSpent > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
          <h3 className="font-semibold">Partnership ROI</h3>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-white/80 text-sm">Cost per Follower</p>
              <p className="text-2xl font-bold mt-1">
                ${totalFollowersGained > 0 ? (totalSpent / totalFollowersGained).toFixed(2) : "0.00"}
              </p>
            </div>
            <div>
              <p className="text-white/80 text-sm">Total Reach</p>
              <p className="text-2xl font-bold mt-1">{totalReach.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-white/80 text-sm">Cost per 1K Reach</p>
              <p className="text-2xl font-bold mt-1">
                ${totalReach > 0 ? ((totalSpent / totalReach) * 1000).toFixed(2) : "0.00"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
