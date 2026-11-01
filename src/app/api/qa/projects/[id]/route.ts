import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { json, mapTaskSummary, requireQaAdmin, TASK_SUMMARY_SELECT } from "@/lib/qaTrackingServer";

type Params = { params: Promise<{ id: string }> };

// GET /api/qa/projects/[id] — project, team and every task link.
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireQaAdmin(request);
  if (auth.error) return auth.error;
  const { id } = await params;

  const { data: project, error } = await supabaseAdmin
    .from("qa_projects")
    .select("id, name, created_at, updated_at, members:qa_project_members(user:users(id, full_name, email))")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load QA project", error);
    return json({ error: "Unable to load project" }, 500);
  }
  if (!project) return json({ error: "Project not found" }, 404);

  const { data: tasks, error: tasksError } = await supabaseAdmin
    .from("qa_tasks")
    .select(TASK_SUMMARY_SELECT)
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  if (tasksError) {
    console.error("Failed to load QA tasks", tasksError);
    return json({ error: "Unable to load project tasks" }, 500);
  }

  const members = ((project.members ?? []) as unknown as Array<{ user: unknown }>)
    .map((m) => m.user)
    .filter(Boolean);

  return json({
    project: { id: project.id, name: project.name, created_at: project.created_at, updated_at: project.updated_at, members },
    tasks: (tasks ?? []).map(mapTaskSummary),
  });
}

// PATCH /api/qa/projects/[id] — { name?, member_ids? }
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireQaAdmin(request);
  if (auth.error) return auth.error;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 200) return json({ error: "Enter a valid project name" }, 400);
    const { error } = await supabaseAdmin.from("qa_projects").update({ name }).eq("id", id);
    if (error) return json({ error: "Unable to rename project" }, 500);
  }

  if (body.member_ids !== undefined) {
    const memberIds = Array.isArray(body.member_ids)
      ? Array.from(new Set(body.member_ids.filter((v): v is string => typeof v === "string")))
      : [];
    if (memberIds.length === 0) return json({ error: "Select at least one team member" }, 400);

    const { data: existing, error: loadError } = await supabaseAdmin
      .from("qa_project_members")
      .select("user_id")
      .eq("project_id", id);
    if (loadError) return json({ error: "Unable to update team" }, 500);

    const current = new Set((existing ?? []).map((m) => m.user_id as string));
    const toAdd = memberIds.filter((uid) => !current.has(uid));
    const toRemove = Array.from(current).filter((uid) => !memberIds.includes(uid));

    if (toAdd.length) {
      const { error } = await supabaseAdmin
        .from("qa_project_members")
        .insert(toAdd.map((user_id) => ({ project_id: id, user_id })));
      if (error) return json({ error: "Unable to add team members" }, 500);
    }
    if (toRemove.length) {
      // Existing task links of removed members are kept for history.
      const { error } = await supabaseAdmin
        .from("qa_project_members")
        .delete()
        .eq("project_id", id)
        .in("user_id", toRemove);
      if (error) return json({ error: "Unable to remove team members" }, 500);
    }
  }

  return json({ ok: true });
}

// DELETE /api/qa/projects/[id] — removes the project, its tasks, cases and history.
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireQaAdmin(request);
  if (auth.error) return auth.error;
  const { id } = await params;

  const { error } = await supabaseAdmin.from("qa_projects").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete QA project", error);
    return json({ error: "Unable to delete project" }, 500);
  }
  return json({ ok: true });
}
