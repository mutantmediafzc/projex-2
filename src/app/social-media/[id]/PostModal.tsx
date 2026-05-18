"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";
import { PLATFORM_ICONS, EMOJI_LIST } from "./socialMediaUtils";

// Helper to properly encode image URLs with spaces in path
function getImageUrl(url: string | null): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return url.split("/").map((segment, i) => i === 0 ? segment : encodeURIComponent(decodeURIComponent(segment))).join("/");
}

// Validate image URL exists (returns true if valid, false if 404)
async function validateImageUrl(url: string): Promise<boolean> {
  if (!url) return true;
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

type WorkflowStatus = "production" | "creatives_approval" | "creative_approval" | "captions" | "final_approval" | "for_publishing" | "published";
type PostType = "organic" | "boosted";
type ShootStatus = "pending" | "scheduled" | "completed" | "cancelled";

type Post = {
  id: string;
  platforms: string[];
  subject: string | null;
  caption: string | null;
  media_urls: { url: string; type: "image" | "video" }[];
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: "draft" | "pending" | "approved" | "published";
  workflow_status: WorkflowStatus;
  hashtags: string[];
  post_type: PostType;
  content_type: string | null;
  image_asset_url: string | null;
  video_url: string | null;
  first_comment: string | null;
  shoot_status: ShootStatus;
  shoot_date: string | null;
  shoot_time: string | null;
  shoot_count: number;
  raw_assets_link: string | null;
  shoot_notes: string | null;
  creative_notes: string | null;
  danote_board_id: string | null;
  platform_budgets: Record<string, number>;
  published_urls: Record<string, string>;
  assigned_creative_ids: string[];
  created_at: string;
};

type DanoteBoard = {
  id: string;
  name: string;
};

type ProjectInfo = {
  id: string;
  name: string;
  brand_color: string | null;
  company: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
};

type Props = {
  post: Post | null;
  projectId: string;
  projectInfo?: ProjectInfo | null;
  availablePlatforms: string[];
  onClose: () => void;
  onSaved: () => void;
};

const WORKFLOW_STEPS: { key: WorkflowStatus; label: string }[] = [
  { key: "production", label: "Production" },
  { key: "creatives_approval", label: "Creative Development" },
  { key: "creative_approval", label: "Creative Approval" },
  { key: "captions", label: "Copywriting" },
  { key: "final_approval", label: "Final Approval" },
  { key: "for_publishing", label: "Scheduled" },
  { key: "published", label: "Live" },
];

const CONTENT_TYPES = [
  "Reel (9:16)",
  "Static Post (4:5)",
  "Static Post (4:5) + Story (9:16)",
  "Story (9:16)",
  "Carousel Post (4:5)",
  "Long-Form Video (16:9)",
  "WhatsApp (1:1)",
  "Ad Creatives (Check dimensions on notes)",
];

export default function PostModal({ post, projectId, projectInfo, availablePlatforms, onClose, onSaved }: Props) {
  // Basic fields - auto-select IG and FB for new posts
  const [platforms, setPlatforms] = useState<string[]>(post?.platforms || ["instagram", "facebook"]);
  const [subject, setSubject] = useState(post?.subject || "");
  const [caption, setCaption] = useState(post?.caption || "");
  const [scheduledDate, setScheduledDate] = useState(post?.scheduled_date ? post.scheduled_date.slice(0, 10) : "");
  const [scheduledTime, setScheduledTime] = useState(post?.scheduled_time || "12:00");
  const [status, setStatus] = useState<Post["status"]>(post?.status || "draft");
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>(post?.workflow_status || "production");
  const [hashtags, setHashtags] = useState(post?.hashtags?.join(" ") || "");
  
  // New fields
  const [postType, setPostType] = useState<PostType>(post?.post_type || "organic");
  const [contentType, setContentType] = useState(post?.content_type || "");
  const [imageAssetUrl, setImageAssetUrl] = useState(post?.image_asset_url || "");
  const [videoUrl, setVideoUrl] = useState(post?.video_url || "");
  const [firstComment, setFirstComment] = useState(post?.first_comment || "");
  const [platformBudgets, setPlatformBudgets] = useState<Record<string, number>>(post?.platform_budgets || {});
  
  // Shoot details
  const [shootStatus, setShootStatus] = useState<ShootStatus>(post?.shoot_status || "pending");
  const [shootDate, setShootDate] = useState(post?.shoot_date || "");
  const [shootTime, setShootTime] = useState(post?.shoot_time || "");
  const [shootCount, setShootCount] = useState(post?.shoot_count || 0);
  const [rawAssetsLink, setRawAssetsLink] = useState(post?.raw_assets_link || "");
  const [shootNotes, setShootNotes] = useState(post?.shoot_notes || "");
  
  // Creatives
  const [creativeNotes, setCreativeNotes] = useState(post?.creative_notes || "");
  const [assignedCreativeIds, setAssignedCreativeIds] = useState<string[]>(post?.assigned_creative_ids || []);
  const [creativeSearch, setCreativeSearch] = useState("");
  const [showCreativeSuggestions, setShowCreativeSuggestions] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string }[]>([]);
  
  // Danote board association
  const [danoteBoardId, setDanoteBoardId] = useState(post?.danote_board_id || "");
  const [danoteBoards, setDanoteBoards] = useState<DanoteBoard[]>([]);
  const [boardSearch, setBoardSearch] = useState("");
  const [showBoardDropdown, setShowBoardDropdown] = useState(false);
  const [selectedBoardName, setSelectedBoardName] = useState("");
  
  // UI state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Sync state when post prop changes (rehydration)
  useEffect(() => {
    if (post) {
      setPlatforms(post.platforms || ["instagram", "facebook"]);
      setSubject(post.subject || "");
      setCaption(post.caption || "");
      setScheduledDate(post.scheduled_date ? post.scheduled_date.slice(0, 10) : "");
      setScheduledTime(post.scheduled_time || "12:00");
      setStatus(post.status || "draft");
      setWorkflowStatus(post.workflow_status || "captions");
      setHashtags(post.hashtags?.join(" ") || "");
      setPostType(post.post_type || "organic");
      setContentType(post.content_type || "");
      setImageAssetUrl(post.image_asset_url || "");
      setVideoUrl(post.video_url || "");
      setFirstComment(post.first_comment || "");
      setPlatformBudgets(post.platform_budgets || {});
      setShootStatus(post.shoot_status || "pending");
      setShootDate(post.shoot_date || "");
      setShootTime(post.shoot_time || "");
      setShootCount(post.shoot_count || 0);
      setRawAssetsLink(post.raw_assets_link || "");
      setShootNotes(post.shoot_notes || "");
      setCreativeNotes(post.creative_notes || "");
      setAssignedCreativeIds(post.assigned_creative_ids || []);
      setDanoteBoardId(post.danote_board_id || "");
    }
  }, [post]);

  // Fetch all users for Assigned Creatives
  useEffect(() => {
    async function fetchUsers() {
      const { data } = await supabaseClient.from("users").select("id, full_name").order("full_name");
      if (data) setAllUsers(data.map((u: any) => ({ id: u.id, name: u.full_name || u.id })));
    }
    fetchUsers();
  }, []);

  // Fetch Danote boards
  useEffect(() => {
    async function fetchBoards() {
      const { data } = await supabaseClient.from("danote_boards").select("id, name").order("name");
      if (data) {
        setDanoteBoards(data);
        // Set initial selected board name if editing
        if (post?.danote_board_id) {
          const board = data.find(b => b.id === post.danote_board_id);
          if (board) setSelectedBoardName(board.name);
        }
      }
    }
    fetchBoards();
  }, [post?.danote_board_id]);

  const hashtagCount = (caption.match(/#\w+/g) || []).length + (hashtags.match(/#?\w+/g) || []).length;

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const insertEmoji = (emoji: string) => {
    setCaption((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `social-posts/${projectId}/${fileName}`;
    
    const { error } = await supabaseClient.storage.from("social-media").upload(filePath, file);
    if (!error) {
      const { data: { publicUrl } } = supabaseClient.storage.from("social-media").getPublicUrl(filePath);
      setImageAssetUrl(publicUrl);
    }
    setUploadingImage(false);
  };

  const updatePlatformBudget = (platform: string, budget: number) => {
    setPlatformBudgets(prev => ({ ...prev, [platform]: budget }));
  };

  async function handleSubmit() {
    // Validate mandatory fields
    const errors: string[] = [];
    if (!scheduledDate) errors.push("Date is required");
    if (!contentType) errors.push("Content Type is required");
    if (!subject.trim()) errors.push("Subject is required");
    if (platforms.length === 0) errors.push("At least one platform is required");
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    
    setSaving(true);
    
    // Validate image URL before saving - clear if invalid (404)
    let validImageUrl: string | null = imageAssetUrl;
    if (imageAssetUrl) {
      const isValid = await validateImageUrl(imageAssetUrl);
      if (!isValid) {
        validImageUrl = null;
        setImageAssetUrl("");
      }
    }
    
    const postData = {
      project_id: projectId,
      platforms,
      subject: subject || null,
      caption,
      scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : null,
      scheduled_time: scheduledTime || null,
      status,
      workflow_status: workflowStatus,
      hashtags: hashtags.split(/\s+/).filter(Boolean).map((h) => h.replace(/^#/, "")),
      post_type: postType,
      content_type: contentType || null,
      image_asset_url: validImageUrl || null,
      video_url: videoUrl || null,
      first_comment: firstComment || null,
      shoot_status: shootStatus,
      shoot_date: shootDate || null,
      shoot_time: shootTime || null,
      shoot_count: shootCount,
      raw_assets_link: rawAssetsLink || null,
      shoot_notes: shootNotes || null,
      creative_notes: creativeNotes || null,
      assigned_creative_ids: assignedCreativeIds,
      danote_board_id: danoteBoardId || null,
      platform_budgets: platformBudgets,
    };

    // DEBUG: Log what we're saving
    console.log("=== SAVING POST DATA ===");
    console.log("video_url:", videoUrl);
    console.log("shoot_notes:", shootNotes);
    console.log("shoot_status:", shootStatus);
    console.log("shoot_date:", shootDate);
    console.log("shoot_time:", shootTime);
    console.log("Full postData:", postData);

    const oldStatus = post?.workflow_status;
    let savedPostId = post?.id;

    if (post) {
      const { data: updateData, error: updateError } = await supabaseClient.from("social_posts").update(postData).eq("id", post.id).select();
      console.log("=== UPDATE RESPONSE ===");
      console.log("updateData:", updateData);
      console.log("updateError:", updateError);
      if (updateData && updateData[0]) {
        console.log("Saved video_url:", updateData[0].video_url);
        console.log("Saved shoot_notes:", updateData[0].shoot_notes);
      }
      if (updateError) {
        console.error("Error updating post:", updateError);
        setValidationErrors([`Failed to save: ${updateError.message}`]);
        setSaving(false);
        return;
      }
    } else {
      const { data: newPost, error: insertError } = await supabaseClient.from("social_posts").insert(postData).select("id").single();
      if (insertError) {
        console.error("Error inserting post:", insertError);
        setValidationErrors([`Failed to save: ${insertError.message}`]);
        setSaving(false);
        return;
      }
      savedPostId = newPost?.id;
    }

    // Send workflow notifications if status changed
    if (savedPostId && workflowStatus !== oldStatus) {
      try {
        await fetch("/api/social-media/notify-workflow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId: savedPostId,
            projectId,
            newStatus: workflowStatus,
            oldStatus: oldStatus || null,
            postData: {
              subject,
              caption,
              content_type: contentType,
              image_asset_url: imageAssetUrl,
              post_type: postType,
              scheduled_date: scheduledDate || null,
            },
          }),
        });
      } catch (err) {
        console.error("Failed to send workflow notifications:", err);
      }
    }

    setSaving(false);
    onSaved();
  }

  async function handleDelete() {
    if (!post || !confirm("Delete this post?")) return;
    await supabaseClient.from("social_posts").delete().eq("id", post.id);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-start justify-center bg-black/50 overflow-y-auto py-4 px-2 sm:px-4">
      <div className="flex flex-col sm:flex-row w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl my-auto">
        {/* Left: Image/Video Preview Area - Hidden on mobile, shown at top */}
        <div className="hidden sm:flex w-72 bg-slate-100 flex-shrink-0 flex-col items-center p-4 border-r border-slate-200">
          {/* Brand Header Link */}
          {projectInfo && (
            <Link
              href={`/social-media/${projectInfo.id}`}
              className="w-full mb-4 flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 hover:border-pink-300 hover:bg-pink-50 transition-all group"
              title={`Go to ${projectInfo.name} calendar`}
            >
              {projectInfo.company?.logo_url ? (
                <img src={projectInfo.company.logo_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <span 
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: projectInfo.brand_color || "#ec4899" }}
                >
                  {projectInfo.name[0]}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-900 truncate group-hover:text-pink-600">{projectInfo.name}</p>
                <p className="text-[10px] text-slate-400">View Calendar →</p>
              </div>
            </Link>
          )}
          
          {imageAssetUrl ? (
            <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden bg-white shadow">
              <img src={getImageUrl(imageAssetUrl)} alt="Post asset" className="w-full h-full object-contain bg-slate-50" />
              <div className="absolute top-2 right-2 flex gap-1">
                <button onClick={() => imageInputRef.current?.click()} className="p-1.5 bg-white rounded-lg shadow hover:bg-slate-50" title="Replace">
                  <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"/></svg>
                </button>
                <button onClick={() => setImageAssetUrl("")} className="p-1.5 bg-white rounded-lg shadow hover:bg-red-50" title="Delete">
                  <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => imageInputRef.current?.click()} disabled={uploadingImage}
              className="w-full aspect-[4/5] rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 hover:border-purple-400 hover:bg-purple-50/50 transition-colors">
              {uploadingImage ? (
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
              ) : (
                <>
                  <svg className="w-12 h-12 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  <span className="text-sm text-slate-500">Upload Image</span>
                  <span className="text-[10px] text-slate-400">4:5 ratio recommended</span>
                </>
              )}
            </button>
          )}
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          
          {/* Asset URL Preview */}
          {videoUrl && (
            <button onClick={() => setShowVideoPreview(true)} className="mt-3 w-full py-2 px-3 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 flex items-center justify-center gap-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              Open Asset
            </button>
          )}
        </div>

        {/* Main Editor */}
        <div className="flex-1 overflow-y-auto max-h-[85vh]">
          {/* Header with workflow tabs */}
          <div className="sticky top-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 z-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-semibold text-black">{post ? "Edit Post" : "Create Post"}</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            
            {/* Workflow Status Tabs */}
            <div className="flex flex-wrap gap-1.5 pb-1">
              {WORKFLOW_STEPS.map((step) => {
                // Content types that require production (shoots)
                const PRODUCTION_CONTENT_TYPES = ["Reel (9:16)", "Long-Form Video (16:9)"];
                const requiresProduction = PRODUCTION_CONTENT_TYPES.includes(contentType);
                
                // Rule: Production tab - can only move forward if shoot is completed with raw assets link
                const stagesAfterProduction = ["creatives_approval", "creative_approval", "captions", "final_approval", "for_publishing", "published"];
                const cannotLeaveProduction = workflowStatus === "production" && stagesAfterProduction.includes(step.key) && 
                  requiresProduction && (shootStatus !== "completed" || !rawAssetsLink);
                
                // Rule: Creative Development - can only move forward if image/cover is added
                const stagesAfterCreatives = ["creative_approval", "captions", "final_approval", "for_publishing", "published"];
                const cannotLeaveCreatives = workflowStatus === "creatives_approval" && stagesAfterCreatives.includes(step.key) && !imageAssetUrl;
                
                // Rule: Items in Captions or later stages cannot move forward without caption
                const stagesAfterCaptions = ["final_approval", "for_publishing", "published"];
                const cannotLeaveCaptions = workflowStatus === "captions" && stagesAfterCaptions.includes(step.key) && !caption.trim();
                
                // Rule: Boosted items in Publishing cannot move to Published if total boost is 0
                const totalBudget = Object.values(platformBudgets).reduce((sum, b) => sum + (b || 0), 0);
                const cannotPublishBoosted = workflowStatus === "for_publishing" && step.key === "published" && postType === "boosted" && totalBudget === 0;
                
                const isDisabled = cannotLeaveProduction || cannotLeaveCreatives || cannotLeaveCaptions || cannotPublishBoosted;
                
                // Build tooltip message
                let tooltipMessage = "";
                if (cannotLeaveProduction) tooltipMessage = "Complete shoot and add raw assets link first";
                else if (cannotLeaveCreatives) tooltipMessage = "Add image/cover first";
                else if (cannotLeaveCaptions) tooltipMessage = "Add caption first";
                else if (cannotPublishBoosted) tooltipMessage = "Set boost budget first";
                
                return (
                  <button 
                    key={step.key} 
                    onClick={() => !isDisabled && setWorkflowStatus(step.key)}
                    disabled={isDisabled}
                    title={tooltipMessage}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                      workflowStatus === step.key 
                        ? "bg-purple-600 text-white" 
                        : isDisabled
                        ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}>
                    {step.label}
                  </button>
                );
              })}
            </div>
            {/* Validation warnings */}
            {workflowStatus === "production" && ["Reel (9:16)", "Long-Form Video (16:9)"].includes(contentType) && (shootStatus !== "completed" || !rawAssetsLink) && (
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                {shootStatus !== "completed" ? "Mark shoot as completed" : "Add raw assets link"} to move forward
              </p>
            )}
            {workflowStatus === "creatives_approval" && !imageAssetUrl && (
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                Add image/cover to move forward
              </p>
            )}
            {workflowStatus === "captions" && !caption.trim() && (
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                Add caption to move forward
              </p>
            )}
            {workflowStatus === "for_publishing" && postType === "boosted" && Object.values(platformBudgets).reduce((sum, b) => sum + (b || 0), 0) === 0 && (
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                Set boost budget to publish boosted post
              </p>
            )}
          </div>

          <div className="p-4 sm:p-6 space-y-5">
            {/* Mobile Image Upload - Only shown on mobile */}
            <div className="sm:hidden">
              <label className="mb-1.5 block text-xs font-medium text-slate-600">📷 Image</label>
              <div className="flex items-center gap-3">
                {imageAssetUrl ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                    <img src={getImageUrl(imageAssetUrl)} alt="Post" className="w-full h-full object-cover" />
                    <button onClick={() => setImageAssetUrl("")} className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <button onClick={() => imageInputRef.current?.click()} disabled={uploadingImage}
                    className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center hover:border-purple-400 flex-shrink-0">
                    {uploadingImage ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-500 border-t-transparent" />
                    ) : (
                      <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                    )}
                  </button>
                )}
                <span className="text-xs text-slate-500">{imageAssetUrl ? "Tap X to remove" : "Tap to upload"}</span>
              </div>
            </div>
            
            {/* Post Details Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                Post Details
              </h3>
              
              {/* Date & Time Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">📅 Date <span className="text-red-500">*</span></label>
                  <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-black focus:border-purple-300 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">🕐 Time</label>
                  <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-black focus:border-purple-300 focus:outline-none" />
                </div>
              </div>

              {/* Content Type */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">🎬 Content Type <span className="text-red-500">*</span></label>
                <select value={contentType} onChange={(e) => setContentType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-black focus:border-purple-300 focus:outline-none">
                  <option value="">Select type...</option>
                  {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Organic/Boosted */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">💰 Post Type</label>
                <select value={postType} onChange={(e) => setPostType(e.target.value as PostType)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-black focus:border-purple-300 focus:outline-none">
                  <option value="organic">Organic</option>
                  <option value="boosted">Boosted</option>
                </select>
              </div>

              {/* Platform budgets for boosted posts */}
              {postType === "boosted" && (
                <div className="bg-amber-50 rounded-lg p-3 space-y-2">
                  <label className="block text-xs font-medium text-amber-800">Platform Budgets</label>
                  {[...platforms, "youtube", "google"].filter((p, i, arr) => arr.indexOf(p) === i).map(p => (
                    <div key={p} className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 w-20 capitalize">{p}</span>
                      <input type="number" value={platformBudgets[p] || 0} onChange={(e) => updatePlatformBudget(p, Number(e.target.value))}
                        className="flex-1 rounded border border-amber-200 bg-white px-2 py-1 text-sm text-black" placeholder="0" />
                    </div>
                  ))}
                </div>
              )}

              {/* Platforms with budget */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">📱 Platforms <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {[...new Set([...availablePlatforms, "youtube", "whatsapp", "pinterest"])].map((p) => (
                    <button key={p} type="button" onClick={() => togglePlatform(p)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                        platforms.includes(p) 
                          ? "border-purple-300 bg-purple-50 text-purple-700" 
                          : "border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}>
                      {platforms.includes(p) && <span className="text-green-500">✓</span>}
                      {PLATFORM_ICONS[p.toLowerCase()]}
                      <span className="capitalize">{p}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">📌 Subject <span className="text-red-500">*</span></label>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                  placeholder="Short title for calendar display..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:border-purple-300 focus:outline-none" />
              </div>

              {/* Caption */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600">✏️ Caption</label>
                  <span className="text-xs text-slate-400">{caption.length} chars</span>
                </div>
                <div className="relative">
                  <textarea ref={captionRef} value={caption} onChange={(e) => setCaption(e.target.value)} rows={4}
                    placeholder="Write your caption here..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:border-purple-300 focus:outline-none resize-none" />
                  <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="absolute bottom-2 right-2 p-1.5 rounded hover:bg-slate-100 text-lg">😀</button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-10 right-0 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-xl z-20">
                      <div className="grid grid-cols-8 gap-1">
                        {EMOJI_LIST.map((emoji) => (
                          <button key={emoji} type="button" onClick={() => insertEmoji(emoji)}
                            className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100">{emoji}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* First Comment */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">💬 First Comment</label>
                <input type="text" value={firstComment} onChange={(e) => setFirstComment(e.target.value)}
                  placeholder="First comment after posting..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:border-purple-300 focus:outline-none" />
              </div>

              {/* Asset URL */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">📦 Asset URL</label>
                <div className="flex gap-2">
                  <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:border-purple-300 focus:outline-none" />
                  {videoUrl && (
                    <button onClick={() => setShowVideoPreview(true)} className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200">
                      Preview
                    </button>
                  )}
                </div>
              </div>

              {/* Danote Board Association - Searchable */}
              <div className="relative">
                <label className="mb-1.5 block text-xs font-medium text-slate-600">📋 Link to Danote Board</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                    type="text"
                    value={showBoardDropdown ? boardSearch : selectedBoardName}
                    onChange={(e) => {
                      setBoardSearch(e.target.value);
                      setShowBoardDropdown(true);
                    }}
                    onFocus={() => setShowBoardDropdown(true)}
                    placeholder="Search boards..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:border-purple-300 focus:outline-none pr-8"
                  />
                  {selectedBoardName && (
                      <button
                        type="button"
                        onClick={() => {
                          setDanoteBoardId("");
                          setSelectedBoardName("");
                          setBoardSearch("");
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    )}
                  </div>
                  {danoteBoardId && (
                    <a
                      href={`/danote/${danoteBoardId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 whitespace-nowrap"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      Open Board
                    </a>
                  )}
                </div>
                {showBoardDropdown && (
                  <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {danoteBoards
                      .filter(board => board.name.toLowerCase().includes(boardSearch.toLowerCase()))
                      .slice(0, 10)
                      .map(board => (
                        <button
                          key={board.id}
                          type="button"
                          onClick={() => {
                            setDanoteBoardId(board.id);
                            setSelectedBoardName(board.name);
                            setBoardSearch("");
                            setShowBoardDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-purple-50 flex items-center gap-2 ${
                            danoteBoardId === board.id ? "bg-purple-50 text-purple-700" : "text-slate-700"
                          }`}
                        >
                          <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                          {board.name}
                        </button>
                      ))}
                    {danoteBoards.filter(board => board.name.toLowerCase().includes(boardSearch.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-sm text-slate-400">No boards found</div>
                    )}
                  </div>
                )}
                {showBoardDropdown && (
                  <div className="fixed inset-0 z-10" onClick={() => setShowBoardDropdown(false)} />
                )}
              </div>
            </div>

            {/* Shoot Details Section */}
            <div className="border-t border-slate-200 pt-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                Shoot Details
              </h3>
              
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">📋 Status</label>
                <select value={shootStatus} onChange={(e) => setShootStatus(e.target.value as ShootStatus)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-black focus:border-purple-300 focus:outline-none">
                  <option value="pending">Pending</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">📅 Shoot Date</label>
                  <input type="date" value={shootDate} onChange={(e) => setShootDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-black focus:border-purple-300 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">🕐 Shoot Time</label>
                  <input type="time" value={shootTime} onChange={(e) => setShootTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-black focus:border-purple-300 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">📸 Shot Count</label>
                <input type="number" value={shootCount} onChange={(e) => setShootCount(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-black focus:border-purple-300 focus:outline-none" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">� Raw Assets Link</label>
                <input type="url" value={rawAssetsLink} onChange={(e) => setRawAssetsLink(e.target.value)}
                  placeholder="Link to raw assets folder..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:border-purple-300 focus:outline-none" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">�📝 Shoot Notes</label>
                <textarea value={shootNotes} onChange={(e) => setShootNotes(e.target.value)} rows={3}
                  placeholder="Notes about the shoot..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:border-purple-300 focus:outline-none resize-none" />
              </div>
            </div>

            {/* Creatives Section */}
            <div className="border-t border-slate-200 pt-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
                Creatives
              </h3>
              
              {/* Assigned Creatives */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">🎨 Assigned Creatives</label>
                {assignedCreativeIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {assignedCreativeIds.map((id) => {
                      const user = allUsers.find((u) => u.id === id);
                      return (
                        <span key={id} className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                          {user?.name || id}
                          <button type="button" onClick={() => setAssignedCreativeIds((prev) => prev.filter((x) => x !== id))} className="ml-0.5 hover:text-purple-900">×</button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="relative">
                  <input
                    type="text"
                    value={creativeSearch}
                    onChange={(e) => { setCreativeSearch(e.target.value); setShowCreativeSuggestions(true); }}
                    onFocus={() => setShowCreativeSuggestions(true)}
                    placeholder="Search and add creatives..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:border-purple-300 focus:outline-none"
                  />
                  {showCreativeSuggestions && creativeSearch && (
                    <div className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                      {allUsers
                        .filter((u) => u.name.toLowerCase().includes(creativeSearch.toLowerCase()) && !assignedCreativeIds.includes(u.id))
                        .slice(0, 8)
                        .map((u) => (
                          <button key={u.id} type="button"
                            className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-purple-50"
                            onClick={() => { setAssignedCreativeIds((prev) => [...prev, u.id]); setCreativeSearch(""); setShowCreativeSuggestions(false); }}>
                            <span className="font-medium text-slate-800">{u.name}</span>
                          </button>
                        ))}
                      {allUsers.filter((u) => u.name.toLowerCase().includes(creativeSearch.toLowerCase()) && !assignedCreativeIds.includes(u.id)).length === 0 && (
                        <div className="px-3 py-2 text-sm text-slate-400">No users found</div>
                      )}
                    </div>
                  )}
                  {showCreativeSuggestions && (
                    <div className="fixed inset-0 z-10" onClick={() => setShowCreativeSuggestions(false)} />
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">📝 Creative Notes</label>
                <textarea value={creativeNotes} onChange={(e) => setCreativeNotes(e.target.value)} rows={3}
                  placeholder="Notes for the creative team..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:border-purple-300 focus:outline-none resize-none" />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4">
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-medium text-red-700 mb-1">Please fix the following errors:</p>
                <ul className="text-xs text-red-600 space-y-0.5">
                  {validationErrors.map((error, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <span>•</span> {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex items-center justify-between">
              {post && (
                <button type="button" onClick={handleDelete} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              )}
              <div className="ml-auto flex items-center gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">
                  Cancel
                </button>
                <button type="button" onClick={handleSubmit} disabled={saving}
                  className="px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 shadow-lg shadow-purple-500/25">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Preview Modal */}
      {showVideoPreview && videoUrl && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70" onClick={() => setShowVideoPreview(false)}>
          <div className="bg-white rounded-xl p-4 max-w-2xl w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-black">Video Preview</h3>
              <button onClick={() => setShowVideoPreview(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden">
              <iframe src={videoUrl} className="w-full h-full" allowFullScreen />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
