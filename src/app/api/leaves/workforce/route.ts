import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const datePattern = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;

export async function GET(request: NextRequest) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: authData } = await supabaseAdmin.auth.getUser(token);
  if (!authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || "";
  const date = searchParams.get("date") || "";
  if (!monthPattern.test(month) || !datePattern.test(date) || !date.startsWith(`${month}-`)) {
    return NextResponse.json({ error: "A valid month and date are required" }, { status: 400 });
  }

  const [year, monthNumber] = month.split("-").map(Number);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, "0")}`;

  const { data: employees, error: employeesError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("is_active", true);

  if (employeesError) {
    return NextResponse.json({ error: employeesError.message }, { status: 500 });
  }

  const employeeIds = (employees || []).map((employee) => employee.id);
  if (employeeIds.length === 0) {
    return NextResponse.json({
      employeeCount: 0,
      monthlyEmployees: 0,
      dailyEmployees: 0,
      monthlyPercentage: 0,
      dailyPercentage: 0,
    });
  }

  const { data: leaves, error: leavesError } = await supabaseAdmin
    .from("leaves")
    .select("user_id, start_date, end_date")
    .eq("status", "approved")
    .in("user_id", employeeIds)
    .lte("start_date", monthEnd)
    .gte("end_date", monthStart);

  if (leavesError) {
    return NextResponse.json({ error: leavesError.message }, { status: 500 });
  }

  const monthlyEmployees = new Set((leaves || []).map((leave) => leave.user_id)).size;
  const dailyEmployees = new Set(
    (leaves || [])
      .filter((leave) => leave.start_date <= date && leave.end_date >= date)
      .map((leave) => leave.user_id),
  ).size;
  const employeeCount = employeeIds.length;

  return NextResponse.json({
    employeeCount,
    monthlyEmployees,
    dailyEmployees,
    monthlyPercentage: Math.round((monthlyEmployees / employeeCount) * 100),
    dailyPercentage: Math.round((dailyEmployees / employeeCount) * 100),
  });
}
