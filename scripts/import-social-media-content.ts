/**
 * Import Social Media Content from CSV files
 * 
 * This script imports:
 * 1. Social+Media+Posts.csv -> social_posts table
 * 2. SocialMediaSpend.csv -> platform_budgets in social_posts
 * 3. WebsiteBlogs.csv -> social_articles table
 * 
 * Usage: npx tsx scripts/import-social-media-content.ts
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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// CSV Parser
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length >= headers.length - 5) {
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || "";
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

// Platform ID to name mapping (from Platforms.csv)
const PLATFORM_ID_MAP: Record<string, string> = {
  "73d19a4c-7876-47f8-81a5-d29b5d2cc5c3": "facebook",
  "7dac2b2f-9a9a-4c9a-b987-5b248f5a6aea": "instagram",
  "962e2d92-ea8d-4066-8430-2f892bdc8142": "tiktok",
  "f6c2f16a-8e39-40d1-ac3b-36ca7de2b91e": "linkedin",
  "25387b99-cf69-454c-930c-85bbd25edd55": "x",
  "190b927d-fd7c-4f73-aa6b-e6d9ebe765cd": "youtube",
  "75ecb782-7c68-4364-93df-203f5b4625ab": "whatsapp",
};

// Status mapping from CSV to database
function mapStatus(csvStatus: string): string {
  const statusMap: Record<string, string> = {
    "Posted": "posted",
    "Approved": "approved",
    "Client Approval": "client_approval",
    "Captions": "captions",
    "Creatives Approval": "creatives_approval",
    "New": "new",
    "": "new",
  };
  return statusMap[csvStatus] || "new";
}

// Content type/format mapping
function mapContentType(format: string): string {
  const formatMap: Record<string, string> = {
    "Reel": "Reel",
    "Static Image": "Single Image Post",
    "Carousel": "Carousel Post (Images only)",
    "Story": "Reel", // Stories are similar to reels
    "Video": "Long-Form Video",
  };
  return formatMap[format] || format || "";
}

// Parse platforms array from CSV
function parsePlatforms(platformsStr: string): string[] {
  if (!platformsStr) return [];
  try {
    const ids = JSON.parse(platformsStr.replace(/\\/g, ""));
    return ids.map((id: string) => PLATFORM_ID_MAP[id] || "").filter(Boolean);
  } catch {
    return [];
  }
}

// Strip HTML tags for cleaner text
function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

// Store mappings
const socialProjectIdMap = new Map<string, string>(); // old project ID -> social_project ID
const postIdMap = new Map<string, string>(); // old post ID -> new post ID

async function loadSocialProjects() {
  console.log("=".repeat(60));
  console.log("STEP 1: Loading Social Media Projects");
  console.log("=".repeat(60));

  // Get existing social_projects
  const { data: existingProjects } = await supabase
    .from("social_projects")
    .select("id, name, company_id");

  console.log(`Found ${existingProjects?.length || 0} existing social projects`);

  // Get projects with social_calendar_id (linking regular projects to social projects)
  const { data: linkedProjects } = await supabase
    .from("projects")
    .select("id, name, social_calendar_id, company_id")
    .not("social_calendar_id", "is", null);

  console.log(`Found ${linkedProjects?.length || 0} projects linked to social calendars`);

  // Map old project IDs to social_project IDs
  // We need to create social_projects for projects that don't have them yet
  
  // Get all unique project IDs from the CSV
  const postsPath = path.join(__dirname, "../public/projex-data/Content/Social+Media+Posts.csv");
  const postsContent = fs.readFileSync(postsPath, "utf8");
  const postsCSV = parseCSV(postsContent);
  
  const uniqueProjectIds = new Set<string>();
  const projectCompanyMap = new Map<string, string>();
  
  for (const row of postsCSV) {
    if (row.project) {
      uniqueProjectIds.add(row.project);
      if (row.company) {
        projectCompanyMap.set(row.project, row.company);
      }
    }
  }

  console.log(`Found ${uniqueProjectIds.size} unique project IDs in CSV`);

  // Check which projects already exist in our system
  const { data: dbProjects } = await supabase
    .from("projects")
    .select("id, name, social_calendar_id, company_id")
    .in("id", Array.from(uniqueProjectIds));

  console.log(`Found ${dbProjects?.length || 0} matching projects in database`);

  // For projects with social_calendar_id, use that
  for (const proj of dbProjects || []) {
    if (proj.social_calendar_id) {
      socialProjectIdMap.set(proj.id, proj.social_calendar_id);
    }
  }

  // Create social_projects for projects that don't have one
  const projectsNeedingCalendar = (dbProjects || []).filter(p => !p.social_calendar_id);
  console.log(`\nCreating social projects for ${projectsNeedingCalendar.length} projects...`);

  for (const proj of projectsNeedingCalendar) {
    // Check if company exists
    const companyId = proj.company_id || projectCompanyMap.get(proj.id);
    
    if (!companyId) {
      console.log(`  Skipping ${proj.name} - no company ID`);
      continue;
    }

    // Check if company exists in DB
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .single();

    if (!company) {
      console.log(`  Skipping ${proj.name} - company ${companyId} not found`);
      continue;
    }

    // Create social_project
    const { data: newSocialProj, error } = await supabase
      .from("social_projects")
      .insert({
        company_id: companyId,
        name: proj.name,
        status: "active",
        platforms: ["instagram", "facebook", "linkedin", "tiktok", "x"],
      })
      .select()
      .single();

    if (error) {
      console.log(`  Error creating social project for ${proj.name}: ${error.message}`);
      continue;
    }

    // Link project to social calendar
    await supabase
      .from("projects")
      .update({ social_calendar_id: newSocialProj.id })
      .eq("id", proj.id);

    socialProjectIdMap.set(proj.id, newSocialProj.id);
    console.log(`  Created social project for: ${proj.name}`);
  }

  console.log(`\nTotal mapped social projects: ${socialProjectIdMap.size}`);
  return socialProjectIdMap;
}

async function importPosts() {
  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: Importing Social Media Posts");
  console.log("=".repeat(60));

  const postsPath = path.join(__dirname, "../public/projex-data/Content/Social+Media+Posts.csv");
  const postsContent = fs.readFileSync(postsPath, "utf8");
  const postsCSV = parseCSV(postsContent);

  console.log(`Found ${postsCSV.length} posts in CSV`);

  // Load spend data for platform_budgets
  const spendPath = path.join(__dirname, "../public/projex-data/Content/SocialMediaSpend.csv");
  const spendContent = fs.readFileSync(spendPath, "utf8");
  const spendCSV = parseCSV(spendContent);

  // Build post -> platform -> budget map
  const postBudgets = new Map<string, Record<string, number>>();
  for (const spend of spendCSV) {
    const postId = spend.post;
    const platform = (spend.platform || "").toLowerCase();
    const amount = parseFloat(spend.amount) || 0;
    
    if (postId && platform && amount > 0) {
      if (!postBudgets.has(postId)) {
        postBudgets.set(postId, {});
      }
      const budgets = postBudgets.get(postId)!;
      budgets[platform] = (budgets[platform] || 0) + amount;
    }
  }

  console.log(`Found ${postBudgets.size} posts with budget data`);

  // Check existing posts to avoid duplicates
  const { data: existingPosts } = await supabase
    .from("social_posts")
    .select("id, caption, scheduled_date");

  const existingPostSet = new Set(
    (existingPosts || []).map(p => `${p.caption?.slice(0, 50)}|${p.scheduled_date}`)
  );

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of postsCSV) {
    const oldId = row.ID;
    const projectId = row.project;
    const socialProjectId = socialProjectIdMap.get(projectId);

    if (!socialProjectId) {
      skipped++;
      continue;
    }

    const caption = stripHtml(row.caption || "");
    const scheduledDate = row.date ? new Date(row.date).toISOString() : null;
    
    // Check for duplicate
    const key = `${caption?.slice(0, 50)}|${scheduledDate}`;
    if (existingPostSet.has(key)) {
      skipped++;
      continue;
    }

    const platforms = parsePlatforms(row.platforms);
    const workflowStatus = mapStatus(row.status);
    const contentType = mapContentType(row.format);
    const postType = (row.type || "").toLowerCase() === "boosted" ? "boosted" : "organic";
    
    // Get platform budgets for this post
    const platformBudgets = postBudgets.get(oldId) || {};

    // Parse time
    let scheduledTime = "12:00";
    if (row.time) {
      const timeParts = row.time.split(":");
      if (timeParts.length >= 2) {
        scheduledTime = `${timeParts[0].padStart(2, "0")}:${timeParts[1].padStart(2, "0")}`;
      }
    }

    // Parse shoot details
    const shootDate = row.shootDate ? new Date(row.shootDate).toISOString().slice(0, 10) : null;
    const shootTime = row.shootTime ? row.shootTime.slice(0, 5) : null;
    const shootCount = parseInt(row.shootHours) || 0;
    const shootNotes = stripHtml(row.shootNotes || "");
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
      content_type: contentType || null,
      image_asset_url: row.assetLink || null,
      first_comment: stripHtml(row.firstComment || "") || null,
      shoot_status: shootStatus,
      shoot_date: shootDate,
      shoot_time: shootTime,
      shoot_count: shootCount,
      shoot_notes: shootNotes || null,
      creative_notes: stripHtml(row.notes || "") || null,
      platform_budgets: Object.keys(platformBudgets).length > 0 ? platformBudgets : {},
    };

    const { data, error } = await supabase
      .from("social_posts")
      .insert(postData)
      .select()
      .single();

    if (error) {
      if (!error.message.includes("duplicate")) {
        console.log(`Error inserting post: ${error.message}`);
      }
      errors++;
    } else {
      postIdMap.set(oldId, data.id);
      created++;
      existingPostSet.add(key);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("POST IMPORT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
}

async function importArticles() {
  console.log("\n" + "=".repeat(60));
  console.log("STEP 3: Importing Website Blogs/Articles");
  console.log("=".repeat(60));

  const blogsPath = path.join(__dirname, "../public/projex-data/Content/WebsiteBlogs.csv");
  const blogsContent = fs.readFileSync(blogsPath, "utf8");
  const blogsCSV = parseCSV(blogsContent);

  console.log(`Found ${blogsCSV.length} articles in CSV`);

  // Check existing articles
  const { data: existingArticles } = await supabase
    .from("social_articles")
    .select("id, title");

  const existingTitles = new Set((existingArticles || []).map(a => a.title?.toLowerCase()));

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of blogsCSV) {
    const title = row.Title?.trim();
    if (!title) {
      skipped++;
      continue;
    }

    const projectId = row.project;
    const socialProjectId = socialProjectIdMap.get(projectId);

    if (!socialProjectId) {
      skipped++;
      continue;
    }

    // Check duplicate
    if (existingTitles.has(title.toLowerCase())) {
      skipped++;
      continue;
    }

    // Map status
    let status: "draft" | "pending" | "approved" | "published" = "draft";
    const csvStatus = (row.status || "").toLowerCase();
    if (csvStatus === "posted") status = "published";
    else if (csvStatus === "approved") status = "approved";
    else if (csvStatus === "new") status = "draft";

    const articleData = {
      project_id: socialProjectId,
      title,
      body_html: row.notes || null,
      status,
      published_url: row.link || null,
      scheduled_date: row.Date ? new Date(row.Date).toISOString() : null,
      featured_image_url: row.cover || null,
    };

    const { error } = await supabase.from("social_articles").insert(articleData);

    if (error) {
      if (!error.message.includes("duplicate")) {
        errors++;
      }
    } else {
      created++;
      existingTitles.add(title.toLowerCase());
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("ARTICLES IMPORT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
}

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("SOCIAL MEDIA CONTENT IMPORT SCRIPT");
  console.log("=".repeat(60) + "\n");

  await loadSocialProjects();
  await importPosts();
  await importArticles();

  console.log("\n" + "=".repeat(60));
  console.log("IMPORT COMPLETED!");
  console.log("=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  });
