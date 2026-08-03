import { createHmac, timingSafeEqual } from "node:crypto";
type CampaignTokenPayload = {
  aud: "campaign-forms";
  sub: string;
  email: string;
  iat: number;
  exp: number;
};

const TOKEN_TTL_SECONDS = 60 * 60;

function secret() {
  const value = process.env.CAMPAIGN_FORMS_TOKEN_SECRET;
  if (!value || value.length < 32) {
    throw new Error("CAMPAIGN_FORMS_TOKEN_SECRET must contain at least 32 characters");
  }
  return value;
}

function signature(encodedPayload: string) {
  return createHmac("sha256", secret()).update(encodedPayload).digest("base64url");
}

export function createCampaignToken(input: {
  userId: string;
  email: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  const payload: CampaignTokenPayload = {
    aud: "campaign-forms",
    sub: input.userId,
    email: input.email,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return {
    accessToken: `${encodedPayload}.${signature(encodedPayload)}`,
    expiresIn: TOKEN_TTL_SECONDS,
  };
}

export function verifyCampaignToken(token: string) {
  const [encodedPayload, suppliedSignature, extra] = token.split(".");
  if (!encodedPayload || !suppliedSignature || extra) return null;

  const expectedSignature = signature(encodedPayload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<CampaignTokenPayload>;
    const now = Math.floor(Date.now() / 1000);
    if (
      payload.aud !== "campaign-forms" ||
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      payload.iat > now + 30 ||
      payload.exp <= now
    ) {
      return null;
    }
    return payload as CampaignTokenPayload;
  } catch {
    return null;
  }
}
