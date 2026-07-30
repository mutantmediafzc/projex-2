import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function getAuthorizedUser(request: NextRequest) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;

  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data.user) return null;

  return data.user.app_metadata?.hr_access === true || data.user.user_metadata?.role === "hr"
    ? data.user
    : null;
}

function parseAllowances(body: Record<string, unknown>) {
  const annualLeaveTotal = Number(body.annualLeaveTotal);
  const sickLeaveTotal = Number(body.sickLeaveTotal);
  const lieuLeaveTotal = Number(body.lieuLeaveTotal);
  const valid = [annualLeaveTotal, sickLeaveTotal, lieuLeaveTotal]
    .every((value) => Number.isFinite(value) && value >= 0 && value <= 999);
  return { annualLeaveTotal, sickLeaveTotal, lieuLeaveTotal, valid };
}

export async function GET(request: NextRequest) {
  const currentUser = await getAuthorizedUser(request);
  if (!currentUser) return NextResponse.json({ error: "HR access required." }, { status: 403 });

  const [{ data: users, error: usersError }, { data: members, error: membersError }] = await Promise.all([
    supabaseAdmin.from("users").select("id, full_name, email, avatar_url").order("full_name"),
    supabaseAdmin.from("excalibur_leave_members").select("*").order("created_at"),
  ]);

  if (usersError || membersError) {
    return NextResponse.json({ error: usersError?.message || membersError?.message }, { status: 500 });
  }

  const userMap = new Map((users || []).map((user) => [user.id, user]));
  return NextResponse.json({
    users,
    members: (members || []).map((member) => ({ ...member, user: userMap.get(member.user_id) || null })),
  });
}

export async function POST(request: NextRequest) {
  const currentUser = await getAuthorizedUser(request);
  if (!currentUser) return NextResponse.json({ error: "HR access required." }, { status: 403 });

  const body = await request.json() as Record<string, unknown>;
  const userId = String(body.userId || "");
  if (!userId) {
    return NextResponse.json({ error: "Select a user." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("excalibur_leave_members").insert({
    user_id: userId,
    added_by: currentUser.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const currentUser = await getAuthorizedUser(request);
  if (!currentUser) return NextResponse.json({ error: "HR access required." }, { status: 403 });

  const body = await request.json() as Record<string, unknown>;
  const userId = String(body.userId || "");
  const allowances = parseAllowances(body);
  if (!userId || !allowances.valid) {
    return NextResponse.json({ error: "Invalid member or leave allowances." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("excalibur_leave_members").update({
    annual_leave_total: allowances.annualLeaveTotal,
    sick_leave_total: allowances.sickLeaveTotal,
    lieu_leave_total: allowances.lieuLeaveTotal,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const currentUser = await getAuthorizedUser(request);
  if (!currentUser) return NextResponse.json({ error: "HR access required." }, { status: 403 });

  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });

  const { error } = await supabaseAdmin.from("excalibur_leave_members").delete().eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
