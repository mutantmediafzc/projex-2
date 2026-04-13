import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    // Test 1: Check if "Jeano Pangan" exists in users table
    const { data: jeanoUsers, error: jeanoError } = await supabaseAdmin
      .from("users")
      .select("id, full_name, email")
      .ilike("full_name", "%jeano%");

    // Test 2: Check if "Carlo Nickson" exists
    const { data: carloUsers, error: carloError } = await supabaseAdmin
      .from("users")
      .select("id, full_name, email")
      .ilike("full_name", "%carlo%");

    // Test 2b: Check if "Wilson" exists
    const { data: wilsonUsers, error: wilsonError } = await supabaseAdmin
      .from("users")
      .select("id, full_name, email")
      .ilike("full_name", "%wilson%");

    // Test 3: Check social workflow tasks
    const { data: socialTasks, error: socialError } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("source", "social_workflow")
      .limit(10);

    // Test 4: Check unread counts for a specific user (if provided)
    let unreadCounts = null;
    if (userId) {
      const [noteRes, taskRes, workflowRes, socialRes] = await Promise.all([
        supabaseAdmin
          .from("project_note_mentions")
          .select("id, created_at, read_at", { count: "exact" })
          .eq("mentioned_user_id", userId)
          .is("read_at", null),
        supabaseAdmin
          .from("task_comment_mentions")
          .select("id, created_at, read_at", { count: "exact" })
          .eq("mentioned_user_id", userId)
          .is("read_at", null),
        supabaseAdmin
          .from("workflow_step_mentions")
          .select("id, created_at, read_at, project_id, project:projects(id, name)", { count: "exact" })
          .eq("mentioned_user_id", userId)
          .is("read_at", null),
        supabaseAdmin
          .from("tasks")
          .select("id, created_at, status, name", { count: "exact" })
          .eq("assigned_user_id", userId)
          .eq("source", "social_workflow")
          .neq("status", "completed"),
      ]);

      unreadCounts = {
        notesMentions: { count: noteRes.count, data: noteRes.data, error: noteRes.error?.message },
        taskMentions: { count: taskRes.count, data: taskRes.data, error: taskRes.error?.message },
        workflowMentions: { count: workflowRes.count, data: workflowRes.data, error: workflowRes.error?.message },
        socialWorkflowTasks: { count: socialRes.count, data: socialRes.data, error: socialRes.error?.message },
        total: (noteRes.count || 0) + (taskRes.count || 0) + (workflowRes.count || 0) + (socialRes.count || 0),
      };
    }

    return NextResponse.json({
      jeano: {
        found: jeanoUsers?.length || 0,
        users: jeanoUsers,
        error: jeanoError?.message,
      },
      carlo: {
        found: carloUsers?.length || 0,
        users: carloUsers,
        error: carloError?.message,
      },
      wilson: {
        found: wilsonUsers?.length || 0,
        users: wilsonUsers,
        error: wilsonError?.message,
      },
      socialWorkflowTasks: {
        count: socialTasks?.length || 0,
        tasks: socialTasks,
        error: socialError?.message,
      },
      unreadCounts,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
