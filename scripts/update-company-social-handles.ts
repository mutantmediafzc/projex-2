/**
 * Update companies with social media handles from CSV
 * The CSV has a single "socialmediaHandle" field which we map to social_instagram
 * 
 * Usage: npx tsx scripts/update-company-social-handles.ts
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

// CSV Parser
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

async function updateSocialHandles() {
  console.log("Starting social media handles update...\n");

  const csvPath = path.join(__dirname, "../public/projex-data/Companies.csv");
  const csvContent = fs.readFileSync(csvPath, "utf8");
  const companiesCSV = parseCSV(csvContent);

  console.log(`Found ${companiesCSV.length} companies in CSV\n`);

  // Get all companies from database
  const { data: dbCompanies, error: compError } = await supabase
    .from("companies")
    .select("id, name");

  if (compError || !dbCompanies) {
    console.error("Failed to fetch companies from database:", compError?.message);
    process.exit(1);
  }

  // Build company name -> DB ID mapping (case-insensitive)
  const companyNameToDbId = new Map<string, string>();
  for (const c of dbCompanies) {
    companyNameToDbId.set(c.name.toLowerCase().trim(), c.id);
  }

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const row of companiesCSV) {
    const companyName = row.company?.trim();
    const socialHandle = row.socialmediaHandle?.trim();

    if (!companyName) {
      skipped++;
      continue;
    }

    if (!socialHandle) {
      skipped++;
      continue;
    }

    const dbId = companyNameToDbId.get(companyName.toLowerCase());
    if (!dbId) {
      console.log(`Company not found in DB: "${companyName}"`);
      notFound++;
      continue;
    }

    // Update the company with the social handle (store as social_instagram since most handles appear to be Instagram)
    const { error } = await supabase
      .from("companies")
      .update({ social_instagram: socialHandle })
      .eq("id", dbId);

    if (error) {
      console.error(`Failed to update "${companyName}":`, error.message);
    } else {
      updated++;
      console.log(`Updated "${companyName}" with handle: ${socialHandle}`);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("UPDATE SUMMARY");
  console.log("=".repeat(50));
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no handle): ${skipped}`);
  console.log(`Not found in DB: ${notFound}`);
  console.log("=".repeat(50));
}

updateSocialHandles()
  .then(() => {
    console.log("\nUpdate completed!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Update failed:", err);
    process.exit(1);
  });
