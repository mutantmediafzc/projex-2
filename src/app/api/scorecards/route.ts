import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getRating(total: number): string {
  if (total >= 85) return "Strong performer";
  if (total >= 70) return "Stable, needs improvement";
  if (total >= 50) return "Underperforming";
  return "Action required";
}

function getAttendanceScore(lateCount: number, absentCount: number): number {
  if (absentCount >= 3) return 0;
  if (absentCount === 2) return 10;
  if (absentCount === 1 || lateCount >= 3) return 20;
  if (lateCount >= 1) return 25;
  return 30;
}

function getDeliveryScore(pct: number): number {
  if (pct >= 95) return 25;
  if (pct >= 85) return 20;
  if (pct >= 70) return 15;
  return 5;
}

// GET /api/scorecards?quarter=2026-Q2&userId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const quarter = searchParams.get("quarter");
  const userId = searchParams.get("userId");

  let query = supabaseAdmin
    .from("scorecards")
    .select("*, user:users(id, full_name, email, designation)");

  if (quarter) query = query.eq("quarter", quarter);
  if (userId) query = query.eq("user_id", userId);

  query = query.order("total_score", { ascending: false });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ scorecards: data || [] });
}

// POST /api/scorecards — create or update a scorecard
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    user_id,
    quarter,
    quarter_start,
    quarter_end,
    // Manual scores
    quality_score = 0,
    satisfaction_score = 0,
    revenue_score = 0,
    role_addon_notes = "",
    admin_notes = "",
    is_finalized = false,
    reviewed_by = null,
  } = body;

  if (!user_id || !quarter || !quarter_start || !quarter_end) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const qStart = new Date(quarter_start);
  const qEnd = new Date(quarter_end);

  // --- Auto-calculate attendance from attendance_logs ---
  const { data: logs } = await supabaseAdmin
    .from("attendance_logs")
    .select("is_late, is_absent, log_date")
    .eq("user_id", user_id)
    .gte("log_date", quarter_start)
    .lte("log_date", quarter_end);

  const lateCount = (logs || []).filter((l: any) => l.is_late && !l.is_absent).length;
  const absentCount = (logs || []).filter((l: any) => l.is_absent).length;
  const attendanceScore = getAttendanceScore(lateCount, absentCount);

  // --- Auto-calculate on-time delivery from tasks ---
  const { data: tasks } = await supabaseAdmin
    .from("tasks")
    .select("id, status, activity_date, updated_at")
    .eq("assigned_user_id", user_id)
    .gte("activity_date", quarter_start)
    .lte("activity_date", quarter_end)
    .not("activity_date", "is", null);

  const totalTasks = (tasks || []).length;
  let onTimeTasks = 0;

  (tasks || []).forEach((task: any) => {
    if (task.status === "completed") {
      const due = new Date(task.activity_date);
      const completedAt = task.updated_at ? new Date(task.updated_at) : null;
      // On time = completed on or before due date
      if (completedAt && completedAt <= due) {
        onTimeTasks++;
      } else if (task.status === "completed") {
        // If we can't determine exact time, count as on-time if status is completed
        onTimeTasks++;
      }
    }
  });

  const onTimePct = totalTasks > 0 ? Math.round((onTimeTasks / totalTasks) * 100) : 0;
  const deliveryScore = totalTasks > 0 ? getDeliveryScore(onTimePct) : 0;

  // --- Compute totals ---
  const performanceScore = deliveryScore + quality_score + satisfaction_score + revenue_score;
  const totalScore = attendanceScore + performanceScore;
  const rating = getRating(totalScore);

  // Determine consequence based on previous low scores (simplified: based on rating)
  let consequence = "None";
  if (totalScore < 50) consequence = "Action required";
  else if (totalScore < 70) consequence = "Monitor";

  const payload = {
    user_id,
    quarter,
    quarter_start,
    quarter_end,
    attendance_score: attendanceScore,
    late_count: lateCount,
    absent_count: absentCount,
    delivery_score: deliveryScore,
    tasks_total: totalTasks,
    tasks_on_time: onTimeTasks,
    on_time_pct: onTimePct,
    quality_score,
    satisfaction_score,
    revenue_score,
    role_addon_notes,
    performance_score: performanceScore,
    total_score: totalScore,
    rating,
    consequence,
    admin_notes,
    reviewed_by,
    reviewed_at: is_finalized ? new Date().toISOString() : null,
    is_finalized,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("scorecards")
    .upsert(payload, { onConflict: "user_id,quarter" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ scorecard: data });
}
