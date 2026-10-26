// Safe local tests for Creative Request validation logic.
// These tests do NOT connect to Supabase and do NOT write any data.
// Run with: npx tsx src/lib/creativeRequests.test.ts

import {
  DESIGN_REQUEST_STATUSES,
  REQUEST_TYPES,
  QUESTIONNAIRE_FIELDS,
  QUESTIONNAIRE_SECTIONS,
  PREFILLED_FIELD_IDS,
  sanitizeAnswers,
  stripPrefilledFields,
  isDesignRequestStatus,
  isRequestType,
  isValidDeliverableUrl,
  isDesignRequestStatus as _isStatus,
} from "./creativeRequests";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${message}`);
  }
}

// 1. All 20 questionnaire fields present
assert(QUESTIONNAIRE_FIELDS.length === 20, "Questionnaire has exactly 20 fields");

// 2. All 6 sections present
assert(QUESTIONNAIRE_SECTIONS.length === 6, "Questionnaire has exactly 6 sections");

// 3. Sections match expected names
const expectedSections = ["REQUEST", "BRAND", "MESSAGE", "CREATIVE", "CONTENT", "OUTPUT"];
assert(
  QUESTIONNAIRE_SECTIONS.every((s, i) => s === expectedSections[i]),
  "Sections are in correct order: REQUEST, BRAND, MESSAGE, CREATIVE, CONTENT, OUTPUT",
);

// 4. Field labels match the Excel workbook exactly
const expectedLabels = [
  "Client / Brand", "Request Type", "Purpose / Goal", "Target Audience",
  "Existing Brand Guidelines?", "Brand Guidelines / Assets", "How Strict Are They?",
  "Key Message", "Desired Reaction", "Tone of Voice",
  "Mood / Aesthetic", "Peg / Inspiration", "What We Like About It",
  "Content / Information", "Must Include / Avoid",
  "Deliverables", "Specs / Platform", "CTA", "Deadline", "Request Owner",
];
assert(
  QUESTIONNAIRE_FIELDS.every((f, i) => f.label === expectedLabels[i]),
  "All 20 field labels match the Excel workbook exactly",
);

// 5. Only ONE Client / Brand field (no separate Client dropdown)
const clientBrandFields = QUESTIONNAIRE_FIELDS.filter((f) =>
  f.label.toLowerCase().includes("client") || f.label.toLowerCase().includes("brand"),
);
assert(
  clientBrandFields.filter((f) => f.id === "client_brand").length === 1,
  "Exactly ONE Client / Brand field exists",
);

// 6. No separate Contact Person field
assert(
  !QUESTIONNAIRE_FIELDS.some((f) => f.label.toLowerCase().includes("contact")),
  "No Contact Person field exists",
);

// 7. Prefilled fields are exactly Client/Brand, Request Type, Request Owner
assert(
  PREFILLED_FIELD_IDS.length === 3 &&
    PREFILLED_FIELD_IDS.includes("client_brand") &&
    PREFILLED_FIELD_IDS.includes("request_type") &&
    PREFILLED_FIELD_IDS.includes("request_owner"),
  "Exactly 3 prefilled fields: client_brand, request_type, request_owner",
);

// 8. Status values match the Tracker worksheet
const expectedStatuses = [
  "waiting_for_brief", "in_queue", "in_progress", "for_approval", "need_to_action", "completed",
];
assert(
  DESIGN_REQUEST_STATUSES.length === 6 &&
    DESIGN_REQUEST_STATUSES.every((s, i) => s === expectedStatuses[i]),
  "Status values match the Tracker worksheet",
);

// 9. Request types match the Excel Tracker
const expectedRequestTypes = [
  "Ad campaign assets", "Branding and Guidelines", "Hiring Ads", "Print or Event Materials",
  "Social media design", "Video or Motion Graphics", "Visual Edit", "Website or UI/UX design", "Other",
];
assert(
  REQUEST_TYPES.length === 9 &&
    REQUEST_TYPES.every((t, i) => t === expectedRequestTypes[i]),
  "Request types match the Excel Tracker categories",
);

// 10. sanitizeAnswers handles text fields
const sanitized = sanitizeAnswers({ purpose_goal: "  Build brand awareness  ", key_message: "" });
assert(
  sanitized.purpose_goal === "Build brand awareness" && !("key_message" in sanitized),
  "sanitizeAnswers trims text and drops empty values",
);

// 11. sanitizeAnswers converts newline-separated links to arrays
const linkSanitized = sanitizeAnswers({
  brand_guidelines_assets: "https://dropbox.com/a\nhttps://drive.google.com/b",
});
assert(
  Array.isArray(linkSanitized.brand_guidelines_assets) &&
    (linkSanitized.brand_guidelines_assets as string[]).length === 2,
  "sanitizeAnswers converts newline-separated links to arrays",
);

// 12. sanitizeAnswers rejects non-string values
const badSanitized = sanitizeAnswers({ purpose_goal: 12345, key_message: null });
assert(
  !("purpose_goal" in badSanitized) && !("key_message" in badSanitized),
  "sanitizeAnswers rejects non-string and null values",
);

// 13. stripPrefilledFields removes prefilled fields (public form security)
const stripped = stripPrefilledFields({
  client_brand: "Hacked Company",
  request_type: "Hacked Type",
  request_owner: "Hacked Owner",
  purpose_goal: "Legit answer",
  key_message: "Another legit answer",
});
assert(
  !("client_brand" in stripped) &&
    !("request_type" in stripped) &&
    !("request_owner" in stripped) &&
    stripped.purpose_goal === "Legit answer" &&
    stripped.key_message === "Another legit answer",
  "stripPrefilledFields removes prefilled fields but keeps client answers",
);

// 14. isDesignRequestStatus validates correctly
assert(isDesignRequestStatus("in_queue") === true, "isDesignRequestStatus accepts valid status");
assert(isDesignRequestStatus("invalid") === false, "isDesignRequestStatus rejects invalid status");

// 15. isRequestType validates correctly
assert(isRequestType("Ad campaign assets") === true, "isRequestType accepts valid type");
assert(isRequestType("Invalid Type") === false, "isRequestType rejects invalid type");

// 16. isValidDeliverableUrl validates Dropbox links
assert(isValidDeliverableUrl("https://www.dropbox.com/scl/fi/abc/file.pdf") === true, "Dropbox URL is valid");
assert(isValidDeliverableUrl("https://drive.google.com/file/d/abc/view") === true, "Google Drive URL is valid");
assert(isValidDeliverableUrl("https://sheets.google.com/abc") === true, "Google Sheets URL is valid");
assert(isValidDeliverableUrl("http://dropbox.com/abc") === false, "HTTP (non-HTTPS) URL is rejected");
assert(isValidDeliverableUrl("https://evil.com/abc") === false, "Non-whitelisted domain is rejected");
assert(isValidDeliverableUrl("not-a-url") === false, "Non-URL string is rejected");

// 17. sanitizeAnswers handles invalid input gracefully
assert(Object.keys(sanitizeAnswers(null)).length === 0, "sanitizeAnswers(null) returns empty object");
assert(Object.keys(sanitizeAnswers(undefined)).length === 0, "sanitizeAnswers(undefined) returns empty object");
assert(Object.keys(sanitizeAnswers("string")).length === 0, "sanitizeAnswers(string) returns empty object");
assert(Object.keys(sanitizeAnswers([])).length === 0, "sanitizeAnswers(array) returns empty object");

console.log("\n--- All tests complete ---");
