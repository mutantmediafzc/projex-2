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

    // Step 2: Find social_workflow tasks with null activity_date — set to today (they were created today)
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data: tasksNeedingDate, error: e2 } = await supabaseAdmin
      .from("tasks")
      .select("id, created_at")
      .eq("source", "social_workflow")
      .is("activity_date", null);

    if (e2) {
      console.error("Backfill: error fetching tasks needing activity_date:", e2);
    }

    let dateBackfillCount = 0;
    if (tasksNeedingDate && tasksNeedingDate.length > 0) {
      for (const task of tasksNeedingDate) {
        // Use the task's created_at date as fallback activity_date
        const fallbackDate = (task as any).created_at
          ? String((task as any).created_at).slice(0, 10)
          : todayStr;
        await supabaseAdmin
          .from("tasks")
          .update({ activity_date: fallbackDate })
          .eq("id", (task as any).id);
        dateBackfillCount++;
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
