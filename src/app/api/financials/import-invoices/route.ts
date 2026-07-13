import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type CsvRow = Record<string, string>;
type ImportMode = "dry-run" | "import";

type ImportStats = {
  invoices: { total: number; created: number; skipped: number; failed: number; unmatchedProjects: number };
  items: { total: number; created: number; skipped: number; failed: number };
  payments: { total: number; created: number; skipped: number; failed: number };
  reviewRows: ReviewRow[];
  unmatchedProjectRows: UnmatchedProjectRow[];
  warnings: string[];
  errors: string[];
};

type ReviewRow = {
  section: "Invoice" | "Item" | "Payment";
  rowId: string;
  reference: string;
  reason: string;
};

type UnmatchedProjectRow = {
  invoiceNumber: string;
  clientName: string;
  total: number;
  issueDate: string;
  search: string;
  reason: string;
};

type ExistingProject = {
  id: string;
  name: string;
  company_id: string;
  company?: { id: string; name: string } | null;
};

type WixProjectMatch = {
  id: string;
  legacyId: string;
  name: string;
};

const IMPORT_SOURCE = "legacy_invoice_csv";
const REQUIRED_HEADERS = {
  invoices: ["invoiceNumber", "ID", "invoiceDate", "total", "status", "companyInvoice"],
  items: ["invoice", "ID", "price", "quantity", "amount"],
  payments: ["invoice", "ID", "paymentDate", "amount", "status"],
  projects: ["project", "ID"],
};

export async function POST(request: NextRequest) {
  const stats = createStats();

  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id, role")
      .eq("id", authData.user.id)
      .single();

    if (userRow?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const form = await request.formData();
    const mode = normalizeMode(form.get("mode"));
    const invoiceFile = getFile(form, "invoices");
    const itemFile = getFile(form, "items");
    const paymentFile = getFile(form, "payments");
    const projectFile = getFile(form, "projects");

    if (!invoiceFile || !itemFile || !paymentFile) {
      return NextResponse.json({ error: "Invoices, invoice items, and payments CSV files are required" }, { status: 400 });
    }

    const invoiceRows = parseCsv(await invoiceFile.text());
    const itemRows = parseCsv(await itemFile.text());
    const paymentRows = parseCsv(await paymentFile.text());
    const projectRows = projectFile ? parseCsv(await projectFile.text()) : [];
    stats.invoices.total = invoiceRows.length;
    stats.items.total = itemRows.length;
    stats.payments.total = paymentRows.length;

    const headerError = validateHeaders(invoiceRows, itemRows, paymentRows, projectRows);
    if (headerError) return NextResponse.json({ error: headerError }, { status: 400 });

    if (mode === "dry-run") {
      await dryRun(invoiceRows, itemRows, paymentRows, projectRows, stats);
      return NextResponse.json({ mode, stats });
    }

    await importRows(invoiceRows, itemRows, paymentRows, projectRows, authData.user.id, stats);
    return NextResponse.json({ mode, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected import error";
    return NextResponse.json({ error: message, stats }, { status: 500 });
  }
}

function normalizeMode(value: FormDataEntryValue | null): ImportMode {
  return value === "import" ? "import" : "dry-run";
}

function getFile(form: FormData, key: string): File | null {
  const value = form.get(key);
  return value instanceof File ? value : null;
}

function createStats(): ImportStats {
  return {
    invoices: { total: 0, created: 0, skipped: 0, failed: 0, unmatchedProjects: 0 },
    items: { total: 0, created: 0, skipped: 0, failed: 0 },
    payments: { total: 0, created: 0, skipped: 0, failed: 0 },
    reviewRows: [],
    unmatchedProjectRows: [],
    warnings: [],
    errors: [],
  };
}

function parseCsv(content: string): CsvRow[] {
  const records: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && content[i + 1] === "\n") i++;
      row.push(current.trim());
      if (row.some((value) => value.trim())) records.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  row.push(current.trim());
  if (row.some((value) => value.trim())) records.push(row);
  if (records.length < 2) return [];

  const headers = records[0];
  return records.slice(1).map((values) => {
    const parsed: CsvRow = {};
    headers.forEach((header, index) => {
      parsed[header] = values[index] ?? "";
    });
    return parsed;
  });
}

function validateHeaders(invoices: CsvRow[], items: CsvRow[], payments: CsvRow[], projects: CsvRow[]): string | null {
  const checks: Array<[string, CsvRow[], string[]]> = [
    ["Invoices", invoices, REQUIRED_HEADERS.invoices],
    ["Invoice items", items, REQUIRED_HEADERS.items],
    ["Payments", payments, REQUIRED_HEADERS.payments],
  ];

  for (const [label, rows, required] of checks) {
    if (rows.length === 0) return `${label} CSV has no importable rows`;
    const headers = new Set(Object.keys(rows[0]));
    const missing = required.filter((header) => !headers.has(header));
    if (missing.length) return `${label} CSV is missing required headers: ${missing.join(", ")}`;
  }

  if (projects.length > 0) {
    const headers = new Set(Object.keys(projects[0]));
    const missing = REQUIRED_HEADERS.projects.filter((header) => !headers.has(header));
    if (missing.length) return `Projects CSV is missing required headers: ${missing.join(", ")}`;
  }

  return null;
}

async function dryRun(invoiceRows: CsvRow[], itemRows: CsvRow[], paymentRows: CsvRow[], projectRows: CsvRow[], stats: ImportStats) {
  const existingInvoices = await getExistingExternalIds("invoices");
  const existingItems = await getExistingExternalIds("invoice_items");
  const existingPayments = await getExistingExternalIds("invoice_payments");
  const projectResolver = await buildProjectResolver(projectRows);
  const invoiceIds = new Set(invoiceRows.map((row) => row.ID).filter(Boolean));
  const blockedInvoiceIds = new Set<string>();

  for (const row of invoiceRows) {
    if (existingInvoices.has(row.ID)) {
      stats.invoices.skipped++;
      continue;
    }
    const mapped = mapInvoice(row, projectResolver);
    if (!mapped.record) {
      stats.invoices.failed++;
      stats.errors.push(mapped.error);
      addReviewRow(stats, "Invoice", row.ID, row.invoiceNumber, mapped.error);
      if (row.ID) blockedInvoiceIds.add(row.ID);
      continue;
    }
    if (!mapped.projectMatched) {
      addUnmatchedProjectRow(stats, row, mapped.projectMatchReason);
      addReviewRow(stats, "Invoice", row.ID, row.invoiceNumber, mapped.projectMatchReason);
      stats.invoices.failed++;
      if (row.ID) blockedInvoiceIds.add(row.ID);
      continue;
    }
    stats.invoices.created++;
  }

  for (const row of itemRows) {
    if (existingItems.has(row.ID)) stats.items.skipped++;
    else if (!invoiceIds.has(row.invoice)) {
      stats.items.failed++;
      const reason = `Parent invoice ${row.invoice || "(blank)"} is not in the invoices CSV`;
      if (stats.errors.length < 30) stats.errors.push(`Item ${row.ID || "(missing ID)"}: ${reason}`);
      addReviewRow(stats, "Item", row.ID, row.invoice, reason);
    }
    else if (blockedInvoiceIds.has(row.invoice)) {
      stats.items.failed++;
      const reason = `Parent invoice ${row.invoice} is blocked because its project match is unresolved`;
      if (stats.errors.length < 30) stats.errors.push(`Item ${row.ID || "(missing ID)"}: ${reason}`);
      addReviewRow(stats, "Item", row.ID, row.invoice, reason);
    }
    else stats.items.created++;
  }

  for (const row of paymentRows) {
    if (existingPayments.has(row.ID)) stats.payments.skipped++;
    else if (!invoiceIds.has(row.invoice)) {
      stats.payments.failed++;
      const reason = `Parent invoice ${row.invoice || "(blank)"} is not in the invoices CSV`;
      if (stats.errors.length < 30) stats.errors.push(`Payment ${row.ID || "(missing ID)"}: ${reason}`);
      addReviewRow(stats, "Payment", row.ID, row.invoice, reason);
    }
    else if (blockedInvoiceIds.has(row.invoice)) {
      stats.payments.failed++;
      const reason = `Parent invoice ${row.invoice} is blocked because its project match is unresolved`;
      if (stats.errors.length < 30) stats.errors.push(`Payment ${row.ID || "(missing ID)"}: ${reason}`);
      addReviewRow(stats, "Payment", row.ID, row.invoice, reason);
    }
    else stats.payments.created++;
  }
}

async function importRows(
  invoiceRows: CsvRow[],
  itemRows: CsvRow[],
  paymentRows: CsvRow[],
  projectRows: CsvRow[],
  userId: string,
  stats: ImportStats
) {
  const projectResolver = await buildProjectResolver(projectRows);
  const existingInvoiceIds = await getExistingImportIdMap("invoices");
  const invoiceIdMap = new Map(existingInvoiceIds);

  for (const row of invoiceRows) {
    if (invoiceIdMap.has(row.ID)) {
      stats.invoices.skipped++;
      continue;
    }

    const mapped = mapInvoice(row, projectResolver);
    if (!mapped.record) {
      stats.invoices.failed++;
      stats.errors.push(mapped.error);
      addReviewRow(stats, "Invoice", row.ID, row.invoiceNumber, mapped.error);
      continue;
    }
    if (!mapped.projectMatched) {
      addUnmatchedProjectRow(stats, row, mapped.projectMatchReason);
      addReviewRow(stats, "Invoice", row.ID, row.invoiceNumber, mapped.projectMatchReason);
      stats.invoices.failed++;
      continue;
    }

    const { data, error } = await supabaseAdmin
      .from("invoices")
      .insert({ ...mapped.record, created_by: userId })
      .select("id")
      .single();

    if (error || !data) {
      stats.invoices.failed++;
      stats.errors.push(`${row.invoiceNumber || row.ID}: ${error?.message ?? "Invoice insert failed"}`);
      continue;
    }

    invoiceIdMap.set(row.ID, data.id);
    stats.invoices.created++;
  }

  const existingItemIds = await getExistingExternalIds("invoice_items");
  for (const [index, row] of itemRows.entries()) {
    if (existingItemIds.has(row.ID)) {
      stats.items.skipped++;
      continue;
    }

    const invoiceId = invoiceIdMap.get(row.invoice);
    if (!invoiceId) {
      stats.items.failed++;
      const reason = `Parent invoice ${row.invoice || "(blank)"} was not imported`;
      stats.errors.push(`Item ${row.ID || index + 1}: ${reason}`);
      addReviewRow(stats, "Item", row.ID || String(index + 1), row.invoice, reason);
      continue;
    }

    const record = mapItem(row, invoiceId, index);
    if (!record) {
      stats.items.failed++;
      const reason = "Description or amount is missing";
      stats.errors.push(`Item ${row.ID || index + 1}: ${reason}`);
      addReviewRow(stats, "Item", row.ID || String(index + 1), row.invoice, reason);
      continue;
    }

    const { error } = await supabaseAdmin.from("invoice_items").insert(record);
    if (error) {
      stats.items.failed++;
      stats.errors.push(`Item ${row.ID || index + 1}: ${error.message}`);
    } else {
      stats.items.created++;
    }
  }

  const existingPaymentIds = await getExistingExternalIds("invoice_payments");
  for (const [index, row] of paymentRows.entries()) {
    if (existingPaymentIds.has(row.ID)) {
      stats.payments.skipped++;
      continue;
    }

    const invoiceId = invoiceIdMap.get(row.invoice);
    if (!invoiceId) {
      stats.payments.failed++;
      const reason = `Parent invoice ${row.invoice || "(blank)"} was not imported`;
      stats.errors.push(`Payment ${row.ID || index + 1}: ${reason}`);
      addReviewRow(stats, "Payment", row.ID || String(index + 1), row.invoice, reason);
      continue;
    }

    const record = mapPayment(row, invoiceId);
    if (!record) {
      stats.payments.failed++;
      const reason = "Paid amount/date is missing or payment status is not Paid";
      stats.errors.push(`Payment ${row.ID || index + 1}: ${reason}`);
      addReviewRow(stats, "Payment", row.ID || String(index + 1), row.invoice, reason);
      continue;
    }

    const { error } = await supabaseAdmin.from("invoice_payments").insert(record);
    if (error) {
      stats.payments.failed++;
      stats.errors.push(`Payment ${row.ID || index + 1}: ${error.message}`);
    } else {
      stats.payments.created++;
    }
  }

  await recalculateImportedInvoiceStatuses(invoiceIdMap, invoiceRows, stats);
}

function addReviewRow(stats: ImportStats, section: ReviewRow["section"], rowId: string, reference: string, reason: string) {
  if (stats.reviewRows.length >= 200) return;
  stats.reviewRows.push({
    section,
    rowId: rowId || "(missing ID)",
    reference: reference || "(blank)",
    reason,
  });
}

function addUnmatchedProjectRow(stats: ImportStats, row: CsvRow, reason: string) {
  stats.invoices.unmatchedProjects++;
  if (stats.unmatchedProjectRows.length >= 200) return;
  stats.unmatchedProjectRows.push({
    invoiceNumber: row.invoiceNumber || row.ID || "(missing invoice number)",
    clientName: cleanText(row.companyInvoice) || "Imported Client",
    total: parseMoney(row.total) || 0,
    issueDate: parseDate(row.invoiceDate || row["Created Date"]) || "",
    search: cleanText(row.search),
    reason,
  });
}

async function getExistingExternalIds(table: "invoices" | "invoice_items" | "invoice_payments"): Promise<Set<string>> {
  const { data } = await supabaseAdmin.from(table).select("import_external_id").eq("import_source", IMPORT_SOURCE);
  return new Set((data || []).map((row) => row.import_external_id).filter(Boolean) as string[]);
}

async function getExistingImportIdMap(table: "invoices"): Promise<Map<string, string>> {
  const { data } = await supabaseAdmin.from(table).select("id, import_external_id").eq("import_source", IMPORT_SOURCE);
  return new Map((data || []).filter((row) => row.import_external_id).map((row) => [row.import_external_id as string, row.id as string]));
}

async function buildProjectResolver(wixProjectRows: CsvRow[]) {
  const { data: projects } = await supabaseAdmin
    .from("projects")
    .select("id, name, company_id, company:companies(id, name)");
  const normalizedProjects = ((projects || []) as unknown as ExistingProject[]).map((project) => ({
    ...project,
    normalizedName: normalizeText(project.name),
    normalizedCompanyName: normalizeText(project.company?.name || ""),
  }));
  const wixProjectByLegacyId = new Map<string, WixProjectMatch>();

  for (const row of wixProjectRows) {
    const legacyId = cleanText(row.ID);
    const wixName = cleanText(row.project);
    if (!legacyId || !wixName) continue;
    const exactDbProject = normalizedProjects.find((project) => project.normalizedName === normalizeText(wixName));
    if (exactDbProject) {
      wixProjectByLegacyId.set(legacyId, { id: exactDbProject.id, legacyId, name: wixName });
    }
  }

  return {
    resolve(row: CsvRow): { projectId: string | null; reason: string } {
      const legacyProjectId = cleanText(row.project);
      const wixMatch = legacyProjectId ? wixProjectByLegacyId.get(legacyProjectId) : null;
      if (wixMatch) {
        return { projectId: wixMatch.id, reason: `Matched Wix project "${wixMatch.name}" by legacy project ID` };
      }

      const projectKey = normalizeText(row.search || "");
      const clientName = normalizeText(row.companyInvoice || "");
      const exactProject = normalizedProjects.find((project) => project.normalizedName && projectKey.includes(project.normalizedName));
      if (exactProject) return { projectId: exactProject.id, reason: "Matched project name in CSV search text" };

      const companyProjects = normalizedProjects.filter((project) => clientName && project.normalizedCompanyName === clientName);
      if (companyProjects.length === 1) {
        return { projectId: companyProjects[0].id, reason: "Matched the only project for this client" };
      }
      if (companyProjects.length > 1) {
        return { projectId: null, reason: `Multiple projects found for ${cleanText(row.companyInvoice)}; CSV does not identify which one` };
      }
      return { projectId: null, reason: "No matching project/company found from CSV search text or client name" };
    },
  };
}

function mapInvoice(
  row: CsvRow,
  projectResolver: Awaited<ReturnType<typeof buildProjectResolver>>
): { record?: Record<string, unknown>; projectMatched: boolean; projectMatchReason: string; error: string } {
  const total = parseMoney(row.total);
  const issueDate = parseDate(row.invoiceDate || row["Created Date"]);
  if (!row.ID || !row.invoiceNumber) return { projectMatched: false, projectMatchReason: "", error: "Invoice row is missing ID or invoiceNumber" };
  if (!issueDate) return { projectMatched: false, projectMatchReason: "", error: `${row.invoiceNumber}: invoiceDate is invalid` };
  if (total === null) return { projectMatched: false, projectMatchReason: "", error: `${row.invoiceNumber}: total is invalid` };

  const dueDate = parseDate(row.paymentDueDate);
  const status = mapInvoiceStatus(row.status, dueDate);
  const projectMatch = projectResolver.resolve(row);
  const paidDate = status === "paid" ? parsePaymentSchedulePaidDate(row.paymentSchedules) : null;

  return {
    projectMatched: Boolean(projectMatch.projectId),
    projectMatchReason: projectMatch.reason,
    error: "",
    record: {
      project_id: projectMatch.projectId,
      invoice_number: row.invoiceNumber,
      invoice_type: "invoice",
      status,
      client_name: cleanText(row.companyInvoice) || cleanText(row.search) || "Imported Client",
      issue_date: issueDate,
      due_date: dueDate,
      paid_date: paidDate,
      subtotal: total,
      tax_rate: 0,
      tax_amount: 0,
      discount_amount: 0,
      total,
      currency: "AED",
      notes: cleanHtml(row.notes) || null,
      terms: cleanText(row.po) && cleanText(row.po) !== "N/A" ? `PO: ${cleanText(row.po)}` : null,
      import_source: IMPORT_SOURCE,
      import_external_id: row.ID,
      created_at: parseDateTime(row["Created Date"]) || new Date().toISOString(),
      updated_at: parseDateTime(row["Updated Date"]) || new Date().toISOString(),
    },
  };
}

function mapItem(row: CsvRow, invoiceId: string, index: number): Record<string, unknown> | null {
  const quantity = parseMoney(row.quantity) ?? 1;
  const unitPrice = parseMoney(row.price) ?? 0;
  const amount = parseMoney(row.amount) ?? quantity * unitPrice;
  const description = cleanHtml(row.notes) || cleanText(row.Title) || "Imported invoice item";
  if (!description || amount < 0) return null;

  return {
    invoice_id: invoiceId,
    description,
    quantity,
    unit_price: unitPrice,
    amount,
    sort_order: index,
    import_source: IMPORT_SOURCE,
    import_external_id: row.ID || `${row.invoice}:${index}`,
    created_at: parseDateTime(row["Created Date"]) || new Date().toISOString(),
  };
}

function mapPayment(row: CsvRow, invoiceId: string): Record<string, unknown> | null {
  const amount = parseMoney(row.amount);
  const paymentDate = parseDate(row.paymentDate);
  if (amount === null || amount <= 0 || !paymentDate || row.status.toLowerCase() !== "paid") return null;

  return {
    invoice_id: invoiceId,
    receipt_number: cleanText(row.paymentNumber) || `REC-${row.ID}`,
    amount,
    payment_date: paymentDate,
    payment_method: mapPaymentMethod(row.paymentMethod),
    reference: cleanText(row.paymentNumber) || null,
    notes: cleanHtml(row.notes) || cleanText(row.payment) || null,
    import_source: IMPORT_SOURCE,
    import_external_id: row.ID,
    created_at: parseDateTime(row["Created Date"]) || new Date().toISOString(),
    updated_at: parseDateTime(row["Updated Date"]) || new Date().toISOString(),
  };
}

async function recalculateImportedInvoiceStatuses(invoiceIdMap: Map<string, string>, invoiceRows: CsvRow[], stats: ImportStats) {
  const importedIds = Array.from(new Set(Array.from(invoiceIdMap.values())));
  if (!importedIds.length) return;

  const { data: payments } = await supabaseAdmin
    .from("invoice_payments")
    .select("invoice_id, amount, payment_date")
    .in("invoice_id", importedIds);

  const paymentMap = new Map<string, { total: number; lastDate: string | null }>();
  for (const payment of payments || []) {
    const current = paymentMap.get(payment.invoice_id) || { total: 0, lastDate: null };
    const paymentDate = typeof payment.payment_date === "string" ? payment.payment_date : null;
    paymentMap.set(payment.invoice_id, {
      total: current.total + Number(payment.amount || 0),
      lastDate: !current.lastDate || (paymentDate && paymentDate > current.lastDate) ? paymentDate : current.lastDate,
    });
  }

  for (const row of invoiceRows) {
    const invoiceId = invoiceIdMap.get(row.ID);
    if (!invoiceId) continue;
    if (row.status.toLowerCase() === "cancelled") continue;

    const total = parseMoney(row.total) ?? 0;
    const paid = paymentMap.get(invoiceId) || { total: 0, lastDate: null };
    const dueDate = parseDate(row.paymentDueDate);
    const status =
      paid.total >= total - 0.01
        ? "paid"
        : paid.total > 0
          ? "partially_paid"
          : dueDate && new Date(dueDate) < new Date()
            ? "overdue"
            : "unpaid";

    const { error } = await supabaseAdmin
      .from("invoices")
      .update({ status, paid_date: status === "paid" ? paid.lastDate : null, updated_at: new Date().toISOString() })
      .eq("id", invoiceId);

    if (error) stats.warnings.push(`${row.invoiceNumber}: status recalculation failed (${error.message})`);
  }
}

function mapInvoiceStatus(status: string, dueDate: string | null): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "paid") return "paid";
  if (normalized === "cancelled" || normalized === "canceled") return "cancelled";
  if (normalized === "draft") return "draft";
  if (normalized === "active") return "active";
  if (normalized === "sent") return "sent";
  if (normalized === "overdue") return "overdue";
  if (dueDate && new Date(dueDate) < new Date()) return "overdue";
  return "unpaid";
}

function mapPaymentMethod(value: string): string {
  const normalized = value.trim();
  if (!normalized) return "Imported";
  if (normalized.includes("1e696b2d")) return "Bank Transfer";
  return normalized.length > 50 ? "Imported" : normalized;
}

function parsePaymentSchedulePaidDate(value: string): string | null {
  if (!value) return null;
  const match = value.match(/"paymentDate"\s*:\s*\{\s*"\$date"\s*:\s*"([^"]+)"/);
  return match ? parseDate(match[1]) : null;
}

function parseMoney(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function parseDateTime(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function cleanHtml(value: string | undefined): string {
  return cleanText(
    value
      ?.replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&nbsp;/g, " ")
  );
}

function cleanText(value: string | undefined): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
