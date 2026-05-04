import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function verifySession(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") || request.cookies.get("sb-access-token")?.value;
  
  if (!token) {
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

export async function GET(request: NextRequest) {
  const user = await verifySession(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("work_status, status_updated_at")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ 
    work_status: data?.work_status || "available",
    status_updated_at: data?.status_updated_at || null
  });
}

export async function POST(request: NextRequest) {
  const user = await verifySession(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { work_status } = body;

  if (!work_status || !["available", "on_leave", "wfh"].includes(work_status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const now = new Date();
  const { error } = await supabaseAdmin
    .from("users")
    .update({ 
      work_status,
      status_updated_at: now.toISOString()
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log attendance: record first time user sets status to "available" each day
  if (work_status === "available") {
    // Use GST (UTC+4) for both the date and the late check
    const gstOffsetMs = 4 * 60 * 60 * 1000;
    const gstNow = new Date(now.getTime() + gstOffsetMs);
    const todayStr = gstNow.toISOString().slice(0, 10); // YYYY-MM-DD in GST
    const gstHour = gstNow.getUTCHours();
    const minutes = gstNow.getUTCMinutes();
    const isLate = gstHour > 9 || (gstHour === 9 && minutes >= 10);

    // Upsert: only set first_available_at if not already logged today
    await supabaseAdmin
      .from("attendance_logs")
      .upsert(
        {
          user_id: user.id,
          log_date: todayStr,
          first_available_at: now.toISOString(),
          is_late: isLate,
        },
        {
          onConflict: "user_id,log_date",
          ignoreDuplicates: true, // only insert if no row yet for today
        }
      );
  }

  return NextResponse.json({ success: true, work_status });
}
