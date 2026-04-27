import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resend, FROM_EMAIL, APP_URL } from "@/lib/resend";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CRON_SECRET = process.env.CRON_SECRET;

async function runDigest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: users, error: usersErr } = await supabaseAdmin
      .from("users")
      .select("id, email, full_name");

    if (usersErr || !users) {
      return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
    }

    let sent = 0;
    let skipped = 0;

    for (const user of users) {
      if (!user.email) { skipped++; continue; }

      const [noteRes, taskRes, workflowRes, socialRes] = await Promise.all([
        supabaseAdmin
          .from("project_note_mentions")
          .select("id, created_at, note:project_notes(body, author_name), project:projects(name)")
          .eq("mentioned_user_id", user.id)
          .is("read_at", null)
          .order("created_at", { ascending: false })
          .limit(10),
        supabaseAdmin
          .from("task_comment_mentions")
          .select("id, created_at, comment:task_comments(body, author_name), project:projects(name), task:tasks(name)")
          .eq("mentioned_user_id", user.id)
          .is("read_at", null)
          .order("created_at", { ascending: false })
          .limit(10),
        supabaseAdmin
          .from("workflow_step_mentions")
          .select("id, created_at, comment_body, author_name, project_id")
          .eq("mentioned_user_id", user.id)
          .is("read_at", null)
          .order("created_at", { ascending: false })
          .limit(10),
        supabaseAdmin
          .from("tasks")
          .select("id, created_at, name, content, created_by_name")
          .eq("assigned_user_id", user.id)
          .eq("source", "social_workflow")
          .neq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const totalUnread =
        (noteRes.data?.length || 0) +
        (taskRes.data?.length || 0) +
        (workflowRes.data?.length || 0) +
        (socialRes.data?.length || 0);

      if (totalUnread === 0) { skipped++; continue; }

      const firstName = (user.full_name || "").split(" ")[0] || "there";

      const buildSection = (title: string, items: { label: string; body: string; link: string }[]) => {
        if (items.length === 0) return "";
        return `
          <div style="margin-bottom:20px;">
            <h3 style="margin:0 0 10px;font-size:13px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:0.05em;">${title} (${items.length})</h3>
            ${items.map((i) => `
              <div style="border-left:3px solid #e0e7ff;padding:8px 12px;margin-bottom:8px;border-radius:0 6px 6px 0;background:#f8fafc;">
                <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#475569;">${i.label}</p>
                <p style="margin:0 0 6px;font-size:13px;color:#334155;line-height:1.5;">${(i.body || "").slice(0, 200)}${(i.body || "").length > 200 ? "…" : ""}</p>
                <a href="${i.link}" style="font-size:12px;color:#6366f1;text-decoration:none;">View →</a>
              </div>`).join("")}
          </div>`;
      };

      const noteSections = (noteRes.data || []).map((m: any) => ({
        label: `${m.note?.author_name || "Someone"} mentioned you${m.project?.name ? ` in ${m.project.name}` : ""}`,
        body: m.note?.body || "",
        link: `${APP_URL}/messages`,
      }));

      const taskSections = (taskRes.data || []).map((m: any) => ({
        label: `${m.comment?.author_name || "Someone"} mentioned you${m.task?.name ? ` on task: ${m.task.name}` : ""}`,
        body: m.comment?.body || "",
        link: `${APP_URL}/messages`,
      }));

      const workflowSections = (workflowRes.data || []).map((m: any) => ({
        label: `${m.author_name || "Someone"} mentioned you in a workflow`,
        body: m.comment_body || "",
        link: `${APP_URL}/messages`,
      }));

      const socialSections = (socialRes.data || []).map((t: any) => ({
        label: `${t.created_by_name || "System"}: ${t.name}`,
        body: t.content || "",
        link: `${APP_URL}/messages`,
      }));

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:600px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Projex</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Your Daily Summary</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1e293b;">Good morning, ${firstName}! ☀️</p>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;">You have <strong>${totalUnread} unread notification${totalUnread === 1 ? "" : "s"}</strong> waiting for you.</p>
            ${buildSection("Note Mentions", noteSections)}
            ${buildSection("Task Comment Mentions", taskSections)}
            ${buildSection("Workflow Mentions", workflowSections)}
            ${buildSection("Social Media Notifications", socialSections)}
            <a href="${APP_URL}/messages" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;margin-top:8px;">
              Go to Messages →
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #f1f5f9;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">This is your daily 9 AM summary from Projex. <a href="${APP_URL}/messages" style="color:#6366f1;">View all messages</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject: `[Projex] Daily Summary — ${totalUnread} unread notification${totalUnread === 1 ? "" : "s"}`,
        html,
      });
      sent++;
    }

    return NextResponse.json({ success: true, sent, skipped });
  } catch (err) {
    console.error("Error in /api/notifications/daily-digest:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return runDigest(req);
}

export async function POST(req: NextRequest) {
  return runDigest(req);
}
