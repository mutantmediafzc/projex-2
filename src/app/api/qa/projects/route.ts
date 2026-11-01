import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { json, requireQaAdmin } from "@/lib/qaTrackingServer";

type ProjectRow = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  members: Array<{ user: { id: string; full_name: string | null; email: string | null } | null }> | null;
  tasks: Array<{ status: string; review_status: string }> | null;
};

// GET /api/qa/projects — all QA projects with team and task counts.
export async function GET(request: NextRequest) {
  const auth = await requireQaAdmin(request);
  if (auth.error) return auth.error;

  const { data, error } = await supabaseAdmin
    .from("qa_projects")
    .select(
      "id, name, created_at, updated_at, members:qa_project_members(user:users(id, full_name, email)), tasks:qa_tasks(status, review_status)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load QA projects", error);
    return json({ error: "Unable to load QA projects" }, 500);
  }

  const projects = ((data ?? []) as unknown as ProjectRow[]).map((p) => {
    const tasks = p.tasks ?? [];
    return {
      id: p.id,
      name: p.name,
      created_at: p.created_at,
      updated_at: p.updated_at,
      members: (p.members ?? []).map((m) => m.user).filter(Boolean),
      task_total: tasks.length,
      task_submitted: tasks.filter((t) => t.status === "submitted").length,
      task_passed: tasks.filter((t) => t.review_status === "passed").length,
      task_bugs: tasks.filter((t) => t.review_status === "bugs_found").length,
      task_awaiting_review: tasks.filter((t) => t.status === "submitted" && t.review_status === "pending").length,
    };
  });

  return json({ projects });
}

// POST /api/qa/projects — { name, member_ids: string[] }
export async function POST(request: NextRequest) {
  const auth = await requireQaAdmin(request);
  if (auth.error) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return json({ error: "Project name is required" }, 400);
  if (name.length > 200) return json({ error: "Project name is too long" }, 400);

  const memberIds = Array.isArray(body.member_ids)
    ? Array.from(new Set(body.member_ids.filter((v): v is string => typeof v === "string")))
    : [];
  if (memberIds.length === 0) return json({ error: "Select at least one team member" }, 400);

  const { data: project, error } = await supabaseAdmin
    .from("qa_projects")
    .insert({ name, created_by: auth.user.id })
    .select("id")
    .single();

  if (error || !project) {
    console.error("Failed to create QA project", error);
    return json({ error: "Unable to create project" }, 500);
  }

  const { error: membersError } = await supabaseAdmin
    .from("qa_project_members")
    .insert(memberIds.map((user_id) => ({ project_id: project.id, user_id })));

  if (membersError) {
    console.error("Failed to add QA project members", membersError);
    await supabaseAdmin.from("qa_projects").delete().eq("id", project.id);
    return json({ error: "Unable to add team members" }, 500);
  }

  return json({ id: project.id }, 201);
}
