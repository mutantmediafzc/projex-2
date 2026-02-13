"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type WorkStatus = "available" | "on_leave" | "wfh";

const STATUS_OPTIONS: { value: WorkStatus; label: string; icon: string; description: string }[] = [
  { value: "available", label: "Available", icon: "🟢", description: "Working from office" },
  { value: "on_leave", label: "On Leave", icon: "🟡", description: "Taking time off" },
  { value: "wfh", label: "WFH", icon: "🏠", description: "Working from home" },
];

export default function StatusPromptModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<WorkStatus>("available");

  useEffect(() => {
    checkIfPromptNeeded();
  }, []);

  async function checkIfPromptNeeded() {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return;

      const { data } = await supabaseClient
        .from("users")
        .select("work_status, status_updated_at")
        .eq("id", session.user.id)
        .single();

      if (!data) return;

      // Check if status was updated today (Dubai time - UTC+4)
      const now = new Date();
      const dubaiOffset = 4 * 60; // Dubai is UTC+4
      const dubaiNow = new Date(now.getTime() + (dubaiOffset + now.getTimezoneOffset()) * 60000);
      
      // Get today's 9am Dubai time
      const today9amDubai = new Date(dubaiNow);
      today9amDubai.setHours(9, 0, 0, 0);

      // If current time is before 9am Dubai, don't prompt
      if (dubaiNow < today9amDubai) return;

      // Check if status was updated after today's 9am Dubai
      if (data.status_updated_at) {
        const lastUpdate = new Date(data.status_updated_at);
        const lastUpdateDubai = new Date(lastUpdate.getTime() + (dubaiOffset + lastUpdate.getTimezoneOffset()) * 60000);
        
        // If last update was today after 9am, don't prompt
        if (lastUpdateDubai >= today9amDubai) return;
      }

      // Check localStorage for dismissed prompt today
      const dismissedKey = `status_prompt_dismissed_${dubaiNow.toDateString()}`;
      if (localStorage.getItem(dismissedKey)) return;

      // Show the prompt
      setSelectedStatus((data.work_status as WorkStatus) || "available");
      setIsOpen(true);
    } catch (err) {
      console.error("Failed to check status prompt:", err);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return;

      await supabaseClient
        .from("users")
        .update({ 
          work_status: selectedStatus,
          status_updated_at: new Date().toISOString()
        })
        .eq("id", session.user.id);

      setIsOpen(false);
      
      // Refresh page to update header status
      window.location.reload();
    } catch (err) {
      console.error("Failed to save status:", err);
    } finally {
      setSaving(false);
    }
  }

  function handleDismiss() {
    // Mark as dismissed for today (Dubai time)
    const now = new Date();
    const dubaiOffset = 4 * 60;
    const dubaiNow = new Date(now.getTime() + (dubaiOffset + now.getTimezoneOffset()) * 60000);
    const dismissedKey = `status_prompt_dismissed_${dubaiNow.toDateString()}`;
    localStorage.setItem(dismissedKey, "true");
    setIsOpen(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200/50 bg-white shadow-2xl">
        {/* Header */}
        <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 px-6 py-5">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm text-2xl">
              👋
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Good Morning!</h2>
              <p className="text-sm text-white/80">What's your status today?</p>
            </div>
          </div>
        </div>

        {/* Status Options */}
        <div className="p-6 space-y-3">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedStatus(option.value)}
              className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                selectedStatus === option.value
                  ? "border-violet-500 bg-violet-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className="text-2xl">{option.icon}</span>
              <div className="flex-1">
                <p className={`font-semibold ${selectedStatus === option.value ? "text-violet-700" : "text-slate-900"}`}>
                  {option.label}
                </p>
                <p className="text-sm text-slate-500">{option.description}</p>
              </div>
              {selectedStatus === option.value && (
                <svg className="h-5 w-5 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 rounded-b-2xl">
          <button
            onClick={handleDismiss}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Ask me later
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25 hover:shadow-xl disabled:opacity-60"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving...
              </>
            ) : (
              "Set Status"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
