import { NextRequest, NextResponse } from "next/server";
import { canDeleteInvoice } from "@/lib/invoiceDeleteAccess";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { data, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !data.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  if (!canDeleteInvoice(data.user)) return NextResponse.json({ error: "Invoice deletion is not permitted" }, { status: 403 });

  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid invoice ID" }, { status: 400 });
  }
  const { data: invoice, error: lookupError } = await supabaseAdmin
    .from("invoices").select("id, invoice_type").eq("id", id).maybeSingle();
  if (lookupError) return NextResponse.json({ error: "Unable to load invoice" }, { status: 500 });
  if (!invoice || invoice.invoice_type !== "invoice") {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Keep the invoice and related records intact; the RLS policy hides it from app queries.
  const { error } = await supabaseAdmin.from("invoice_deletions").upsert({
    invoice_id: id,
    deleted_by: data.user.id,
  }, { onConflict: "invoice_id", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: "Unable to delete invoice" }, { status: 500 });
  return NextResponse.json({ success: true });
}
