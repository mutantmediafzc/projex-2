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

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function optionalRecord(value: unknown): Record<string, unknown> {
  return record(value) ?? {};
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

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const body = record(payload);
  if (!body) {
    return json({ error: "Request body must be a JSON object" }, 400);
  }

  const contact = record(body.contact);
  if (!contact) {
    return json({ error: "contact must be a JSON object" }, 400);
  }

  const email = str(contact.email);

  if (!email) {
    return json({ error: "contact.email is required" }, 400);
  }

  const sectionKeys = [
    "brandBrief",
    "objectives",
    "challenges",
    "currentMarketingActivities",
    "goals",
    "serviceRequirements",
    "metadata",
  ] as const;
  const invalidSection = sectionKeys.find(
    (key) => body[key] !== undefined && record(body[key]) === null,
  );
  if (invalidSection) {
    return json({ error: `${invalidSection} must be a JSON object` }, 400);
  }

  const firstName = str(contact.firstName);
  const lastName = str(contact.lastName);
  const phoneCountryCode = str(contact.phoneCountryCode);
  const mobile = str(contact.mobile);
  const sourceIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  const { data, error } = await supabaseAdmin
    .from("brand_briefing_form_submissions")
    .insert({
      company: str(body.company),
      full_name:
        str(contact.fullName) ||
        [firstName, lastName].filter(Boolean).join(" ") ||
        null,
      first_name: firstName,
      last_name: lastName,
      email,
      phone_country_code: phoneCountryCode,
      mobile,
      mobile_with_country_code:
        str(contact.mobileWithCountryCode) ||
        (phoneCountryCode && mobile ? `${phoneCountryCode}${mobile}` : null),
      brand_brief: optionalRecord(body.brandBrief),
      objectives: optionalRecord(body.objectives),
      challenges: optionalRecord(body.challenges),
      current_marketing_activities: optionalRecord(
        body.currentMarketingActivities,
      ),
      goals: optionalRecord(body.goals),
      service_requirements: optionalRecord(body.serviceRequirements),
      metadata: optionalRecord(body.metadata),
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
