import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateQaToken } from "@/lib/qaTracking";
import { getActorName, json, logQaEvent, requireQaAdmin } from "@/lib/qaTrackingServer";

type Params = { params: Promise<{ id: string }> };

// POST /api/qa/projects/[id]/tasks — generate a task link for a team member.
// Body: { assignee_id, title?, description? }
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireQaAdmin(request);
  if (auth.error) return auth.error;
  const { id: projectId } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const assigneeId = typeof body.assignee_id === "string" ? body.assignee_id : "";
  if (!assigneeId) return json({ error: "Select a team member" }, 400);

  const { data: member } = await supabaseAdmin
    .from("qa_project_members")
    .select("user_id")
    .eq("project_id", projectId)
    .eq("user_id", assigneeId)
    .maybeSingle();
  if (!member) return json({ error: "This person is not on the project team" }, 400);

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 500) : "";
  const description = typeof body.description === "string" ? body.description.slice(0, 10000) : "";

  const { data: task, error } = await supabaseAdmin
    .from("qa_tasks")
    .insert({
      project_id: projectId,
      assignee_id: assigneeId,
      public_token: generateQaToken(),
      title,
      description,
      created_by: auth.user.id,
    })
    .select("id, public_token")
    .single();

  if (error || !task) {
    console.error("Failed to create QA task", error);
    return json({ error: "Unable to generate task link" }, 500);
  }

  await logQaEvent({
    taskId: task.id,
    eventType: "created",
    actorId: auth.user.id,
    actorName: await getActorName(auth.user.id, auth.user.email),
    details: { title: title || null },
  });

  return json({ id: task.id, public_token: task.public_token }, 201);
}
