/**
 * Import Projects and Project Notes from CSV files into Supabase
 * Maps projects to the correct companies that were imported earlier
 * 
 * Usage: npx tsx scripts/import-projects-data.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load env
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join("=").trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CSV Parser - handles quoted fields with commas
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx];
      });
      rows.push(row);
    }
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  return values;
}

// Map CSV project type IDs to our database project_type values
const PROJECT_TYPE_MAP: Record<string, string | null> = {
  "ece86a13-c171-41db-a0f2-537ffdfca451": "website", // Web Design & Development
  "406585ca-1f8d-426d-bea3-2cdda83737fd": null, // App Design & Development (no direct map)
  "86776c2e-a39f-43eb-8db3-02b55daceb08": "branding", // Brand Development
  "3dfa2732-4093-4a45-b4a4-661907aeb0ef": "social_media", // Social Media Marketing & SEO
  "b4bae6d3-75e5-458b-8188-ced2388e559d": "social_media", // Digital Marketing
  "b003e890-c554-4cf2-b0c9-6c7a3eee8b3c": null, // Content Creation
  "1b8811dd-d1b8-4282-a76f-943dcc15d3a3": null, // Event Services
  "d42b4efd-b074-4760-b1c3-48509a723021": null, // Technical Assistance
  "d7257e6b-c286-4437-9bfc-c5d30b5cb3d2": null, // Studio Rental
  "3ed1c282-9230-4ac7-b887-54eee0824e60": null, // All
};

// Map CSV status to our status values
function mapStatus(csvStatus: string): string {
  const statusMap: Record<string, string> = {
    "Completed": "completed",
    "In Progress": "in_progress",
    "Not Started": "not_started",
    "Cancelled": "cancelled",
    "On Hold": "on_hold",
  };
  return statusMap[csvStatus] || csvStatus?.toLowerCase().replace(/\s+/g, "_") || "not_started";
}

// Clean HTML to plain text (for description)
function cleanHtml(html: string | undefined): string | null {
  if (!html) return null;
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, " ");
  // Decode common HTML entities
  text = text.replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim();
  return text || null;
}

async function importData() {
  console.log("Starting Projects CSV import...\n");

  const projectsDir = path.join(__dirname, "../public/projex-data/Projects");

  // Read CSV files
  const projectsContent = fs.readFileSync(path.join(projectsDir, "Projects.csv"), "utf8");
  const companiesContent = fs.readFileSync(path.join(__dirname, "../public/projex-data/Companies.csv"), "utf8");
  const contactsContent = fs.readFileSync(path.join(__dirname, "../public/projex-data/Contacts (2).csv"), "utf8");
  const notesContent = fs.readFileSync(path.join(projectsDir, "Notes.csv"), "utf8");

  const projectsData = parseCSV(projectsContent);
  const companiesCSV = parseCSV(companiesContent);
  const contactsCSV = parseCSV(contactsContent);
  const notesData = parseCSV(notesContent);

  console.log(`Found ${projectsData.length} projects and ${notesData.length} notes in CSV\n`);

  // Step 1: Build company name -> DB ID mapping
  // First get all companies from database
  const { data: dbCompanies, error: compError } = await supabase
    .from("companies")
    .select("id, name");

  if (compError || !dbCompanies) {
    console.error("Failed to fetch companies from database:", compError?.message);
    process.exit(1);
  }

  // Build CSV company ID -> company name mapping
  const csvCompanyIdToName = new Map<string, string>();
  for (const c of companiesCSV) {
    if (c.ID && c.company) {
      csvCompanyIdToName.set(c.ID, c.company.trim());
    }
  }

  // Build company name -> DB ID mapping (case-insensitive)
  const companyNameToDbId = new Map<string, string>();
  for (const c of dbCompanies) {
    companyNameToDbId.set(c.name.toLowerCase(), c.id);
  }

  // Build CSV company ID -> DB company ID mapping
  const csvCompanyIdToDbId = new Map<string, string>();
  for (const [csvId, name] of csvCompanyIdToName) {
    const dbId = companyNameToDbId.get(name.toLowerCase());
    if (dbId) {
      csvCompanyIdToDbId.set(csvId, dbId);
    }
  }

  console.log(`Mapped ${csvCompanyIdToDbId.size} companies from CSV to database\n`);

  // Step 2: Build contact mapping
  const { data: dbContacts, error: contError } = await supabase
    .from("contacts")
    .select("id, email, first_name, last_name, company_id");

  if (contError || !dbContacts) {
    console.error("Failed to fetch contacts from database:", contError?.message);
    process.exit(1);
  }

  // Build CSV contact ID -> contact email mapping
  const csvContactIdToEmail = new Map<string, string>();
  const csvContactIdToCompanyId = new Map<string, string>();
  for (const c of contactsCSV) {
    if (c.ID && c.email) {
      csvContactIdToEmail.set(c.ID, c.email.toLowerCase().replace(/^'+/, ""));
    }
    if (c.ID && c.company) {
      csvContactIdToCompanyId.set(c.ID, c.company);
    }
  }

  // Build contact email -> DB ID mapping
  const contactEmailToDbId = new Map<string, string>();
  for (const c of dbContacts) {
    if (c.email) {
      contactEmailToDbId.set(c.email.toLowerCase(), c.id);
    }
  }

  // Build CSV contact ID -> DB contact ID mapping
  const csvContactIdToDbId = new Map<string, string>();
  for (const [csvId, email] of csvContactIdToEmail) {
    const dbId = contactEmailToDbId.get(email);
    if (dbId) {
      csvContactIdToDbId.set(csvId, dbId);
    }
  }

  console.log(`Mapped ${csvContactIdToDbId.size} contacts from CSV to database\n`);

  // Step 3: Import projects
  let projectsInserted = 0;
  let projectsFailed = 0;
  let projectsSkipped = 0;
  const csvProjectIdToDbId = new Map<string, string>();

  for (const project of projectsData) {
    const name = project.project?.trim();
    if (!name) {
      projectsSkipped++;
      continue;
    }

    // Map company ID
    const csvCompanyId = project.company;
    const dbCompanyId = csvCompanyIdToDbId.get(csvCompanyId);

    if (!dbCompanyId) {
      // Try to find company by parsing the company name from the project name
      console.log(`Skipping project "${name}" - company ID ${csvCompanyId} not found in mapping`);
      projectsSkipped++;
      continue;
    }

    // Map contact ID
    const csvContactId = project.contact;
    const dbContactId = csvContactIdToDbId.get(csvContactId) || null;

    // Map project type
    const csvProjectType = project.projectType;
    const projectType = PROJECT_TYPE_MAP[csvProjectType] || null;

    // Parse dates
    const createdAt = project["Created Date"] || new Date().toISOString();
    const updatedAt = project["Updated Date"] || new Date().toISOString();
    const dueDate = project.completionDate ? project.completionDate.split("T")[0] : null;

    // Parse value
    const value = project.productionBudget ? parseFloat(project.productionBudget) : null;

    const projectRecord = {
      company_id: dbCompanyId,
      primary_contact_id: dbContactId,
      name: name,
      description: cleanHtml(project.brief),
      status: mapStatus(project.status),
      project_type: projectType,
      value: value && !isNaN(value) ? value : null,
      due_date: dueDate,
      created_at: createdAt,
      updated_at: updatedAt,
    };

    const { data, error } = await supabase
      .from("projects")
      .insert(projectRecord)
      .select("id")
      .single();

    if (error) {
      console.error(`Failed to insert project "${name}":`, error.message);
      projectsFailed++;
    } else if (data) {
      csvProjectIdToDbId.set(project.ID, data.id);
      projectsInserted++;
      if (projectsInserted % 20 === 0) {
        console.log(`Inserted ${projectsInserted} projects...`);
      }
    }
  }

  console.log(`\nProjects: ${projectsInserted} inserted, ${projectsFailed} failed, ${projectsSkipped} skipped\n`);

  // Step 4: Import project notes
  let notesInserted = 0;
  let notesFailed = 0;
  let notesSkipped = 0;

  for (const note of notesData) {
    const csvProjectId = note.project;
    const dbProjectId = csvProjectIdToDbId.get(csvProjectId);

    if (!dbProjectId) {
      notesSkipped++;
      continue;
    }

    const body = cleanHtml(note.notes);
    if (!body) {
      notesSkipped++;
      continue;
    }

    const noteRecord = {
      project_id: dbProjectId,
      body: body,
      source: "operations",
      created_at: note["Created Date"] || new Date().toISOString(),
    };

    const { error } = await supabase.from("project_notes").insert(noteRecord);

    if (error) {
      console.error(`Failed to insert note:`, error.message);
      notesFailed++;
    } else {
      notesInserted++;
    }
  }

  console.log(`Project Notes: ${notesInserted} inserted, ${notesFailed} failed, ${notesSkipped} skipped\n`);

  // Summary
  console.log("=".repeat(50));
  console.log("IMPORT SUMMARY");
  console.log("=".repeat(50));
  console.log(`Projects: ${projectsInserted} inserted`);
  console.log(`Project Notes: ${notesInserted} inserted`);
  console.log("=".repeat(50));
}

importData()
  .then(() => {
    console.log("\nImport completed!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Import failed:", err);
    process.exit(1);
  });
