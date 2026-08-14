import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Webhook-Secret",
  Vary: "Origin",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function authenticate(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : data.user;
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.BRAND_BRIEFING_FORM_SECRET;
  if (expectedSecret) {
    const providedSecret = request.headers.get("x-webhook-secret");
    if (providedSecret !== expectedSecret) {
      return json({ error: "Unauthorized" }, 401);
    }
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const contact = obj(body.contact);
  const email = str(contact.email);

  if (!email) {
    return json({ error: "contact.email is required" }, 400);
  }

  const sourceIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  const { data, error } = await supabaseAdmin
    .from("brand_briefing_form_submissions")
    .insert({
      company: str(body.company),
      full_name: str(contact.fullName),
      first_name: str(contact.firstName),
      last_name: str(contact.lastName),
      email,
      phone_country_code: str(contact.phoneCountryCode),
      mobile: str(contact.mobile),
      mobile_with_country_code: str(contact.mobileWithCountryCode),
      brand_brief: obj(body.brandBrief),
      objectives: obj(body.objectives),
      challenges: obj(body.challenges),
      current_marketing_activities: obj(body.currentMarketingActivities),
      goals: obj(body.goals),
      service_requirements: obj(body.serviceRequirements),
      metadata: obj(body.metadata),
      raw_payload: body,
      source_ip: sourceIp,
    })
    .select("id, created_at")
    .single();

  if (error) {
    console.error("Failed to save brand briefing form submission", error);
    return json({ error: "Unable to save submission" }, 500);
  }

  return json({ ok: true, id: data.id, createdAt: data.created_at }, 201);
}

export async function GET(request: NextRequest) {
  if (!(await authenticate(request))) {
    return json({ error: "Unauthorized" }, 401);
  }

  const { data, error } = await supabaseAdmin
    .from("brand_briefing_form_submissions")
    .select(
      "id, company, full_name, first_name, last_name, email, phone_country_code, mobile, mobile_with_country_code, brand_brief, objectives, challenges, current_marketing_activities, goals, service_requirements, metadata, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ submissions: data });
}
