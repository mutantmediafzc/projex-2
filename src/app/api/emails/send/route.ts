import { NextResponse } from "next/server";
import { resend, FROM_EMAIL } from "@/lib/resend";

export async function POST(request: Request) {
  try {
    const { to, subject, html, fromUserEmail, emailId } = (await request.json()) as {
      to?: string;
      subject?: string;
      html?: string;
      fromUserEmail?: string | null;
      emailId?: string | null;
    };

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, html" },
        { status: 400 },
      );
    }

    const trimmedTo = to.trim();
    const trimmedSubject = subject.trim();
    const trimmedHtml = html.trim();

    if (!trimmedTo || !trimmedSubject || !trimmedHtml) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, html" },
        { status: 400 },
      );
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: trimmedTo,
      subject: trimmedSubject,
      html: trimmedHtml,
      replyTo: fromUserEmail || undefined,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (error) {
    console.error("Error in /api/emails/send", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 },
    );
  }
}
