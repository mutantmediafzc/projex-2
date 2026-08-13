import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BREVO_CONTACTS_URL = "https://api.brevo.com/v3/contacts";

type BrevoLog = {
  email: string;
  listId: number;
  statusCode?: number;
  success: boolean;
  responseBody?: string;
  errorMessage?: string;
};

async function saveBrevoApiLog(log: BrevoLog): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("brevo_api_logs").insert({
      endpoint: BREVO_CONTACTS_URL,
      method: "POST",
      email: log.email,
      list_id: log.listId,
      status_code: log.statusCode ?? null,
      success: log.success,
      response_body: log.responseBody || null,
      error_message: log.errorMessage || null,
    });

    if (error) {
      console.error("Unable to save Brevo API log", error);
    }
  } catch (error) {
    console.error("Unable to save Brevo API log", error);
  }
}

export async function addContactToBrevoList(
  email: string,
  listId: number,
): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured");
  }

  const normalizedEmail = email.toLowerCase().trim();

  let response: Response;

  try {
    response = await fetch(BREVO_CONTACTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        email: normalizedEmail,
        listIds: [listId],
        updateEnabled: true,
      }),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown Brevo request error";

    await saveBrevoApiLog({
      email: normalizedEmail,
      listId,
      success: false,
      errorMessage,
    });

    console.error("Brevo API request failed", {
      endpoint: BREVO_CONTACTS_URL,
      method: "POST",
      email: normalizedEmail,
      listId,
      error: errorMessage,
    });
    throw error;
  }

  const responseBody = await response.text().catch(() => "");
  const logDetails = {
    endpoint: BREVO_CONTACTS_URL,
    method: "POST",
    email: normalizedEmail,
    listId,
    status: response.status,
    success: response.ok,
  };

  await saveBrevoApiLog({
    email: normalizedEmail,
    listId,
    statusCode: response.status,
    success: response.ok,
    responseBody,
    errorMessage: response.ok ? undefined : responseBody,
  });

  if (response.ok) {
    console.info("Brevo API request completed", logDetails);
  } else {
    console.error("Brevo API request completed", logDetails);
  }

  if (!response.ok) {
    throw new Error(
      `Brevo contact sync failed with HTTP ${response.status}${responseBody ? `: ${responseBody}` : ""}`,
    );
  }
}
