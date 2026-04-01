"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabaseClient";
import RichTextEditor from "@/components/RichTextEditor";

type Blog = {
  id: string;
  project_id: string;
  publication_type: "website_blog" | "linkedin_article";
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

const PUBLICATION_TYPES = [
  { value: "website_blog", label: "Website Blog", icon: "📝" },
  { value: "linkedin_article", label: "LinkedIn Article", icon: "💼" },
];

export default function BlogsArticles({ projectId }: { projectId: string }) {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"all" | "published">("all");

  // Form state
  const [publicationType, setPublicationType] = useState<"website_blog" | "linkedin_article">("website_blog");
  const [status, setStatus] = useState<"not_due" | "in_progress" | "scheduled" | "published">("not_due");
  const [scheduledDate, setScheduledDate] = useState("");
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadBlogs();
  }, [projectId]);

  async function loadBlogs() {
    setLoading(true);
    const { data, error } = await supabaseClient
      .from("website_blogs")
      .select("*")
      .eq("project_id", projectId)
      .order("scheduled_date", { ascending: true, nullsFirst: false });

    if (!error && data) {
      setBlogs(data as Blog[]);
    }
    setLoading(false);
  }

  function openNewModal() {
    setEditingBlog(null);
    setPublicationType("website_blog");
    setStatus("not_due");
    setScheduledDate("");
    setTitle("");
    setImageUrl("");
    setContent("");
    setShowModal(true);
  }

  function openEditModal(blog: Blog) {
    setEditingBlog(blog);
    setPublicationType(blog.publication_type);
    setStatus(blog.status);
    setScheduledDate(blog.scheduled_date || "");
    setTitle(blog.title);
    setImageUrl(blog.image_url || "");
    setContent(blog.content || "");
    setShowModal(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `blog-${Date.now()}.${ext}`;
    const filePath = `blogs/${projectId}/${fileName}`;

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
    const wasPublished = editingBlog?.status !== "published" && status === "published";
    
    const data = {
      project_id: projectId,
      publication_type: publicationType,
      status,
      scheduled_date: scheduledDate || null,
      title: title.trim(),
      image_url: imageUrl || null,
      content: content || null,
      updated_at: new Date().toISOString(),
    };

    if (editingBlog) {
      const { error } = await supabaseClient
        .from("website_blogs")
        .update(data)
        .eq("id", editingBlog.id);
      if (error) console.error("Error updating blog:", error);
    } else {
      const { error } = await supabaseClient.from("website_blogs").insert(data);
      if (error) console.error("Error inserting blog:", error);
    }

    // If status changed to published, notify (placeholder for now)
    if (wasPublished || (!editingBlog && status === "published")) {
      console.log("Blog published - notify account manager and Website Blogs users");
    }

    setSaving(false);
    setShowModal(false);
    loadBlogs();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this blog?")) return;
    await supabaseClient.from("website_blogs").delete().eq("id", id);
    loadBlogs();
  }

  // Filter blogs based on active sub-tab
  const filteredBlogs = blogs.filter((b) => {
    if (activeSubTab === "published") return b.status === "published";
    return b.status !== "published"; // "all" shows non-published
  });

  const getStatusStyle = (status: string) => {
    return STATUS_OPTIONS.find((s) => s.value === status)?.color || "bg-slate-100 text-slate-700";
  };

  const getStatusLabel = (status: string) => {
    return STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Blogs & Articles</h2>
          <p className="text-sm text-slate-500">Manage your website blogs and LinkedIn articles</p>
        </div>
        <button
          onClick={openNewModal}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Publication
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab("all")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeSubTab === "all"
              ? "border-violet-500 text-violet-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Blogs & Articles
        </button>
        <button
          onClick={() => setActiveSubTab("published")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeSubTab === "published"
              ? "border-violet-500 text-violet-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Published
        </button>
      </div>

      {/* Blogs List View */}
      {filteredBlogs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100">
            <svg className="h-8 w-8 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14,2 14,8 20,8" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">
            {activeSubTab === "published" ? "No published blogs yet" : "No blogs yet"}
          </h3>
          <p className="mb-4 text-sm text-slate-500">
            {activeSubTab === "published" 
              ? "Published blogs will appear here." 
              : "Create your first website blog or LinkedIn article."}
          </p>
          {activeSubTab !== "published" && (
            <button
              onClick={openNewModal}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add Publication
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {/* List Header - Hidden on mobile */}
          <div className="hidden md:grid grid-cols-[80px_1fr_150px_120px_100px] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
            <span>Image</span>
            <span>Title & Content</span>
            <span>Date</span>
            <span>Status</span>
            <span></span>
          </div>
          {/* List Rows */}
          {filteredBlogs.map((blog) => (
            <div
              key={blog.id}
              className="flex flex-col md:grid md:grid-cols-[80px_1fr_150px_120px_100px] gap-3 md:gap-4 md:items-center px-4 py-3 border-b border-slate-50 hover:bg-violet-50/50 transition-colors"
            >
              {/* Mobile: Top row with image and content */}
              <div className="flex gap-3 md:contents">
                {/* Image */}
                <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                  {blog.image_url ? (
                    <Image
                      src={blog.image_url}
                      alt=""
                      width={64}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="m21 15-5-5L5 21" />
                      </svg>
                    </div>
                  )}
                </div>
                {/* Title & Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {blog.publication_type === "website_blog" ? "📝 Blog" : "💼 LinkedIn"}
                    </span>
                  </div>
                  <h4 className="font-medium text-slate-900 truncate">{blog.title}</h4>
                  <p className="text-sm text-slate-500 line-clamp-1">
                    {truncateContent(blog.content)}
                  </p>
                </div>
              </div>
              {/* Mobile: Bottom row with date, status, actions */}
              <div className="flex items-center justify-between md:contents pl-[76px] md:pl-0">
                {/* Date */}
                <span className="text-sm text-slate-600">
                  {blog.scheduled_date 
                    ? new Date(blog.scheduled_date).toLocaleDateString()
                    : "—"}
                </span>
                {/* Status */}
                <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusStyle(blog.status)}`}>
                  {getStatusLabel(blog.status)}
                </span>
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(blog)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(blog.id)}
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
                {editingBlog ? "Edit Publication" : "Add Publication"}
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
                {/* Publication Type */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Publication</label>
                  <div className="flex gap-3">
                    {PUBLICATION_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setPublicationType(type.value as "website_blog" | "linkedin_article")}
                        className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
                          publicationType === type.value
                            ? "border-violet-500 bg-violet-50 text-violet-700"
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Scheduled Date */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
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
                    <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-violet-300 hover:bg-violet-50/50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                      {uploading ? (
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
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
                    placeholder="Blog title..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black placeholder:text-slate-400 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>

                {/* Content (Rich Text) */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Content</label>
                  <RichTextEditor
                    value={content}
                    onChange={setContent}
                    placeholder="Write your blog content..."
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
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 hover:shadow-xl disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  "Save Blog"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
