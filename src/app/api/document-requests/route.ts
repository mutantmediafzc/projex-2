import { NextRequest, NextResponse } from "next/server";
import { isDocumentType } from "@/lib/documentRequests";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getCurrentUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : data.user;
}

const SHENNA_USER_ID = "74c38799-f057-4125-9eb2-dcdb1c4c5600";

async function canApproveDocuments(user: { id: string; email?: string | null }) {
  if (user.id === SHENNA_USER_ID || user.email?.toLowerCase() === "ralf@mutant.ae") return true;

  const { data } = await supabaseAdmin
    .from("users")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();
  const fullName = data?.full_name?.trim().toLowerCase();
  const email = data?.email?.trim().toLowerCase();
  return fullName === "shenna esguerra" || fullName === "ralf jovenal" || email === "ralf@mutant.ae";
}

async function createDocumentNotifications(
  recipients: Array<{ id: string; full_name: string | null }>,
  notification: { name: string; content: string; createdById: string; createdByName: string | null },
) {
  if (recipients.length === 0) return;
  const { error } = await supabaseAdmin.from("tasks").insert(recipients.map((recipient) => ({
    name: notification.name,
    content: notification.content,
    status: "not_started",
    priority: "medium",
    type: "other",
    activity_date: new Date().toISOString(),
    assigned_user_id: recipient.id,
    assigned_user_name: recipient.full_name,
    created_by_user_id: notification.createdById,
    created_by_name: notification.createdByName,
    source: "document_request",
  })));
  if (error) console.error("Failed to create document request notifications:", error.message);
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const approvals = request.nextUrl.searchParams.get("scope") === "approvals";
  const isApprover = await canApproveDocuments(user);
  if (approvals && !isApprover) {
    return NextResponse.json({ error: "Document approval access required." }, { status: 403 });
  }

  let query = supabaseAdmin
    .from("document_requests")
    .select("id, user_id, document_type, addressed_to, status, pdf_path, approved_at, denial_reason, created_at, user:users!document_requests_user_id_fkey(full_name, email)")
    .order("created_at", { ascending: false });

  let pagination: { page: number; pageSize: number; total: number; totalPages: number } | null = null;
  let statusCounts: Record<string, number> | null = null;
  if (approvals) {
    const statusParam = request.nextUrl.searchParams.get("status");
    const status = ["pending", "processing", "completed", "rejected"].includes(statusParam || "") ? statusParam! : "pending";
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
    const pageSize = 8;
    const [{ count: pending }, { count: processing }, { count: completed }, { count: rejected }, { count: total }] = await Promise.all([
      supabaseAdmin.from("document_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("document_requests").select("id", { count: "exact", head: true }).eq("status", "processing"),
      supabaseAdmin.from("document_requests").select("id", { count: "exact", head: true }).eq("status", "completed"),
      supabaseAdmin.from("document_requests").select("id", { count: "exact", head: true }).eq("status", "rejected"),
      supabaseAdmin.from("document_requests").select("id", { count: "exact", head: true }).eq("status", status),
    ]);
    statusCounts = { pending: pending || 0, processing: processing || 0, completed: completed || 0, rejected: rejected || 0 };
    pagination = { page, pageSize, total: total || 0, totalPages: Math.max(1, Math.ceil((total || 0) / pageSize)) };
    query = query.eq("status", status).range((page - 1) * pageSize, page * pageSize - 1);
  } else {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ requests: data, canApprove: isApprover, pagination, statusCounts });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const body = await request.json();
  const documentType = body.documentType;
  const addressedTo = typeof body.addressedTo === "string" ? body.addressedTo.trim() : "";

  if (!isDocumentType(documentType)) {
    return NextResponse.json({ error: "Select a valid document type." }, { status: 400 });
  }

  if (addressedTo.length > 200) {
    return NextResponse.json({ error: "The addressee must be 200 characters or fewer." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("document_requests")
    .insert({
      user_id: user.id,
      document_type: documentType,
      addressed_to: addressedTo || null,
    })
    .select("id, document_type, addressed_to, status, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }


  const [{ data: requester }, { data: approvers }] = await Promise.all([
    supabaseAdmin.from("users").select("full_name").eq("id", user.id).maybeSingle(),
    supabaseAdmin
      .from("users")
      .select("id, full_name")
      .or(`id.eq.${SHENNA_USER_ID},email.ilike.ralf@mutant.ae,full_name.ilike.Ralf Jovenal`),
  ]);
  await createDocumentNotifications(approvers || [], {
    name: "New document request",
    content: `${requester?.full_name || user.email || "An employee"} requested a ${documentType}.`,
    createdById: user.id,
    createdByName: requester?.full_name || user.email || "Employee Services",
  });

  return NextResponse.json({ request: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (!(await canApproveDocuments(user))) {
    return NextResponse.json({ error: "Document approval access required." }, { status: 403 });
  }

  const formData = await request.formData();
  const requestId = formData.get("requestId");
  const action = formData.get("action");
  const file = formData.get("file");
  const denialReason = typeof formData.get("denialReason") === "string" ? String(formData.get("denialReason")).trim() : "";
  if (typeof requestId !== "string" || !["approve", "upload", "deny"].includes(String(action))) {
    return NextResponse.json({ error: "A request and valid action are required." }, { status: 400 });
  }
  if (action === "upload") {
    if (!(file instanceof File)) return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files can be attached." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "The PDF must be 10 MB or smaller." }, { status: 400 });
    }
  } else if (action === "deny" && !denialReason) {
    return NextResponse.json({ error: "A reason is required when denying a request." }, { status: 400 });
  } else if (action === "deny" && denialReason.length > 500) {
    return NextResponse.json({ error: "The denial reason must be 500 characters or fewer." }, { status: 400 });
  }

  const { data: documentRequest } = await supabaseAdmin
    .from("document_requests")
    .select("id, user_id, document_type, status")
    .eq("id", requestId)
    .maybeSingle();
  if (!documentRequest) {
    return NextResponse.json({ error: "Document request not found." }, { status: 404 });
  }
  const expectedStatus = action === "upload" ? "processing" : "pending";
  if (documentRequest.status !== expectedStatus) {
    return NextResponse.json({ error: action === "upload" ? "Only approved requests can receive a document." : "Only pending requests can be approved or denied." }, { status: 409 });
  }

  let pdfPath: string | null = null;
  if (action === "upload" && file instanceof File) {
    pdfPath = `${requestId}/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("employee-documents")
      .upload(pdfPath, file, { contentType: "application/pdf", upsert: false });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("document_requests")
    .update({
      status: action === "approve" ? "processing" : action === "upload" ? "completed" : "rejected",
      pdf_path: pdfPath,
      approved_by: user.id,
      approved_at: action === "approve" ? new Date().toISOString() : undefined,
      denial_reason: action === "deny" ? denialReason : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", expectedStatus)
    .select("id, user_id, document_type, addressed_to, status, pdf_path, approved_at, denial_reason, created_at")
    .single();

  if (error) {
    if (pdfPath) await supabaseAdmin.storage.from("employee-documents").remove([pdfPath]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const [{ data: employee }, { data: approver }] = await Promise.all([
    supabaseAdmin.from("users").select("id, full_name").eq("id", documentRequest.user_id).single(),
    supabaseAdmin.from("users").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  if (employee) {
    await createDocumentNotifications([employee], {
      name: action === "approve" ? "Document request approved" : action === "upload" ? "Document ready" : "Document request denied",
      content: action === "approve"
        ? `Your ${documentRequest.document_type} request was approved. The completed document will be uploaded soon.`
        : action === "upload"
          ? `Your ${documentRequest.document_type} is ready to download.`
          : `Your ${documentRequest.document_type} request was denied. Reason: ${denialReason}`,
      createdById: user.id,
      createdByName: approver?.full_name || user.email || "Employee Services",
    });
  }

  return NextResponse.json({ request: data });
}
