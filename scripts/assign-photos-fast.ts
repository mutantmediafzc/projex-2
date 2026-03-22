/**
 * Fast photo assignment using prepared updates
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

const BRANDS = [
  { pattern: "airstay", keywords: ["airstay"] },
  { pattern: "elite", keywords: ["elite property", "elite"] },
  { pattern: "crypto", keywords: ["crypto homes", "crypto"] },
  { pattern: "mutant", keywords: ["mutant"] },
  { pattern: "alkalive", keywords: ["alkalive"] },
  { pattern: "lino", keywords: ["lino"] },
  { pattern: "canterra", keywords: ["canterra"] },
  { pattern: "esperia", keywords: ["esperia"] },
  { pattern: "libya", keywords: ["libya"] },
  { pattern: "kuwait", keywords: ["kuwait"] },
  { pattern: "horeca", keywords: ["horeca"] },
  { pattern: "code", keywords: ["code dxb", "code"] },
  { pattern: "atex", keywords: ["atex"] },
  { pattern: "sovereign", keywords: ["sovereign"] },
  { pattern: "fx", keywords: ["fx unlocked"] },
];

async function main() {
  console.log("=== FAST PHOTO ASSIGN ===");

  const uploadsDir = path.join(__dirname, "../public/projex-data/post-photos/Visitor Uploads");
  const files = fs.readdirSync(uploadsDir);
  
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

  for (const [b, bf] of filesByBrand) console.log(`${b}: ${bf.length}`);

  // Get projects
  const { data: projects } = await sb.from("social_projects").select("id, name");
  const projectBrand = new Map<string, string>();
  for (const p of projects || []) {
    const n = p.name.toLowerCase();
    for (const b of BRANDS) {
      if (b.keywords.some(k => n.includes(k))) {
        projectBrand.set(p.id, b.pattern);
        break;
      }
    }
  }
  console.log(`Projects mapped: ${projectBrand.size}`);

  // Get ALL posts without images in one query
  const { data: posts } = await sb
    .from("social_posts")
    .select("id, project_id")
    .is("image_asset_url", null);

  console.log(`Posts to update: ${posts?.length}`);

  // Prepare all updates
  const usedIdx = new Map<string, number>();
  const updates: { id: string; image_asset_url: string }[] = [];

  for (const post of posts || []) {
    const brand = projectBrand.get(post.project_id);
    if (!brand) continue;
    const brandFiles = filesByBrand.get(brand);
    if (!brandFiles?.length) continue;

    const idx = usedIdx.get(brand) || 0;
    const file = brandFiles[idx % brandFiles.length];
    usedIdx.set(brand, idx + 1);

    updates.push({
      id: post.id,
      image_asset_url: `/projex-data/post-photos/Visitor Uploads/${encodeURIComponent(file)}`
    });
  }

  console.log(`Prepared ${updates.length} updates`);

  // Execute updates in larger batches using Promise.all
  const BATCH = 50;
  let done = 0;

  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    await Promise.all(batch.map(u => 
      sb.from("social_posts").update({ image_asset_url: u.image_asset_url }).eq("id", u.id)
    ));
    done += batch.length;
    if (done % 200 === 0) console.log(`Progress: ${done}/${updates.length}`);
  }

  console.log(`\nDONE: ${done} updated`);
}

main().catch(console.error);
