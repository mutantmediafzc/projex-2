import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function authorize(request: NextRequest) {
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
  const user = await authorize(request);
  if (!user) return NextResponse.json({ error: "HR access required." }, { status: 403 });

  const { data, error } = await supabaseAdmin.from("leave_policy_settings").select("*").eq("id", "default").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function PUT(request: NextRequest) {
  const user = await authorize(request);
  if (!user) return NextResponse.json({ error: "HR access required." }, { status: 403 });

  const body = await request.json() as Record<string, unknown>;
  const allowed = [
    "standardAnnualTotal", "standardSickTotal", "standardLieuTotal",
    "excaliburAnnualTotal", "excaliburSickTotal", "excaliburLieuTotal",
  ] as const;
  const columnMap: Record<(typeof allowed)[number], string> = {
    standardAnnualTotal: "standard_annual_total",
    standardSickTotal: "standard_sick_total",
    standardLieuTotal: "standard_lieu_total",
    excaliburAnnualTotal: "excalibur_annual_total",
    excaliburSickTotal: "excalibur_sick_total",
    excaliburLieuTotal: "excalibur_lieu_total",
  };
  const update: Record<string, number | string> = {
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  };

  for (const key of allowed) {
    if (body[key] === undefined) continue;
    const value = Number(body[key]);
    if (!Number.isFinite(value) || value < 0 || value > 999) {
      return NextResponse.json({ error: "Leave allowances must be between 0 and 999 days." }, { status: 400 });
    }
    update[columnMap[key]] = value;
  }

  const { error } = await supabaseAdmin.from("leave_policy_settings").update(update).eq("id", "default");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
