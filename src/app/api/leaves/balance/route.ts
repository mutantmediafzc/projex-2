import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// GET - Fetch user's leave balance
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("annual_leave_used, annual_leave_total, sick_leave_used, sick_leave_total, lieu_leave_used, lieu_leave_total, maternity_leave_eligible, maternity_leave_used")
      .eq("id", userId)
      .single();

    if (error) {
      // If user doesn't exist in users table, return defaults
      if (error.code === "PGRST116") {
        return NextResponse.json({
          balance: {
            annualLeaveUsed: 0,
            annualLeaveTotal: 30,
            annualLeaveRemaining: 30,
            sickLeaveUsed: 0,
            sickLeaveTotal: 90,
            sickLeaveRemaining: 90,
            lieuLeaveUsed: 0,
            lieuLeaveTotal: 0,
            lieuLeaveRemaining: 0,
            maternityLeaveEligible: false,
            maternityLeaveUsed: 0,
            maternityLeaveTotal: 90,
            maternityLeaveRemaining: 0,
          },
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const annualLeaveUsed = data.annual_leave_used || 0;
    const sickLeaveUsed = data.sick_leave_used || 0;
    let sickLeaveTotal = data.sick_leave_total || 90;
    const lieuLeaveUsed = data.lieu_leave_used || 0;
    let lieuLeaveTotal = data.lieu_leave_total || 0;
    let annualLeaveTotal = data.annual_leave_total || 30;

    const [{ data: excalibur }, { data: policy }] = await Promise.all([
      supabaseAdmin
      .from("excalibur_leave_members")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle(),
      supabaseAdmin.from("leave_policy_settings").select("*").eq("id", "default").maybeSingle(),
    ]);

    if (policy) {
      annualLeaveTotal = excalibur ? policy.excalibur_annual_total : policy.standard_annual_total;
      sickLeaveTotal = excalibur ? policy.excalibur_sick_total : policy.standard_sick_total;
      lieuLeaveTotal = excalibur ? policy.excalibur_lieu_total : policy.standard_lieu_total;
    }

    return NextResponse.json({
      balance: {
        annualLeaveUsed,
        annualLeaveTotal,
        annualLeaveRemaining: annualLeaveTotal - annualLeaveUsed,
        sickLeaveUsed,
        sickLeaveTotal,
        sickLeaveRemaining: sickLeaveTotal - sickLeaveUsed,
        lieuLeaveUsed,
        lieuLeaveTotal,
        lieuLeaveRemaining: lieuLeaveTotal - lieuLeaveUsed,
        maternityLeaveEligible: data.maternity_leave_eligible || false,
        maternityLeaveUsed: data.maternity_leave_used || 0,
        maternityLeaveTotal: 90,
        maternityLeaveRemaining: data.maternity_leave_eligible
          ? Math.max(0, 90 - (data.maternity_leave_used || 0))
          : 0,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch leave balance" }, { status: 500 });
  }
}
