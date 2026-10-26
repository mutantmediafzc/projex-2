import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  Vary: "Origin",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

async function authenticate(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : data.user;
}

// GET /api/design-requests/options — returns companies + users for dropdowns.
// Uses the service-role client to bypass RLS so all authenticated users
// can populate the Client / Brand and Assigned To dropdowns.
export async function GET(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const [companiesRes, usersRes] = await Promise.all([
    supabaseAdmin.from("companies").select("id, name").order("name"),
    supabaseAdmin.from("users").select("id, full_name, email").order("full_name"),
  ]);

  return json({
    companies: companiesRes.data || [],
    users: usersRes.data || [],
  });
}
