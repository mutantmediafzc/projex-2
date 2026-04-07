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
  project_manager_ids: string[];
  account_manager_ids: string[];
  creative_team_lead_ids: string[];
  creative_ids: string[];
  videographer_ids: string[];
  social_media_specialist_ids: string[];
  performance_marketer_ids: string[];
  email_whatsapp_specialist_ids: string[];
  website_blogs_specialist_ids: string[];
  content_creator_ids: string[];
};

type Props = {
  projectId: string;
  onUpdate?: () => void;
};

const ROLE_CONFIG = [
  { 
    key: "project_manager_ids" as const, 
    label: "Project Manager", 
    icon: "📋",
    description: "Oversees project execution"
  },
  { 
    key: "account_manager_ids" as const, 
    label: "Account Manager", 
    icon: "👔",
    description: "Manages client relationship"
  },
  { 
    key: "creative_team_lead_ids" as const, 
    label: "Creative Team Lead", 
    icon: "🎨",
    description: "Leads creative direction"
  },
  { 
    key: "creative_ids" as const, 
    label: "Creative", 
    icon: "✏️",
    description: "Creates visual assets"
  },
  { 
    key: "videographer_ids" as const, 
    label: "Videographer", 
    icon: "🎥",
    description: "Handles video production & shoots"
  },
  { 
    key: "social_media_specialist_ids" as const, 
    label: "Integrated Marketing", 
    icon: "📱",
    description: "Handles captions & publishing"
  },
  { 
    key: "performance_marketer_ids" as const, 
    label: "Performance Marketer", 
    icon: "📊",
    description: "Manages boosted content"
  },
  { 
    key: "email_whatsapp_specialist_ids" as const, 
    label: "Email & WhatsApp", 
    icon: "📧",
    description: "Handles email & WhatsApp campaigns"
  },
  { 
    key: "website_blogs_specialist_ids" as const, 
    label: "SEO Specialist", 
    icon: "🔍",
    description: "Manages SEO & blog content"
  },
  { 
    key: "content_creator_ids" as const, 
    label: "Content Creator", 
    icon: "🎬",
    description: "Creates content for all platforms"
  },
];

function MultiSelectUserDropdown({ 
  users, 
  selectedIds, 
  onChange, 
  disabled 
}: { 
  users: User[]; 
  selectedIds: string[];
  onChange: (userIds: string[]) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedUsers = users.filter(u => selectedIds.includes(u.id));

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

  function toggleUser(userId: string) {
    if (selectedIds.includes(userId)) {
      onChange(selectedIds.filter(id => id !== userId));
    } else {
      onChange([...selectedIds, userId]);
    }
  }

  function removeUser(userId: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(selectedIds.filter(id => id !== userId));
  }

  // Show compact view when closed with multiple users, expanded when open
  const showCompact = !isOpen && selectedUsers.length > 2;
  const displayUsers = showCompact ? selectedUsers.slice(0, 2) : selectedUsers;
  const hiddenCount = showCompact ? selectedUsers.length - 2 : 0;

  return (
    <div ref={dropdownRef} className="relative">
      <div
        className={`flex flex-wrap items-center gap-1.5 w-full rounded-lg border bg-white px-2 py-1.5 min-h-[38px] cursor-pointer transition-all ${
          isOpen ? "border-pink-400 ring-2 ring-pink-500/20" : "border-slate-200 hover:border-slate-300"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
      >
        {displayUsers.map(user => {
          const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Unknown";
          const initials = `${(user.firstName || "U")[0]}${(user.lastName || "")[0]}`.toUpperCase();
          return (
            <div
              key={user.id}
              className="flex items-center gap-1 bg-pink-50 border border-pink-200 rounded-full pl-0.5 pr-1.5 py-0.5 flex-shrink-0"
            >
              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-500 flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <span className="text-xs font-medium text-pink-800 max-w-[60px] truncate">{name.split(" ")[0]}</span>
              {isOpen && (
                <button
                  onClick={(e) => removeUser(user.id, e)}
                  className="text-pink-400 hover:text-pink-600 ml-0.5"
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
        {hiddenCount > 0 && (
          <div className="flex items-center justify-center h-6 px-2 bg-pink-100 border border-pink-200 rounded-full flex-shrink-0">
            <span className="text-xs font-medium text-pink-700">+{hiddenCount}</span>
          </div>
        )}
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={selectedIds.length === 0 ? "Search users..." : "Add more..."}
            className="flex-1 min-w-[60px] outline-none text-sm text-black bg-transparent placeholder:text-slate-400 py-0.5"
            onClick={(e) => e.stopPropagation()}
          />
        ) : selectedIds.length === 0 ? (
          <span className="text-slate-400 text-sm py-0.5">Not assigned</span>
        ) : null}
        <svg className={`h-4 w-4 text-slate-400 transition-transform ml-auto flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {selectedIds.length > 0 && (
            <div
              className="px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 cursor-pointer border-b border-slate-100"
              onClick={() => {
                onChange([]);
                setSearch("");
              }}
            >
              Clear all
            </div>
          )}
          {filteredUsers.length === 0 ? (
            <div className="px-3 py-4 text-sm text-slate-400 text-center">No users found</div>
          ) : (
            filteredUsers.map((user) => {
              const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Unknown";
              const initials = `${(user.firstName || "U")[0]}${(user.lastName || "")[0]}`.toUpperCase();
              const isSelected = selectedIds.includes(user.id);
              return (
                <div
                  key={user.id}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                    isSelected ? "bg-pink-50" : "hover:bg-slate-50"
                  }`}
                  onClick={() => toggleUser(user.id)}
                >
                  <div className={`h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected ? "bg-pink-500 border-pink-500" : "border-slate-300"
                  }`}>
                    {isSelected && (
                      <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </div>
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
    project_manager_ids: [],
    account_manager_ids: [],
    creative_team_lead_ids: [],
    creative_ids: [],
    videographer_ids: [],
    social_media_specialist_ids: [],
    performance_marketer_ids: [],
    email_whatsapp_specialist_ids: [],
    website_blogs_specialist_ids: [],
    content_creator_ids: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(true);

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

    // Load current assignments (now arrays)
    const { data: project } = await supabaseClient
      .from("social_projects")
      .select("project_manager_ids, account_manager_ids, creative_team_lead_ids, creative_ids, videographer_ids, social_media_specialist_ids, performance_marketer_ids, email_whatsapp_specialist_ids, website_blogs_specialist_ids, content_creator_ids")
      .eq("id", projectId)
      .single();

    if (project) {
      setAssignments({
        project_manager_ids: project.project_manager_ids || [],
        account_manager_ids: project.account_manager_ids || [],
        creative_team_lead_ids: project.creative_team_lead_ids || [],
        creative_ids: project.creative_ids || [],
        videographer_ids: project.videographer_ids || [],
        social_media_specialist_ids: project.social_media_specialist_ids || [],
        performance_marketer_ids: project.performance_marketer_ids || [],
        email_whatsapp_specialist_ids: project.email_whatsapp_specialist_ids || [],
        website_blogs_specialist_ids: project.website_blogs_specialist_ids || [],
        content_creator_ids: project.content_creator_ids || [],
      });
    }

    setLoading(false);
  }

  async function handleAssignmentChange(roleKey: keyof TeamAssignment, userIds: string[]) {
    setSaving(true);
    
    const updateData = { [roleKey]: userIds.length > 0 ? userIds : null };
    
    const { error } = await supabaseClient
      .from("social_projects")
      .update(updateData)
      .eq("id", projectId);

    if (!error) {
      setAssignments(prev => ({ ...prev, [roleKey]: userIds }));
      onUpdate?.();
    }
    
    setSaving(false);
  }

  function getUserDisplay(userId: string) {
    const user = users.find(u => u.id === userId);
    if (!user) return null;
    return {
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Unknown",
      initials: `${(user.firstName || "U")[0]}${(user.lastName || "")[0]}`.toUpperCase(),
      designation: user.designation,
      avatar_url: user.avatar_url,
    };
  }
  
  // Get all unique assigned user IDs for the header avatars
  function getAllAssignedUserIds(): string[] {
    const allIds = new Set<string>();
    Object.values(assignments).forEach(ids => {
      if (Array.isArray(ids)) {
        ids.forEach(id => allIds.add(id));
      }
    });
    return Array.from(allIds);
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

  const assignedRolesCount = Object.values(assignments).filter(ids => ids && ids.length > 0).length;
  const allAssignedUserIds = getAllAssignedUserIds();

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
              {assignedRolesCount} of {ROLE_CONFIG.length} roles assigned ({allAssignedUserIds.length} members)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Quick avatars - show unique users */}
          <div className="flex -space-x-2">
            {allAssignedUserIds.slice(0, 5).map((userId, idx) => {
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
            {allAssignedUserIds.length > 5 && (
              <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 border-2 border-white">
                +{allAssignedUserIds.length - 5}
              </div>
            )}
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
            return (
              <div key={role.key} className="flex items-center gap-3">
                <span className="text-lg w-8 text-center">{role.icon}</span>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {role.label}
                  </label>
                  <MultiSelectUserDropdown
                    users={users}
                    selectedIds={assignments[role.key]}
                    onChange={(userIds) => handleAssignmentChange(role.key, userIds)}
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
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
