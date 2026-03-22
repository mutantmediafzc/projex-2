/**
 * Fixed Import Script - Maps by company name instead of ID
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load env
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
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length >= headers.length - 5) {
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
      rows.push(row);
    }
  }
  return rows;
}

// Platform mapping
const PLATFORM_ID_MAP: Record<string, string> = {
  "73d19a4c-7876-47f8-81a5-d29b5d2cc5c3": "facebook",
  "7dac2b2f-9a9a-4c9a-b987-5b248f5a6aea": "instagram",
  "962e2d92-ea8d-4066-8430-2f892bdc8142": "tiktok",
  "f6c2f16a-8e39-40d1-ac3b-36ca7de2b91e": "linkedin",
  "25387b99-cf69-454c-930c-85bbd25edd55": "x",
  "190b927d-fd7c-4f73-aa6b-e6d9ebe765cd": "youtube",
  "75ecb782-7c68-4364-93df-203f5b4625ab": "whatsapp",
};

function mapStatus(s: string): string {
  const m: Record<string, string> = { "Posted": "posted", "Approved": "approved", "Client Approval": "client_approval", "Captions": "captions", "Creatives Approval": "creatives_approval", "New": "new", "": "new" };
  return m[s] || "new";
}

function parsePlatforms(s: string): string[] {
  if (!s) return [];
  try {
    const ids = JSON.parse(s.replace(/\\/g, ""));
    return ids.map((id: string) => PLATFORM_ID_MAP[id] || "").filter(Boolean);
  } catch { return []; }
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&nbsp;/g, " ").trim();
}

// CSV project ID -> company name mapping (extracted from Strategy.csv titles)
const PROJECT_COMPANY_NAME_MAP: Record<string, string> = {
  "5dd8d88e-58bc-4e12-9cfb-55a3306b21cd": "Elite Property DXB",
  "90f5bb8e-1da9-441f-b63b-1941b663318b": "Crypto Homes DXB",
  "1212678d-037b-475a-b187-a27821e2d3c8": "Airstay",
  "f889f811-6e7f-489d-a7de-dee3fc249d28": "Mutant",
  "47d93cff-6005-493a-9f0c-578cfaf57506": "FX Unlocked",
  "1b2f16d7-192d-4d10-88a5-0fb18eb4967a": "ATEX International",
  "90f693b9-af56-47a1-9965-98bf0326b43e": "Esperia Volleyball Academy",
  "160e00a4-309a-40b8-aec3-1635e37cf211": "Kuwait Build",
  "b7444ad8-e438-49ce-b78a-df4a2ed60dd8": "Code DXB",
  "fe578398-ead8-4e5c-902c-1ba9d28746b3": "Canterra Properties",
  "ba7b39b5-2f96-4c6b-8d55-9e6c7cbd3ea4": "Alkalive",
  "e65ea50e-6cc6-458d-8f81-1ebf9b702e2d": "Lino Lada",
  "cf43c9d2-0680-46a6-bfb1-614177099a56": "Flavour Fest Kuwait",
  "62980c2d-3d5b-4488-8b5e-83dc24f687b3": "Libya Build",
  "0e90ed6d-2dbc-48b2-aeea-fe5b0928abd5": "Elite Vacations",
  "fe6eef75-85a6-4b38-9c21-2c3079846288": "Sovereign Capital",
};

async function main() {
  console.log("=== FIXED SOCIAL MEDIA IMPORT ===\n");

  // Get all companies
  const { data: companies } = await sb.from("companies").select("id, name");
  const companyByName = new Map<string, string>();
  for (const c of companies || []) {
    companyByName.set(c.name.toLowerCase().trim(), c.id);
    // Also add partial matches
    const words = c.name.toLowerCase().split(/\s+/);
    if (words.length > 1) {
      companyByName.set(words[0], c.id);
    }
  }
  console.log(`Loaded ${companies?.length} companies`);

  // Get existing social_projects
  const { data: existingSP } = await sb.from("social_projects").select("id, name, company_id");
  const spByCompanyId = new Map<string, string>();
  for (const sp of existingSP || []) {
    spByCompanyId.set(sp.company_id, sp.id);
  }
  console.log(`Existing social_projects: ${existingSP?.length}`);

  // Load Strategy.csv to get more project-company mappings
  const strategyPath = path.join(__dirname, "../public/projex-data/Content/Strategy.csv");
  const strategyContent = fs.readFileSync(strategyPath, "utf8");
  const strategyRows = parseCSV(strategyContent);
  
  // Build project ID -> company name from strategy titles
  for (const row of strategyRows) {
    const title = row.Title || "";
    const projId = row.project;
    if (title && projId && !PROJECT_COMPANY_NAME_MAP[projId]) {
      // Extract company name from title (e.g., "Elite Property DXB - November 2025...")
      const match = title.match(/^([^-]+)/);
      if (match) {
        PROJECT_COMPANY_NAME_MAP[projId] = match[1].trim();
      }
    }
  }
  
  console.log(`Project-company mappings: ${Object.keys(PROJECT_COMPANY_NAME_MAP).length}`);

  // Create social_projects for each CSV project
  const csvProjectToSocialProject = new Map<string, string>();
  
  for (const [csvProjId, companyName] of Object.entries(PROJECT_COMPANY_NAME_MAP)) {
    // Find company in DB by name
    let companyId = companyByName.get(companyName.toLowerCase().trim());
    
    // Try partial match
    if (!companyId) {
      for (const [name, id] of companyByName) {
        if (name.includes(companyName.toLowerCase()) || companyName.toLowerCase().includes(name)) {
          companyId = id;
          break;
        }
      }
    }
    
    if (!companyId) {
      console.log(`  Company not found: ${companyName}`);
      continue;
    }

    // Check if social_project exists for this company
    let socialProjectId = spByCompanyId.get(companyId);
    
    if (!socialProjectId) {
      // Create new social_project
      const { data: newSP, error } = await sb.from("social_projects").insert({
        company_id: companyId,
        name: `${companyName} - Social Media`,
        status: "active",
        platforms: ["instagram", "facebook", "linkedin", "tiktok", "x"],
      }).select().single();
      
      if (error) {
        console.log(`  Error creating social_project for ${companyName}: ${error.message}`);
        continue;
      }
      socialProjectId = newSP.id;
      if (companyId && socialProjectId) spByCompanyId.set(companyId, socialProjectId);
      console.log(`  Created social_project for: ${companyName}`);
    }
    
    if (socialProjectId) csvProjectToSocialProject.set(csvProjId, socialProjectId);
  }
  
  console.log(`\nMapped ${csvProjectToSocialProject.size} CSV projects to social_projects`);

  // Load posts CSV
  const postsPath = path.join(__dirname, "../public/projex-data/Content/Social+Media+Posts.csv");
  const postsContent = fs.readFileSync(postsPath, "utf8");
  const posts = parseCSV(postsContent);
  console.log(`\nLoaded ${posts.length} posts from CSV`);

  // Load spend data
  const spendPath = path.join(__dirname, "../public/projex-data/Content/SocialMediaSpend.csv");
  const spendContent = fs.readFileSync(spendPath, "utf8");
  const spendRows = parseCSV(spendContent);
  const postBudgets = new Map<string, Record<string, number>>();
  for (const s of spendRows) {
    const postId = s.post;
    const platform = (s.platform || "").toLowerCase();
    const amount = parseFloat(s.amount) || 0;
    if (postId && platform && amount > 0) {
      if (!postBudgets.has(postId)) postBudgets.set(postId, {});
      postBudgets.get(postId)![platform] = (postBudgets.get(postId)![platform] || 0) + amount;
    }
  }

  // Clear existing posts for fresh import
  console.log("\nClearing existing social_posts...");
  await sb.from("social_posts").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  let created = 0, skipped = 0, errors = 0;

  for (const row of posts) {
    const csvProjId = row.project;
    const socialProjectId = csvProjectToSocialProject.get(csvProjId);
    
    if (!socialProjectId) {
      skipped++;
      continue;
    }

    const caption = stripHtml(row.caption || "");
    const scheduledDate = row.date ? new Date(row.date).toISOString() : null;
    const platforms = parsePlatforms(row.platforms);
    const workflowStatus = mapStatus(row.status);
    const postType = (row.type || "").toLowerCase() === "boosted" ? "boosted" : "organic";
    const budgets = postBudgets.get(row.ID) || {};

    let scheduledTime = "12:00";
    if (row.time) {
      const parts = row.time.split(":");
      if (parts.length >= 2) scheduledTime = `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    }

    const shootDate = row.shootDate ? new Date(row.shootDate).toISOString().slice(0, 10) : null;
    const shootStatus = (row.shootStatus || "pending").toLowerCase() as "pending" | "scheduled" | "completed" | "cancelled";

    const postData = {
      project_id: socialProjectId,
      platforms,
      caption,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      status: workflowStatus === "posted" ? "published" : "draft",
      workflow_status: workflowStatus,
      post_type: postType,
      content_type: row.format || null,
      image_asset_url: row.assetLink || null,
      first_comment: stripHtml(row.firstComment || "") || null,
      shoot_status: shootStatus,
      shoot_date: shootDate,
      shoot_time: row.shootTime?.slice(0, 5) || null,
      shoot_count: parseInt(row.shootHours) || 0,
      shoot_notes: stripHtml(row.shootNotes || "") || null,
      creative_notes: stripHtml(row.notes || "") || null,
      platform_budgets: Object.keys(budgets).length > 0 ? budgets : {},
    };

    const { error } = await sb.from("social_posts").insert(postData);
    if (error) {
      errors++;
      if (errors <= 5) console.log(`  Error: ${error.message}`);
    } else {
      created++;
    }
  }

  console.log("\n=== IMPORT COMPLETE ===");
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
}

main().catch(console.error);
