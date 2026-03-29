"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type Task = {
  id: string;
  task_type: string;
  target_username: string;
  target_profile_url: string | null;
  target_post_url: string | null;
  suggested_comment: string | null;
  suggested_dm: string | null;
  engagement_reason: string | null;
  priority: number;
  status: string;
};

type Props = {
  accountId: string;
};

const TASK_TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  follow: { icon: "👤", label: "Follow", color: "purple" },
  like: { icon: "❤️", label: "Like Post", color: "pink" },
  comment: { icon: "💬", label: "Comment", color: "blue" },
  dm: { icon: "✉️", label: "Send DM", color: "indigo" },
  story_view: { icon: "👁️", label: "View Story", color: "amber" },
  story_reply: { icon: "📱", label: "Reply to Story", color: "emerald" },
  reel_engage: { icon: "🎬", label: "Engage Reel", color: "rose" },
};

export default function OperatorDashboard({ accountId }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");
  const [completing, setCompleting] = useState<string | null>(null);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    followsGenerated: 0,
  });

  useEffect(() => {
    loadTasks();
    loadStats();
  }, [accountId, filter]);

  async function loadTasks() {
    setLoading(true);
    let query = supabaseClient
      .from("ig_engagement_tasks")
      .select("*")
      .eq("account_id", accountId)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(50);

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;
    setTasks(data || []);
    setLoading(false);
  }

  async function loadStats() {
    const today = new Date().toISOString().split("T")[0];
    
    const { data: batch } = await supabaseClient
      .from("ig_task_batches")
      .select("*")
      .eq("account_id", accountId)
      .eq("batch_date", today)
      .single();

    if (batch) {
      setStats({
        total: batch.total_tasks,
        completed: batch.completed_tasks,
        pending: batch.total_tasks - batch.completed_tasks,
        followsGenerated: 0,
      });
    }
  }

  async function completeTask(taskId: string, resultedInFollow: boolean) {
    setCompleting(taskId);
    
    await supabaseClient
      .from("ig_engagement_tasks")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        resulted_in_follow: resultedInFollow,
        resulted_in_engagement: true,
      })
      .eq("id", taskId);

    setCompleting(null);
    loadTasks();
    loadStats();
  }

  async function skipTask(taskId: string, reason: string) {
    await supabaseClient
      .from("ig_engagement_tasks")
      .update({
        status: "skipped",
        completion_notes: reason,
      })
      .eq("id", taskId);

    loadTasks();
    loadStats();
  }

  async function generateTasks() {
    setLoading(true);
    
    // Get targeting configuration and AI targets
    const [targetsRes, aiTargetsRes] = await Promise.all([
      supabaseClient
        .from("ig_targeting")
        .select("*")
        .eq("account_id", accountId)
        .eq("is_active", true),
      supabaseClient
        .from("ig_ai_targets")
        .select("*")
        .eq("account_id", accountId)
        .eq("used_in_task", false)
        .eq("target_type", "user")
        .order("relevance_score", { ascending: false })
        .limit(30),
    ]);

    const targets = targetsRes.data || [];
    const aiTargets = aiTargetsRes.data || [];

    if (targets.length === 0) {
      alert("Please configure targeting first (hashtags, similar accounts, etc.)");
      setLoading(false);
      return;
    }

    // Generate tasks using AI targets if available, otherwise use targeting config
    const taskTypes = ["follow", "like", "comment", "story_view"];
    const newTasks = [];

    if (aiTargets.length > 0) {
      // Use AI-generated targets
      for (const aiTarget of aiTargets) {
        const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
        newTasks.push({
          account_id: accountId,
          task_type: taskType,
          target_username: aiTarget.target_value,
          target_profile_url: aiTarget.target_url || `https://instagram.com/${aiTarget.target_value}`,
          suggested_comment: taskType === "comment" ? null : null,
          engagement_reason: aiTarget.reasoning || `AI-matched with ${aiTarget.relevance_score}% relevance`,
          priority: Math.min(10, Math.floor((aiTarget.relevance_score || 50) / 10)),
          status: "pending",
        });

        // Mark AI target as used
        await supabaseClient
          .from("ig_ai_targets")
          .update({ used_in_task: true })
          .eq("id", aiTarget.id);
      }
    } else {
      // No AI targets - prompt user to add them or generate based on similar accounts in targeting
      const similarAccounts = targets.filter(t => t.target_type === "similar_account");
      
      if (similarAccounts.length > 0) {
        // Create tasks based on similar accounts targeting
        for (const account of similarAccounts) {
          const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
          newTasks.push({
            account_id: accountId,
            task_type: taskType,
            target_username: account.target_value,
            target_profile_url: `https://instagram.com/${account.target_value}`,
            suggested_comment: null,
            engagement_reason: `Similar account target: @${account.target_value}`,
            priority: 7,
            status: "pending",
          });
        }
      }

      if (newTasks.length === 0) {
        alert("No AI targets or similar accounts found. Add similar accounts to your targeting or wait for AI to generate targets.");
        setLoading(false);
        return;
      }
    }

    if (newTasks.length === 0) {
      alert("No tasks could be generated. Please add more targets or wait for AI suggestions.");
      setLoading(false);
      return;
    }

    // Insert tasks
    await supabaseClient.from("ig_engagement_tasks").insert(newTasks);

    // Create/update batch
    const today = new Date().toISOString().split("T")[0];
    
    // Get existing batch to add to total
    const { data: existingBatch } = await supabaseClient
      .from("ig_task_batches")
      .select("total_tasks")
      .eq("account_id", accountId)
      .eq("batch_date", today)
      .single();

    const existingTotal = existingBatch?.total_tasks || 0;

    await supabaseClient
      .from("ig_task_batches")
      .upsert({
        account_id: accountId,
        batch_date: today,
        total_tasks: existingTotal + newTasks.length,
        completed_tasks: 0,
        status: "active",
      }, { onConflict: "account_id,batch_date" });

    loadTasks();
    loadStats();
  }

  const progressPercent = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Operator Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">Daily engagement tasks for manual growth</p>
        </div>
        <button
          onClick={generateTasks}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
          </svg>
          Generate Tasks
        </button>
      </div>

      {/* Progress Stats */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/80 text-sm">Today's Progress</p>
            <p className="text-3xl font-bold mt-1">{stats.completed} / {stats.total}</p>
          </div>
          <div className="text-right">
            <p className="text-white/80 text-sm">Completion Rate</p>
            <p className="text-3xl font-bold mt-1">{progressPercent.toFixed(0)}%</p>
          </div>
        </div>
        <div className="h-3 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{stats.pending}</p>
          <p className="text-xs text-slate-500 mt-1">Pending</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
          <p className="text-xs text-slate-500 mt-1">Completed</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-pink-600">{stats.followsGenerated}</p>
          <p className="text-xs text-slate-500 mt-1">Follows Generated</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">
            {tasks.filter(t => t.status === "completed").length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Engagements</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {["pending", "completed", "skipped", "all"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              filter === status
                ? "bg-purple-100 text-purple-700"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
            <svg className="h-8 w-8 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 14l2 2 4-4" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No tasks available</h3>
          <p className="mt-1 text-sm text-slate-500">Generate new tasks based on your targeting configuration</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const config = TASK_TYPE_CONFIG[task.task_type] || { icon: "📋", label: task.task_type, color: "slate" };
            
            return (
              <div
                key={task.id}
                className={`rounded-xl bg-white border p-4 transition-all ${
                  task.status === "completed" 
                    ? "border-emerald-200 bg-emerald-50/50" 
                    : task.status === "skipped"
                    ? "border-slate-200 bg-slate-50 opacity-60"
                    : "border-slate-200 hover:border-purple-200 hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Task Type Icon */}
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-${config.color}-100 flex-shrink-0`}>
                    <span className="text-xl">{config.icon}</span>
                  </div>

                  {/* Task Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full bg-${config.color}-100 px-2 py-0.5 text-xs font-medium text-${config.color}-700`}>
                        {config.label}
                      </span>
                      <span className="text-xs text-slate-400">Priority: {task.priority}/10</span>
                    </div>
                    
                    <p className="mt-1 font-medium text-slate-900">@{task.target_username}</p>
                    
                    {task.engagement_reason && (
                      <p className="mt-1 text-xs text-slate-500">{task.engagement_reason}</p>
                    )}

                    {task.suggested_comment && (
                      <div className="mt-2 rounded-lg bg-slate-50 p-2">
                        <p className="text-xs text-slate-400">Suggested comment:</p>
                        <p className="text-sm text-slate-700 mt-0.5">"{task.suggested_comment}"</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {task.status === "pending" && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={task.target_profile_url || `https://instagram.com/${task.target_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        title="Open in Instagram"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <path d="M15 3h6v6" />
                          <path d="M10 14L21 3" />
                        </svg>
                      </a>
                      <button
                        onClick={() => skipTask(task.id, "Manual skip")}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200"
                        title="Skip"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      </button>
                      <button
                        onClick={() => completeTask(task.id, false)}
                        disabled={completing === task.id}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                      >
                        {completing === task.id ? (
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        )}
                        Done
                      </button>
                      <button
                        onClick={() => completeTask(task.id, true)}
                        disabled={completing === task.id}
                        className="flex items-center gap-1.5 rounded-lg bg-purple-500 px-3 py-2 text-xs font-medium text-white hover:bg-purple-600 disabled:opacity-50"
                        title="Mark as done + they followed back"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        +Follow
                      </button>
                    </div>
                  )}

                  {task.status === "completed" && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        Completed
                      </span>
                    </div>
                  )}

                  {task.status === "skipped" && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                      Skipped
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
