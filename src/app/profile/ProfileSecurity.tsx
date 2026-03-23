"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabaseClient";

interface ProfileState {
  fullName: string;
  email: string;
  avatarUrl: string | null;
}

export default function ProfileSecurity() {
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      const { data } = await supabaseClient.auth.getUser();
      const user = data.user;
      if (!isMounted || !user) { setProfile(null); return; }
      const meta = (user.user_metadata || {}) as Record<string, unknown>;
      const firstName = (meta["first_name"] as string) || "";
      const lastName = (meta["last_name"] as string) || "";
      const fullName = [firstName, lastName].filter(Boolean).join(" ") || user.email || "";
      setProfile({ fullName, email: user.email ?? "", avatarUrl: (meta["avatar_url"] as string) || null });
    }
    load();
    return () => { isMounted = false; };
  }, []);

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

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - cropPosition.x, y: touch.clientY - cropPosition.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;
    const maxOffset = 200 * zoom;
    setCropPosition({
      x: Math.max(-maxOffset, Math.min(maxOffset, newX)),
      y: Math.max(-maxOffset, Math.min(maxOffset, newY)),
    });
  };

  const handleCropSave = useCallback(async () => {
    if (!profile || !selectedImage || !canvasRef.current) return;
    setAvatarUploading(true);
    setAvatarError(null);
    setAvatarSuccess(null);
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) { setAvatarError("Not logged in"); return; }
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
          // Upload to 'user-avatar' bucket
          const uploadResult = await supabaseClient.storage.from("user-avatar").upload(path, blob, { upsert: true, contentType: "image/webp" });
          if (uploadResult.error) {
            setAvatarError(`Upload failed: ${uploadResult.error.message}`);
            setAvatarUploading(false);
            return;
          }
          const { data: { publicUrl } } = supabaseClient.storage.from("user-avatar").getPublicUrl(path);
          const { error: updateError } = await supabaseClient.auth.updateUser({ data: { avatar_url: publicUrl } });
          if (updateError) { setAvatarError(updateError.message); setAvatarUploading(false); return; }
          setProfile({ ...profile, avatarUrl: publicUrl });
          setAvatarSuccess("Profile photo updated!");
          setShowCropModal(false);
          setSelectedImage(null);
          setAvatarUploading(false);
        }, "image/webp", 0.85);
      };
      img.src = selectedImage;
    } catch (err) {
      setAvatarError("Unexpected error uploading avatar");
      setAvatarUploading(false);
    }
  }, [profile, selectedImage, zoom, cropPosition]);

  const handleRemovePhoto = async () => {
    if (!profile) return;
    setAvatarUploading(true);
    try {
      const { error } = await supabaseClient.auth.updateUser({ data: { avatar_url: null } });
      if (error) { setAvatarError(error.message); return; }
      setProfile({ ...profile, avatarUrl: null });
      setAvatarSuccess("Profile photo removed");
    } catch (err) {
      setAvatarError("Failed to remove photo");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    if (newPassword.length < 6) { setPasswordError("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match"); return; }
    setPasswordSaving(true);
    try {
      const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
      if (error) { setPasswordError(error.message); return; }
      setPasswordSuccess("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError("Failed to update password");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (!profile) return <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">Loading profile...</div>;

  return (
    <div className="space-y-6">
      {/* Profile Photo Section */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-lg backdrop-blur">
        <h3 className="text-sm font-semibold text-slate-900">Profile Photo</h3>
        <p className="mt-1 text-xs text-slate-500">Upload a profile photo. Supported formats: JPG, PNG, WEBP.</p>
        <div className="mt-4 flex items-center gap-6">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-violet-100 to-purple-100 text-2xl font-bold text-violet-600 shadow-lg">
              {profile.avatarUrl ? (
                <Image src={profile.avatarUrl} alt={profile.fullName} width={96} height={96} className="h-full w-full object-cover" />
              ) : (
                <span>{profile.fullName.charAt(0).toUpperCase() || "U"}</span>
              )}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 ${avatarUploading ? "cursor-not-allowed opacity-50" : ""}`}>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                {avatarUploading ? "Uploading..." : "Upload Photo"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} disabled={avatarUploading} />
              </label>
              {profile.avatarUrl && (
                <button onClick={handleRemovePhoto} disabled={avatarUploading} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-100 disabled:opacity-50">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  Remove
                </button>
              )}
            </div>
            {avatarError && <p className="text-xs text-red-600">{avatarError}</p>}
            {avatarSuccess && <p className="text-xs text-emerald-600">{avatarSuccess}</p>}
          </div>
        </div>
      </div>

      {/* Password Change Section */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-lg backdrop-blur">
        <h3 className="text-sm font-semibold text-slate-900">Change Password</h3>
        <p className="mt-1 text-xs text-slate-500">Update your account password for security.</p>
        <form onSubmit={handlePasswordChange} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500" placeholder="••••••••" />
            </div>
          </div>
          {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
          {passwordSuccess && <p className="text-xs text-emerald-600">{passwordSuccess}</p>}
          <button type="submit" disabled={passwordSaving} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25 hover:from-violet-600 hover:to-purple-600 disabled:opacity-50">
            {passwordSaving ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

      {/* Account Info */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-lg backdrop-blur">
        <h3 className="text-sm font-semibold text-slate-900">Account Information</h3>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
            <span className="text-xs font-medium text-slate-500">Full Name</span>
            <span className="text-sm font-medium text-slate-900">{profile.fullName}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
            <span className="text-xs font-medium text-slate-500">Email</span>
            <span className="text-sm font-medium text-slate-900">{profile.email}</span>
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      {showCropModal && selectedImage && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Crop Photo</h3>
            <p className="mt-1 text-xs text-slate-500">Adjust the crop area for your profile photo.</p>
            <div 
              ref={cropContainerRef}
              className="relative mt-4 flex h-64 items-center justify-center overflow-hidden rounded-xl bg-slate-900 cursor-move select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
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
              <button onClick={() => { setShowCropModal(false); setSelectedImage(null); }} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={handleCropSave} disabled={avatarUploading} className="rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2 text-sm font-medium text-white shadow-lg hover:from-violet-600 hover:to-purple-600 disabled:opacity-50">
                {avatarUploading ? "Saving..." : "Save Photo"}
              </button>
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
