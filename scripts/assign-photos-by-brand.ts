/**
 * Assign photos to posts by brand name in filename
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

// Brand patterns to match in filenames and captions
const BRANDS = [
  { pattern: "airstay", keywords: ["airstay", "holiday home", "short-term"] },
  { pattern: "elite", keywords: ["elite property", "elitepropertydxb", "elite"] },
  { pattern: "crypto", keywords: ["crypto homes", "cryptohomesdxb", "crypto"] },
  { pattern: "mutant", keywords: ["mutant"] },
  { pattern: "alkalive", keywords: ["alkalive"] },
  { pattern: "lino", keywords: ["lino lada", "lino"] },
  { pattern: "canterra", keywords: ["canterra"] },
  { pattern: "esperia", keywords: ["esperia", "volleyball"] },
  { pattern: "libya", keywords: ["libya build", "libyabuild"] },
  { pattern: "kuwait", keywords: ["kuwait build", "kuwaitbuild"] },
  { pattern: "horeca", keywords: ["horeca"] },
  { pattern: "code", keywords: ["code dxb", "codedxb"] },
  { pattern: "atex", keywords: ["atex"] },
  { pattern: "sovereign", keywords: ["sovereign"] },
  { pattern: "fx", keywords: ["fx unlocked", "fxunlocked"] },
];

async function main() {
  console.log("=== ASSIGN PHOTOS BY BRAND ===\n");

  const uploadsDir = path.join(__dirname, "../public/projex-data/post-photos/Visitor Uploads");
  const files = fs.readdirSync(uploadsDir);
  console.log(`Total files: ${files.length}`);

  // Group files by brand
  const filesByBrand = new Map<string, string[]>();
  for (const f of files) {
    const lower = f.toLowerCase();
    for (const brand of BRANDS) {
      if (lower.includes(brand.pattern)) {
        if (!filesByBrand.has(brand.pattern)) filesByBrand.set(brand.pattern, []);
        filesByBrand.get(brand.pattern)!.push(f);
        break;
      }
    }
  }

  console.log("\nFiles by brand:");
  for (const [brand, brandFiles] of filesByBrand) {
    console.log(`  ${brand}: ${brandFiles.length} files`);
  }

  // Get social_projects with their company info
  const { data: socialProjects } = await sb.from("social_projects").select("id, name");
  console.log(`\nSocial projects: ${socialProjects?.length}`);

  // Map project IDs to brand patterns
  const projectToBrand = new Map<string, string>();
  for (const sp of socialProjects || []) {
    const name = sp.name.toLowerCase();
    for (const brand of BRANDS) {
      if (name.includes(brand.pattern) || brand.keywords.some(k => name.includes(k))) {
        projectToBrand.set(sp.id, brand.pattern);
        break;
      }
    }
  }

  // Track file usage per brand
  const usedIndexByBrand = new Map<string, number>();

  // Process posts in batches
  let totalUpdated = 0;
  let offset = 0;
  const BATCH = 500;

  while (true) {
    const { data: posts } = await sb
      .from("social_posts")
      .select("id, project_id, caption, image_asset_url")
      .is("image_asset_url", null)
      .range(offset, offset + BATCH - 1);

    if (!posts || posts.length === 0) break;
    console.log(`\nBatch at ${offset}: ${posts.length} posts without images`);

    let batchUpdated = 0;

    for (const post of posts) {
      const brand = projectToBrand.get(post.project_id);
      if (!brand) continue;

      const brandFiles = filesByBrand.get(brand);
      if (!brandFiles || brandFiles.length === 0) continue;

      // Get next file for this brand (round-robin)
      const idx = usedIndexByBrand.get(brand) || 0;
      const file = brandFiles[idx % brandFiles.length];
      usedIndexByBrand.set(brand, idx + 1);

      const url = `/projex-data/post-photos/Visitor Uploads/${encodeURIComponent(file)}`;
      const { error } = await sb.from("social_posts").update({ image_asset_url: url }).eq("id", post.id);
      
      if (!error) batchUpdated++;
    }

    totalUpdated += batchUpdated;
    console.log(`  Updated: ${batchUpdated}`);

    offset += BATCH;
    if (posts.length < BATCH) break;
  }

  console.log(`\n=== TOTAL UPDATED: ${totalUpdated} ===`);
}

main().catch(console.error);
