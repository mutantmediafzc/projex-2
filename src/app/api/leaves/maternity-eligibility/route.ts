import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function authorizeHR(request: NextRequest) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data.user) return null;
  return data.user.app_metadata?.hr_access === true || data.user.user_metadata?.role === "hr"
    ? data.user
    : null;
}

export async function GET(request: NextRequest) {
  if (!(await authorizeHR(request))) {
    return NextResponse.json({ error: "HR access required." }, { status: 403 });
  }
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, full_name, email, maternity_leave_eligible")
    .order("full_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ employees: data || [] });
}

export async function PATCH(request: NextRequest) {
  if (!(await authorizeHR(request))) {
    return NextResponse.json({ error: "HR access required." }, { status: 403 });
  }
  const body = await request.json();
  const userId = String(body.userId || "");
  if (!userId || typeof body.eligible !== "boolean") {
    return NextResponse.json({ error: "userId and eligible are required." }, { status: 400 });
  }
  const { error } = await supabaseAdmin
    .from("users")
    .update({ maternity_leave_eligible: body.eligible })
    .eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
