import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  CAMPAIGN_FORMS,
  CampaignQuestion,
  isCampaignFormSlug,
} from "@/lib/campaignForms";

type Answer = string | number | string[] | null;
type SubmittedQuestion = { id?: unknown; question?: unknown; answer?: unknown };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  Vary: "Origin",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

function hasValue(value: Answer | undefined) {
  return Array.isArray(value)
    ? value.length > 0
    : value !== undefined && value !== null && String(value).trim() !== "";
}

function validateAnswer(question: CampaignQuestion, value: Answer | undefined) {
  if (!hasValue(value)) return question.required ? "is required" : null;

  if (question.multiple) {
    if (!Array.isArray(value)) return "must be an array";
    if (question.options && value.some((item) => !question.options?.includes(item))) {
      return "contains an invalid option";
    }
    return null;
  }

  if (Array.isArray(value)) return "must not be an array";
  if (question.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) {
    return "must be a finite number";
  }
  if (question.type !== "number" && typeof value !== "string") return "must be a string";
  if (question.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
    return "must be a valid email address";
  }
  if (question.options && !question.options.includes(String(value))) return "is not a valid option";
  return null;
}

function parseAnswers(body: Record<string, unknown>, questions: readonly CampaignQuestion[]) {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const answers: Record<string, Answer> = {};
  const errors: Record<string, string> = {};

  if (body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)) {
    for (const [id, value] of Object.entries(body.answers)) {
      if (!byId.has(id)) errors[id] = "is not a question in this form";
      else answers[id] = value as Answer;
    }
  } else if (Array.isArray(body.questionnaire)) {
    for (const entry of body.questionnaire as SubmittedQuestion[]) {
      if (!entry || typeof entry !== "object" || typeof entry.id !== "string") {
        errors.questionnaire = "each item must contain a question id";
        continue;
      }
      const expected = byId.get(entry.id);
      if (!expected) {
        errors[entry.id] = "is not a question in this form";
        continue;
      }
      if (typeof entry.question !== "string" || entry.question.trim() !== expected.question) {
        errors[entry.id] = "question text does not match this form";
        continue;
      }
      answers[entry.id] = entry.answer as Answer;
    }
  } else {
    errors.body = "provide either an answers object or a questionnaire array";
  }

  for (const question of questions) {
    const error = validateAnswer(question, answers[question.id]);
    if (error) errors[question.id] = error;
  }

  return { answers, errors };
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ formSlug: string }> },
) {
  const { formSlug } = await context.params;
  if (!isCampaignFormSlug(formSlug)) return json({ error: "Unknown campaign form" }, 404);

  const form = CAMPAIGN_FORMS[formSlug];
  return json({ formSlug, sourceUrl: form.sourceUrl, questions: form.questions });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ formSlug: string }> },
) {
  const { formSlug } = await context.params;
  if (!isCampaignFormSlug(formSlug)) return json({ error: "Unknown campaign form" }, 404);

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

  const form = CAMPAIGN_FORMS[formSlug];
  const { answers, errors } = parseAnswers(body, form.questions);
  if (Object.keys(errors).length > 0) {
    return json({ error: "Validation failed", fields: errors }, 422);
  }

  const questionnaire = form.questions.map((question) => ({
    id: question.id,
    question: question.question,
    answer: answers[question.id] ?? null,
  }));

  const { data, error } = await supabaseAdmin
    .from("campaign_form_submissions")
    .insert({
      form_slug: formSlug,
      source_url: form.sourceUrl,
      website: String(answers.website),
      email: String(answers.email).trim().toLowerCase(),
      authenticated_user_id: authorizedUser.id,
      authenticated_user_email: authorizedUser.email,
      questionnaire,
      metadata:
        body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
          ? body.metadata
          : {},
    })
    .select("id, form_slug, created_at")
    .single();

  if (error || !data) {
    console.error("Campaign form submission failed", { formSlug, error });
    return json({ error: "Unable to save submission" }, 500);
  }

  return json({ submission: data }, 201);
}
