"use client";

import { useState, useEffect, useRef } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type WorkStatus = "available" | "on_leave" | "wfh";

const STATUS_CONFIG: Record<WorkStatus, { label: string; color: string; bg: string; icon: string }> = {
  available: { 
    label: "Available", 
    color: "text-emerald-700", 
    bg: "bg-emerald-100",
    icon: "🟢"
  },
  on_leave: { 
    label: "On Leave", 
    color: "text-amber-700", 
    bg: "bg-amber-100",
    icon: "🟡"
  },
  wfh: { 
    label: "WFH", 
    color: "text-blue-700", 
    bg: "bg-blue-100",
    icon: "🏠"
  },
};

interface Props {
  onStatusChange?: (status: WorkStatus) => void;
}

export default function UserStatusDropdown({ onStatusChange }: Props) {
  const [status, setStatus] = useState<WorkStatus>("available");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadStatus() {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return;

      const { data } = await supabaseClient
        .from("users")
        .select("work_status")
        .eq("id", session.user.id)
        .single();

      if (data?.work_status) {
        setStatus(data.work_status as WorkStatus);
      }
    } catch (err) {
      console.error("Failed to load status:", err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus: WorkStatus) {
    setStatus(newStatus);
    setIsOpen(false);

    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return;

      await supabaseClient
        .from("users")
        .update({ 
          work_status: newStatus,
          status_updated_at: new Date().toISOString()
        })
        .eq("id", session.user.id);

      onStatusChange?.(newStatus);
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex h-8 w-8 items-center justify-center">
        <div className="h-3 w-3 animate-pulse rounded-full bg-slate-300" />
      </div>
    );
  }

  const currentConfig = STATUS_CONFIG[status];

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all hover:shadow-sm ${currentConfig.bg} ${currentConfig.color}`}
      >
        <span>{currentConfig.icon}</span>
        <span className="hidden sm:inline">{currentConfig.label}</span>
        <svg className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {(Object.keys(STATUS_CONFIG) as WorkStatus[]).map((key) => {
            const config = STATUS_CONFIG[key];
            const isActive = status === key;
            return (
              <button
                key={key}
                onClick={() => updateStatus(key)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-colors ${
                  isActive 
                    ? `${config.bg} ${config.color}` 
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{config.icon}</span>
                {config.label}
                {isActive && (
                  <svg className="ml-auto h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
