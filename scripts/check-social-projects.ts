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
  // Check social_posts count
  const { count } = await sb.from("social_posts").select("*", { count: "exact", head: true });
  console.log("Total social_posts:", count);

  const { data: sp } = await sb.from("social_projects").select("id, name, company_id");
  console.log("\nSocial Projects:", sp?.length);
  sp?.forEach(p => console.log("-", p.name, "|", p.company_id));

  const { data: proj } = await sb.from("projects").select("id, name, project_type, social_calendar_id, company_id").eq("project_type", "social_media");
  console.log("\nSocial Media Projects:", proj?.length);
  proj?.forEach(p => console.log("-", p.name, "| company:", p.company_id, "| cal:", p.social_calendar_id));

  const { data: companies } = await sb.from("companies").select("id, name").limit(10);
  console.log("\nCompanies (first 10):");
  companies?.forEach(c => console.log("-", c.name, "|", c.id));
}

main();
