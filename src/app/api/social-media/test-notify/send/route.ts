import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Test endpoint to manually trigger a notification
export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status") || "Final Approval";
    const postTitle = request.nextUrl.searchParams.get("title") || "Test Post";
    const calendarName = request.nextUrl.searchParams.get("calendar") || "Test Calendar";

    // Find Jeano's user ID
    const { data: jeanoUsers, error: jeanoError } = await supabaseAdmin
      .from("users")
      .select("id, full_name")
      .ilike("full_name", "%jeano pangan%");

    if (jeanoError || !jeanoUsers || jeanoUsers.length === 0) {
      return NextResponse.json({ 
        error: "Jeano not found", 
        jeanoError: jeanoError?.message,
        jeanoUsers 
      }, { status: 404 });
    }

    const jeanoId = jeanoUsers[0].id;

    // Create a test task for Jeano
    const taskData = {
      assigned_user_id: jeanoId,
      name: `Social Post: ${status}`,
      content: `A new post has been added to ${status} Tab in the "${calendarName}" Calendar - "${postTitle}".`,
      status: "not_started",  // Valid enum: not_started, in_progress, completed
      priority: "medium",
      type: "todo",  // Valid enum: todo, call, email
      source: "social_workflow",
      created_by_name: "Test System",
      project_id: null,
    };

    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .insert(taskData)
      .select("id")
      .single();

    if (taskError) {
      return NextResponse.json({ 
        error: "Failed to create task", 
        taskError: taskError.message,
        taskData
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Created notification task for Jeano (${jeanoId})`,
      taskId: task.id,
      jeanoId,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
