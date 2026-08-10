import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const SHENNA_USER_ID = "74c38799-f057-4125-9eb2-dcdb1c4c5600";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await context.params;
  const { data: documentRequest } = await supabaseAdmin
    .from("document_requests")
    .select("user_id, pdf_path")
    .eq("id", id)
    .maybeSingle();
  if (!documentRequest?.pdf_path) return NextResponse.json({ error: "PDF not found." }, { status: 404 });

  const email = authData.user.email?.toLowerCase();
  const isNamedApprover = authData.user.id === SHENNA_USER_ID || email === "ralf@mutant.ae";
  if (documentRequest.user_id !== authData.user.id && !isNamedApprover) {
    return NextResponse.json({ error: "You do not have access to this PDF." }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from("employee-documents")
    .createSignedUrl(documentRequest.pdf_path, 60, { download: true });
  if (error || !data?.signedUrl) return NextResponse.json({ error: error?.message || "Unable to download PDF." }, { status: 500 });

  return NextResponse.redirect(data.signedUrl);
}
