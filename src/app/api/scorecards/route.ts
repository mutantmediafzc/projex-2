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
    .select("*");

  if (quarter) query = query.eq("quarter", quarter);
  if (userId) query = query.eq("user_id", userId);

  query = query.order("total_score", { ascending: false });

  const { data: scorecards, error } = await query;
  if (error) {
    console.error("[scorecards GET error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch user details separately (no FK constraint needed)
  const userIds = [...new Set((scorecards || []).map((s: any) => s.user_id))];
  const { data: usersData } = userIds.length
    ? await supabaseAdmin.from("users").select("id, full_name, email, designation").in("id", userIds)
    : { data: [] };
  const usersMap = new Map((usersData || []).map((u: any) => [u.id, u]));

  const merged = (scorecards || []).map((s: any) => ({
    ...s,
    user: usersMap.get(s.user_id) || null,
  }));

  return NextResponse.json({ scorecards: merged });
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

  const qStart = new Date(quarter_start + "T00:00:00");
  const qEnd = new Date(quarter_end + "T23:59:59");

  // --- Auto-calculate attendance from attendance_logs ---
  const { data: logs } = await supabaseAdmin
    .from("attendance_logs")
    .select("is_late, is_absent, log_date")
    .eq("user_id", user_id)
    .gte("log_date", quarter_start)
    .lte("log_date", quarter_end);

  // Build a set of dates that have a log entry
  const logDateSet = new Set((logs || []).map((l: any) => l.log_date));

  // Count workdays (Mon–Fri) from quarter start up to TODAY (not into the future)
  const today = new Date();
  const effectiveEnd = qEnd < today ? qEnd : today;

  let absentCount = (logs || []).filter((l: any) => l.is_absent).length;
  let lateCount = (logs || []).filter((l: any) => l.is_late && !l.is_absent).length;

  // Any workday that has no log row at all counts as absent
  const cursor = new Date(qStart);
  while (cursor <= effectiveEnd) {
    const dayOfWeek = cursor.getDay(); // 0=Sun, 6=Sat
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateStr = cursor.toISOString().slice(0, 10);
      if (!logDateSet.has(dateStr)) {
        absentCount++;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const attendanceScore = getAttendanceScore(lateCount, absentCount);

  // --- Auto-calculate on-time delivery from tasks ---
  // Fetch all assigned tasks in the quarter, filter client-side to handle both date and timestamp formats
  const { data: allUserTasks } = await supabaseAdmin
    .from("tasks")
    .select("id, status, activity_date, updated_at")
    .eq("assigned_user_id", user_id)
    .not("activity_date", "is", null);

  const tasks = (allUserTasks || []).filter((t: any) => {
    if (!t.activity_date) return false;
    const d = new Date(t.activity_date);
    return !isNaN(d.getTime()) && d >= qStart && d <= qEnd;
  });

  const totalTasks = tasks.length;
  let onTimeTasks = 0;

  tasks.forEach((task: any) => {
    if (task.status === "completed") {
      // All completed tasks count as on-time (updated_at check is unreliable after bulk migrations)
      onTimeTasks++;
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

  if (error) {
    console.error("[scorecards POST upsert error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ scorecard: data });
}
