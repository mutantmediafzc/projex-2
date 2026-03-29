"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type Targeting = {
  id: string;
  target_type: "hashtag" | "similar_account" | "location" | "interest";
  target_value: string;
  is_active: boolean;
  priority: number;
  created_at: string;
};

type AITarget = {
  id: string;
  target_type: string;
  target_value: string;
  relevance_score: number;
  reasoning: string | null;
};

type Props = {
  accountId: string;
};

const TARGET_TYPE_CONFIG = {
  hashtag: { icon: "#", label: "Hashtag", color: "purple", placeholder: "fitness, health, workout" },
  similar_account: { icon: "@", label: "Similar Account", color: "pink", placeholder: "@fitness_influencer" },
  location: { icon: "📍", label: "Location", color: "blue", placeholder: "Dubai, UAE" },
  interest: { icon: "💡", label: "Interest", color: "amber", placeholder: "Fitness & Health" },
};

export default function TargetingPanel({ accountId }: Props) {
  const [targets, setTargets] = useState<Targeting[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AITarget[]>([]);
  const [accountNiche, setAccountNiche] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState<Targeting["target_type"]>("hashtag");
  const [newValue, setNewValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTargets();
    loadAISuggestions();
  }, [accountId]);

  async function loadTargets() {
    setLoading(true);
    const [targetsRes, accountRes] = await Promise.all([
      supabaseClient
        .from("ig_targeting")
        .select("*")
        .eq("account_id", accountId)
        .order("priority", { ascending: true }),
      supabaseClient
        .from("ig_accounts")
        .select("niche")
        .eq("id", accountId)
        .single(),
    ]);
    setTargets(targetsRes.data || []);
    setAccountNiche(accountRes.data?.niche || null);
    setLoading(false);
  }

  async function loadAISuggestions() {
    const { data } = await supabaseClient
      .from("ig_ai_targets")
      .select("*")
      .eq("account_id", accountId)
      .eq("used_in_task", false)
      .order("relevance_score", { ascending: false })
      .limit(10);
    setAiSuggestions(data || []);
  }

  async function useAISuggestion(suggestion: AITarget) {
    setSaving(true);
    await supabaseClient.from("ig_targeting").insert({
      account_id: accountId,
      target_type: suggestion.target_type as Targeting["target_type"],
      target_value: suggestion.target_value,
      is_active: true,
      priority: targets.length + 1,
    });
    await supabaseClient
      .from("ig_ai_targets")
      .update({ used_in_task: true })
      .eq("id", suggestion.id);
    setSaving(false);
    loadTargets();
    loadAISuggestions();
  }

  async function handleAdd() {
    if (!newValue.trim()) return;
    setSaving(true);

    const values = newValue.split(",").map(v => v.trim()).filter(Boolean);
    
    for (const value of values) {
      await supabaseClient.from("ig_targeting").insert({
        account_id: accountId,
        target_type: newType,
        target_value: value.replace(/^[@#]/, ""),
        is_active: true,
        priority: targets.length + 1,
      });
    }

    setNewValue("");
    setAdding(false);
    setSaving(false);
    loadTargets();
  }

  async function toggleActive(id: string, currentActive: boolean) {
    await supabaseClient
      .from("ig_targeting")
      .update({ is_active: !currentActive })
      .eq("id", id);
    loadTargets();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this target?")) return;
    await supabaseClient.from("ig_targeting").delete().eq("id", id);
    loadTargets();
  }

  const groupedTargets = targets.reduce((acc, t) => {
    if (!acc[t.target_type]) acc[t.target_type] = [];
    acc[t.target_type].push(t);
    return acc;
  }, {} as Record<string, Targeting[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Targeting Configuration</h2>
          <p className="text-sm text-slate-500 mt-1">Define who you want to reach with your content</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14m-7-7h14" />
          </svg>
          Add Target
        </button>
      </div>

      {/* Add Target Form */}
      {adding && (
        <div className="rounded-2xl bg-white border border-purple-200 p-6 shadow-lg">
          <h3 className="font-semibold text-slate-900 mb-4">Add New Target</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Target Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as Targeting["target_type"])}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black focus:border-purple-400 focus:outline-none"
              >
                {Object.entries(TARGET_TYPE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.icon} {config.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Target Value(s) <span className="text-slate-400">- separate multiple with commas</span>
              </label>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={TARGET_TYPE_CONFIG[newType].placeholder}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-400 focus:border-purple-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 mt-4">
            <button
              onClick={() => { setAdding(false); setNewValue(""); }}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !newValue.trim()}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Target"}
            </button>
          </div>
        </div>
      )}

      {/* Targeting Groups */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        </div>
      ) : targets.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
            <svg className="h-8 w-8 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No targets configured</h3>
          <p className="mt-1 text-sm text-slate-500">Add hashtags, similar accounts, or interests to grow your audience</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(Object.keys(TARGET_TYPE_CONFIG) as Array<keyof typeof TARGET_TYPE_CONFIG>).map((type) => {
            const config = TARGET_TYPE_CONFIG[type];
            const typeTargets = groupedTargets[type] || [];
            
            return (
              <div key={type} className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
                <div className={`px-5 py-3 bg-${config.color}-50 border-b border-${config.color}-100`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{config.icon}</span>
                    <h3 className={`font-semibold text-${config.color}-700`}>{config.label}s</h3>
                    <span className={`ml-auto rounded-full bg-${config.color}-100 px-2 py-0.5 text-xs font-medium text-${config.color}-700`}>
                      {typeTargets.length}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  {typeTargets.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No {config.label.toLowerCase()}s added</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {typeTargets.map((target) => (
                        <div
                          key={target.id}
                          className={`group flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all ${
                            target.is_active
                              ? `bg-${config.color}-100 text-${config.color}-700`
                              : "bg-slate-100 text-slate-400 line-through"
                          }`}
                        >
                          <span>{type === "hashtag" ? "#" : type === "similar_account" ? "@" : ""}{target.target_value}</span>
                          <button
                            onClick={() => toggleActive(target.id, target.is_active)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            title={target.is_active ? "Disable" : "Enable"}
                          >
                            {target.is_active ? (
                              <svg className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                <line x1="1" y1="1" x2="23" y2="23" />
                              </svg>
                            ) : (
                              <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(target.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove"
                          >
                            <svg className="h-3.5 w-3.5 text-red-400 hover:text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Suggestions */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur flex-shrink-0">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">AI-Powered Suggestions</h3>
            <p className="text-white/80 text-sm mt-1">
              {accountNiche ? `Based on your ${accountNiche} niche` : "Based on your targeting configuration"}
            </p>
            {aiSuggestions.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-4">
                {aiSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => useAISuggestion(suggestion)}
                    disabled={saving}
                    className="group flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-sm hover:bg-white/30 transition-colors disabled:opacity-50"
                    title={suggestion.reasoning || `Relevance: ${suggestion.relevance_score}%`}
                  >
                    <span>
                      {suggestion.target_type === "hashtag" ? "#" : suggestion.target_type === "similar_account" ? "@" : ""}
                      {suggestion.target_value}
                    </span>
                    <span className="text-white/60 text-xs">({suggestion.relevance_score}%)</span>
                  </button>
                ))}
              </div>
            ) : targets.length > 0 ? (
              <div className="mt-4 text-white/70 text-sm">
                <p>No AI suggestions available. Suggestions are generated based on your existing targets and account activity.</p>
              </div>
            ) : (
              <div className="mt-4 text-white/70 text-sm">
                <p>Add some targets above to get AI-powered suggestions for similar hashtags and accounts.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
