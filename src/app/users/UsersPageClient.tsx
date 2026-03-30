"use client";

import { useState } from "react";
import Image from "next/image";
import NewUserModal from "./NewUserModal";
import EditUserModal from "./EditUserModal";
import RequireAdmin from "@/components/RequireAdmin";

type WorkStatus = "available" | "on_leave" | "wfh";

type UserRow = {
  id: string;
  email: string | null;
  role: string | null;
  firstName: string | null;
  lastName: string | null;
  designation: string | null;
  createdAt: string | null;
  work_status: WorkStatus | null;
  is_active?: boolean;
  avatar_url?: string | null;
};

const ROLE_COLORS: Record<string, string> = {
  admin: "from-violet-500 to-purple-500",
  staff: "from-slate-500 to-gray-500",
};

const STATUS_CONFIG: Record<WorkStatus, { label: string; color: string; bg: string; icon: string }> = {
  available: { label: "Available", color: "text-emerald-700", bg: "bg-emerald-100", icon: "🟢" },
  on_leave: { label: "On Leave", color: "text-amber-700", bg: "bg-amber-100", icon: "🟡" },
  wfh: { label: "WFH", color: "text-blue-700", bg: "bg-blue-100", icon: "🏠" },
};

interface Props {
  users: UserRow[];
}

export default function UsersPageClient({ users }: Props) {
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");
  const [statusFilter, setStatusFilter] = useState<WorkStatus | "all">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  const activeUsers = users.filter(u => u.is_active !== false);
  const inactiveUsers = users.filter(u => u.is_active === false);
  
  const adminCount = users.filter(u => u.role === "admin").length;
  const staffCount = users.filter(u => u.role !== "admin").length;

  // Status counts (only for active users)
  const statusCounts = {
    available: activeUsers.filter(u => u.work_status === "available").length,
    on_leave: activeUsers.filter(u => u.work_status === "on_leave").length,
    wfh: activeUsers.filter(u => u.work_status === "wfh").length,
  };

  // Filter users by active tab, then by status, then sort alphabetically
  const tabUsers = activeTab === "active" ? activeUsers : inactiveUsers;
  const filteredUsers = (statusFilter === "all" || activeTab === "inactive"
    ? tabUsers 
    : tabUsers.filter(u => u.work_status === statusFilter)
  ).sort((a, b) => {
    const nameA = [a.firstName, a.lastName].filter(Boolean).join(" ").toLowerCase();
    const nameB = [b.firstName, b.lastName].filter(Boolean).join(" ").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <RequireAdmin>
    <div className="space-y-6">
      {/* Decorative gradient background */}
      <div className="pointer-events-none fixed top-[120px] right-0 h-[400px] w-[500px] overflow-hidden opacity-50">
        <div className="absolute top-0 -right-10 h-[300px] w-[400px] rounded-full bg-gradient-to-br from-slate-200/60 to-gray-200/40 blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-gray-600 shadow-lg shadow-slate-500/30">
              <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">User Management</h1>
              <p className="text-[13px] text-slate-500">
                Invite, manage, and configure roles for team members
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Member
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="group relative overflow-hidden rounded-xl border border-slate-200/50 bg-gradient-to-br from-slate-50 to-gray-50 p-4 shadow-sm transition-all hover:shadow-md">
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-slate-200/30 blur-2xl transition-all group-hover:bg-slate-300/40" />
          <p className="text-[11px] font-medium text-slate-600 uppercase tracking-wide">Total Users</p>
          <p className="mt-1 text-2xl font-bold text-slate-700">{users.length}</p>
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-violet-200/50 bg-gradient-to-br from-violet-50 to-purple-50 p-4 shadow-sm transition-all hover:shadow-md">
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-violet-200/30 blur-2xl transition-all group-hover:bg-violet-300/40" />
          <p className="text-[11px] font-medium text-violet-600 uppercase tracking-wide">Admins</p>
          <p className="mt-1 text-2xl font-bold text-violet-700">{adminCount}</p>
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-sky-200/50 bg-gradient-to-br from-sky-50 to-cyan-50 p-4 shadow-sm transition-all hover:shadow-md">
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-sky-200/30 blur-2xl transition-all group-hover:bg-sky-300/40" />
          <p className="text-[11px] font-medium text-sky-600 uppercase tracking-wide">Staff</p>
          <p className="mt-1 text-2xl font-bold text-sky-700">{staffCount}</p>
        </div>
      </div>

      {/* Active/Inactive Tabs */}
      <div className="flex items-center gap-4">
        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            onClick={() => { setActiveTab("active"); setStatusFilter("all"); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "active" 
                ? "bg-emerald-500 text-white shadow" 
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Active ({activeUsers.length})
          </button>
          <button
            onClick={() => { setActiveTab("inactive"); setStatusFilter("all"); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "inactive" 
                ? "bg-slate-500 text-white shadow" 
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Inactive ({inactiveUsers.length})
          </button>
        </div>
      </div>

      {/* Status Filter - Only show for Active tab */}
      {activeTab === "active" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Filter by status:</span>
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === "all" 
                ? "bg-slate-800 text-white" 
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All ({activeUsers.length})
          </button>
          {(Object.keys(STATUS_CONFIG) as WorkStatus[]).map((status) => {
            const config = STATUS_CONFIG[status];
            const count = statusCounts[status];
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  statusFilter === status 
                    ? `${config.bg} ${config.color} ring-2 ring-offset-1 ring-current` 
                    : `${config.bg} ${config.color} opacity-70 hover:opacity-100`
                }`}
              >
                <span>{config.icon}</span>
                {config.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Team Members Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/50 bg-white shadow-xl shadow-slate-200/30">
        {/* Gradient bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-slate-500 to-gray-500" />
        
        {/* Decorative element */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-slate-100/40 to-gray-100/30 blur-2xl" />
        
        <div className="relative p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-gray-100">
              <svg className="h-4.5 w-4.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Team Members</h2>
              <p className="text-[11px] text-slate-500">
                {filteredUsers.length} {activeTab} user{filteredUsers.length !== 1 ? "s" : ""} {statusFilter !== "all" && activeTab === "active" ? `(${STATUS_CONFIG[statusFilter].label})` : ""} • Sorted A-Z
              </p>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-gray-100">
                <svg className="h-8 w-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <p className="mt-4 text-[14px] font-medium text-slate-700">No team members found</p>
              <p className="mt-1 text-[12px] text-slate-500">
                {statusFilter !== "all" ? "Try changing the filter" : "Add your first team member"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => {
                const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
                const initials = `${(user.firstName || "U").charAt(0)}${(user.lastName || "").charAt(0)}`.toUpperCase();
                const roleColor = ROLE_COLORS[user.role || "staff"] || ROLE_COLORS.staff;
                const statusConfig = STATUS_CONFIG[user.work_status || "available"];

                return (
                  <div
                    key={user.id}
                    className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-all hover:border-slate-200 hover:bg-white hover:shadow-sm"
                  >
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-200 to-gray-200 text-sm font-semibold text-slate-600">
                      {user.avatar_url ? (
                        <Image
                          src={user.avatar_url}
                          alt={fullName || "User"}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-medium text-slate-900 truncate">
                          {fullName || "Unnamed User"}
                        </p>
                        <span className={`inline-flex rounded-full bg-gradient-to-r px-2 py-0.5 text-[10px] font-semibold text-white capitalize ${roleColor}`}>
                          {user.role || "staff"}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                          <span>{statusConfig.icon}</span>
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {user.email || "No email"} {user.designation ? `• ${user.designation}` : ""}
                      </p>
                    </div>
                    
                    {/* Date */}
                    <div className="text-right shrink-0 mr-2">
                      <p className="text-[10px] text-slate-400">Joined</p>
                      <p className="text-[11px] font-medium text-slate-600">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                      </p>
                    </div>

                    {/* Active Status */}
                    <div className="shrink-0 mr-2">
                      {user.is_active === false ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          Inactive
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      )}
                    </div>

                    {/* Edit Button */}
                    <button
                      onClick={() => setEditingUser(user)}
                      className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 opacity-0 transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 group-hover:opacity-100"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <NewUserModal onClose={() => setShowAddModal(false)} />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />
      )}
    </div>
    </RequireAdmin>
  );
}
