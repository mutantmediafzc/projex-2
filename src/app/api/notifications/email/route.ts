import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resend, FROM_EMAIL, APP_URL } from "@/lib/resend";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      userId: string;
      type: "note" | "task_comment" | "workflow" | "social_workflow";
      body: string;
      authorName?: string | null;
      projectName?: string | null;
      taskName?: string | null;
      linkPath?: string | null;
    };

    const { userId, type, body: msgBody, authorName, projectName, taskName, linkPath } = body;

    if (!userId || !msgBody) {
      return NextResponse.json({ error: "Missing userId or body" }, { status: 400 });
    }

    const { data: user, error: userErr } = await supabaseAdmin
      .from("users")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (userErr || !user?.email) {
      return NextResponse.json({ error: "User not found or no email" }, { status: 404 });
    }

    const typeLabels: Record<string, string> = {
      note: "Note Mention",
      task_comment: "Task Comment Mention",
      workflow: "Workflow Mention",
      social_workflow: "Social Media Notification",
    };
    const typeLabel = typeLabels[type] || "Notification";
    const fullLink = linkPath ? `${APP_URL}${linkPath}` : `${APP_URL}/messages`;
    const firstName = (user.full_name || "").split(" ")[0] || "there";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Projex</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">${typeLabel}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 16px;font-size:15px;color:#1e293b;">Hi ${firstName},</p>
            <p style="margin:0 0 16px;font-size:14px;color:#475569;">
              ${authorName ? `<strong>${authorName}</strong> ` : ""}${
                type === "note" ? "mentioned you in a note" :
                type === "task_comment" ? "mentioned you in a task comment" :
                type === "workflow" ? "mentioned you in a workflow comment" :
                "sent you a notification"
              }${projectName ? ` on <strong>${projectName}</strong>` : ""}${taskName ? ` — <em>${taskName}</em>` : ""}.
            </p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:0 0 24px;">
              <p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">${msgBody.replace(/\n/g, "<br/>")}</p>
            </div>
            <a href="${fullLink}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
              View in Projex →
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #f1f5f9;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">You received this because you were mentioned or notified in Projex. <a href="${APP_URL}/messages" style="color:#6366f1;">Manage notifications</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: `[Projex] ${typeLabel}${projectName ? ` — ${projectName}` : ""}`,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in /api/notifications/email:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
