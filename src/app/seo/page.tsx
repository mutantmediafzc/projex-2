"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { formatNumber } from "@/lib/semrush";

type Company = {
  id: string;
  name: string;
  logo_url: string | null;
};

type SeoProject = {
  id: string;
  company_id: string;
  name: string;
  domain: string;
  description: string | null;
  status: string;
  project_type: string;
  target_keywords: string[];
  competitors: string[];
  created_at: string;
  company?: Company;
};

type SeoGoal = {
  id: string;
  project_id: string;
  goal_type: string;
  title: string;
  description: string | null;
  target_value: number;
  current_value: number;
  unit: string;
  start_date: string;
  target_date: string | null;
  status: string;
  priority: string;
};

type DomainOverview = {
  organicKeywords: number;
  organicTraffic: number;
  organicCost: number;
  backlinks: number;
  referringDomains: number;
};

type Keyword = {
  keyword: string;
  position: number;
  previousPosition: number;
  searchVolume: number;
  cpc: number;
  url: string;
  traffic: number;
};

type Suggestion = {
  type: string;
  title: string;
  description: string;
  keywords: string[];
  priority_score: number;
  estimated_impact: string;
};

const GOAL_TYPES = [
  { value: "organic_traffic", label: "Organic Traffic", icon: "📈", unit: "visits/mo" },
  { value: "keyword_ranking", label: "Keyword Ranking", icon: "🎯", unit: "position" },
  { value: "backlinks", label: "Backlinks", icon: "🔗", unit: "links" },
  { value: "domain_authority", label: "Domain Authority", icon: "💪", unit: "DA" },
  { value: "page_speed", label: "Page Speed", icon: "⚡", unit: "score" },
  { value: "indexed_pages", label: "Indexed Pages", icon: "📄", unit: "pages" },
  { value: "featured_snippets", label: "Featured Snippets", icon: "⭐", unit: "snippets" },
  { value: "aeo_visibility", label: "AEO Visibility", icon: "🤖", unit: "%" },
  { value: "custom", label: "Custom Goal", icon: "🎨", unit: "custom" },
];

export default function SEOPage() {
  const [projects, setProjects] = useState<SeoProject[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedProject, setSelectedProject] = useState<SeoProject | null>(null);
  const [goals, setGoals] = useState<SeoGoal[]>([]);
  const [domainData, setDomainData] = useState<DomainOverview | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "keywords" | "goals" | "suggestions">("overview");
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);

  // New project form
  const [newProject, setNewProject] = useState({
    name: "",
    domain: "",
    description: "",
    company_id: "",
    project_type: "both",
    target_keywords: "",
  });

  // New goal form
  const [newGoal, setNewGoal] = useState({
    goal_type: "organic_traffic",
    title: "",
    description: "",
    target_value: 0,
    current_value: 0,
    target_date: "",
    priority: "medium",
  });

  useEffect(() => {
    loadProjects();
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectData();
    }
  }, [selectedProject]);

  async function loadProjects() {
    setLoading(true);
    const { data } = await supabaseClient
      .from("seo_projects")
      .select("*, company:companies(id, name, logo_url)")
      .order("created_at", { ascending: false });
    
    if (data) {
      const transformed = data.map((p: any) => ({
        ...p,
        company: Array.isArray(p.company) ? p.company[0] : p.company,
      }));
      setProjects(transformed);
      if (transformed.length > 0 && !selectedProject) {
        setSelectedProject(transformed[0]);
      }
    }
    setLoading(false);
  }

  async function loadCompanies() {
    const { data } = await supabaseClient
      .from("companies")
      .select("id, name, logo_url")
      .order("name");
    setCompanies(data || []);
  }

  async function loadProjectData() {
    if (!selectedProject) return;
    setLoadingData(true);

    // Load goals
    const { data: goalsData } = await supabaseClient
      .from("seo_goals")
      .select("*")
      .eq("project_id", selectedProject.id)
      .order("created_at", { ascending: false });
    setGoals(goalsData || []);

    // Fetch SEMrush data
    try {
      const [overviewRes, keywordsRes] = await Promise.all([
        fetch(`/api/seo?action=domain_overview&domain=${selectedProject.domain}`),
        fetch(`/api/seo?action=organic_keywords&domain=${selectedProject.domain}&limit=50`),
      ]);

      const overviewJson = await overviewRes.json();
      const keywordsJson = await keywordsRes.json();

      if (overviewJson.data) setDomainData(overviewJson.data);
      if (keywordsJson.data) setKeywords(keywordsJson.data);
    } catch (error) {
      console.error("Error fetching SEMrush data:", error);
    }

    setLoadingData(false);
  }

  async function loadAISuggestions() {
    if (!selectedProject) return;
    setLoadingSuggestions(true);

    try {
      const response = await fetch("/api/seo/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: selectedProject.domain,
          keywords: selectedProject.target_keywords,
          projectType: selectedProject.project_type,
          currentMetrics: domainData,
        }),
      });

      const json = await response.json();
      if (json.data?.suggestions) {
        setSuggestions(json.data.suggestions);
      }
    } catch (error) {
      console.error("Error loading suggestions:", error);
    }

    setLoadingSuggestions(false);
  }

  async function createProject() {
    if (!newProject.name || !newProject.domain) return;

    const { data, error } = await supabaseClient
      .from("seo_projects")
      .insert({
        name: newProject.name,
        domain: newProject.domain.replace(/^https?:\/\//, "").replace(/\/$/, ""),
        description: newProject.description || null,
        company_id: newProject.company_id || null,
        project_type: newProject.project_type,
        target_keywords: newProject.target_keywords ? newProject.target_keywords.split(",").map(k => k.trim()) : [],
      })
      .select("*, company:companies(id, name, logo_url)")
      .single();

    if (!error && data) {
      const transformed = {
        ...data,
        company: Array.isArray(data.company) ? data.company[0] : data.company,
      };
      setProjects([transformed, ...projects]);
      setSelectedProject(transformed);
      setShowNewProjectModal(false);
      setNewProject({ name: "", domain: "", description: "", company_id: "", project_type: "both", target_keywords: "" });
    }
  }

  async function createGoal() {
    if (!selectedProject || !newGoal.title || !newGoal.target_value) return;

    const { data, error } = await supabaseClient
      .from("seo_goals")
      .insert({
        project_id: selectedProject.id,
        goal_type: newGoal.goal_type,
        title: newGoal.title,
        description: newGoal.description || null,
        target_value: newGoal.target_value,
        current_value: newGoal.current_value,
        target_date: newGoal.target_date || null,
        priority: newGoal.priority,
        unit: GOAL_TYPES.find(g => g.value === newGoal.goal_type)?.unit || "count",
      })
      .select()
      .single();

    if (!error && data) {
      setGoals([data, ...goals]);
      setShowNewGoalModal(false);
      setNewGoal({ goal_type: "organic_traffic", title: "", description: "", target_value: 0, current_value: 0, target_date: "", priority: "medium" });
    }
  }

  async function updateGoalProgress(goalId: string, newValue: number) {
    const { error } = await supabaseClient
      .from("seo_goals")
      .update({ current_value: newValue, updated_at: new Date().toISOString() })
      .eq("id", goalId);

    if (!error) {
      // Also record progress
      await supabaseClient.from("seo_goal_progress").insert({
        goal_id: goalId,
        recorded_value: newValue,
      });

      setGoals(goals.map(g => g.id === goalId ? { ...g, current_value: newValue } : g));
    }
  }

  async function deleteProject(projectId: string) {
    if (!confirm("Delete this project and all its data?")) return;
    
    const { error } = await supabaseClient
      .from("seo_projects")
      .delete()
      .eq("id", projectId);

    if (!error) {
      setProjects(projects.filter(p => p.id !== projectId));
      if (selectedProject?.id === projectId) {
        setSelectedProject(projects.find(p => p.id !== projectId) || null);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">SEO & AEO Manager</h1>
            <p className="text-sm text-slate-500">Track rankings, set goals, and get AI-powered content suggestions</p>
          </div>
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl transition-all"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Project
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Projects Sidebar */}
        <div className="w-72 border-r border-slate-200 bg-white min-h-[calc(100vh-73px)]">
          <div className="p-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Projects</h2>
            <div className="space-y-2">
              {projects.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No projects yet</p>
              ) : (
                projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className={`w-full text-left p-3 rounded-xl transition-all ${
                      selectedProject?.id === project.id
                        ? "bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200"
                        : "hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {project.company?.logo_url ? (
                        <img src={project.company.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
                          {project.name[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{project.name}</p>
                        <p className="text-xs text-slate-500 truncate">{project.domain}</p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        project.project_type === "seo" ? "bg-blue-100 text-blue-700" :
                        project.project_type === "aeo" ? "bg-purple-100 text-purple-700" :
                        "bg-emerald-100 text-emerald-700"
                      }`}>
                        {project.project_type.toUpperCase()}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {!selectedProject ? (
            <div className="flex flex-col items-center justify-center h-96">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No Project Selected</h3>
              <p className="text-sm text-slate-500 mb-4">Select a project or create a new one to get started</p>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="text-emerald-600 text-sm font-medium hover:text-emerald-700"
              >
                + Create New Project
              </button>
            </div>
          ) : (
            <>
              {/* Project Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  {selectedProject.company?.logo_url ? (
                    <img src={selectedProject.company.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-lg font-bold">
                      {selectedProject.name[0]}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedProject.name}</h2>
                    <p className="text-sm text-slate-500">{selectedProject.domain}</p>
                  </div>
                </div>
                <button
                  onClick={() => deleteProject(selectedProject.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
                {[
                  { key: "overview", label: "Overview", icon: "📊" },
                  { key: "keywords", label: "Keywords", icon: "🔑" },
                  { key: "goals", label: "Goals", icon: "🎯" },
                  { key: "suggestions", label: "AI Suggestions", icon: "🤖" },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key as any);
                      if (tab.key === "suggestions" && suggestions.length === 0) {
                        loadAISuggestions();
                      }
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.key
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <span className="mr-1.5">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              {loadingData ? (
                <div className="flex items-center justify-center h-64">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                </div>
              ) : (
                <>
                  {/* Overview Tab */}
                  {activeTab === "overview" && (
                    <div className="space-y-6">
                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                          <p className="text-xs text-slate-500 mb-1">Organic Keywords</p>
                          <p className="text-2xl font-bold text-slate-900">{formatNumber(domainData?.organicKeywords || 0)}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                          <p className="text-xs text-slate-500 mb-1">Organic Traffic</p>
                          <p className="text-2xl font-bold text-slate-900">{formatNumber(domainData?.organicTraffic || 0)}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                          <p className="text-xs text-slate-500 mb-1">Traffic Value</p>
                          <p className="text-2xl font-bold text-slate-900">${formatNumber(domainData?.organicCost || 0)}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                          <p className="text-xs text-slate-500 mb-1">Active Goals</p>
                          <p className="text-2xl font-bold text-slate-900">{goals.filter(g => g.status === "active").length}</p>
                        </div>
                      </div>

                      {/* Top Keywords Preview */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-slate-900">Top Keywords</h3>
                          <button onClick={() => setActiveTab("keywords")} className="text-sm text-emerald-600 hover:text-emerald-700">
                            View All →
                          </button>
                        </div>
                        <div className="space-y-3">
                          {keywords.slice(0, 5).map((kw, idx) => (
                            <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-slate-400 w-6">#{kw.position}</span>
                                <span className="text-sm text-slate-900">{kw.keyword}</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span>{formatNumber(kw.searchVolume)} vol</span>
                                <span className={kw.position < kw.previousPosition ? "text-green-600" : kw.position > kw.previousPosition ? "text-red-600" : ""}>
                                  {kw.position < kw.previousPosition ? "↑" : kw.position > kw.previousPosition ? "↓" : "–"}
                                </span>
                              </div>
                            </div>
                          ))}
                          {keywords.length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-4">No keyword data available</p>
                          )}
                        </div>
                      </div>

                      {/* Goals Preview */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-slate-900">Active Goals</h3>
                          <button onClick={() => setShowNewGoalModal(true)} className="text-sm text-emerald-600 hover:text-emerald-700">
                            + Add Goal
                          </button>
                        </div>
                        <div className="space-y-3">
                          {goals.filter(g => g.status === "active").slice(0, 3).map(goal => {
                            const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);
                            const goalType = GOAL_TYPES.find(t => t.value === goal.goal_type);
                            return (
                              <div key={goal.id} className="p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span>{goalType?.icon}</span>
                                    <span className="text-sm font-medium text-slate-900">{goal.title}</span>
                                  </div>
                                  <span className="text-xs text-slate-500">
                                    {goal.current_value} / {goal.target_value} {goal.unit}
                                  </span>
                                </div>
                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                          {goals.filter(g => g.status === "active").length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-4">No active goals. Set your first goal!</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Keywords Tab */}
                  {activeTab === "keywords" && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Position</th>
                              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Keyword</th>
                              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Volume</th>
                              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">CPC</th>
                              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Traffic</th>
                              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Change</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {keywords.map((kw, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                                    {kw.position}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-900">{kw.keyword}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{formatNumber(kw.searchVolume)}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">${kw.cpc.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{formatNumber(kw.traffic)}</td>
                                <td className="px-4 py-3">
                                  {kw.previousPosition > 0 && (
                                    <span className={`text-xs font-medium ${
                                      kw.position < kw.previousPosition ? "text-green-600" :
                                      kw.position > kw.previousPosition ? "text-red-600" : "text-slate-400"
                                    }`}>
                                      {kw.position < kw.previousPosition ? `↑${kw.previousPosition - kw.position}` :
                                       kw.position > kw.previousPosition ? `↓${kw.position - kw.previousPosition}` : "–"}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {keywords.length === 0 && (
                          <div className="text-center py-12">
                            <p className="text-sm text-slate-400">No keyword data available for this domain</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Goals Tab */}
                  {activeTab === "goals" && (
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        <button
                          onClick={() => setShowNewGoalModal(true)}
                          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                          Add Goal
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        {goals.map(goal => {
                          const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);
                          const goalType = GOAL_TYPES.find(t => t.value === goal.goal_type);
                          return (
                            <div key={goal.id} className="bg-white rounded-xl border border-slate-200 p-5">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-xl">
                                    {goalType?.icon}
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-slate-900">{goal.title}</h4>
                                    <p className="text-xs text-slate-500">{goalType?.label}</p>
                                  </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  goal.status === "active" ? "bg-emerald-100 text-emerald-700" :
                                  goal.status === "achieved" ? "bg-blue-100 text-blue-700" :
                                  "bg-slate-100 text-slate-600"
                                }`}>
                                  {goal.status}
                                </span>
                              </div>

                              {goal.description && (
                                <p className="text-sm text-slate-500 mb-3">{goal.description}</p>
                              )}

                              <div className="mb-2">
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-slate-500">Progress</span>
                                  <span className="font-medium text-slate-900">
                                    {goal.current_value} / {goal.target_value} {goal.unit}
                                  </span>
                                </div>
                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${
                                      progress >= 100 ? "bg-blue-500" : "bg-gradient-to-r from-emerald-500 to-teal-500"
                                    }`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                  <span className={`px-1.5 py-0.5 rounded ${
                                    goal.priority === "critical" ? "bg-red-100 text-red-700" :
                                    goal.priority === "high" ? "bg-orange-100 text-orange-700" :
                                    goal.priority === "medium" ? "bg-yellow-100 text-yellow-700" :
                                    "bg-slate-100 text-slate-600"
                                  }`}>
                                    {goal.priority}
                                  </span>
                                  {goal.target_date && (
                                    <span>Due: {new Date(goal.target_date).toLocaleDateString()}</span>
                                  )}
                                </div>
                                <input
                                  type="number"
                                  value={goal.current_value}
                                  onChange={(e) => updateGoalProgress(goal.id, parseFloat(e.target.value) || 0)}
                                  className="w-20 text-right text-sm border border-slate-200 rounded px-2 py-1"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {goals.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                          <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                            <span className="text-2xl">🎯</span>
                          </div>
                          <h3 className="font-semibold text-slate-900 mb-1">No Goals Yet</h3>
                          <p className="text-sm text-slate-500 mb-4">Set your first SEO goal to start tracking progress</p>
                          <button
                            onClick={() => setShowNewGoalModal(true)}
                            className="text-emerald-600 text-sm font-medium hover:text-emerald-700"
                          >
                            + Create Your First Goal
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Suggestions Tab */}
                  {activeTab === "suggestions" && (
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        <button
                          onClick={loadAISuggestions}
                          disabled={loadingSuggestions}
                          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {loadingSuggestions ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                            </svg>
                          )}
                          {loadingSuggestions ? "Generating..." : "Refresh Suggestions"}
                        </button>
                      </div>

                      {loadingSuggestions ? (
                        <div className="flex flex-col items-center justify-center py-16">
                          <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent mb-4" />
                          <p className="text-sm text-slate-500">AI is analyzing your domain and generating suggestions...</p>
                        </div>
                      ) : suggestions.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          {suggestions.map((suggestion, idx) => (
                            <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                              <div className="flex items-start gap-3 mb-3">
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm ${
                                  suggestion.type === "blog_topic" ? "bg-blue-100 text-blue-600" :
                                  suggestion.type === "keyword_opportunity" ? "bg-green-100 text-green-600" :
                                  suggestion.type === "content_gap" ? "bg-orange-100 text-orange-600" :
                                  suggestion.type === "trending_topic" ? "bg-pink-100 text-pink-600" :
                                  suggestion.type === "aeo_question" ? "bg-purple-100 text-purple-600" :
                                  "bg-slate-100 text-slate-600"
                                }`}>
                                  {suggestion.type === "blog_topic" ? "📝" :
                                   suggestion.type === "keyword_opportunity" ? "🔑" :
                                   suggestion.type === "content_gap" ? "📊" :
                                   suggestion.type === "trending_topic" ? "🔥" :
                                   suggestion.type === "aeo_question" ? "❓" : "💡"}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                                      {suggestion.type.replace(/_/g, " ")}
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                      suggestion.estimated_impact === "high" ? "bg-green-100 text-green-700" :
                                      suggestion.estimated_impact === "medium" ? "bg-yellow-100 text-yellow-700" :
                                      "bg-slate-100 text-slate-600"
                                    }`}>
                                      {suggestion.estimated_impact} impact
                                    </span>
                                  </div>
                                  <h4 className="font-semibold text-slate-900 mb-1">{suggestion.title}</h4>
                                </div>
                              </div>
                              <p className="text-sm text-slate-600 mb-3">{suggestion.description}</p>
                              {suggestion.keywords && suggestion.keywords.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {suggestion.keywords.slice(0, 5).map((kw, i) => (
                                    <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                      {kw}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                          <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center mx-auto mb-3">
                            <span className="text-2xl">🤖</span>
                          </div>
                          <h3 className="font-semibold text-slate-900 mb-1">AI Content Suggestions</h3>
                          <p className="text-sm text-slate-500 mb-4">Get AI-powered content ideas based on your domain analysis</p>
                          <button
                            onClick={loadAISuggestions}
                            className="text-purple-600 text-sm font-medium hover:text-purple-700"
                          >
                            Generate Suggestions
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowNewProjectModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">New SEO Project</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="My Website SEO"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Domain *</label>
                <input
                  type="text"
                  value={newProject.domain}
                  onChange={e => setNewProject({ ...newProject, domain: e.target.value })}
                  placeholder="example.com"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                <select
                  value={newProject.company_id}
                  onChange={e => setNewProject({ ...newProject, company_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">No company</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Type</label>
                <select
                  value={newProject.project_type}
                  onChange={e => setNewProject({ ...newProject, project_type: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="both">SEO & AEO</option>
                  <option value="seo">SEO Only</option>
                  <option value="aeo">AEO Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Keywords (comma-separated)</label>
                <input
                  type="text"
                  value={newProject.target_keywords}
                  onChange={e => setNewProject({ ...newProject, target_keywords: e.target.value })}
                  placeholder="seo services, digital marketing"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={newProject.description}
                  onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Brief description of this SEO project..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                disabled={!newProject.name || !newProject.domain}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 disabled:opacity-50"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Goal Modal */}
      {showNewGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowNewGoalModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">New SEO Goal</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Goal Type</label>
                <select
                  value={newGoal.goal_type}
                  onChange={e => setNewGoal({ ...newGoal, goal_type: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {GOAL_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Goal Title *</label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
                  placeholder="Increase organic traffic by 50%"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Current Value</label>
                  <input
                    type="number"
                    value={newGoal.current_value}
                    onChange={e => setNewGoal({ ...newGoal, current_value: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Value *</label>
                  <input
                    type="number"
                    value={newGoal.target_value}
                    onChange={e => setNewGoal({ ...newGoal, target_value: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={newGoal.priority}
                    onChange={e => setNewGoal({ ...newGoal, priority: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Date</label>
                  <input
                    type="date"
                    value={newGoal.target_date}
                    onChange={e => setNewGoal({ ...newGoal, target_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={newGoal.description}
                  onChange={e => setNewGoal({ ...newGoal, description: e.target.value })}
                  placeholder="Additional details about this goal..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewGoalModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={createGoal}
                disabled={!newGoal.title || !newGoal.target_value}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 disabled:opacity-50"
              >
                Create Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
