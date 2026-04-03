import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type WorkflowStatus = "captions" | "creatives_approval" | "creative_approval" | "final_approval" | "for_publishing" | "published";

type NotificationRule = {
  roles: string[];
  specificUsers?: string[]; // User IDs for specific people like "Jeano", "Carlo"
  condition?: (post: any) => boolean;
};

// Notification rules based on the requirements
const NOTIFICATION_RULES: Record<WorkflowStatus, NotificationRule[]> = {
  captions: [
    {
      // Notify Social Media Specialist for new/existing assets without captions
      roles: ["social_media_specialist_id"],
      condition: (post) => !post.caption || post.caption.trim() === "",
    },
    {
      // If long form video, notify Performance Marketer
      roles: ["performance_marketer_id"],
      condition: (post) => post.content_type === "Long-Form Video (16:9)",
    },
    {
      // Notify Creative for assets without creatives
      roles: ["creative_id"],
      condition: (post) => !post.image_asset_url,
    },
  ],
  creatives_approval: [
    {
      // Notify Creative Team Lead for creative development
      roles: ["creative_team_lead_id", "creative_id"],
    },
  ],
  creative_approval: [
    {
      // Notify Account Manager and Creative Team Lead for creative approval
      roles: ["account_manager_id", "creative_team_lead_id"],
    },
  ],
  final_approval: [
    {
      // Notify Jeano
      roles: [],
      specificUsers: [], // Jeano's ID would be added here if known
    },
  ],
  for_publishing: [
    {
      // Notify Social Media Specialist
      roles: ["social_media_specialist_id"],
    },
  ],
  published: [
    {
      // Notify Social Media Specialist and Jeano
      roles: ["social_media_specialist_id"],
      specificUsers: [], // Jeano's ID would be added here
    },
  ],
};

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

    // Get project team assignments
    const { data: project, error: projectError } = await supabaseAdmin
      .from("social_projects")
      .select(`
        id, name,
        account_manager_id,
        creative_team_lead_id,
        creative_id,
        videographer_id,
        social_media_specialist_id,
        performance_marketer_id
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

    // Apply each rule
    for (const rule of rules) {
      // Check condition if exists
      if (rule.condition && !rule.condition(postData || {})) {
        continue;
      }

      // Add users from roles
      for (const roleKey of rule.roles) {
        const userId = project[roleKey as keyof typeof project];
        if (userId && typeof userId === "string") {
          usersToNotify.add(userId);
        }
      }

      // Add specific users
      if (rule.specificUsers) {
        for (const userId of rule.specificUsers) {
          if (userId) {
            usersToNotify.add(userId);
          }
        }
      }
    }

    // Get current user for "created_by_name"
    const { data: authData } = await supabaseAdmin.auth.getUser();
    const currentUserName = authData?.user?.user_metadata?.first_name 
      ? `${authData.user.user_metadata.first_name} ${authData.user.user_metadata.last_name || ""}`.trim()
      : "System";

    // Create tasks/notifications for each user
    const notifications = [];
    const statusLabels: Record<string, string> = {
      creatives_approval: "Creative Development",
      creative_approval: "Creative Approval",
      captions: "Copywriting",
      final_approval: "Final Approval",
      for_publishing: "Scheduled",
      published: "Live",
    };

    for (const userId of usersToNotify) {
      const taskData = {
        assigned_user_id: userId,
        name: `Social Post: ${statusLabels[newStatus] || newStatus}`,
        content: `Post "${postData?.subject || "Untitled"}" in calendar "${project.name}" has moved to ${statusLabels[newStatus] || newStatus}.`,
        status: "pending",
        priority: "medium",
        type: "social_media",
        source: "social_workflow",
        created_by_name: currentUserName,
        project_id: null, // Social posts don't link to regular projects
      };

      const { data: task, error: taskError } = await supabaseAdmin
        .from("tasks")
        .insert(taskData)
        .select("id")
        .single();

      if (!taskError && task) {
        notifications.push({ userId, taskId: task.id });
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
      creatives_approval: "Notify Creative Team Lead and Creative",
      creative_approval: "Notify Account Manager and Creative Team Lead",
      captions: "Notify Social Media Specialist (no caption), Performance Marketer (long form video), Creative (no image)",
      final_approval: "Notify designated approver",
      for_publishing: "Notify Social Media Specialist",
      published: "Notify Social Media Specialist",
    },
  });
}
