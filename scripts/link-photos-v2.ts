/**
 * Link photos by matching CSV assetLink filenames to local files
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

function stripHtml(h: string): string {
  return (h || "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#x27;/g, "'").trim();
}

function extractFilename(wixUrl: string): string | null {
  if (!wixUrl) return null;
  // Format: wix:image://v1/xxx/FileName.ext#params
  const match = wixUrl.match(/\/([^\/]+)(?:#|$)/);
  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return null;
}

async function main() {
  console.log("=== LINK PHOTOS V2 ===\n");

  // Load files from Visitor Uploads
  const uploadsDir = path.join(__dirname, "../public/projex-data/post-photos/Visitor Uploads");
  const files = fs.readdirSync(uploadsDir);
  console.log(`Local files: ${files.length}`);

  // Create lookup maps
  const exactMap = new Map<string, string>(); // exact filename match
  const normalizedMap = new Map<string, string>(); // normalized match
  
  for (const f of files) {
    exactMap.set(f.toLowerCase(), f);
    // Normalize: remove spaces, dashes, underscores
    const norm = f.toLowerCase().replace(/[\s\-_]/g, "").replace(/\.(jpg|jpeg|png|gif|webp)$/i, "");
    normalizedMap.set(norm, f);
  }

  // Parse CSV
  const csvPath = path.join(__dirname, "../public/projex-data/Content/Social+Media+Posts.csv");
  const lines = fs.readFileSync(csvPath, "utf8").split("\n").filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  
  const assetIdx = headers.indexOf("assetLink");
  const captionIdx = headers.indexOf("caption");
  const dateIdx = headers.indexOf("date");
  const subjectIdx = headers.indexOf("subject");

  console.log(`CSV rows: ${lines.length - 1}`);

  // Build caption+date -> filename mapping from CSV
  const captionToFile = new Map<string, string>();
  let csvFilesFound = 0;

  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const assetLink = vals[assetIdx] || "";
    const filename = extractFilename(assetLink);
    
    if (filename) {
      // Check if file exists locally
      const lower = filename.toLowerCase();
      const norm = lower.replace(/[\s\-_]/g, "").replace(/\.(jpg|jpeg|png|gif|webp)$/i, "");
      
      let localFile = exactMap.get(lower) || normalizedMap.get(norm);
      
      if (localFile) {
        // Create key from caption snippet + date
        const caption = stripHtml(vals[captionIdx] || "").slice(0, 100);
        const date = vals[dateIdx] || "";
        const key = `${caption}|${date}`;
        captionToFile.set(key, localFile);
        csvFilesFound++;
      }
    }
  }

  console.log(`CSV files matched to local: ${csvFilesFound}`);

  // Get posts from DB and update
  const { data: posts } = await sb.from("social_posts").select("id, caption, scheduled_date, image_asset_url");
  console.log(`DB posts: ${posts?.length}`);

  let updated = 0, skipped = 0, notFound = 0;
  const BATCH_SIZE = 100;
  let batch: { id: string; url: string }[] = [];

  for (const post of posts || []) {
    // Skip if already has local image
    if (post.image_asset_url?.startsWith("/projex-data")) {
      skipped++;
      continue;
    }

    const caption = (post.caption || "").slice(0, 100);
    const date = post.scheduled_date || "";
    const key = `${caption}|${date}`;

    const localFile = captionToFile.get(key);
    if (localFile) {
      batch.push({
        id: post.id,
        url: `/projex-data/post-photos/Visitor Uploads/${encodeURIComponent(localFile)}`
      });

      if (batch.length >= BATCH_SIZE) {
        for (const b of batch) {
          await sb.from("social_posts").update({ image_asset_url: b.url }).eq("id", b.id);
        }
        updated += batch.length;
        console.log(`Updated batch: ${updated}`);
        batch = [];
      }
    } else {
      notFound++;
    }
  }

  // Final batch
  if (batch.length > 0) {
    for (const b of batch) {
      await sb.from("social_posts").update({ image_asset_url: b.url }).eq("id", b.id);
    }
    updated += batch.length;
  }

  console.log(`\nUpdated: ${updated}`);
  console.log(`Skipped (already set): ${skipped}`);
  console.log(`Not found: ${notFound}`);
  console.log("=== DONE ===");
}

main().catch(console.error);
