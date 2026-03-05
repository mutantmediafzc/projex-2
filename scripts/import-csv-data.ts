/**
 * Import Companies and Contacts from CSV files into Supabase
 * 
 * Usage: npx tsx scripts/import-csv-data.ts
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

// Clean phone numbers
function cleanPhone(phone: string | undefined): string | null {
  if (!phone) return null;
  // Remove leading ' and clean up
  let cleaned = phone.replace(/^'+/, "").trim();
  if (cleaned === "" || cleaned === "0000" || cleaned === "000000" || cleaned === "-") return null;
  return cleaned;
}

// Clean URL
function cleanUrl(url: string | undefined): string | null {
  if (!url) return null;
  const cleaned = url.trim().toLowerCase();
  if (cleaned === "" || cleaned === "none" || cleaned === "na" || cleaned === "n/a" || cleaned === "tbd" || cleaned === "tbc" || cleaned === "no website") {
    return null;
  }
  // Add https if missing
  let result = url.trim();
  if (result && !result.startsWith("http://") && !result.startsWith("https://")) {
    result = "https://" + result;
  }
  return result;
}

// Clean address
function cleanAddress(address: string | undefined): string | null {
  if (!address) return null;
  const cleaned = address.trim().toLowerCase();
  if (cleaned === "" || cleaned === "none" || cleaned === "na" || cleaned === "n/a" || cleaned === "tbd") {
    return null;
  }
  return address.trim();
}

// Clean name
function cleanName(name: string | undefined): string {
  if (!name) return "";
  return name.trim();
}

// Clean email
function cleanEmail(email: string | undefined): string | null {
  if (!email) return null;
  let cleaned = email.trim();
  // Remove leading '
  cleaned = cleaned.replace(/^'+/, "");
  // Basic validation
  if (!cleaned.includes("@") || cleaned === "TEst") return null;
  return cleaned.toLowerCase();
}

async function importData() {
  console.log("Starting CSV import...\n");

  // Read CSV files
  const companiesPath = path.join(__dirname, "../public/projex-data/Companies.csv");
  const contactsPath = path.join(__dirname, "../public/projex-data/Contacts (2).csv");

  const companiesContent = fs.readFileSync(companiesPath, "utf8");
  const contactsContent = fs.readFileSync(contactsPath, "utf8");

  const companiesData = parseCSV(companiesContent);
  const contactsData = parseCSV(contactsContent);

  console.log(`Found ${companiesData.length} companies and ${contactsData.length} contacts\n`);

  // Build company ID mapping (old ID -> new ID)
  const companyIdMap = new Map<string, string>();

  // Track unique companies by name to avoid duplicates
  const uniqueCompanies = new Map<string, typeof companiesData[0]>();
  for (const company of companiesData) {
    const name = company.company?.trim();
    if (name && !uniqueCompanies.has(name.toLowerCase())) {
      uniqueCompanies.set(name.toLowerCase(), company);
    }
  }

  console.log(`Unique companies after deduplication: ${uniqueCompanies.size}\n`);

  // Insert companies
  let companiesInserted = 0;
  let companiesFailed = 0;

  for (const [, company] of uniqueCompanies) {
    const name = company.company?.trim();
    if (!name) continue;

    // Extract TRN for notes
    let notes = "";
    if (company.trn && company.trn.trim() && company.trn.trim() !== "TRN: ") {
      notes = company.trn.trim();
    }
    if (company.status === "Blacklisted") {
      notes = notes ? `${notes}\nStatus: Blacklisted` : "Status: Blacklisted";
    }

    const companyRecord = {
      name: name,
      website: cleanUrl(company.website),
      street_address: cleanAddress(company.address),
      social_instagram: company.socialmediaHandle?.trim() || null,
      notes: notes || null,
      created_at: company["Created Date"] || new Date().toISOString(),
      updated_at: company["Updated Date"] || new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("companies")
      .insert(companyRecord)
      .select("id")
      .single();

    if (error) {
      console.error(`Failed to insert company "${name}":`, error.message);
      companiesFailed++;
    } else if (data) {
      companyIdMap.set(company.ID, data.id);
      companiesInserted++;
      if (companiesInserted % 20 === 0) {
        console.log(`Inserted ${companiesInserted} companies...`);
      }
    }
  }

  // Also map duplicate company IDs to the same new ID
  for (const company of companiesData) {
    const name = company.company?.trim();
    if (!name) continue;
    const uniqueCompany = uniqueCompanies.get(name.toLowerCase());
    if (uniqueCompany && uniqueCompany.ID !== company.ID) {
      const newId = companyIdMap.get(uniqueCompany.ID);
      if (newId) {
        companyIdMap.set(company.ID, newId);
      }
    }
  }

  console.log(`\nCompanies: ${companiesInserted} inserted, ${companiesFailed} failed\n`);

  // Insert contacts
  let contactsInserted = 0;
  let contactsFailed = 0;
  let contactsSkipped = 0;

  for (const contact of contactsData) {
    const firstName = cleanName(contact.firstName);
    const lastName = cleanName(contact.lastName);
    const companyId = companyIdMap.get(contact.company);

    // Skip if no company mapping or no name
    if (!companyId) {
      contactsSkipped++;
      continue;
    }

    if (!firstName && !lastName) {
      contactsSkipped++;
      continue;
    }

    const contactRecord = {
      company_id: companyId,
      first_name: firstName || "Unknown",
      last_name: lastName || "",
      email: cleanEmail(contact.email),
      phone: cleanPhone(contact.phone),
      mobile: cleanPhone(contact.mobile),
      is_primary: false,
      created_at: contact["Created Date"] || new Date().toISOString(),
      updated_at: contact["Updated Date"] || new Date().toISOString(),
    };

    const { error } = await supabase.from("contacts").insert(contactRecord);

    if (error) {
      console.error(`Failed to insert contact "${firstName} ${lastName}":`, error.message);
      contactsFailed++;
    } else {
      contactsInserted++;
      if (contactsInserted % 20 === 0) {
        console.log(`Inserted ${contactsInserted} contacts...`);
      }
    }
  }

  console.log(`\nContacts: ${contactsInserted} inserted, ${contactsFailed} failed, ${contactsSkipped} skipped\n`);

  // Summary
  console.log("=".repeat(50));
  console.log("IMPORT SUMMARY");
  console.log("=".repeat(50));
  console.log(`Companies: ${companiesInserted} inserted`);
  console.log(`Contacts: ${contactsInserted} inserted`);
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
