"use client";

import { FormEvent, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabaseClient";

type UserRow = {
  id: string;
  email: string | null;
  role: string | null;
  firstName: string | null;
  lastName: string | null;
  designation: string | null;
  is_active?: boolean;
  avatar_url?: string | null;
};

interface Props {
  user: UserRow;
  onClose: () => void;
}

export default function EditUserModal({ user, onClose }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [designation, setDesignation] = useState(user.designation || "");
  const [role, setRole] = useState(user.role || "staff");
  const [isActive, setIsActive] = useState(user.is_active !== false);

  // Password reset state
  const [resettingPassword, setResettingPassword] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // Profile photo state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load user's avatar and current user role on mount
  useEffect(() => {
    async function loadData() {
      try {
        // Load avatar
        const response = await fetch(`/api/users/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setAvatarUrl(data.avatar_url || null);
        }
        
        // Load current user's role
        const { data: { user: currentUser } } = await supabaseClient.auth.getUser();
        if (currentUser) {
          const meta = (currentUser.user_metadata || {}) as Record<string, unknown>;
          setCurrentUserRole((meta.role as string) || "staff");
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      }
    }
    loadData();
  }, [user.id]);

  const handleResetPassword = async () => {
    setResettingPassword(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/${user.id}/reset-password`, {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || "Failed to reset password");
      } else {
        setSuccess("Password reset to 000000");
        setShowResetConfirm(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError("Network error while resetting password");
    } finally {
      setResettingPassword(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarError("Please select a JPG, PNG, or WEBP image");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSelectedImage(ev.target?.result as string);
      setShowCropModal(true);
      setCropPosition({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropPosition.x, y: e.clientY - cropPosition.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    const maxOffset = 200 * zoom;
    setCropPosition({
      x: Math.max(-maxOffset, Math.min(maxOffset, newX)),
      y: Math.max(-maxOffset, Math.min(maxOffset, newY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCropSave = useCallback(async () => {
    if (!selectedImage || !canvasRef.current) return;
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = async () => {
        canvas.width = 256;
        canvas.height = 256;
        const size = Math.min(img.width, img.height) / zoom;
        const scale = Math.min(img.width, img.height) / 256;
        const sx = (img.width - size) / 2 - (cropPosition.x * scale / zoom);
        const sy = (img.height - size) / 2 - (cropPosition.y * scale / zoom);
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 256, 256);
        canvas.toBlob(async (blob) => {
          if (!blob) { setAvatarError("Failed to process image"); setAvatarUploading(false); return; }
          const path = `${user.id}/${Date.now()}.webp`;
          const uploadResult = await supabaseClient.storage.from("user-avatar").upload(path, blob, { upsert: true, contentType: "image/webp" });
          if (uploadResult.error) {
            setAvatarError(`Upload failed: ${uploadResult.error.message}`);
            setAvatarUploading(false);
            return;
          }
          const { data: { publicUrl } } = supabaseClient.storage.from("user-avatar").getPublicUrl(path);
          
          // Update user's avatar via API
          const response = await fetch(`/api/users/${user.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ avatar_url: publicUrl }),
          });
          
          if (!response.ok) {
            setAvatarError("Failed to save avatar");
            setAvatarUploading(false);
            return;
          }
          
          setAvatarUrl(publicUrl);
          setShowCropModal(false);
          setSelectedImage(null);
          setAvatarUploading(false);
          setSuccess("Profile photo updated!");
          setTimeout(() => setSuccess(null), 2000);
        }, "image/webp", 0.85);
      };
      img.src = selectedImage;
    } catch (err) {
      setAvatarError("Unexpected error uploading avatar");
      setAvatarUploading(false);
    }
  }, [selectedImage, zoom, cropPosition, user.id]);

  const handleRemovePhoto = async () => {
    setAvatarUploading(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: null }),
      });
      if (!response.ok) {
        setAvatarError("Failed to remove photo");
        return;
      }
      setAvatarUrl(null);
      setSuccess("Profile photo removed");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setAvatarError("Failed to remove photo");
    } finally {
      setAvatarUploading(false);
    }
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !designation.trim()) {
      setError("All fields are required.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          designation: designation.trim(),
          role,
          is_active: isActive,
        }),
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        setError(json?.error ?? "Failed to update user");
      } else {
        setSuccess("User updated successfully!");
        setTimeout(() => {
          onClose();
          router.refresh();
        }, 1500);
      }
    } catch (err) {
      setError("Network or server error while updating user.");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (response.ok) {
        setIsActive(!isActive);
        setSuccess(`User ${!isActive ? "activated" : "deactivated"} successfully!`);
        setTimeout(() => {
          router.refresh();
        }, 1000);
      } else {
        const json = await response.json().catch(() => null);
        setError(json?.error ?? "Failed to update user status");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/50 bg-white shadow-2xl">
        {/* Header */}
        <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-slate-600 via-gray-600 to-zinc-600 px-6 py-5">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Edit Team Member</h2>
                <p className="text-sm text-white/80">{user.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg bg-white/20 p-2 text-white hover:bg-white/30">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Active Status Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Account Status</p>
              <p className="text-xs text-slate-500">
                {isActive ? "User can access the system" : "User is deactivated and cannot log in"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                isActive ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Reset Password (Admin Only) */}
          {currentUserRole === "admin" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-900">Reset Password</p>
                  <p className="text-xs text-amber-700">Reset user&apos;s password to default (000000)</p>
                </div>
                {!showResetConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-200 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Reset
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      disabled={resettingPassword}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={resettingPassword}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                    >
                      {resettingPassword ? (
                        <>
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Resetting...
                        </>
                      ) : (
                        "Confirm Reset"
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Profile Photo */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900 mb-3">Profile Photo</p>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-200 bg-gradient-to-br from-violet-100 to-purple-100 text-xl font-bold text-violet-600">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt={`${firstName} ${lastName}`} width={64} height={64} className="h-full w-full object-cover" />
                  ) : (
                    <span>{(firstName || user.firstName || "U").charAt(0).toUpperCase()}{(lastName || user.lastName || "").charAt(0).toUpperCase()}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 ${avatarUploading ? "cursor-not-allowed opacity-50" : ""}`}>
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    {avatarUploading ? "Uploading..." : "Upload"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} disabled={avatarUploading} />
                  </label>
                  {avatarUrl && (
                    <button type="button" onClick={handleRemovePhoto} disabled={avatarUploading} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                      Remove
                    </button>
                  )}
                </div>
                {avatarError && <p className="text-[10px] text-red-600">{avatarError}</p>}
                <p className="text-[10px] text-slate-400">JPG, PNG, or WEBP. Max 5MB.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="first_name" className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                First Name *
              </label>
              <input
                id="first_name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-black placeholder:text-slate-400 shadow-sm transition-all focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="last_name" className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                Last Name *
              </label>
              <input
                id="last_name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-black placeholder:text-slate-400 shadow-sm transition-all focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="role" className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                Role *
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black shadow-sm transition-all focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="designation" className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                Designation *
              </label>
              <select
                id="designation"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                required
                className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black shadow-sm transition-all focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="">Select designation...</option>
                <option value="Account Manager">Account Manager</option>
                <option value="Creative Team Lead">Creative Team Lead</option>
                <option value="Creative">Creative</option>
                <option value="Social Media Specialist">Social Media Specialist</option>
                <option value="Performance Marketer">Performance Marketer</option>
                <option value="Project Manager">Project Manager</option>
                <option value="Developer">Developer</option>
                <option value="Designer">Designer</option>
                <option value="Content Writer">Content Writer</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700 flex items-center gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {success}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !!success}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-slate-600 to-gray-600 px-6 py-2 text-sm font-medium text-white shadow-lg shadow-slate-500/25 transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Crop Modal */}
      {showCropModal && selectedImage && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Crop Photo</h3>
            <p className="mt-1 text-xs text-slate-500">Adjust the crop area for the profile photo.</p>
            <div 
              className="relative mt-4 flex h-64 items-center justify-center overflow-hidden rounded-xl bg-slate-900 cursor-move select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img 
                src={selectedImage} 
                alt="Preview" 
                className="max-h-full max-w-full object-contain pointer-events-none" 
                style={{ 
                  transform: `translate(${cropPosition.x}px, ${cropPosition.y}px) scale(${zoom})`,
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }} 
                draggable={false}
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-48 w-48 rounded-full border-4 border-white/80 shadow-lg ring-[9999px] ring-black/40" />
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-500">Drag to reposition • Use slider to zoom</p>
            <div className="mt-3">
              <label className="block text-xs font-medium text-slate-700">Zoom</label>
              <input type="range" min="0.25" max="3" step="0.05" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="mt-1 w-full accent-violet-500" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowCropModal(false); setSelectedImage(null); }} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={handleCropSave} disabled={avatarUploading} className="rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2 text-sm font-medium text-white shadow-lg hover:from-violet-600 hover:to-purple-600 disabled:opacity-50">
                {avatarUploading ? "Saving..." : "Save Photo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
