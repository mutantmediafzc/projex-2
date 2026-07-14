/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

const IMPORT_SOURCE = "legacy_invoice_csv";
const execute = process.argv.includes("--execute");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const reviewedMappings = {
  "00724084-8aab-4996-b404-d46c13291eae": { projectId: "fcb73d36-d7d9-4cbe-bcf5-34326396fc56" },
  "073b9e97-d76c-4256-98f1-53bfd1db23f9": { projectId: "2cb4e777-4868-4042-b023-3d8cec072ff5" },
  "0aaaee04-ec4b-4eb9-ae3f-27ebcc361ea0": { projectId: "53526ba2-2cf5-43ff-b0e5-560878f2a5b5" },
  "0c390535-3996-44be-94e4-c03b882cbdfc": { projectId: "dd55ba54-a821-4e8d-8a53-2fa3108d072a" },
  "10f115fa-6ae5-4e39-b80f-0f393a899bb1": { projectId: "ab3105b0-9d80-46f8-aafd-ca6745ee97e0" },
  "27974d7e-40cf-48a5-b3a6-09677b1eb984": { projectId: "49aaa9cb-a6fd-462a-978c-1f1010909dcb" },
  "2bbae55d-07b8-4131-a738-6ca9813ce178": { projectId: "917855ec-ba4c-4672-aa92-4fdbb76100fd" },
  "2f8684bf-708a-4eaf-a1e8-7c71a69b43d1": { projectId: "0fe8a24e-aa64-4a96-be22-c6e244c01d29" },
  "2f8b2c03-3149-4ec2-a4e4-b1e64278b596": { projectId: "03dfd160-780b-476a-b796-092e11d1f6d8" },
  "4ca5158d-6b52-41fd-8d0f-470130d0d200": { projectId: "117b779f-2e1b-4ad4-89bc-d50f191dfc1f" },
  "523194a3-154f-4a15-a5e3-a2eca6474ec8": { newProject: "rijas" },
  "60fa59e1-43fa-4ee9-8a64-f60438b430b6": { newProject: "zenith" },
  "62e7e98e-6f86-4ada-a464-7bf41e4e6950": { projectId: "49aaa9cb-a6fd-462a-978c-1f1010909dcb" },
  "675d704d-7c6c-4a1d-8eb4-f6fce21bc345": { projectId: "68493de3-f6fc-4052-a74f-4e4d2818680f" },
  "74645202-84ef-432c-ba47-c68978547851": { newProject: "big_brain" },
  "7a78327b-6898-43ff-91b3-d28b37274af0": { projectId: "bb3b6180-5bd8-4d2a-9f0c-d8d70700c3ba" },
  "8abdd507-3ecf-46df-bb46-ab972fa0b993": { projectId: "89cfbe5f-50c8-4025-b774-d3571527807a" },
  "a29dd623-d78b-4228-a9ce-1ad5a3c07e2f": { projectId: "6a3eb90b-8164-43be-ab67-3ed05095f144" },
  "af895528-913e-487c-a5ba-9ff7b7a02fc2": { skip: true },
  "c4053c0a-0600-45b6-a3f4-ee88245cf8ef": { projectId: "17d56d9d-f7af-45a1-a2f3-701eaa64db43" },
  "c872c9c8-3873-4bb4-a61e-8c0629ef9f83": { projectId: "d2db37da-faf8-4b91-b91e-138f1ae897c9" },
  "eeb9e90f-9efa-403e-9c6a-32c8bf6b280d": { projectId: "ab3105b0-9d80-46f8-aafd-ca6745ee97e0" },
  "f01c0a81-45df-4b38-9bbe-b5a3616edbbd": { newProject: "thomas" },
};

const newProjects = {
  rijas: {
    companyId: "695e0fda-61c4-43bb-a11b-0392d2685601",
    name: "Rijas Group",
    status: "Project Lost",
    is_archived: true,
  },
  zenith: {
    companyId: "35737d7e-45a8-4dd6-9c1b-15f40b1e296a",
    name: "Zenith Zones - Property Listing Platform",
    status: "Project Lost",
    is_archived: true,
  },
  big_brain: {
    companyId: "135c2aef-9960-4085-b08d-f4d60e883ee5",
    name: "Big Brain Training - Wix CRM Configuration",
    status: "Project Delivered",
    is_archived: false,
  },
  thomas: {
    companyName: "Thomas",
    name: "Thomas - Branding, Website & Social Media",
    status: "Project Lost",
    is_archived: true,
  },
};

function readCsv(filename) {
  const workbook = XLSX.readFile(path.resolve(process.cwd(), "public", "files", filename));
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanHtml(value) {
  return cleanText(
    String(value || "")
      .replace(/<br\s*\/?>/gi, "\n")
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

function parseMoney(value) {
  const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function parseDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function initialInvoiceStatus(row) {
  const status = cleanText(row.status).toLowerCase();
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "paid") return "paid";
  if (status === "draft") return "draft";
  const dueDate = parseDate(row.paymentDueDate);
  return dueDate && new Date(dueDate) < new Date() ? "overdue" : "unpaid";
}

function paymentMethod(value) {
  const method = cleanText(value);
  if (!method) return "Imported";
  if (method.includes("1e696b2d")) return "Bank Transfer";
  return method.length > 50 ? "Imported" : method;
}

async function ensureNewProjects() {
  const projectIds = {};

  for (const [key, spec] of Object.entries(newProjects)) {
    let companyId = spec.companyId;
    if (!companyId) {
      const { data: existingCompany, error: companyLookupError } = await supabase
        .from("companies")
        .select("id")
        .eq("name", spec.companyName)
        .maybeSingle();
      if (companyLookupError) throw companyLookupError;

      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        const { data: company, error } = await supabase
          .from("companies")
          .insert({ name: spec.companyName })
          .select("id")
          .single();
        if (error) throw error;
        companyId = company.id;
      }
    }

    const { data: existingProject, error: projectLookupError } = await supabase
      .from("projects")
      .select("id")
      .eq("company_id", companyId)
      .eq("name", spec.name)
      .maybeSingle();
    if (projectLookupError) throw projectLookupError;

    if (existingProject) {
      projectIds[key] = existingProject.id;
      continue;
    }

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        company_id: companyId,
        name: spec.name,
        status: spec.status,
        is_archived: spec.is_archived,
      })
      .select("id")
      .single();
    if (error) throw error;
    projectIds[key] = project.id;
  }

  return projectIds;
}

async function main() {
  const invoiceRows = readCsv("Invoices.csv");
  const itemRows = readCsv("InvoiceItems.csv");
  const paymentRows = readCsv("Payments.csv");
  const selectedIds = new Set(
    Object.entries(reviewedMappings).filter(([, mapping]) => !mapping.skip).map(([id]) => id)
  );

  const selectedInvoices = invoiceRows.filter((row) => selectedIds.has(row.ID));
  if (selectedInvoices.length !== selectedIds.size) {
    throw new Error(`Expected ${selectedIds.size} reviewed invoices, found ${selectedInvoices.length} in Invoices.csv`);
  }

  console.log(`Reviewed plan: ${selectedInvoices.length} invoices; ${Object.keys(reviewedMappings).length - selectedIds.size} skipped`);
  if (!execute) {
    console.log("Dry run only. Pass --execute after reviewing the plan.");
    return;
  }

  const { data: adminUser, error: adminError } = await supabase
    .from("users")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .single();
  if (adminError) throw adminError;

  const createdProjectIds = await ensureNewProjects();
  const { data: existingInvoices, error: existingInvoiceError } = await supabase
    .from("invoices")
    .select("id, import_external_id")
    .eq("import_source", IMPORT_SOURCE)
    .in("import_external_id", Array.from(selectedIds));
  if (existingInvoiceError) throw existingInvoiceError;

  const invoiceIdMap = new Map(existingInvoices.map((row) => [row.import_external_id, row.id]));
  let invoicesCreated = 0;

  for (const row of selectedInvoices) {
    if (invoiceIdMap.has(row.ID)) continue;
    const mapping = reviewedMappings[row.ID];
    const projectId = mapping.projectId || createdProjectIds[mapping.newProject];
    const total = parseMoney(row.total);
    const issueDate = parseDate(row.invoiceDate || row["Created Date"]);
    if (total === null || !issueDate || !projectId) throw new Error(`${row.invoiceNumber}: invalid reviewed invoice mapping`);

    const { data: invoice, error } = await supabase
      .from("invoices")
      .insert({
        project_id: projectId,
        invoice_number: row.invoiceNumber,
        invoice_type: "invoice",
        status: initialInvoiceStatus(row),
        client_name: cleanText(row.companyInvoice) || cleanText(row.search) || "Imported Client",
        issue_date: issueDate,
        due_date: parseDate(row.paymentDueDate),
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
        created_by: adminUser.id,
        created_at: parseDateTime(row["Created Date"]) || new Date().toISOString(),
        updated_at: parseDateTime(row["Updated Date"]) || new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(`${row.invoiceNumber}: ${error.message}`);
    invoiceIdMap.set(row.ID, invoice.id);
    invoicesCreated++;
  }

  const selectedItemRows = itemRows.filter((row) => selectedIds.has(row.invoice));
  const selectedPaymentRows = paymentRows.filter(
    (row) => selectedIds.has(row.invoice) && cleanText(row.status).toLowerCase() === "paid"
  );
  const { data: existingItems, error: existingItemError } = await supabase
    .from("invoice_items")
    .select("import_external_id")
    .eq("import_source", IMPORT_SOURCE);
  if (existingItemError) throw existingItemError;
  const existingItemIds = new Set(existingItems.map((row) => row.import_external_id));

  let itemsCreated = 0;
  for (const [index, row] of selectedItemRows.entries()) {
    const externalId = row.ID || `${row.invoice}:${index}`;
    if (existingItemIds.has(externalId)) continue;
    const quantity = parseMoney(row.quantity) ?? 1;
    const unitPrice = parseMoney(row.price) ?? 0;
    const amount = parseMoney(row.amount) ?? quantity * unitPrice;
    const { error } = await supabase.from("invoice_items").insert({
      invoice_id: invoiceIdMap.get(row.invoice),
      description: cleanHtml(row.notes) || cleanText(row.Title) || "Imported invoice item",
      quantity,
      unit_price: unitPrice,
      amount,
      sort_order: index,
      import_source: IMPORT_SOURCE,
      import_external_id: externalId,
      created_at: parseDateTime(row["Created Date"]) || new Date().toISOString(),
    });
    if (error) throw new Error(`Item ${externalId}: ${error.message}`);
    itemsCreated++;
  }

  const { data: existingPayments, error: existingPaymentError } = await supabase
    .from("invoice_payments")
    .select("import_external_id")
    .eq("import_source", IMPORT_SOURCE);
  if (existingPaymentError) throw existingPaymentError;
  const existingPaymentIds = new Set(existingPayments.map((row) => row.import_external_id));

  let paymentsCreated = 0;
  for (const row of selectedPaymentRows) {
    if (existingPaymentIds.has(row.ID)) continue;
    const amount = parseMoney(row.amount);
    const paymentDate = parseDate(row.paymentDate);
    if (amount === null || amount <= 0 || !paymentDate) continue;
    const { error } = await supabase.from("invoice_payments").insert({
      invoice_id: invoiceIdMap.get(row.invoice),
      receipt_number: cleanText(row.paymentNumber) || `REC-${row.ID}`,
      amount,
      payment_date: paymentDate,
      payment_method: paymentMethod(row.paymentMethod),
      reference: cleanText(row.paymentNumber) || null,
      notes: cleanHtml(row.notes) || cleanText(row.payment) || null,
      import_source: IMPORT_SOURCE,
      import_external_id: row.ID,
      created_at: parseDateTime(row["Created Date"]) || new Date().toISOString(),
      updated_at: parseDateTime(row["Updated Date"]) || new Date().toISOString(),
    });
    if (error) throw new Error(`Payment ${row.ID}: ${error.message}`);
    paymentsCreated++;
  }

  for (const row of selectedInvoices) {
    if (cleanText(row.status).toLowerCase() === "cancelled") continue;
    const invoiceId = invoiceIdMap.get(row.ID);
    const { data: payments, error: paymentsError } = await supabase
      .from("invoice_payments")
      .select("amount, payment_date")
      .eq("invoice_id", invoiceId);
    if (paymentsError) throw paymentsError;
    const paid = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const total = parseMoney(row.total) ?? 0;
    const dueDate = parseDate(row.paymentDueDate);
    const status = paid >= total - 0.01 ? "paid" : paid > 0 ? "partially_paid" : dueDate && new Date(dueDate) < new Date() ? "overdue" : "unpaid";
    const paidDate = status === "paid"
      ? payments.map((payment) => payment.payment_date).filter(Boolean).sort().at(-1) || null
      : null;
    const { error } = await supabase
      .from("invoices")
      .update({ status, paid_date: paidDate, updated_at: new Date().toISOString() })
      .eq("id", invoiceId);
    if (error) throw error;
  }

  console.log(JSON.stringify({ invoicesCreated, itemsCreated, paymentsCreated, projectsEnsured: Object.keys(createdProjectIds).length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
