export const CAMPAIGN_FORM_SLUGS = ["mm26-aeo", "mm26-pm"] as const;

export type CampaignFormSlug = (typeof CAMPAIGN_FORM_SLUGS)[number];

export type CampaignQuestion = {
  id: string;
  question: string;
  required: boolean;
  multiple?: boolean;
  type: "text" | "email" | "number" | "select" | "tel";
  options?: readonly string[];
};

const BUSINESS_OPTIONS = [
  "AI Technology",
  "Building & Construction",
  "Coffee & Tea",
  "Fashion & Apparel",
  "Food & Beverage Products",
  "Food Manufacturing",
  "Jewellery & Accessories",
  "Luxury Products & Services",
  "Healthcare",
  "Hospitality Cleaning & Hygiene Solutions",
  "Hospitality Services",
  "Hotel, Restaurant, Café Equipment",
  "Hotel Supplies",
  "Interior Design & Furnishing",
  "Perfumes & Oud",
  "Real Estate",
  "Restaurants, Cafés, Food Trucks",
  "Other",
] as const;

const COMMON_START: readonly CampaignQuestion[] = [
  {
    id: "website",
    question: "What is your company website?",
    required: true,
    type: "text",
  },
  {
    id: "business",
    question: "What best describes your business?",
    required: true,
    type: "select",
    options: BUSINESS_OPTIONS,
  },
];

export const CAMPAIGN_FORMS: Record<
  CampaignFormSlug,
  { sourceUrl: string; questions: readonly CampaignQuestion[] }
> = {
  "mm26-aeo": {
    sourceUrl: "https://www.mutant.ae/campaign/mm26-aeo",
    questions: [
      ...COMMON_START,
      {
        id: "ranking",
        question: "When someone searches for what you offer, where do you show up?",
        required: true,
        type: "select",
        options: ["Page 1", "Page 2 or beyond", "No idea, never checked"],
      },
      {
        id: "aiSearch",
        question:
          "Have you ever asked ChatGPT, Claude or Gemini about your industry and checked if your brand appears?",
        required: true,
        type: "select",
        options: ["Yes, we show up", "Yes, we don't appear", "Never tried it"],
      },
      {
        id: "traffic",
        question: "How much of your website traffic comes from paid ads vs organic search?",
        required: true,
        type: "select",
        options: ["Mostly paid", "Roughly even", "Mostly organic", "Not sure"],
      },
      {
        id: "frustration",
        question: "What's your biggest frustration right now?",
        required: true,
        multiple: true,
        type: "select",
        options: [
          "Not enough leads",
          "Leads are low quality",
          "Competitors outrank us",
          "We're invisible to AI search",
        ],
      },
      { id: "firstName", question: "First Name", required: true, type: "text" },
      { id: "lastName", question: "Last Name", required: true, type: "text" },
      { id: "email", question: "Email", required: true, type: "email" },
      {
        id: "phoneCountryCode",
        question: "Country calling code",
        required: true,
        type: "text",
      },
      { id: "mobile", question: "Mobile number", required: false, type: "tel" },
    ],
  },
  "mm26-pm": {
    sourceUrl: "https://www.mutant.ae/campaign/mm26-pm",
    questions: [
      ...COMMON_START,
      {
        id: "leadSource",
        question: "Where do most of your leads come from today?",
        required: true,
        multiple: true,
        type: "select",
        options: [
          "Property portals (Bayut, Property Finder, Airbnb, Booking.com)",
          "Our own ads (Meta / Google / TikTok)",
          "Referrals and repeat clients",
          "We barely get leads at all",
        ],
      },
      {
        id: "costAwareness",
        question: "Do you know your exact cost per qualified lead?",
        required: true,
        type: "select",
        options: [
          "Yes, we track it monthly",
          "We know roughly",
          "No idea, we just top up the budget",
          "We don't run ads yet",
        ],
      },
      {
        id: "adSpend",
        question: "Roughly, what's your monthly ad spend?",
        required: false,
        type: "number",
      },
      {
        id: "monthlyLeads",
        question: "And roughly how many leads does that generate each month?",
        required: false,
        type: "number",
      },
      {
        id: "followUp",
        question: "What happens to leads that don't answer the first call?",
        required: true,
        type: "select",
        options: [
          "Automated follow-up (WhatsApp / email sequences)",
          "The agent tries once or twice",
          "Nothing, we move to the next lead",
        ],
      },
      {
        id: "frustration",
        question: "What's your biggest frustration with ads right now?",
        required: true,
        multiple: true,
        type: "select",
        options: [
          "Cost per lead keeps rising",
          "Leads are low quality or fake numbers",
          "Depending on portals for everything",
          "We're not getting leads at all",
        ],
      },
      { id: "fullName", question: "Full Name", required: true, type: "text" },
      { id: "email", question: "Email", required: true, type: "email" },
      {
        id: "phoneCountryCode",
        question: "Country calling code",
        required: true,
        type: "text",
      },
      { id: "mobile", question: "Mobile number", required: false, type: "tel" },
    ],
  },
};

export function isCampaignFormSlug(value: string): value is CampaignFormSlug {
  return CAMPAIGN_FORM_SLUGS.includes(value as CampaignFormSlug);
}
