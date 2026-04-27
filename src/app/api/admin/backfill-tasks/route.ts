import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/admin/backfill-tasks
 * Backfills:
 * 1. assigned_user_name from users table where it is null but assigned_user_id exists
 * 2. activity_date from today where it is null (for social_workflow tasks)
 *
 * Safe to run multiple times (idempotent).
 */
export async function POST() {
  try {
    // Step 1: Find tasks where assigned_user_name is null but assigned_user_id is set
    const { data: tasksNeedingName, error: e1 } = await supabaseAdmin
      .from("tasks")
      .select("id, assigned_user_id")
      .is("assigned_user_name", null)
      .not("assigned_user_id", "is", null);

    if (e1) {
      console.error("Backfill: error fetching tasks needing name:", e1);
    }

    let nameBackfillCount = 0;
    if (tasksNeedingName && tasksNeedingName.length > 0) {
      // Fetch all users in one query
      const uniqueUserIds = [...new Set(tasksNeedingName.map((t: any) => t.assigned_user_id))];
      const { data: usersData } = await supabaseAdmin
        .from("users")
        .select("id, full_name")
        .in("id", uniqueUserIds);

      const usersMap = new Map<string, string>();
      (usersData || []).forEach((u: any) => { if (u.id) usersMap.set(u.id, u.full_name || "Unknown"); });

      // Update each task
      for (const task of tasksNeedingName) {
        const fullName = usersMap.get((task as any).assigned_user_id);
        if (fullName) {
          await supabaseAdmin
            .from("tasks")
            .update({ assigned_user_name: fullName })
            .eq("id", (task as any).id);
          nameBackfillCount++;
        }
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    // Step 2a: Fix tasks with NULL activity_date — all sources, use created_at as fallback
    const { data: tasksNullDate } = await supabaseAdmin
      .from("tasks")
      .select("id, created_at")
      .is("activity_date", null);

    // Step 2b: Fetch ALL tasks to find those with malformed ISO activity_date (contains "T")
    const { data: allTaskDates } = await supabaseAdmin
      .from("tasks")
      .select("id, activity_date, created_at")
      .not("activity_date", "is", null);

    let dateBackfillCount = 0;

    // Fix null activity_date
    for (const task of (tasksNullDate || [])) {
      const fallbackDate = (task as any).created_at
        ? String((task as any).created_at).slice(0, 10)
        : todayStr;
      await supabaseAdmin
        .from("tasks")
        .update({ activity_date: fallbackDate })
        .eq("id", (task as any).id);
      dateBackfillCount++;
    }

    // Fix malformed ISO timestamps — normalize to YYYY-MM-DD
    for (const task of (allTaskDates || [])) {
      const raw = String((task as any).activity_date || "");
      // If it contains T, Z, or + it's a full ISO timestamp, not YYYY-MM-DD
      if (raw.includes("T") || raw.includes("Z") || (raw.includes("+") && raw.length > 10)) {
        const normalized = raw.slice(0, 10);
        if (normalized.match(/^\d{4}-\d{2}-\d{2}$/)) {
          await supabaseAdmin
            .from("tasks")
            .update({ activity_date: normalized })
            .eq("id", (task as any).id);
          dateBackfillCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      nameBackfillCount,
      dateBackfillCount,
      message: `Backfilled ${nameBackfillCount} names and ${dateBackfillCount} activity_dates`,
    });
  } catch (error) {
    console.error("Backfill error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
