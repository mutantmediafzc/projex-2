import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { json, requireQaAdmin } from "@/lib/qaTrackingServer";

// GET /api/qa/users — team members available for QA projects.
export async function GET(request: NextRequest) {
  const auth = await requireQaAdmin(request);
  if (auth.error) return auth.error;

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, full_name, email")
    .order("full_name", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Failed to load QA users", error);
    return json({ error: "Unable to load team members" }, 500);
  }

  return json({ users: data ?? [] });
}
