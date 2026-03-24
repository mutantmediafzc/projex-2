"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type SubscriptionData = {
  manychat_subscribers: number;
  meta_verified: boolean;
  whatsapp_subscribers: number;
  newsletter_subscribers: number;
};

type Props = {
  projectId: string;
  initialData: SubscriptionData;
  onUpdate: (data: SubscriptionData) => void;
};

export default function SubscriptionsPanel({ projectId, initialData, onUpdate }: Props) {
  const [data, setData] = useState<SubscriptionData>(initialData);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabaseClient
      .from("social_projects")
      .update({
        manychat_subscribers: data.manychat_subscribers,
        meta_verified: data.meta_verified,
        whatsapp_subscribers: data.whatsapp_subscribers,
        newsletter_subscribers: data.newsletter_subscribers,
      })
      .eq("id", projectId);

    if (!error) {
      onUpdate(data);
      setEditing(false);
    }
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Subscriptions & Verification</h3>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-pink-600 hover:text-pink-700 font-medium"
          >
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditing(false); setData(initialData); }}
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Meta Verified */}
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span className="text-xs font-medium text-blue-700">Meta Verified</span>
          </div>
          {editing ? (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.meta_verified}
                onChange={(e) => setData({ ...data, meta_verified: e.target.checked })}
                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{data.meta_verified ? "Yes" : "No"}</span>
            </label>
          ) : (
            <div className="flex items-center gap-2">
              {data.meta_verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  Verified
                </span>
              ) : (
                <span className="text-sm text-slate-500">Not Verified</span>
              )}
            </div>
          )}
        </div>

        {/* Manychat Subscribers */}
        <div className="rounded-xl bg-gradient-to-br from-purple-50 to-fuchsia-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-5 w-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
            <span className="text-xs font-medium text-purple-700">Manychat</span>
          </div>
          {editing ? (
            <input
              type="number"
              value={data.manychat_subscribers || ""}
              onChange={(e) => setData({ ...data, manychat_subscribers: parseInt(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-black focus:border-purple-300 focus:outline-none"
              placeholder="0"
            />
          ) : (
            <p className="text-xl font-bold text-purple-700">{(data.manychat_subscribers || 0).toLocaleString()}</p>
          )}
          <p className="text-xs text-slate-500 mt-1">subscribers</p>
        </div>

        {/* WhatsApp Subscribers */}
        <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="text-xs font-medium text-green-700">WhatsApp</span>
          </div>
          {editing ? (
            <input
              type="number"
              value={data.whatsapp_subscribers || ""}
              onChange={(e) => setData({ ...data, whatsapp_subscribers: parseInt(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-black focus:border-green-300 focus:outline-none"
              placeholder="0"
            />
          ) : (
            <p className="text-xl font-bold text-green-700">{(data.whatsapp_subscribers || 0).toLocaleString()}</p>
          )}
          <p className="text-xs text-slate-500 mt-1">subscribers</p>
        </div>

        {/* Newsletter Subscribers */}
        <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-5 w-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span className="text-xs font-medium text-amber-700">Newsletter</span>
          </div>
          {editing ? (
            <input
              type="number"
              value={data.newsletter_subscribers || ""}
              onChange={(e) => setData({ ...data, newsletter_subscribers: parseInt(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-black focus:border-amber-300 focus:outline-none"
              placeholder="0"
            />
          ) : (
            <p className="text-xl font-bold text-amber-700">{(data.newsletter_subscribers || 0).toLocaleString()}</p>
          )}
          <p className="text-xs text-slate-500 mt-1">subscribers</p>
        </div>
      </div>
    </div>
  );
}
