/**
 * Batch Import - Fast version with batch inserts
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
    const [k, ...v] = line.split("=");
    if (k && v.length) process.env[k.trim()] = v.join("=").trim();
  });
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
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

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split("\n").filter(l => l.trim());
  if (lines.length === 0) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  }).filter(r => Object.keys(r).length > 0);
}

const PLATFORM_MAP: Record<string, string> = {
  "73d19a4c-7876-47f8-81a5-d29b5d2cc5c3": "facebook",
  "7dac2b2f-9a9a-4c9a-b987-5b248f5a6aea": "instagram",
  "962e2d92-ea8d-4066-8430-2f892bdc8142": "tiktok",
  "f6c2f16a-8e39-40d1-ac3b-36ca7de2b91e": "linkedin",
  "25387b99-cf69-454c-930c-85bbd25edd55": "x",
  "190b927d-fd7c-4f73-aa6b-e6d9ebe765cd": "youtube",
};

const STATUS_MAP: Record<string, string> = { "Posted": "posted", "Approved": "approved", "Client Approval": "client_approval", "New": "new", "": "new" };

function stripHtml(h: string): string {
  return (h || "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim();
}

function parsePlatforms(s: string): string[] {
  try { return JSON.parse(s.replace(/\\/g, "")).map((id: string) => PLATFORM_MAP[id]).filter(Boolean); }
  catch { return []; }
}

// Known project mappings from Strategy.csv analysis
const PROJECT_NAMES: Record<string, string> = {
  "5dd8d88e-58bc-4e12-9cfb-55a3306b21cd": "Elite Property DXB",
  "90f5bb8e-1da9-441f-b63b-1941b663318b": "Crypto Homes",
  "1212678d-037b-475a-b187-a27821e2d3c8": "Airstay",
  "f889f811-6e7f-489d-a7de-dee3fc249d28": "Mutant",
  "47d93cff-6005-493a-9f0c-578cfaf57506": "FX Unlocked",
  "1b2f16d7-192d-4d10-88a5-0fb18eb4967a": "ATEX",
  "90f693b9-af56-47a1-9965-98bf0326b43e": "Esperia",
  "160e00a4-309a-40b8-aec3-1635e37cf211": "Kuwait Build",
  "b7444ad8-e438-49ce-b78a-df4a2ed60dd8": "Code DXB",
  "fe578398-ead8-4e5c-902c-1ba9d28746b3": "Canterra",
  "ba7b39b5-2f96-4c6b-8d55-9e6c7cbd3ea4": "Alkalive",
  "e65ea50e-6cc6-458d-8f81-1ebf9b702e2d": "Lino",
  "cf43c9d2-0680-46a6-bfb1-614177099a56": "Flavour Fest",
  "62980c2d-3d5b-4488-8b5e-83dc24f687b3": "Libya Build",
  "0e90ed6d-2dbc-48b2-aeea-fe5b0928abd5": "Elite Vacations",
  "fe6eef75-85a6-4b38-9c21-2c3079846288": "Sovereign Capital",
  "6a782226-83c3-4c2b-a265-c2be8ad567b6": "The Restaurant Show",
  "be5a7ff1-e84f-43fb-b6de-579ec9c8315d": "Horeca Libya",
};

async function main() {
  console.log("=== BATCH IMPORT START ===");
  
  // Get companies
  const { data: companies } = await sb.from("companies").select("id, name");
  const companyByName = new Map<string, string>();
  for (const c of companies || []) {
    const lower = c.name.toLowerCase();
    companyByName.set(lower, c.id);
    // Partial matches
    lower.split(/\s+/).forEach((w: string) => { if (w.length > 3) companyByName.set(w, c.id); });
  }
  console.log(`Companies: ${companies?.length}`);

  // Get/create social_projects
  const { data: existingSP } = await sb.from("social_projects").select("id, name, company_id");
  const spByCompanyId = new Map((existingSP || []).map(s => [s.company_id, s.id]));
  console.log(`Existing social_projects: ${existingSP?.length}`);

  // Map CSV projects to social_projects
  const csvToSP = new Map<string, string>();
  
  for (const [csvId, name] of Object.entries(PROJECT_NAMES)) {
    // Find company
    let companyId: string | undefined;
    for (const [cname, cid] of companyByName) {
      if (cname.includes(name.toLowerCase()) || name.toLowerCase().includes(cname)) {
        companyId = cid;
        break;
      }
    }
    if (!companyId) continue;

    let spId = spByCompanyId.get(companyId);
    if (!spId) {
      const { data: newSP } = await sb.from("social_projects").insert({
        company_id: companyId, name: `${name} - Social`, status: "active",
        platforms: ["instagram", "facebook", "linkedin", "tiktok", "x"],
      }).select().single();
      if (newSP) {
        spId = newSP.id;
        spByCompanyId.set(companyId, spId);
        console.log(`Created: ${name}`);
      }
    }
    if (spId) csvToSP.set(csvId, spId);
  }
  console.log(`Mapped projects: ${csvToSP.size}`);

  // Load CSV
  const postsCSV = parseCSV(fs.readFileSync(path.join(__dirname, "../public/projex-data/Content/Social+Media+Posts.csv"), "utf8"));
  console.log(`CSV posts: ${postsCSV.length}`);

  // Build posts
  const posts: any[] = [];
  for (const row of postsCSV) {
    const spId = csvToSP.get(row.project);
    if (!spId) continue;

    const caption = stripHtml(row.caption);
    const date = row.date ? new Date(row.date).toISOString() : null;
    const platforms = parsePlatforms(row.platforms);
    const status = STATUS_MAP[row.status] || "new";
    
    let time = "12:00";
    if (row.time) {
      const p = row.time.split(":");
      if (p.length >= 2) time = `${p[0].padStart(2, "0")}:${p[1].padStart(2, "0")}`;
    }

    posts.push({
      project_id: spId,
      platforms,
      caption,
      scheduled_date: date,
      scheduled_time: time,
      status: status === "posted" ? "published" : "draft",
      workflow_status: status,
      post_type: (row.type || "").toLowerCase() === "boosted" ? "boosted" : "organic",
      content_type: row.format || null,
      image_asset_url: row.assetLink || null,
      first_comment: stripHtml(row.firstComment) || null,
      creative_notes: stripHtml(row.notes) || null,
      shoot_date: row.shootDate ? new Date(row.shootDate).toISOString().slice(0, 10) : null,
      shoot_notes: stripHtml(row.shootNotes) || null,
    });
  }
  console.log(`Valid posts to insert: ${posts.length}`);

  // Batch insert (50 at a time)
  let created = 0, errors = 0;
  const BATCH = 50;
  
  for (let i = 0; i < posts.length; i += BATCH) {
    const batch = posts.slice(i, i + BATCH);
    const { error, data } = await sb.from("social_posts").insert(batch).select("id");
    if (error) {
      errors += batch.length;
      console.log(`Batch ${i}-${i+BATCH} error: ${error.message}`);
    } else {
      created += data?.length || 0;
    }
    if ((i + BATCH) % 200 === 0) console.log(`Progress: ${i + BATCH}/${posts.length}`);
  }

  console.log("\n=== DONE ===");
  console.log(`Created: ${created}`);
  console.log(`Errors: ${errors}`);
}

main().catch(e => { console.error(e); process.exit(1); });
