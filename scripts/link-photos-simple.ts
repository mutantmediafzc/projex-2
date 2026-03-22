/**
 * Simple script to link local photos to posts
 * Uses the public path directly since files are already in public folder
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

async function main() {
  console.log("=== LINK PHOTOS SIMPLE ===\n");

  // Get all files
  const uploadsDir = path.join(__dirname, "../public/projex-data/post-photos/Visitor Uploads");
  const files = fs.readdirSync(uploadsDir);
  console.log(`Files: ${files.length}`);

  // Create a map of filename patterns to full paths
  const filesByPattern = new Map<string, string>();
  for (const f of files) {
    const lower = f.toLowerCase();
    filesByPattern.set(lower, f);
    // Also add without extension
    const noExt = lower.replace(/\.(jpg|jpeg|png|gif|webp)$/i, "");
    filesByPattern.set(noExt, f);
  }

  // Get posts that need images (limit to batches)
  let offset = 0;
  const BATCH = 500;
  let totalUpdated = 0;

  while (true) {
    const { data: posts } = await sb
      .from("social_posts")
      .select("id, caption, scheduled_date, content_type")
      .is("image_asset_url", null)
      .range(offset, offset + BATCH - 1);

    if (!posts || posts.length === 0) break;
    console.log(`Processing batch at offset ${offset}, got ${posts.length} posts`);

    const updates: { id: string; url: string }[] = [];

    for (const post of posts) {
      const caption = (post.caption || "").toLowerCase();
      const date = post.scheduled_date ? new Date(post.scheduled_date) : null;
      
      // Try to find matching file based on patterns
      let matchedFile: string | null = null;

      // Extract potential company/brand names from caption
      const brands = ["airstay", "elite", "crypto", "mutant", "alkalive", "lino", "canterra", "esperia", "libya", "kuwait", "horeca", "code"];
      let brand = "";
      for (const b of brands) {
        if (caption.includes(b)) {
          brand = b;
          break;
        }
      }

      // Try date-based matching
      if (date && brand) {
        const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const monthName = months[date.getMonth()];
        const day = date.getDate();

        // Look for files like "Airstay - Feb 10" or "Elite - Jan 5"
        for (const [pattern, filename] of filesByPattern) {
          if (pattern.includes(brand) && pattern.includes(monthName) && pattern.includes(String(day))) {
            matchedFile = filename;
            break;
          }
        }
      }

      if (matchedFile) {
        updates.push({ 
          id: post.id, 
          url: `/projex-data/post-photos/Visitor Uploads/${encodeURIComponent(matchedFile)}` 
        });
      }
    }

    // Batch update
    if (updates.length > 0) {
      for (const u of updates) {
        await sb.from("social_posts").update({ image_asset_url: u.url }).eq("id", u.id);
      }
      totalUpdated += updates.length;
      console.log(`  Updated ${updates.length} posts`);
    }

    offset += BATCH;
    if (posts.length < BATCH) break;
  }

  console.log(`\nTotal updated: ${totalUpdated}`);
  console.log("=== DONE ===");
}

main().catch(console.error);
