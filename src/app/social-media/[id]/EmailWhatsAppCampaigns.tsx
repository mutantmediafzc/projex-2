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
  scheduled_time: string | null;
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
  const [activeSubTab, setActiveSubTab] = useState<"all" | "published">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Form state
  const [campaignType, setCampaignType] = useState<"email" | "whatsapp">("email");
  const [status, setStatus] = useState<"not_due" | "in_progress" | "scheduled" | "published">("not_due");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
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
      .order("scheduled_date", { ascending: true });

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
    setScheduledTime("");
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
    setScheduledTime(campaign.scheduled_time || "");
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

    // If there's an existing image, delete it first
    if (imageUrl) {
      await handleImageDelete(false);
    }

    const { error: uploadError } = await supabaseClient.storage
      .from("media")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      alert("Failed to upload image. Please try again.");
    } else {
      const { data } = supabaseClient.storage.from("media").getPublicUrl(filePath);
      console.log("Image uploaded successfully:", data.publicUrl);
      setImageUrl(data.publicUrl);
    }
    setUploading(false);
  }

  async function handleImageDelete(clearUrl = true) {
    if (!imageUrl) return;
    
    try {
      // Extract file path from URL
      const url = new URL(imageUrl);
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/media\/(.+)/);
      if (pathMatch) {
        const filePath = decodeURIComponent(pathMatch[1]);
        const { error } = await supabaseClient.storage.from("media").remove([filePath]);
        if (error) {
          console.error("Error deleting image from storage:", error);
        } else {
          console.log("Image deleted from storage:", filePath);
        }
      }
    } catch (err) {
      console.error("Error parsing image URL:", err);
    }
    
    if (clearUrl) {
      setImageUrl("");
    }
  }

  async function handleSave() {
    if (!title.trim()) return;

    setSaving(true);
    const wasPublished = editingCampaign?.status !== "published" && status === "published";
    
    const data = {
      project_id: projectId,
      campaign_type: campaignType,
      status,
      scheduled_date: scheduledDate || null,
      scheduled_time: scheduledTime || null,
      title: title.trim(),
      image_url: imageUrl || null,
      content: content || null,
      updated_at: new Date().toISOString(),
    };

    if (editingCampaign) {
      const { error } = await supabaseClient
        .from("email_campaigns")
        .update(data)
        .eq("id", editingCampaign.id);
      if (error) console.error("Error updating campaign:", error);
    } else {
      const { error } = await supabaseClient.from("email_campaigns").insert(data);
      if (error) console.error("Error inserting campaign:", error);
    }

    // If status changed to published, notify (placeholder for now)
    if (wasPublished || (!editingCampaign && status === "published")) {
      console.log("Campaign published - notify account manager and Email & WhatsApp users");
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

  // Filter and sort campaigns based on active sub-tab and sort order
  const filteredCampaigns = campaigns
    .filter((c) => {
      if (activeSubTab === "published") return c.status === "published";
      return c.status !== "published";
    })
    .sort((a, b) => {
      const aKey = (a.scheduled_date || "9999-12-31") + "T" + (a.scheduled_time || "00:00");
      const bKey = (b.scheduled_date || "9999-12-31") + "T" + (b.scheduled_time || "00:00");
      return sortOrder === "asc" ? aKey.localeCompare(bKey) : bKey.localeCompare(aKey);
    });

  const truncateContent = (html: string | null, maxLength: number = 150) => {
    if (!html) return "";
    // Remove HTML tags and decode HTML entities
    const text = html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

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

      {/* Sub-tabs + Sort Toggle */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-2">
        <button
          onClick={() => setActiveSubTab("all")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeSubTab === "all"
              ? "border-emerald-500 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Email & WhatsApp
        </button>
        <button
          onClick={() => setActiveSubTab("published")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeSubTab === "published"
              ? "border-emerald-500 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Published
        </button>
        </div>
        <button
          onClick={() => setSortOrder((prev) => prev === "asc" ? "desc" : "asc")}
          className="mb-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          title={sortOrder === "asc" ? "Sort: Oldest first" : "Sort: Newest first"}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {sortOrder === "asc" ? (
              <>
                <path d="M3 6h18M3 12h12M3 18h6" />
                <path d="M19 12v6m0 0l-2-2m2 2l2-2" />
              </>
            ) : (
              <>
                <path d="M3 6h18M3 12h12M3 18h6" />
                <path d="M19 18v-6m0 0l-2 2m2-2l2 2" />
              </>
            )}
          </svg>
          {sortOrder === "asc" ? "Oldest First" : "Newest First"}
        </button>
      </div>

      {/* Campaigns List View */}
      {filteredCampaigns.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100">
            <svg className="h-8 w-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">
            {activeSubTab === "published" ? "No published campaigns yet" : "No campaigns yet"}
          </h3>
          <p className="mb-4 text-sm text-slate-500">
            {activeSubTab === "published" 
              ? "Published campaigns will appear here." 
              : "Create your first email or WhatsApp campaign to get started."}
          </p>
          {activeSubTab !== "published" && (
            <button
              onClick={openNewModal}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/25"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {/* List Header - Hidden on mobile */}
          <div className="hidden md:grid grid-cols-[80px_1fr_160px_120px_100px] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
            <span>Image</span>
            <span>Title & Content</span>
            <span>Date & Time</span>
            <span>Status</span>
            <span></span>
          </div>
          {/* List Rows */}
          {filteredCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="flex flex-col md:grid md:grid-cols-[80px_1fr_160px_120px_100px] gap-3 md:gap-4 md:items-center px-4 py-3 border-b border-slate-50 hover:bg-emerald-50/50 transition-colors"
            >
              {/* Mobile: Top row with image and content */}
              <div className="flex gap-3 md:contents">
                {/* Image */}
                <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                  {campaign.image_url ? (
                    <Image
                      src={campaign.image_url}
                      alt=""
                      width={64}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">
                      {campaign.campaign_type === "email" ? "✉️" : "💬"}
                    </div>
                  )}
                </div>
                {/* Title & Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      campaign.campaign_type === "email" 
                        ? "bg-violet-100 text-violet-700" 
                        : "bg-green-100 text-green-700"
                    }`}>
                      {campaign.campaign_type === "email" ? "✉️ Email" : "💬 WhatsApp"}
                    </span>
                  </div>
                  <h4 className="font-medium text-slate-900 truncate">{campaign.title}</h4>
                  <p className="text-sm text-slate-500 line-clamp-1">
                    {truncateContent(campaign.content)}
                  </p>
                </div>
              </div>
              {/* Mobile: Bottom row with date, status, actions */}
              <div className="flex items-center justify-between md:contents pl-[76px] md:pl-0">
                {/* Date & Time */}
                <div className="flex flex-col">
                  <span className="text-sm text-slate-600">
                    {campaign.scheduled_date 
                      ? new Date(campaign.scheduled_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </span>
                  {campaign.scheduled_time && (
                    <span className="text-xs text-slate-400">{campaign.scheduled_time}</span>
                  )}
                </div>
                {/* Status */}
                <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusStyle(campaign.status)}`}>
                  {getStatusLabel(campaign.status)}
                </span>
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(campaign)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(campaign.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Date</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Time</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Image</label>
                  {imageUrl ? (
                    <div className="relative">
                      <div className="relative h-40 w-full overflow-hidden rounded-xl bg-slate-100">
                        <Image src={imageUrl} alt="" fill className="object-cover" />
                      </div>
                      <div className="absolute right-2 top-2 flex gap-1">
                        <label className="cursor-pointer rounded-lg bg-blue-500 p-1.5 text-white hover:bg-blue-600" title="Replace image">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            disabled={uploading}
                          />
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleImageDelete()}
                          className="rounded-lg bg-red-500 p-1.5 text-white hover:bg-red-600"
                          title="Delete image"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Content (Rich Text) */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Content</label>
                  <RichTextEditor
                    value={content}
                    onChange={setContent}
                    placeholder="Write your campaign content..."
                    minHeight="500px"
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
