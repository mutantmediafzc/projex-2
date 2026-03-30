"use client";

import { useState, useEffect, useRef } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type User = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  designation: string | null;
  avatar_url: string | null;
};

type TeamAssignment = {
  account_manager_id: string | null;
  creative_team_lead_id: string | null;
  creative_id: string | null;
  social_media_specialist_id: string | null;
  performance_marketer_id: string | null;
};

type Props = {
  projectId: string;
  onUpdate?: () => void;
};

const ROLE_CONFIG = [
  { 
    key: "account_manager_id" as const, 
    label: "Account Manager", 
    icon: "👔",
    description: "Manages client relationship"
  },
  { 
    key: "creative_team_lead_id" as const, 
    label: "Creative Team Lead", 
    icon: "🎨",
    description: "Leads creative direction"
  },
  { 
    key: "creative_id" as const, 
    label: "Creative", 
    icon: "✏️",
    description: "Creates visual assets"
  },
  { 
    key: "social_media_specialist_id" as const, 
    label: "Social Media Specialist", 
    icon: "📱",
    description: "Handles captions & publishing"
  },
  { 
    key: "performance_marketer_id" as const, 
    label: "Performance Marketer", 
    icon: "📊",
    description: "Manages boosted content"
  },
];

function SearchableUserDropdown({ 
  users, 
  value, 
  onChange, 
  disabled 
}: { 
  users: User[]; 
  value: string | null; 
  onChange: (userId: string | null) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedUser = users.find(u => u.id === value);
  const displayName = selectedUser 
    ? [selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(" ") || selectedUser.email || "Unknown"
    : "";

  const filteredUsers = users.filter(user => {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ").toLowerCase();
    const email = (user.email || "").toLowerCase();
    const designation = (user.designation || "").toLowerCase();
    const searchLower = search.toLowerCase();
    return name.includes(searchLower) || email.includes(searchLower) || designation.includes(searchLower);
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <div
        className={`flex items-center gap-2 w-full rounded-lg border bg-white px-3 py-2 text-sm cursor-pointer transition-all ${
          isOpen ? "border-pink-400 ring-2 ring-pink-500/20" : "border-slate-200 hover:border-slate-300"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
      >
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="flex-1 outline-none text-sm text-black bg-transparent placeholder:text-slate-400"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`flex-1 truncate ${value ? "text-slate-900" : "text-slate-400"}`}>
            {value ? displayName : "Not assigned"}
          </span>
        )}
        {value && !isOpen && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="text-slate-400 hover:text-slate-600"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
        <svg className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          <div
            className="px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 cursor-pointer border-b border-slate-100"
            onClick={() => {
              onChange(null);
              setIsOpen(false);
              setSearch("");
            }}
          >
            Not assigned
          </div>
          {filteredUsers.length === 0 ? (
            <div className="px-3 py-4 text-sm text-slate-400 text-center">No users found</div>
          ) : (
            filteredUsers.map((user) => {
              const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Unknown";
              const initials = `${(user.firstName || "U")[0]}${(user.lastName || "")[0]}`.toUpperCase();
              return (
                <div
                  key={user.id}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                    user.id === value ? "bg-pink-50" : "hover:bg-slate-50"
                  }`}
                  onClick={() => {
                    onChange(user.id);
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{name}</p>
                    {user.designation && (
                      <p className="text-xs text-slate-500 truncate">{user.designation}</p>
                    )}
                  </div>
                  {user.id === value && (
                    <svg className="h-4 w-4 text-pink-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function TeamAssignments({ projectId, onUpdate }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<TeamAssignment>({
    account_manager_id: null,
    creative_team_lead_id: null,
    creative_id: null,
    social_media_specialist_id: null,
    performance_marketer_id: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    setLoading(true);
    
    // Load users from users table (accessible to all authenticated users)
    const { data: dbUsers } = await supabaseClient
      .from("users")
      .select("id, email, full_name, designation, avatar_url")
      .eq("is_active", true)
      .order("full_name");
    
    if (dbUsers) {
      const mappedUsers: User[] = dbUsers.map((u: any) => {
        const nameParts = (u.full_name || "").split(" ");
        return {
          id: u.id,
          email: u.email,
          firstName: nameParts[0] || null,
          lastName: nameParts.slice(1).join(" ") || null,
          designation: u.designation || null,
          avatar_url: u.avatar_url || null,
        };
      });
      setUsers(mappedUsers);
    }

    // Load current assignments
    const { data: project } = await supabaseClient
      .from("social_projects")
      .select("account_manager_id, creative_team_lead_id, creative_id, social_media_specialist_id, performance_marketer_id")
      .eq("id", projectId)
      .single();

    if (project) {
      setAssignments({
        account_manager_id: project.account_manager_id || null,
        creative_team_lead_id: project.creative_team_lead_id || null,
        creative_id: project.creative_id || null,
        social_media_specialist_id: project.social_media_specialist_id || null,
        performance_marketer_id: project.performance_marketer_id || null,
      });
    }

    setLoading(false);
  }

  async function handleAssignmentChange(roleKey: keyof TeamAssignment, userId: string | null) {
    setSaving(true);
    
    const updateData = { [roleKey]: userId || null };
    
    const { error } = await supabaseClient
      .from("social_projects")
      .update(updateData)
      .eq("id", projectId);

    if (!error) {
      setAssignments(prev => ({ ...prev, [roleKey]: userId }));
      onUpdate?.();
    }
    
    setSaving(false);
  }

  function getUserDisplay(userId: string | null) {
    if (!userId) return null;
    const user = users.find(u => u.id === userId);
    if (!user) return null;
    return {
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Unknown",
      initials: `${(user.firstName || "U")[0]}${(user.lastName || "")[0]}`.toUpperCase(),
      designation: user.designation,
      avatar_url: user.avatar_url,
    };
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
          <span className="text-sm text-slate-500">Loading team...</span>
        </div>
      </div>
    );
  }

  const assignedCount = Object.values(assignments).filter(Boolean).length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-pink-100 to-fuchsia-100">
            <svg className="h-4.5 w-4.5 text-pink-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-slate-900">Team Assignments</h3>
            <p className="text-xs text-slate-500">
              {assignedCount} of {ROLE_CONFIG.length} roles assigned
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Quick avatars */}
          <div className="flex -space-x-2">
            {Object.values(assignments).filter(Boolean).slice(0, 4).map((userId, idx) => {
              const user = getUserDisplay(userId);
              if (!user) return null;
              return (
                <div
                  key={idx}
                  className="h-7 w-7 rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-500 flex items-center justify-center text-[10px] font-bold text-white border-2 border-white"
                  title={user.name}
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    user.initials
                  )}
                </div>
              );
            })}
          </div>
          <svg
            className={`h-5 w-5 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-3">
          {ROLE_CONFIG.map((role) => {
            const currentUser = getUserDisplay(assignments[role.key]);
            
            return (
              <div key={role.key} className="flex items-center gap-3">
                <span className="text-lg w-8 text-center">{role.icon}</span>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {role.label}
                  </label>
                  <SearchableUserDropdown
                    users={users}
                    value={assignments[role.key]}
                    onChange={(userId) => handleAssignmentChange(role.key, userId)}
                    disabled={saving}
                  />
                </div>
              </div>
            );
          })}

          {/* Info box */}
          <div className="mt-4 p-3 bg-gradient-to-r from-pink-50 to-fuchsia-50 rounded-lg border border-pink-100">
            <p className="text-xs text-pink-800">
              <strong>Notification Routing:</strong> Team members will receive notifications based on workflow status changes. 
              Social Media Specialists are notified for Captions & Publishing, Creative Team Leads for Creative Approval, etc.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
