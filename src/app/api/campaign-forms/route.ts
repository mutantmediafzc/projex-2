import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  Vary: "Origin",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return json({ error: "A valid campaign authorization token is required" }, 401);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    console.error("Campaign token verification is missing Supabase configuration");
    return json({ error: "Authorization service is unavailable" }, 503);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user: authorizedUser },
    error: authorizationError,
  } = await authClient.auth.getUser(match[1]);
  if (authorizationError || !authorizedUser || !authorizedUser.email) {
    return json({ error: "A valid campaign authorization token is required" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const source = String(body.source ?? body.formSlug ?? "unknown");
  const sourceUrl = String(body.sourceUrl ?? body.source_url ?? source);
  const answers =
    body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
      ? (body.answers as Record<string, unknown>)
      : {};
  const questionnaire = Array.isArray(body.questionnaire)
    ? body.questionnaire
    : Object.entries(answers).map(([id, answer]) => ({
        id,
        question: id,
        answer,
      }));
  const website = String(body.website ?? answers.website ?? "");
  const email = String(body.email ?? answers.email ?? "").trim().toLowerCase();
  const metadata =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? body.metadata
      : {};

  const { data, error } = await supabaseAdmin
    .from("campaign_form_submissions")
    .insert({
      form_slug: source,
      source_url: sourceUrl,
      website,
      email,
      authenticated_user_id: authorizedUser.id,
      authenticated_user_email: authorizedUser.email,
      questionnaire,
      metadata,
    })
    .select("id, form_slug, created_at")
    .single();

  if (error || !data) {
    console.error("Campaign form submission failed", { source, error });
    return json({ error: "Unable to save submission" }, 500);
  }

  return json({ submission: data }, 201);
}
