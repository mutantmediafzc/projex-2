import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
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

    // Test 3: Get all users to see what names exist
    const { data: allUsers, error: allError } = await supabaseAdmin
      .from("users")
      .select("id, full_name, email")
      .order("full_name")
      .limit(50);

    // Test 4: Check if tasks table has the source column
    const { data: taskColumns, error: taskColError } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("source", "social_workflow")
      .limit(5);

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
      allUsers: {
        count: allUsers?.length || 0,
        users: allUsers?.map(u => ({ id: u.id, name: u.full_name })),
        error: allError?.message,
      },
      existingSocialTasks: {
        count: taskColumns?.length || 0,
        tasks: taskColumns,
        error: taskColError?.message,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
