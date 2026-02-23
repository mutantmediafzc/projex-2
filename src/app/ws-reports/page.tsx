"use client";

import { useState, useEffect, useMemo } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type User = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type Project = {
  id: string;
  name: string;
  company: { name: string } | null;
};

type CreditEntry = {
  id: string;
  user_id: string;
  project_id: string | null;
  prompts_used: number;
  logged_at: string;
  notes: string | null;
  user: User | null;
  project: Project | null;
};

type DateRange = "today" | "daily" | "weekly" | "monthly" | "custom" | "all";
type SortOption = "latest" | "oldest" | "amount_high" | "amount_low";

const ITEMS_PER_PAGE = 5;

const COST_PER_500_PROMPTS = 41; // AED

function calculateCost(prompts: number): number {
  return (prompts / 500) * COST_PER_500_PROMPTS;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDateRangeFilter(range: DateRange, customFrom?: string, customTo?: string): { from: Date | null; to: Date | null } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  
  switch (range) {
    case "today":
      return { from: todayStart, to: todayEnd };
    case "daily":
      return { from: todayStart, to: null };
    case "weekly":
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { from: weekAgo, to: null };
    case "monthly":
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return { from: monthAgo, to: null };
    case "custom":
      return {
        from: customFrom ? new Date(customFrom) : null,
        to: customTo ? new Date(customTo + "T23:59:59") : null
      };
    default:
      return { from: null, to: null };
  }
}

// PDF Export function
function exportToPDF(data: CreditEntry[], stats: { totalPrompts: number; totalCost: number }, dateRangeLabel: string) {
  // Create printable HTML
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Windsurf Credits Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; }
        h1 { color: #4f46e5; margin-bottom: 8px; }
        .subtitle { color: #64748b; margin-bottom: 24px; }
        .stats { display: flex; gap: 32px; margin-bottom: 32px; padding: 16px; background: #f8fafc; border-radius: 8px; }
        .stat { }
        .stat-label { font-size: 12px; color: #64748b; }
        .stat-value { font-size: 24px; font-weight: bold; color: #1e293b; }
        table { width: 100%; border-collapse: collapse; margin-top: 24px; }
        th { text-align: left; padding: 12px 8px; border-bottom: 2px solid #e2e8f0; font-size: 12px; color: #64748b; text-transform: uppercase; }
        td { padding: 12px 8px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        .text-right { text-align: right; }
        .text-indigo { color: #4f46e5; font-weight: 600; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <h1>Windsurf Credits Report</h1>
      <p class="subtitle">Date Range: ${dateRangeLabel} | Generated: ${new Date().toLocaleString()}</p>
      <div class="stats">
        <div class="stat">
          <div class="stat-label">Total Prompts</div>
          <div class="stat-value">${stats.totalPrompts.toLocaleString()}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Total Cost</div>
          <div class="stat-value">AED ${stats.totalCost.toFixed(2)}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Total Entries</div>
          <div class="stat-value">${data.length}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Project</th>
            <th class="text-right">Prompts</th>
            <th class="text-right">Cost (AED)</th>
            <th>Date</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(entry => `
            <tr>
              <td>${entry.user?.full_name || 'Unknown'}</td>
              <td>${entry.project?.name || 'Unassigned'}</td>
              <td class="text-right">${entry.prompts_used.toLocaleString()}</td>
              <td class="text-right text-indigo">${((entry.prompts_used / 500) * 41).toFixed(2)}</td>
              <td>${new Date(entry.logged_at).toLocaleDateString()}</td>
              <td>${entry.notes || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer">Windsurf Credits Report - Projex by Mutant</div>
    </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  }
}

export default function WSReportsPage() {
  const [credits, setCredits] = useState<CreditEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Filters
  const [dateRange, setDateRange] = useState<DateRange>("monthly");
  const [customDateFrom, setCustomDateFrom] = useState<string>("");
  const [customDateTo, setCustomDateTo] = useState<string>("");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("latest");

  // Pagination
  const [entriesPage, setEntriesPage] = useState(1);
  const [userStatsPage, setUserStatsPage] = useState(1);
  const [projectStatsPage, setProjectStatsPage] = useState(1);

  // Log form state
  const [showLogModal, setShowLogModal] = useState(false);
  const [logProjectId, setLogProjectId] = useState<string>("");
  const [logPrompts, setLogPrompts] = useState<string>("500");
  const [logNotes, setLogNotes] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    // Get current user
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) setCurrentUserId(user.id);

    // Load users
    const { data: usersData } = await supabaseClient
      .from("users")
      .select("id, full_name, email")
      .order("full_name");
    if (usersData) setUsers(usersData);

    // Load projects
    const { data: projectsData } = await supabaseClient
      .from("projects")
      .select("id, name, company:companies(name)")
      .order("name");
    if (projectsData) {
      setProjects(projectsData.map(p => ({
        ...p,
        company: Array.isArray(p.company) ? p.company[0] : p.company
      })) as Project[]);
    }

    // Load credits
    const { data: creditsData } = await supabaseClient
      .from("ws_credits")
      .select(`
        *,
        user:users(id, full_name, email),
        project:projects(id, name, company:companies(name))
      `)
      .order("logged_at", { ascending: false });
    
    if (creditsData) {
      setCredits(creditsData.map(c => ({
        ...c,
        user: Array.isArray(c.user) ? c.user[0] : c.user,
        project: c.project ? {
          ...c.project,
          company: Array.isArray(c.project.company) ? c.project.company[0] : c.project.company
        } : null
      })) as CreditEntry[]);
    }

    setLoading(false);
  }

  async function handleLogCredits() {
    if (!currentUserId || !logPrompts) return;
    setSaving(true);

    const { error } = await supabaseClient.from("ws_credits").insert({
      user_id: currentUserId,
      project_id: logProjectId || null,
      prompts_used: parseInt(logPrompts) || 0,
      logged_at: new Date(logDate).toISOString(),
      notes: logNotes || null,
    });

    if (!error) {
      setShowLogModal(false);
      setLogProjectId("");
      setLogPrompts("500");
      setLogNotes("");
      setLogDate(new Date().toISOString().slice(0, 10));
      await loadData();
    }
    setSaving(false);
  }

  async function handleDeleteEntry(id: string) {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    await supabaseClient.from("ws_credits").delete().eq("id", id);
    await loadData();
  }

  // Filtered data
  const filteredCredits = useMemo(() => {
    let result = [...credits];

    // Date range filter
    const { from, to } = getDateRangeFilter(dateRange, customDateFrom, customDateTo);
    if (from) {
      result = result.filter(c => new Date(c.logged_at) >= from);
    }
    if (to) {
      result = result.filter(c => new Date(c.logged_at) <= to);
    }

    // User filter
    if (userFilter !== "all") {
      result = result.filter(c => c.user_id === userFilter);
    }

    // Project filter
    if (projectFilter !== "all") {
      if (projectFilter === "none") {
        result = result.filter(c => !c.project_id);
      } else {
        result = result.filter(c => c.project_id === projectFilter);
      }
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.user?.full_name?.toLowerCase().includes(query) ||
        c.project?.name?.toLowerCase().includes(query) ||
        c.notes?.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortOption) {
      case "latest":
        result.sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());
        break;
      case "amount_high":
        result.sort((a, b) => b.prompts_used - a.prompts_used);
        break;
      case "amount_low":
        result.sort((a, b) => a.prompts_used - b.prompts_used);
        break;
    }

    return result;
  }, [credits, dateRange, customDateFrom, customDateTo, userFilter, projectFilter, searchQuery, sortOption]);

  // Reset pagination when filters change
  useEffect(() => {
    setEntriesPage(1);
    setUserStatsPage(1);
    setProjectStatsPage(1);
  }, [dateRange, customDateFrom, customDateTo, userFilter, projectFilter, searchQuery, sortOption]);

  // Paginated data
  const paginatedCredits = useMemo(() => {
    const start = (entriesPage - 1) * ITEMS_PER_PAGE;
    return filteredCredits.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCredits, entriesPage]);

  const totalEntriesPages = Math.ceil(filteredCredits.length / ITEMS_PER_PAGE);

  // Get date range label for PDF
  const getDateRangeLabel = () => {
    switch (dateRange) {
      case "today": return "Today";
      case "daily": return "Today";
      case "weekly": return "Last 7 Days";
      case "monthly": return "Last 30 Days";
      case "custom": return `${customDateFrom || 'Start'} to ${customDateTo || 'End'}`;
      default: return "All Time";
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const totalPrompts = filteredCredits.reduce((sum, c) => sum + c.prompts_used, 0);
    const totalCost = calculateCost(totalPrompts);
    const uniqueUsers = new Set(filteredCredits.map(c => c.user_id)).size;
    const uniqueProjects = new Set(filteredCredits.filter(c => c.project_id).map(c => c.project_id)).size;

    // By user
    const byUser: Record<string, { name: string; prompts: number; cost: number }> = {};
    filteredCredits.forEach(c => {
      const name = c.user?.full_name || "Unknown";
      if (!byUser[c.user_id]) {
        byUser[c.user_id] = { name, prompts: 0, cost: 0 };
      }
      byUser[c.user_id].prompts += c.prompts_used;
      byUser[c.user_id].cost = calculateCost(byUser[c.user_id].prompts);
    });

    // By project
    const byProject: Record<string, { name: string; prompts: number; cost: number }> = {};
    filteredCredits.forEach(c => {
      const key = c.project_id || "unassigned";
      const name = c.project?.name || "Unassigned";
      if (!byProject[key]) {
        byProject[key] = { name, prompts: 0, cost: 0 };
      }
      byProject[key].prompts += c.prompts_used;
      byProject[key].cost = calculateCost(byProject[key].prompts);
    });

    // By day (for chart)
    const byDay: Record<string, number> = {};
    filteredCredits.forEach(c => {
      const day = new Date(c.logged_at).toISOString().slice(0, 10);
      byDay[day] = (byDay[day] || 0) + c.prompts_used;
    });

    return { totalPrompts, totalCost, uniqueUsers, uniqueProjects, byUser, byProject, byDay };
  }, [filteredCredits]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Windsurf Credits Report</h1>
          <p className="mt-1 text-sm text-slate-500">Track and analyze AI usage across users and projects</p>
        </div>
        <button
          onClick={() => setShowLogModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg hover:from-indigo-600 hover:to-violet-600 hover:shadow-xl transition-all"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Log Credits
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Total Spent</p>
              <p className="text-2xl font-bold text-slate-900">AED {stats.totalCost.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-cyan-50 to-teal-50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-lg">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Total Prompts</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalPrompts.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Active Users</p>
              <p className="text-2xl font-bold text-slate-900">{stats.uniqueUsers}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-green-50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-lg">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Projects</p>
              <p className="text-2xl font-bold text-slate-900">{stats.uniqueProjects}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users, projects, notes..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-black placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Date Range */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {(["today", "weekly", "monthly", "custom", "all"] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  dateRange === range
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {range === "custom" ? "Custom" : range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          {dateRange === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-black focus:border-indigo-500 focus:outline-none"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-black focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}

          {/* Sort Options */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-black focus:border-indigo-500 focus:outline-none"
          >
            <option value="latest">Latest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount_high">Highest Amount</option>
            <option value="amount_low">Lowest Amount</option>
          </select>

          {/* Export PDF */}
          <button
            onClick={() => exportToPDF(filteredCredits, stats, getDateRangeLabel())}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            title="Export all filtered data to PDF"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
            </svg>
            Export PDF
          </button>

          {/* User Filter */}
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-black focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
            ))}
          </select>

          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-black focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Projects</option>
            <option value="none">Unassigned</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* View Toggle */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setViewMode("table")}
              className={`rounded-lg p-2.5 transition-all ${viewMode === "table" ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600 hover:bg-white/50"}`}
              title="Table View"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`rounded-lg p-2.5 transition-all ${viewMode === "cards" ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600 hover:bg-white/50"}`}
              title="Card View"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Usage by User & Project */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* By User */}
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Usage by User</h2>
            <span className="text-xs text-slate-500">{Object.keys(stats.byUser).length} users</span>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {(() => {
                const sortedUsers = Object.entries(stats.byUser).sort((a, b) => b[1].prompts - a[1].prompts);
                const totalUserPages = Math.ceil(sortedUsers.length / ITEMS_PER_PAGE);
                const paginatedUsers = sortedUsers.slice((userStatsPage - 1) * ITEMS_PER_PAGE, userStatsPage * ITEMS_PER_PAGE);
                
                return (
                  <>
                    {paginatedUsers.map(([userId, data]) => {
                      const percentage = stats.totalPrompts > 0 ? (data.prompts / stats.totalPrompts) * 100 : 0;
                      return (
                        <div key={userId} className="group">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-slate-700">{data.name}</span>
                            <span className="text-sm text-slate-600">
                              {data.prompts.toLocaleString()} prompts · <span className="font-semibold text-indigo-600">AED {data.cost.toFixed(2)}</span>
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {sortedUsers.length === 0 && (
                      <p className="text-center text-sm text-slate-500 py-4">No data for selected period</p>
                    )}
                    {totalUserPages > 1 && (
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-3">
                        <button
                          onClick={() => setUserStatsPage(Math.max(1, userStatsPage - 1))}
                          disabled={userStatsPage === 1}
                          className="text-xs text-slate-500 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          ← Previous
                        </button>
                        <span className="text-xs text-slate-500">{userStatsPage} of {totalUserPages}</span>
                        <button
                          onClick={() => setUserStatsPage(Math.min(totalUserPages, userStatsPage + 1))}
                          disabled={userStatsPage === totalUserPages}
                          className="text-xs text-slate-500 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* By Project */}
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Usage by Project</h2>
            <span className="text-xs text-slate-500">{Object.keys(stats.byProject).length} projects</span>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {(() => {
                const sortedProjects = Object.entries(stats.byProject).sort((a, b) => b[1].prompts - a[1].prompts);
                const totalProjectPages = Math.ceil(sortedProjects.length / ITEMS_PER_PAGE);
                const paginatedProjects = sortedProjects.slice((projectStatsPage - 1) * ITEMS_PER_PAGE, projectStatsPage * ITEMS_PER_PAGE);
                
                return (
                  <>
                    {paginatedProjects.map(([projectId, data]) => {
                      const percentage = stats.totalPrompts > 0 ? (data.prompts / stats.totalPrompts) * 100 : 0;
                      return (
                        <div key={projectId} className="group">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-slate-700">{data.name}</span>
                            <span className="text-sm text-slate-600">
                              {data.prompts.toLocaleString()} prompts · <span className="font-semibold text-emerald-600">AED {data.cost.toFixed(2)}</span>
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {sortedProjects.length === 0 && (
                      <p className="text-center text-sm text-slate-500 py-4">No data for selected period</p>
                    )}
                    {totalProjectPages > 1 && (
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-3">
                        <button
                          onClick={() => setProjectStatsPage(Math.max(1, projectStatsPage - 1))}
                          disabled={projectStatsPage === 1}
                          className="text-xs text-slate-500 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          ← Previous
                        </button>
                        <span className="text-xs text-slate-500">{projectStatsPage} of {totalProjectPages}</span>
                        <button
                          onClick={() => setProjectStatsPage(Math.min(totalProjectPages, projectStatsPage + 1))}
                          disabled={projectStatsPage === totalProjectPages}
                          className="text-xs text-slate-500 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Trend Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Daily Usage Trend</h2>
        </div>
        <div className="p-5">
          {(() => {
            const sortedDays = Object.entries(stats.byDay)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .slice(-14);
            const maxPrompts = sortedDays.length > 0 ? Math.max(...sortedDays.map(([, p]) => p)) : 0;
            const chartHeight = 160; // pixels
            
            // Calculate nice Y-axis values
            const yAxisMax = maxPrompts > 0 ? Math.ceil(maxPrompts / 1000) * 1000 : 1000;
            const yAxisMid = yAxisMax / 2;
            
            if (sortedDays.length === 0) {
              return (
                <div className="flex items-center justify-center h-40 text-sm text-slate-500">
                  No data for selected period
                </div>
              );
            }
            
            return (
              <div className="flex gap-4">
                {/* Y-axis labels */}
                <div className="flex flex-col justify-between text-right text-xs text-slate-400 py-1" style={{ height: chartHeight }}>
                  <span>{yAxisMax.toLocaleString()}</span>
                  <span>{yAxisMid.toLocaleString()}</span>
                  <span>0</span>
                </div>
                
                {/* Chart area */}
                <div className="flex-1 relative">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-b border-slate-100" />
                    <div className="border-b border-slate-100" />
                    <div className="border-b border-slate-200" />
                  </div>
                  
                  {/* Bars */}
                  <div className="relative flex items-end gap-1" style={{ height: chartHeight }}>
                    {sortedDays.map(([day, prompts]) => {
                      const barHeight = yAxisMax > 0 ? (prompts / yAxisMax) * chartHeight : 0;
                      return (
                        <div key={day} className="flex-1 flex flex-col items-center group cursor-pointer">
                          <div className="w-full flex items-end justify-center" style={{ height: chartHeight }}>
                            <div
                              className="w-full max-w-[40px] bg-gradient-to-t from-amber-400 to-amber-300 rounded-t transition-all duration-300 group-hover:from-amber-500 group-hover:to-amber-400 relative"
                              style={{ height: Math.max(barHeight, 2) }}
                            >
                              {/* Tooltip */}
                              <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs px-2 py-1.5 rounded-lg whitespace-nowrap z-10 shadow-lg">
                                <div className="font-semibold">{prompts.toLocaleString()} prompts</div>
                                <div className="text-slate-300 text-[10px]">AED {calculateCost(prompts).toFixed(2)}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* X-axis labels */}
                  <div className="flex mt-2">
                    {sortedDays.map(([day], idx) => (
                      <div key={day} className="flex-1 text-center">
                        {idx === 0 || idx === sortedDays.length - 1 || sortedDays.length <= 7 ? (
                          <span className="text-[10px] text-slate-500">
                            {new Date(day).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        ) : idx === Math.floor(sortedDays.length / 2) ? (
                          <span className="text-[10px] text-slate-500">
                            {new Date(day).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Credit Entries Table/Cards */}
      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Credit Entries</h2>
          <span className="text-sm text-slate-500">
            Showing {paginatedCredits.length} of {filteredCredits.length} entries
          </span>
        </div>

        {viewMode === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">User</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Project</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-right">Prompts</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-right">Cost (AED)</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCredits.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-xs font-semibold">
                          {(entry.user?.full_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-900">{entry.user?.full_name || "Unknown"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-sm ${entry.project ? "text-slate-700" : "text-slate-400 italic"}`}>
                        {entry.project?.name || "Unassigned"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-semibold text-slate-900">{entry.prompts_used.toLocaleString()}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-semibold text-indigo-600">
                        {calculateCost(entry.prompts_used).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-slate-600">{formatDateTime(entry.logged_at)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-slate-500 truncate max-w-[200px] block">{entry.notes || "-"}</span>
                    </td>
                    <td className="px-5 py-4">
                      {entry.user_id === currentUserId && (
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {paginatedCredits.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-500">
                      No credit entries found for the selected filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedCredits.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-slate-200 p-4 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white font-semibold">
                      {(entry.user?.full_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{entry.user?.full_name || "Unknown"}</p>
                      <p className="text-xs text-slate-500">{formatDate(entry.logged_at)}</p>
                    </div>
                  </div>
                  {entry.user_id === currentUserId && (
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Project</span>
                    <span className="text-sm text-slate-700">{entry.project?.name || "Unassigned"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Prompts</span>
                    <span className="text-sm font-semibold text-slate-900">{entry.prompts_used.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Cost</span>
                    <span className="text-sm font-semibold text-indigo-600">AED {calculateCost(entry.prompts_used).toFixed(2)}</span>
                  </div>
                  {entry.notes && (
                    <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">{entry.notes}</p>
                  )}
                </div>
              </div>
            ))}
            {paginatedCredits.length === 0 && (
              <div className="col-span-full py-12 text-center text-sm text-slate-500">
                No credit entries found for the selected filters
              </div>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        {totalEntriesPages > 1 && (
          <div className="border-t border-slate-100 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEntriesPage(1)}
                disabled={entriesPage === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                First
              </button>
              <button
                onClick={() => setEntriesPage(Math.max(1, entriesPage - 1))}
                disabled={entriesPage === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalEntriesPages) }, (_, i) => {
                let pageNum: number;
                if (totalEntriesPages <= 5) {
                  pageNum = i + 1;
                } else if (entriesPage <= 3) {
                  pageNum = i + 1;
                } else if (entriesPage >= totalEntriesPages - 2) {
                  pageNum = totalEntriesPages - 4 + i;
                } else {
                  pageNum = entriesPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setEntriesPage(pageNum)}
                    className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                      entriesPage === pageNum
                        ? "bg-indigo-500 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEntriesPage(Math.min(totalEntriesPages, entriesPage + 1))}
                disabled={entriesPage === totalEntriesPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
              <button
                onClick={() => setEntriesPage(totalEntriesPages)}
                disabled={entriesPage === totalEntriesPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Credits Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Log Credits Used</h2>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Project</label>
                <select
                  value={logProjectId}
                  onChange={(e) => setLogProjectId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-black focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Select project (optional)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} {p.company?.name ? `(${p.company.name})` : ""}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Prompts Used</label>
                <input
                  type="number"
                  value={logPrompts}
                  onChange={(e) => setLogPrompts(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-black placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Estimated cost: <span className="font-semibold text-indigo-600">AED {calculateCost(parseInt(logPrompts) || 0).toFixed(2)}</span>
                  <span className="text-slate-400"> (500 prompts = AED 41)</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-black focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes (optional)</label>
                <textarea
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="What were you working on?"
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-black placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowLogModal(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogCredits}
                disabled={saving || !logPrompts}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-3 text-sm font-medium text-white hover:from-indigo-600 hover:to-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving ? "Saving..." : "Log Credits"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
