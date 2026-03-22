/**
 * Match post photos from Visitor Uploads to social_posts
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
  });
}

function extractFilename(wixUrl: string): string | null {
  if (!wixUrl || !wixUrl.includes("wix:image://")) return null;
  // Format: wix:image://v1/xxx/FileName.ext#params
  const match = wixUrl.match(/\/([^\/]+)#/);
  if (match) {
    return decodeURIComponent(match[1]);
  }
  // Try without hash
  const match2 = wixUrl.match(/\/([^\/]+)$/);
  if (match2) {
    return decodeURIComponent(match2[1]);
  }
  return null;
}

function normalizeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function main() {
  console.log("=== MATCH POST PHOTOS ===\n");

  // Load all files from Visitor Uploads
  const uploadsDir = path.join(__dirname, "../public/projex-data/post-photos/Visitor Uploads");
  const files = fs.readdirSync(uploadsDir);
  console.log(`Found ${files.length} files in Visitor Uploads`);

  // Create lookup map by normalized filename
  const fileMap = new Map<string, string>();
  const fileMapExact = new Map<string, string>();
  for (const file of files) {
    const normalized = normalizeFilename(file);
    fileMap.set(normalized, file);
    fileMapExact.set(file.toLowerCase(), file);
  }

  // Load CSV to get original assetLink values
  const csvPath = path.join(__dirname, "../public/projex-data/Content/Social+Media+Posts.csv");
  const csvContent = fs.readFileSync(csvPath, "utf8");
  const csvRows = parseCSV(csvContent);
  console.log(`Loaded ${csvRows.length} CSV rows`);

  // Build mapping from CSV ID to assetLink filename
  const csvAssetMap = new Map<string, string>();
  for (const row of csvRows) {
    const assetLink = row.assetLink || "";
    const filename = extractFilename(assetLink);
    if (filename && row.ID) {
      csvAssetMap.set(row.ID, filename);
    }
  }
  console.log(`Found ${csvAssetMap.size} asset links in CSV`);

  // Get all social_posts
  const { data: posts, error } = await sb.from("social_posts").select("id, caption, image_asset_url, scheduled_date");
  if (error) {
    console.error("Error fetching posts:", error.message);
    return;
  }
  console.log(`Loaded ${posts?.length} social_posts from DB`);

  let matched = 0;
  let alreadySet = 0;
  let notFound = 0;
  const updates: { id: string; url: string }[] = [];

  // Try to match each post
  for (const post of posts || []) {
    // Skip if already has an image
    if (post.image_asset_url && post.image_asset_url.startsWith("/projex-data")) {
      alreadySet++;
      continue;
    }

    let matchedFile: string | null = null;

    // Try to find by caption keywords
    const caption = (post.caption || "").toLowerCase();
    
    // Look for specific patterns in filenames that might match caption content
    for (const file of files) {
      const fileLower = file.toLowerCase();
      // Match by date patterns
      if (post.scheduled_date) {
        const date = new Date(post.scheduled_date);
        const month = date.toLocaleString('en', { month: 'short' }).toLowerCase();
        const day = date.getDate();
        
        // Check for patterns like "Airstay - Feb 10"
        if (fileLower.includes(month) && fileLower.includes(String(day))) {
          // Additional check for company name match
          if (caption.includes("airstay") && fileLower.includes("airstay")) {
            matchedFile = file;
            break;
          }
          if (caption.includes("elite") && fileLower.includes("elite")) {
            matchedFile = file;
            break;
          }
          if (caption.includes("crypto") && fileLower.includes("crypto")) {
            matchedFile = file;
            break;
          }
        }
      }
    }

    if (matchedFile) {
      const url = `/projex-data/post-photos/Visitor Uploads/${matchedFile}`;
      updates.push({ id: post.id, url });
      matched++;
    } else {
      notFound++;
    }
  }

  console.log(`\nMatched: ${matched}`);
  console.log(`Already set: ${alreadySet}`);
  console.log(`Not found: ${notFound}`);

  // Batch update
  if (updates.length > 0) {
    console.log(`\nUpdating ${updates.length} posts...`);
    let updated = 0;
    for (const u of updates) {
      const { error } = await sb.from("social_posts").update({ image_asset_url: u.url }).eq("id", u.id);
      if (!error) updated++;
    }
    console.log(`Updated: ${updated}`);
  }

  console.log("\n=== DONE ===");
}

main().catch(console.error);
