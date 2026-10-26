// Creative / Design Request Management — shared definitions, types, and validation.
// Reused by internal forms, public forms, and API routes to stay DRY.

export const DESIGN_REQUEST_STATUSES = [
  "waiting_for_brief",
  "in_queue",
  "in_progress",
  "for_approval",
  "need_to_action",
  "completed",
] as const;

export type DesignRequestStatus = (typeof DESIGN_REQUEST_STATUSES)[number];

export const DESIGN_REQUEST_STATUS_LABELS: Record<DesignRequestStatus, string> = {
  waiting_for_brief: "Waiting for Brief",
  in_queue: "In Queue",
  in_progress: "In Progress",
  for_approval: "For Approval",
  need_to_action: "Need to Action",
  completed: "Completed",
};

export const DESIGN_REQUEST_STATUS_COLORS: Record<DesignRequestStatus, string> = {
  waiting_for_brief: "bg-slate-100 text-slate-700",
  in_queue: "bg-sky-100 text-sky-700",
  in_progress: "bg-amber-100 text-amber-700",
  for_approval: "bg-violet-100 text-violet-700",
  need_to_action: "bg-rose-100 text-rose-700",
  completed: "bg-emerald-100 text-emerald-700",
};

export const REQUEST_TYPES = [
  "Ad campaign assets",
  "Branding and Guidelines",
  "Hiring Ads",
  "Print or Event Materials",
  "Social media design",
  "Video or Motion Graphics",
  "Visual Edit",
  "Website or UI/UX design",
  "Other",
] as const;

export type RequestType = (typeof REQUEST_TYPES)[number];

export const SUBMISSION_SOURCES = ["internal", "public"] as const;
export type SubmissionSource = (typeof SUBMISSION_SOURCES)[number];

// --- Questionnaire definition (20 fields, 6 sections) ---
// Mirrors the "Creative Request Brief" worksheet exactly.

export type QuestionnaireFieldId =
  | "client_brand"
  | "request_type"
  | "purpose_goal"
  | "target_audience"
  | "existing_brand_guidelines"
  | "brand_guidelines_assets"
  | "how_strict_are_they"
  | "key_message"
  | "desired_reaction"
  | "tone_of_voice"
  | "mood_aesthetic"
  | "peg_inspiration"
  | "what_we_like_about_it"
  | "content_information"
  | "must_include_avoid"
  | "deliverables"
  | "specs_platform"
  | "cta"
  | "deadline"
  | "request_owner";

export type QuestionnaireField = {
  id: QuestionnaireFieldId;
  section: string;
  label: string;
  helper: string;
  type: "text" | "textarea" | "select" | "date" | "links";
  options?: readonly string[];
  // Fields prefilled from the request configuration are read-only on the
  // public form and pre-populated on the internal form.
  prefilled?: boolean;
};

export const QUESTIONNAIRE_SECTIONS = [
  "REQUEST",
  "BRAND",
  "MESSAGE",
  "CREATIVE",
  "CONTENT",
  "OUTPUT",
] as const;

export const QUESTIONNAIRE_FIELDS: readonly QuestionnaireField[] = [
  // A. REQUEST
  { id: "client_brand", section: "REQUEST", label: "Client / Brand", helper: "Who is this for?", type: "text", prefilled: true },
  { id: "request_type", section: "REQUEST", label: "Request Type", helper: "What are we creating?", type: "text", prefilled: true },
  { id: "purpose_goal", section: "REQUEST", label: "Purpose / Goal", helper: "Why are we creating this? What should it achieve?", type: "textarea" },
  { id: "target_audience", section: "REQUEST", label: "Target Audience", helper: "Who are we speaking to?", type: "textarea" },
  // B. BRAND
  { id: "existing_brand_guidelines", section: "BRAND", label: "Existing Brand Guidelines?", helper: "Are there approved guidelines Creative should follow?", type: "select", options: ["Yes", "No", "N/A"] },
  { id: "brand_guidelines_assets", section: "BRAND", label: "Brand Guidelines / Assets", helper: "Paste link to guidelines, logos, fonts, brand folder, brochure or existing assets.", type: "links" },
  { id: "how_strict_are_they", section: "BRAND", label: "How Strict Are They?", helper: "How closely should Creative follow the existing brand system?", type: "textarea" },
  // C. MESSAGE
  { id: "key_message", section: "MESSAGE", label: "Key Message", helper: "What is the ONE main thing we need to communicate?", type: "textarea" },
  { id: "desired_reaction", section: "MESSAGE", label: "Desired Reaction", helper: "What should people think, feel or do after seeing it?", type: "textarea" },
  { id: "tone_of_voice", section: "MESSAGE", label: "Tone of Voice", helper: "How should the communication sound?", type: "textarea" },
  // D. CREATIVE
  { id: "mood_aesthetic", section: "CREATIVE", label: "Mood / Aesthetic", helper: "How should it feel visually?", type: "textarea" },
  { id: "peg_inspiration", section: "CREATIVE", label: "Peg / Inspiration", helper: "Paste reference links, if any.", type: "links" },
  { id: "what_we_like_about_it", section: "CREATIVE", label: "What We Like About It", helper: "What specifically should Creative take from the reference?", type: "textarea" },
  // E. CONTENT
  { id: "content_information", section: "CONTENT", label: "Content / Information", helper: "What copy, products, services, pages or information must be included?", type: "textarea" },
  { id: "must_include_avoid", section: "CONTENT", label: "Must Include / Avoid", helper: "Any mandatory elements, restrictions or client requests?", type: "textarea" },
  // F. OUTPUT
  { id: "deliverables", section: "OUTPUT", label: "Deliverables", helper: "What needs to be delivered?", type: "textarea" },
  { id: "specs_platform", section: "OUTPUT", label: "Specs / Platform", helper: "Size, format, number of pages/assets, platform or placement.", type: "textarea" },
  { id: "cta", section: "OUTPUT", label: "CTA", helper: "What action should the audience take, if applicable?", type: "textarea" },
  { id: "deadline", section: "OUTPUT", label: "Deadline", helper: "When is the first draft / final needed?", type: "date" },
  { id: "request_owner", section: "OUTPUT", label: "Request Owner", helper: "Who should Creative go back to for questions?", type: "text", prefilled: true },
];

export type QuestionnaireAnswers = Partial<Record<QuestionnaireFieldId, string | string[]>>;

// --- Row types (mirror the database shape) ---

export type CreativeRequestRow = {
  id: string;
  company_id: string;
  company_name?: string | null;
  request_type: string;
  requested_by: string;
  requested_by_name?: string | null;
  assigned_to: string | null;
  assigned_to_name?: string | null;
  status: DesignRequestStatus;
  submission_source: SubmissionSource;
  public_token: string | null;
  answers: QuestionnaireAnswers;
  deadline: string | null;
  deadline_notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
};

export type CreativeRequestResponseRow = {
  id: string;
  request_id: string;
  user_id: string;
  user_name: string | null;
  comment: string | null;
  deliverable_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CreativeRequestNotificationRow = {
  id: string;
  request_id: string;
  user_id: string;
  read_at: string | null;
  created_at: string;
};

// --- Validation ---

export const DELIVERABLE_URL_PATTERN = /^https:\/\/(www\.)?(dropbox\.com|drive\.google\.com|docs\.google\.com|sheets\.google\.com|1drv\.ms|sharepoint\.com|we\.tl|box\.com|wetransfer\.com)\/.+/i;

export function isValidDeliverableUrl(value: string): boolean {
  return DELIVERABLE_URL_PATTERN.test(value.trim());
}

export function sanitizeAnswers(raw: unknown): QuestionnaireAnswers {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const result: QuestionnaireAnswers = {};
  for (const field of QUESTIONNAIRE_FIELDS) {
    const value = obj[field.id];
    if (value === undefined || value === null) continue;
    if (field.type === "links") {
      if (Array.isArray(value)) {
        const links = value.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean);
        if (links.length) result[field.id] = links;
      } else if (typeof value === "string" && value.trim()) {
        // Split newline-separated links into an array
        const links = value.split(/[\n,]/).map((l) => l.trim()).filter(Boolean);
        if (links.length) result[field.id] = links;
      }
    } else if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) result[field.id] = trimmed;
    }
  }
  return result;
}

// Fields that external clients must NOT be able to change.
export const PREFILLED_FIELD_IDS = QUESTIONNAIRE_FIELDS
  .filter((f) => f.prefilled)
  .map((f) => f.id);

export function stripPrefilledFields(answers: QuestionnaireAnswers): QuestionnaireAnswers {
  const result: QuestionnaireAnswers = {};
  for (const key of Object.keys(answers) as QuestionnaireFieldId[]) {
    if (!PREFILLED_FIELD_IDS.includes(key)) {
      result[key] = answers[key];
    }
  }
  return result;
}

export function isDesignRequestStatus(value: string): value is DesignRequestStatus {
  return (DESIGN_REQUEST_STATUSES as readonly string[]).includes(value);
}

export function isRequestType(value: string): value is RequestType {
  return (REQUEST_TYPES as readonly string[]).includes(value);
}

export function generatePublicToken(): string {
  // 32-byte unguessable token (URL-safe base64)
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
