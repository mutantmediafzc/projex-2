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

async function main() {
  console.log("=== DATABASE STATE ===\n");
  
  // Check social_posts
  const { count: postCount } = await sb.from("social_posts").select("*", { count: "exact", head: true });
  console.log("social_posts count:", postCount || 0);
  
  // Check social_projects  
  const { data: socialProjects } = await sb.from("social_projects").select("id, name, company_id");
  console.log("social_projects count:", socialProjects?.length || 0);
  
  // Get companies
  const { data: companies } = await sb.from("companies").select("id, name");
  const companyMap = new Map(companies?.map(c => [c.id, c.name]) || []);
  console.log("companies count:", companies?.length || 0);
  
  console.log("\n=== CSV ANALYSIS ===\n");
  
  // Parse CSV
  const csvPath = path.join(__dirname, "../public/projex-data/Content/Social+Media+Posts.csv");
  const content = fs.readFileSync(csvPath, "utf8");
  const lines = content.split("\n").filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  
  const projectIdx = headers.indexOf("project");
  const companyIdx = headers.indexOf("company");
  
  // Collect unique project/company pairs from CSV
  const csvProjectCompany = new Map<string, string>();
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const proj = vals[projectIdx];
    const comp = vals[companyIdx];
    if (proj && comp) csvProjectCompany.set(proj, comp);
  }
  
  console.log("CSV total rows:", lines.length - 1);
  console.log("CSV unique projects:", csvProjectCompany.size);
  
  // Check which CSV company IDs exist in DB
  const csvCompanyIds = new Set(csvProjectCompany.values());
  console.log("CSV unique companies:", csvCompanyIds.size);
  
  let matchedCompanies = 0;
  let unmatchedCompanies: string[] = [];
  for (const cid of csvCompanyIds) {
    if (companyMap.has(cid)) matchedCompanies++;
    else unmatchedCompanies.push(cid);
  }
  
  console.log("\nMatched companies in DB:", matchedCompanies);
  console.log("Unmatched companies:", unmatchedCompanies.length);
  
  if (unmatchedCompanies.length > 0 && unmatchedCompanies.length <= 10) {
    console.log("Unmatched company IDs:", unmatchedCompanies);
  }
  
  // Show sample of CSV data
  console.log("\n=== SAMPLE CSV DATA (first 5 unique projects) ===\n");
  let shown = 0;
  for (const [projId, compId] of csvProjectCompany) {
    if (shown >= 5) break;
    const compName = companyMap.get(compId) || "NOT FOUND";
    console.log(`Project: ${projId}`);
    console.log(`  Company ID: ${compId}`);
    console.log(`  Company Name: ${compName}`);
    shown++;
  }
  
  // Check if social_projects exist for these companies
  console.log("\n=== SOCIAL PROJECTS BY COMPANY ===\n");
  const spByCompany = new Map<string, string[]>();
  for (const sp of socialProjects || []) {
    if (!spByCompany.has(sp.company_id)) spByCompany.set(sp.company_id, []);
    spByCompany.get(sp.company_id)!.push(sp.name);
  }
  
  console.log("Companies with social_projects:", spByCompany.size);
  
  // Check overlap
  let companiesWithSP = 0;
  for (const compId of csvCompanyIds) {
    if (spByCompany.has(compId)) companiesWithSP++;
  }
  console.log("CSV companies that have social_projects:", companiesWithSP);
}

main().catch(console.error);
