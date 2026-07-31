import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: NextRequest) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: authData } = await supabaseAdmin.auth.getUser(token);
  if (!authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "from and to are required" }, { status: 400 });

  const [{ data, error }, { data: users, error: usersError }] = await Promise.all([
    supabaseAdmin
      .from("leaves")
      .select("id, user_id, leave_type, start_date, end_date, days_count, user:users!leaves_user_id_fkey(id, full_name, email, avatar_url)")
      .eq("status", "approved")
      .lte("start_date", to)
      .gte("end_date", from)
      .order("start_date"),
    supabaseAdmin
      .from("users")
      .select("id, full_name, email")
      .order("full_name"),
  ]);

  if (error || usersError) {
    return NextResponse.json({ error: error?.message || usersError?.message }, { status: 500 });
  }
  return NextResponse.json({ leaves: data || [], users: users || [] });
}
