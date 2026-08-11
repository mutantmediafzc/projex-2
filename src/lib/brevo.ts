const BREVO_CONTACTS_URL = "https://api.brevo.com/v3/contacts";

export async function addContactToBrevoList(
  email: string,
  listId: number,
): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured");
  }

  const response = await fetch(BREVO_CONTACTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      email: email.toLowerCase().trim(),
      listIds: [listId],
      updateEnabled: true,
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    throw new Error(
      `Brevo contact sync failed with HTTP ${response.status}${responseBody ? `: ${responseBody}` : ""}`,
    );
  }
}
