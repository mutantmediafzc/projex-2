import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SLUG = "dre-homes";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("onboarding_submissions")
    .select("*")
    .eq("slug", SLUG)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ submission: data ?? null });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { items } = body;

  if (!items || typeof items !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("onboarding_submissions")
    .upsert(
      {
        slug: SLUG,
        client_name: "Dre Homes",
        items,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ submission: data });
}
