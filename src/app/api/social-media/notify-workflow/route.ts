import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resend, FROM_EMAIL, APP_URL } from "@/lib/resend";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type WorkflowStatus = "production" | "creatives_approval" | "creative_approval" | "captions" | "final_approval" | "for_publishing" | "published";

type NotificationRule = {
  roles: string[];
  specificUserNames?: string[]; // Names of specific users to notify (looked up dynamically)
  condition?: (post: any) => boolean;
};

// Content types that require Production (shoots): Reels and Long-form
const PRODUCTION_CONTENT_TYPES = ["Reel (9:16)", "Long-Form Video (16:9)"];

// Content types handled by Performance Marketer instead of Integrated Marketing
const PERFORMANCE_MARKETER_CONTENT_TYPES = ["Long-Form Video (16:9)", "Ad Creatives (Check dimensions on notes)"];

// Notification rules based on workflow requirements
const NOTIFICATION_RULES: Record<WorkflowStatus, NotificationRule[]> = {
  production: [
    {
      // Only for Reels and Long-form: Notify Content Creator and Videographer
      roles: ["content_creator_ids", "videographer_ids"],
      condition: (post) => PRODUCTION_CONTENT_TYPES.includes(post.content_type),
    },
  ],
  creatives_approval: [
    {
      // Creative Development: Notify Creative users
      roles: ["creative_ids"],
    },
  ],
  creative_approval: [
    {
      // Creative Approval: Notify Creative Team Lead and Carlo Nickson
      roles: ["creative_team_lead_ids"],
      specificUserNames: ["Carlo Nickson"],
    },
  ],
  captions: [
    {
      // Copywriting: Notify Integrated Marketing (except Long-form and Ad Creatives)
      roles: ["social_media_specialist_ids"],
      condition: (post) => !PERFORMANCE_MARKETER_CONTENT_TYPES.includes(post.content_type),
    },
    {
      // Copywriting: Notify Performance Marketer for Long-form and Ad Creatives
      roles: ["performance_marketer_ids"],
      condition: (post) => PERFORMANCE_MARKETER_CONTENT_TYPES.includes(post.content_type),
    },
  ],
  final_approval: [
    {
      // Final Approval: Notify Jeano Pangan
      roles: [],
      specificUserNames: ["Jeano Pangan"],
    },
  ],
  for_publishing: [
    {
      // Scheduled: Notify Integrated Marketing (except Long-form and Ad Creatives)
      roles: ["social_media_specialist_ids"],
      condition: (post) => !PERFORMANCE_MARKETER_CONTENT_TYPES.includes(post.content_type),
    },
    {
      // Scheduled: Notify Performance Marketer for Long-form and Ad Creatives
      roles: ["performance_marketer_ids"],
      condition: (post) => PERFORMANCE_MARKETER_CONTENT_TYPES.includes(post.content_type),
    },
  ],
  published: [
    {
      // Live: Notify Jeano Pangan and Carlo Nickson
      roles: [],
      specificUserNames: ["Jeano Pangan", "Carlo Nickson"],
    },
  ],
};

// Helper function to find user IDs by name
async function findUsersByName(names: string[]): Promise<string[]> {
  if (!names || names.length === 0) return [];
  
  const userIds: string[] = [];
  
  for (const name of names) {
    const searchName = name.toLowerCase().trim();
    
    // Query users table for matching full_name
    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select("id, full_name")
      .ilike("full_name", `%${searchName}%`);
    
    if (error) {
      console.error("Error finding user by name:", error);
      continue;
    }
    
    if (users) {
      for (const user of users) {
        const userFullName = (user.full_name || "").toLowerCase().trim();
        // Check if the full name matches (case-insensitive)
        if (userFullName.includes(searchName) || searchName.includes(userFullName)) {
          userIds.push(user.id);
        }
      }
    }
  }
  
  console.log(`findUsersByName: Looking for ${names.join(", ")} - Found ${userIds.length} users`);
  return userIds;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, projectId, newStatus, oldStatus, postData } = body;

    if (!postId || !projectId || !newStatus) {
      return NextResponse.json(
        { error: "Missing required fields: postId, projectId, newStatus" },
        { status: 400 }
      );
    }

    // Skip if status hasn't changed
    if (newStatus === oldStatus) {
      return NextResponse.json({ message: "Status unchanged, no notifications sent" });
    }

    // Get project team assignments (now arrays)
    const { data: project, error: projectError } = await supabaseAdmin
      .from("social_projects")
      .select(`
        id, name,
        account_manager_ids,
        creative_team_lead_ids,
        creative_ids,
        videographer_ids,
        social_media_specialist_ids,
        performance_marketer_ids,
        content_creator_ids
      `)
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Get the notification rules for this status
    const rules = NOTIFICATION_RULES[newStatus as WorkflowStatus] || [];
    const usersToNotify = new Set<string>();

    console.log(`[Notify-Workflow] Processing status: ${newStatus}, rules count: ${rules.length}`);

    // Apply each rule
    for (const rule of rules) {
      // Check condition if exists
      if (rule.condition && !rule.condition(postData || {})) {
        console.log(`[Notify-Workflow] Rule condition not met, skipping`);
        continue;
      }

      // Add users from roles (now arrays)
      for (const roleKey of rule.roles) {
        const userIds = project[roleKey as keyof typeof project];
        console.log(`[Notify-Workflow] Role ${roleKey}: ${JSON.stringify(userIds)}`);
        if (Array.isArray(userIds)) {
          for (const userId of userIds) {
            if (userId && typeof userId === "string") {
              usersToNotify.add(userId);
            }
          }
        }
      }

      // Add specific users by name lookup
      if (rule.specificUserNames && rule.specificUserNames.length > 0) {
        console.log(`[Notify-Workflow] Looking up specific users: ${rule.specificUserNames.join(", ")}`);
        const specificUserIds = await findUsersByName(rule.specificUserNames);
        console.log(`[Notify-Workflow] Found user IDs: ${specificUserIds.join(", ") || "none"}`);
        for (const userId of specificUserIds) {
          usersToNotify.add(userId);
        }
      }
    }

    console.log(`[Notify-Workflow] Total users to notify: ${usersToNotify.size}`);
    console.log(`[Notify-Workflow] User IDs: ${Array.from(usersToNotify).join(", ") || "none"}`);

    // Resolve all user IDs -> full_name in one query
    const allUserIds = Array.from(usersToNotify);
    const userNamesMap = new Map<string, string>();
    if (allUserIds.length > 0) {
      const { data: usersRows } = await supabaseAdmin
        .from("users")
        .select("id, full_name")
        .in("id", allUserIds);
      (usersRows || []).forEach((u: any) => { if (u.id) userNamesMap.set(u.id, u.full_name || "Unknown"); });
    }

    // Get current user for "created_by_name"
    const { data: authData } = await supabaseAdmin.auth.getUser();
    const currentUserName = authData?.user?.user_metadata?.first_name 
      ? `${authData.user.user_metadata.first_name} ${authData.user.user_metadata.last_name || ""}`.trim()
      : "System";

    // Determine activity_date: use post's scheduled_date (YYYY-MM-DD) or today
    const activityDate = postData?.scheduled_date
      ? String(postData.scheduled_date).slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    // Create tasks/notifications for each user
    const notifications = [];
    const statusLabels: Record<string, string> = {
      production: "Production Tab",
      creatives_approval: "Creative Development Tab",
      creative_approval: "Creative Approval Tab",
      captions: "Copywriting Tab",
      final_approval: "Final Approval Tab",
      for_publishing: "Scheduled Tab",
      published: "Live",
    };

    // Generate notification message based on status
    const generateNotificationMessage = (status: string) => {
      const postTitle = postData?.subject || "Untitled";
      const calendarName = project.name;
      
      if (status === "published") {
        // Live notification has different format
        return `${calendarName} Calendar - "${postTitle}" is live.`;
      }
      
      return `A new post has been added to ${statusLabels[status] || status} in the "${calendarName}" Calendar - "${postTitle}".`;
    };

    for (const userId of usersToNotify) {
      const assigneeName = userNamesMap.get(userId) || "Unknown";
      const taskData = {
        assigned_user_id: userId,
        assigned_user_name: assigneeName,
        name: `Social Post: ${statusLabels[newStatus]?.replace(" Tab", "") || newStatus}`,
        content: generateNotificationMessage(newStatus),
        status: "not_started",  // Valid enum: not_started, in_progress, completed
        priority: "medium",
        type: "todo",  // Valid enum: todo, call, email
        source: "social_workflow",
        created_by_name: currentUserName,
        project_id: null,
        activity_date: activityDate,
        // Include image URL for Live notifications
        ...(newStatus === "published" && postData?.image_asset_url ? { image_url: postData.image_asset_url } : {}),
      };

      const { data: task, error: taskError } = await supabaseAdmin
        .from("tasks")
        .insert(taskData)
        .select("id")
        .single();

      if (taskError) {
        console.error(`[Notify-Workflow] Failed to create task for user ${userId}:`, taskError);
      } else if (task) {
        console.log(`[Notify-Workflow] Created task ${task.id} for user ${userId}`);
        notifications.push({ userId, taskId: task.id });

        // Send notification email (non-blocking)
        const { data: userRow } = await supabaseAdmin.from("users").select("email, full_name").eq("id", userId).single();
        if (userRow?.email) {
          const msgBody = taskData.content;
          const firstName = (userRow.full_name || "").split(" ")[0] || "there";
          const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f8fafc;padding:32px 16px;"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;"><div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:20px 28px;"><h2 style="margin:0;color:#fff;font-size:18px;">Projex — Social Media Notification</h2></div><div style="padding:24px 28px;"><p style="font-size:15px;color:#1e293b;">Hi ${firstName},</p><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin:12px 0 20px;font-size:14px;color:#334155;line-height:1.6;">${msgBody}</div><a href="${APP_URL}/messages" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600;">View in Projex →</a></div></div></body></html>`;
          resend.emails.send({ from: FROM_EMAIL, to: userRow.email, subject: `[Projex] ${taskData.name}`, html }).catch(() => {});
        }
      }
    }

    // Update the post's last notification status
    await supabaseAdmin
      .from("social_posts")
      .update({ last_notification_status: newStatus })
      .eq("id", postId);

    return NextResponse.json({
      success: true,
      notificationsSent: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("Error sending workflow notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch notification rules info
export async function GET() {
  return NextResponse.json({
    rules: {
      production: "Notify Content Creator and Videographer (Reels and Long-form only)",
      creatives_approval: "Notify Creative users",
      creative_approval: "Notify Creative Team Lead and Carlo Nickson",
      captions: "Notify Integrated Marketing (except Long-form/Ad Creatives) or Performance Marketer (Long-form/Ad Creatives)",
      final_approval: "Notify Jeano Pangan",
      for_publishing: "Notify Integrated Marketing (except Long-form/Ad Creatives) or Performance Marketer (Long-form/Ad Creatives)",
      published: "Notify Jeano Pangan and Carlo Nickson (with image)",
    },
    contentTypesRequiringProduction: PRODUCTION_CONTENT_TYPES,
    contentTypesForPerformanceMarketer: PERFORMANCE_MARKETER_CONTENT_TYPES,
  });
}
