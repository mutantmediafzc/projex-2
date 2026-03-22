/**
 * Delete social_posts from March 31st 2026 and earlier
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
  console.log("=== DELETE OLD POSTS ===\n");
  
  // Delete posts with scheduled_date on or before March 31, 2026
  const cutoffDate = "2026-03-31T23:59:59Z";
  
  // First count how many will be deleted
  const { count } = await sb
    .from("social_posts")
    .select("*", { count: "exact", head: true })
    .lte("scheduled_date", cutoffDate);
  
  console.log(`Posts to delete (scheduled on or before March 31, 2026): ${count}`);
  
  if (count && count > 0) {
    // Delete the posts
    const { error } = await sb
      .from("social_posts")
      .delete()
      .lte("scheduled_date", cutoffDate);
    
    if (error) {
      console.error("Error deleting posts:", error.message);
    } else {
      console.log(`Successfully deleted ${count} posts`);
    }
  } else {
    console.log("No posts to delete");
  }
  
  // Check remaining posts
  const { count: remaining } = await sb
    .from("social_posts")
    .select("*", { count: "exact", head: true });
  
  console.log(`\nRemaining posts: ${remaining}`);
}

main().catch(console.error);
