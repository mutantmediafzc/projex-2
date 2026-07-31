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
  const hrUser = await authorizeHR(request);
  if (!hrUser) return NextResponse.json({ error: "HR access required." }, { status: 403 });

  const [
    { data: users, error: usersError },
    { data: members, error: membersError },
    { data: policy, error: policyError },
  ] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("id, full_name, email, annual_leave_used, sick_leave_used, lieu_leave_used, maternity_leave_eligible, maternity_leave_used, ticket_price, ticket_price_claimed")
      .order("full_name"),
    supabaseAdmin.from("excalibur_leave_members").select("user_id"),
    supabaseAdmin.from("leave_policy_settings").select("*").eq("id", "default").single(),
  ]);

  if (usersError || membersError || policyError) {
    return NextResponse.json(
      { error: usersError?.message || membersError?.message || policyError?.message },
      { status: 500 },
    );
  }

  const excaliburIds = new Set((members || []).map((member) => member.user_id));
  const employees = (users || []).map((user) => {
    const isExcalibur = excaliburIds.has(user.id);
    return {
      ...user,
      is_excalibur: isExcalibur,
      annual_leave_total: isExcalibur ? policy.excalibur_annual_total : policy.standard_annual_total,
      sick_leave_total: isExcalibur ? policy.excalibur_sick_total : policy.standard_sick_total,
      lieu_leave_total: isExcalibur ? policy.excalibur_lieu_total : policy.standard_lieu_total,
      maternity_leave_total: user.maternity_leave_eligible ? 90 : 0,
    };
  });

  return NextResponse.json({ employees });
}

export async function PATCH(request: NextRequest) {
  const hrUser = await authorizeHR(request);
  if (!hrUser) return NextResponse.json({ error: "HR access required." }, { status: 403 });

  const body = await request.json() as Record<string, unknown>;
  const userId = String(body.userId || "");
  const values: Record<string, number> = {
    annual_leave_used: Number(body.annualLeaveUsed),
    sick_leave_used: Number(body.sickLeaveUsed),
    lieu_leave_used: Number(body.lieuLeaveUsed),
    ticket_price: Number(body.ticketPrice),
    ticket_price_claimed: Number(body.ticketPriceClaimed),
  };

  if (!userId || Object.values(values).some((value) => !Number.isFinite(value) || value < 0)) {
    return NextResponse.json({ error: "All values must be valid non-negative numbers." }, { status: 400 });
  }

  const { data: employee, error: employeeError } = await supabaseAdmin
    .from("users")
    .select("maternity_leave_eligible")
    .eq("id", userId)
    .single();

  if (employeeError || !employee) {
    return NextResponse.json({ error: employeeError?.message || "Employee not found." }, { status: 404 });
  }

  if (employee.maternity_leave_eligible) {
    const maternityLeaveUsed = Number(body.maternityLeaveUsed);
    if (!Number.isFinite(maternityLeaveUsed) || maternityLeaveUsed < 0) {
      return NextResponse.json({ error: "Maternity leave used must be a valid non-negative number." }, { status: 400 });
    }
    values.maternity_leave_used = maternityLeaveUsed;
  }

  const { error } = await supabaseAdmin.from("users").update(values).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
