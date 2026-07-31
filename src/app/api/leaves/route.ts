import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Helper: Verify user session from Authorization header
async function verifySession(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") || request.cookies.get("sb-access-token")?.value;
  
  if (!token) {
    // Fallback: get session from Supabase client cookie
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/sb-[^-]+-auth-token=([^;]+)/);
    if (match) {
      try {
        const parsed = JSON.parse(decodeURIComponent(match[1]));
        if (parsed?.[0]?.access_token) {
          const { data } = await supabaseAdmin.auth.getUser(parsed[0].access_token);
          return data.user;
        }
      } catch {}
    }
    return null;
  }
  
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user;
}

async function isHR(userId: string) {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  return data.user?.app_metadata?.hr_access === true || data.user?.user_metadata?.role === "hr";
}

async function createLeaveNotifications(
  recipients: Array<{ id: string; full_name?: string | null }>,
  notification: { name: string; content: string; createdById?: string; createdByName?: string | null },
) {
  if (recipients.length === 0) return;

  const { error } = await supabaseAdmin.from("tasks").insert(
    recipients.map((recipient) => ({
      name: notification.name,
      content: notification.content,
      status: "not_started",
      priority: "medium",
      type: "other",
      activity_date: new Date().toISOString(),
      assigned_user_id: recipient.id,
      assigned_user_name: recipient.full_name ?? null,
      created_by_user_id: notification.createdById ?? null,
      created_by_name: notification.createdByName ?? "Leave Management",
      source: "leave",
    })),
  );

  // A notification failure must not roll back an otherwise valid leave action.
  if (error) console.error("Failed to create leave notifications:", error.message);
}

// GET - Fetch leave requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const all = searchParams.get("all") === "true";

    if (all) {
      const currentUser = await verifySession(request);
      if (!currentUser || !(await isHR(currentUser.id))) {
        return NextResponse.json({ error: "HR access required." }, { status: 403 });
      }
    }

    let query = supabaseAdmin.from("leaves").select(`
      *,
      user:users!leaves_user_id_fkey(id, full_name, email, avatar_url),
      reviewer:users!leaves_reviewed_by_fkey(id, full_name)
    `);

    if (!all && userId) {
      query = query.eq("user_id", userId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ leaves: data });
  } catch {
    return NextResponse.json({ error: "Failed to fetch leaves" }, { status: 500 });
  }
}

// POST - Create leave request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, leaveType, startDate, endDate, reason } = body;

    if (!userId || !leaveType || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Calculate days count
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Validate against available balance
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("annual_leave_used, annual_leave_total, sick_leave_used, sick_leave_total, maternity_leave_eligible, maternity_leave_used")
      .eq("id", userId)
      .single();

    if (userError) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [{ data: excalibur }, { data: policy }] = await Promise.all([
      supabaseAdmin.from("excalibur_leave_members").select("user_id").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("leave_policy_settings").select("*").eq("id", "default").maybeSingle(),
    ]);

    const annualLeaveTotal = policy
      ? (excalibur ? policy.excalibur_annual_total : policy.standard_annual_total)
      : (userData.annual_leave_total ?? 30);
    const sickLeaveTotal = policy
      ? (excalibur ? policy.excalibur_sick_total : policy.standard_sick_total)
      : (userData.sick_leave_total ?? 90);

    if (leaveType === "annual") {
      const available = annualLeaveTotal - (userData.annual_leave_used || 0);
      if (daysCount > available) {
        return NextResponse.json(
          { error: `Insufficient annual leave balance. Available: ${available} days` },
          { status: 400 }
        );
      }
    } else if (leaveType === "sick") {
      const available = sickLeaveTotal - (userData.sick_leave_used || 0);
      if (daysCount > available) {
        return NextResponse.json(
          { error: `Insufficient sick leave balance. Available: ${available} days` },
          { status: 400 }
        );
      }
    } else if (leaveType === "maternity") {
      if (!userData.maternity_leave_eligible) {
        return NextResponse.json(
          { error: "You are not eligible for maternity leave." },
          { status: 403 }
        );
      }
      const available = 90 - (userData.maternity_leave_used || 0);
      if (daysCount > available) {
        return NextResponse.json(
          { error: `Insufficient maternity leave balance. Available: ${available} days` },
          { status: 400 }
        );
      }
    }

    // Create leave request
    const { data, error } = await supabaseAdmin
      .from("leaves")
      .insert({
        user_id: userId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        days_count: daysCount,
        reason: reason || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const [{ data: applicant }, { data: approvers, error: approversError }] = await Promise.all([
      supabaseAdmin.from("users").select("id, full_name").eq("id", userId).single(),
      supabaseAdmin.from("users").select("id, full_name").or("hr_access.eq.true,role.eq.hr"),
    ]);

    if (approversError) {
      console.error("Failed to load leave approvers for notification:", approversError.message);
    } else {
      await createLeaveNotifications(approvers ?? [], {
        name: `New ${leaveType} leave request`,
        content: `${applicant?.full_name ?? "An employee"} requested ${daysCount} day${daysCount === 1 ? "" : "s"} of ${leaveType} leave (${startDate} to ${endDate}).`,
        createdById: userId,
        createdByName: applicant?.full_name,
      });
    }

    return NextResponse.json({ leave: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create leave request" }, { status: 500 });
  }
}

// PATCH - Update leave status (approve/reject) - ADMIN ONLY
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { leaveId, status, reviewedBy, reviewNotes } = body;

    if (!leaveId || !status || !reviewedBy) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Security: the reviewer must be the signed-in admin/HR user.
    const currentUser = await verifySession(request);
    const canReview = currentUser && currentUser.id === reviewedBy && await isHR(currentUser.id);
    if (!canReview) {
      return NextResponse.json(
        { error: "Unauthorized. Only admin/hr can approve or reject leave requests." },
        { status: 403 }
      );
    }

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    if (status === "rejected" && (!reviewNotes || !String(reviewNotes).trim())) {
      return NextResponse.json(
        { error: "A reason is required when denying a leave request." },
        { status: 400 }
      );
    }

    // Get leave details first
    const { data: leaveData, error: leaveError } = await supabaseAdmin
      .from("leaves")
      .select("*")
      .eq("id", leaveId)
      .single();

    if (leaveError || !leaveData) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    if (leaveData.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending leave requests can be updated" },
        { status: 400 }
      );
    }

    // Update leave status
    const { data, error } = await supabaseAdmin
      .from("leaves")
      .update({
        status,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes ? String(reviewNotes).trim() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leaveId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const [{ data: applicant }, { data: reviewer }] = await Promise.all([
      supabaseAdmin.from("users").select("id, full_name").eq("id", leaveData.user_id).single(),
      supabaseAdmin.from("users").select("id, full_name").eq("id", reviewedBy).single(),
    ]);

    await createLeaveNotifications(
      [{ id: leaveData.user_id, full_name: applicant?.full_name }],
      {
        name: `Leave request ${status}`,
        content: `Your ${leaveData.leave_type} leave request for ${leaveData.start_date} to ${leaveData.end_date} was ${status}.${status === "rejected" && reviewNotes ? ` Reason: ${String(reviewNotes).trim()}` : ""}`,
        createdById: reviewedBy,
        createdByName: reviewer?.full_name,
      },
    );

    return NextResponse.json({ leave: data });
  } catch {
    return NextResponse.json({ error: "Failed to update leave request" }, { status: 500 });
  }
}
