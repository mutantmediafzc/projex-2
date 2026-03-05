/**
 * Verify imported users
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verify() {
  const { data: users, error } = await supabase
    .from("users")
    .select("id, email, full_name, designation, role")
    .order("full_name");

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  console.log(`Total Users: ${users.length}\n`);
  console.log("Users in database:");
  console.log("-".repeat(80));
  
  for (const u of users) {
    console.log(`${u.full_name || "N/A"} | ${u.email} | ${u.designation || "N/A"} | ${u.role}`);
  }
}

verify();
