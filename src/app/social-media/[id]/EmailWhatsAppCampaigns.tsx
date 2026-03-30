"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabaseClient";
import RichTextEditor from "@/components/RichTextEditor";

type Campaign = {
  id: string;
  project_id: string;
  campaign_type: "email" | "whatsapp";
  status: "not_due" | "in_progress" | "scheduled" | "published";
  scheduled_date: string | null;
  title: string;
  image_url: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_OPTIONS = [
  { value: "not_due", label: "Not Due", color: "bg-slate-100 text-slate-700" },
  { value: "in_progress", label: "In Progress", color: "bg-amber-100 text-amber-700" },
  { value: "scheduled", label: "Scheduled", color: "bg-blue-100 text-blue-700" },
  { value: "published", label: "Published", color: "bg-emerald-100 text-emerald-700" },
];

const CAMPAIGN_TYPES = [
  { value: "email", label: "Email", icon: "✉️" },
  { value: "whatsapp", label: "WhatsApp", icon: "💬" },
];

export default function EmailWhatsAppCampaigns({ projectId }: { projectId: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Form state
  const [campaignType, setCampaignType] = useState<"email" | "whatsapp">("email");
  const [status, setStatus] = useState<"not_due" | "in_progress" | "scheduled" | "published">("not_due");
  const [scheduledDate, setScheduledDate] = useState("");
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, [projectId]);

  async function loadCampaigns() {
    setLoading(true);
    const { data, error } = await supabaseClient
      .from("email_campaigns")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCampaigns(data as Campaign[]);
    }
    setLoading(false);
  }

  function openNewModal() {
    setEditingCampaign(null);
    setCampaignType("email");
    setStatus("not_due");
    setScheduledDate("");
    setTitle("");
    setImageUrl("");
    setContent("");
    setShowModal(true);
  }

  function openEditModal(campaign: Campaign) {
    setEditingCampaign(campaign);
    setCampaignType(campaign.campaign_type);
    setStatus(campaign.status);
    setScheduledDate(campaign.scheduled_date || "");
    setTitle(campaign.title);
    setImageUrl(campaign.image_url || "");
    setContent(campaign.content || "");
    setShowModal(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `campaign-${Date.now()}.${ext}`;
    const filePath = `campaigns/${projectId}/${fileName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("media")
      .upload(filePath, file);

    if (!uploadError) {
      const { data } = supabaseClient.storage.from("media").getPublicUrl(filePath);
      setImageUrl(data.publicUrl);
    }
    setUploading(false);
  }

  async function handleSave() {
    if (!title.trim()) return;

    setSaving(true);
    const data = {
      project_id: projectId,
      campaign_type: campaignType,
      status,
      scheduled_date: scheduledDate || null,
      title: title.trim(),
      image_url: imageUrl || null,
      content: content || null,
      updated_at: new Date().toISOString(),
    };

    if (editingCampaign) {
      await supabaseClient
        .from("email_campaigns")
        .update(data)
        .eq("id", editingCampaign.id);
    } else {
      await supabaseClient.from("email_campaigns").insert(data);
    }

    setSaving(false);
    setShowModal(false);
    loadCampaigns();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this campaign?")) return;
    await supabaseClient.from("email_campaigns").delete().eq("id", id);
    loadCampaigns();
  }

  const filteredCampaigns = campaigns.filter((c) => {
    if (filterType && c.campaign_type !== filterType) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    return true;
  });

  const getStatusStyle = (status: string) => {
    return STATUS_OPTIONS.find((s) => s.value === status)?.color || "bg-slate-100 text-slate-700";
  };

  const getStatusLabel = (status: string) => {
    return STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Email & WhatsApp Campaigns</h2>
          <p className="text-sm text-slate-500">Manage your email newsletters and WhatsApp broadcasts</p>
        </div>
        <button
          onClick={openNewModal}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Campaign
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="">All Types</option>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Campaigns List */}
      {filteredCampaigns.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100">
            <svg className="h-8 w-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">No campaigns yet</h3>
          <p className="mb-4 text-sm text-slate-500">
            Create your first email or WhatsApp campaign to get started.
          </p>
          <button
            onClick={openNewModal}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/25"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Campaign
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-emerald-200 hover:shadow-lg"
            >
              {/* Image */}
              {campaign.image_url ? (
                <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                  <Image
                    src={campaign.image_url}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                  <span className="text-4xl">
                    {campaign.campaign_type === "email" ? "✉️" : "💬"}
                  </span>
                </div>
              )}

              {/* Content */}
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    campaign.campaign_type === "email" 
                      ? "bg-violet-100 text-violet-700" 
                      : "bg-green-100 text-green-700"
                  }`}>
                    {campaign.campaign_type === "email" ? "✉️ Email" : "💬 WhatsApp"}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusStyle(campaign.status)}`}>
                    {getStatusLabel(campaign.status)}
                  </span>
                </div>

                <h3 className="mb-1 font-semibold text-slate-900 line-clamp-1">{campaign.title}</h3>
                
                {campaign.scheduled_date && (
                  <p className="mb-2 text-xs text-slate-500">
                    📅 {new Date(campaign.scheduled_date).toLocaleDateString()}
                  </p>
                )}

                {campaign.content && (
                  <div 
                    className="mb-3 text-sm text-slate-600 line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: campaign.content }}
                  />
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(campaign)}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(campaign.id)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingCampaign ? "Edit Campaign" : "Add Campaign"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-5">
                {/* Campaign Type */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Campaign Type</label>
                  <div className="flex gap-3">
                    {CAMPAIGN_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setCampaignType(type.value as "email" | "whatsapp")}
                        className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
                          campaignType === type.value
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <span className="mr-2">{type.icon}</span>
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Scheduled Date */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Scheduled Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Campaign title..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Image</label>
                  {imageUrl ? (
                    <div className="relative">
                      <div className="relative h-40 w-full overflow-hidden rounded-xl bg-slate-100">
                        <Image src={imageUrl} alt="" fill className="object-cover" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="absolute right-2 top-2 rounded-lg bg-red-500 p-1.5 text-white hover:bg-red-600"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                      {uploading ? (
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                      ) : (
                        <>
                          <svg className="mb-2 h-8 w-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="m21 15-5-5L5 21" />
                          </svg>
                          <span className="text-sm text-slate-500">Click to upload image</span>
                        </>
                      )}
                    </label>
                  )}
                </div>

                {/* Content (Rich Text) */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Content</label>
                  <RichTextEditor
                    value={content}
                    onChange={setContent}
                    placeholder="Write your campaign content..."
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  "Save Campaign"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
