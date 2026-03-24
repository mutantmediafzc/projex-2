"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type Deliverable = {
  id: string;
  asset_type: string;
  planned_count: number;
  delivered_count: number;
  notes: string | null;
};

type Props = {
  projectId: string;
  reportQuarter: string;
};

const ASSET_TYPES = [
  { id: "reel", label: "Reels (9:16)", icon: "🎬", color: "bg-purple-100 text-purple-700" },
  { id: "static_post", label: "Static Posts (4:5)", icon: "🖼️", color: "bg-blue-100 text-blue-700" },
  { id: "story", label: "Stories (9:16)", icon: "📲", color: "bg-pink-100 text-pink-700" },
  { id: "carousel", label: "Carousels (4:5)", icon: "🎠", color: "bg-amber-100 text-amber-700" },
  { id: "long_form_video", label: "Long-Form Videos (16:9)", icon: "🎞️", color: "bg-red-100 text-red-700" },
  { id: "article", label: "Articles / Blog Posts", icon: "📝", color: "bg-green-100 text-green-700" },
  { id: "whatsapp", label: "WhatsApp Content (1:1)", icon: "💬", color: "bg-emerald-100 text-emerald-700" },
  { id: "ad_creative", label: "Ad Creatives", icon: "📢", color: "bg-indigo-100 text-indigo-700" },
];

export default function QuarterlyDeliverables({ projectId, reportQuarter }: Props) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Record<string, { planned: number; delivered: number; notes: string }>>({});

  useEffect(() => {
    loadDeliverables();
  }, [projectId, reportQuarter]);

  async function loadDeliverables() {
    setLoading(true);
    const { data } = await supabaseClient
      .from("social_quarterly_deliverables")
      .select("*")
      .eq("project_id", projectId)
      .eq("report_quarter", reportQuarter);

    if (data) {
      setDeliverables(data as Deliverable[]);
      const initialEdit: Record<string, { planned: number; delivered: number; notes: string }> = {};
      ASSET_TYPES.forEach((type) => {
        const existing = data.find((d: any) => d.asset_type === type.id);
        initialEdit[type.id] = {
          planned: existing?.planned_count || 0,
          delivered: existing?.delivered_count || 0,
          notes: existing?.notes || "",
        };
      });
      setEditData(initialEdit);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    
    for (const type of ASSET_TYPES) {
      const data = editData[type.id];
      const existing = deliverables.find((d) => d.asset_type === type.id);

      if (existing) {
        await supabaseClient
          .from("social_quarterly_deliverables")
          .update({
            planned_count: data.planned,
            delivered_count: data.delivered,
            notes: data.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else if (data.planned > 0 || data.delivered > 0) {
        await supabaseClient.from("social_quarterly_deliverables").insert({
          project_id: projectId,
          report_quarter: reportQuarter,
          asset_type: type.id,
          planned_count: data.planned,
          delivered_count: data.delivered,
          notes: data.notes || null,
        });
      }
    }

    await loadDeliverables();
    setEditing(false);
    setSaving(false);
  }

  const totalPlanned = Object.values(editData).reduce((sum, d) => sum + d.planned, 0);
  const totalDelivered = Object.values(editData).reduce((sum, d) => sum + d.delivered, 0);
  const overallProgress = totalPlanned > 0 ? Math.min((totalDelivered / totalPlanned) * 100, 100) : 0;

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Quarterly Deliverables</h3>
          <p className="text-xs text-slate-500">Track planned vs delivered content by asset type</p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-pink-600 hover:text-pink-700 font-medium"
          >
            Edit Deliverables
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditing(false); loadDeliverables(); }}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs bg-pink-500 text-white px-3 py-1 rounded-lg hover:bg-pink-600 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      {/* Overall Progress */}
      <div className="mb-6 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Overall Progress</span>
          <span className="text-sm font-bold text-slate-900">{totalDelivered} / {totalPlanned}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-all ${
              overallProgress >= 100
                ? "bg-emerald-500"
                : overallProgress >= 75
                ? "bg-blue-500"
                : overallProgress >= 50
                ? "bg-amber-500"
                : "bg-slate-400"
            }`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-slate-500">{overallProgress.toFixed(0)}% complete</p>
      </div>

      {/* Asset Types Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ASSET_TYPES.map((type) => {
          const data = editData[type.id] || { planned: 0, delivered: 0, notes: "" };
          const progress = data.planned > 0 ? Math.min((data.delivered / data.planned) * 100, 100) : 0;

          return (
            <div key={type.id} className={`rounded-xl p-4 ${type.color.split(" ")[0]}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{type.icon}</span>
                <span className={`text-xs font-semibold ${type.color.split(" ")[1]}`}>{type.label}</span>
              </div>

              {editing ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500">Planned</label>
                      <input
                        type="number"
                        value={data.planned || ""}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            [type.id]: { ...data, planned: parseInt(e.target.value) || 0 },
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-black"
                        min="0"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500">Delivered</label>
                      <input
                        type="number"
                        value={data.delivered || ""}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            [type.id]: { ...data, delivered: parseInt(e.target.value) || 0 },
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-black"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xl font-bold text-slate-900">{data.delivered}</span>
                    <span className="text-xs text-slate-500">/ {data.planned} planned</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/50">
                    <div
                      className={`h-full rounded-full ${
                        progress >= 100 ? "bg-emerald-500" : progress >= 50 ? "bg-blue-500" : "bg-slate-400"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
