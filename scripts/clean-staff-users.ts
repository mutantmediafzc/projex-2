import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Reassign tasks from Reymar duplicate to the kept account
  const oldReymarId = "90d12daf-59c6-440c-84f2-cbca6142cfa3"; // rey@mutant.ae
  const newReymarId = "cb302cc6-9d4b-4534-afa7-0cf92e8d6206"; // reymar@mutant.ae

  console.log("Reassigning tasks from duplicate Reymar...");
  const { error: taskError } = await supabase
    .from("tasks")
    .update({ assigned_user_id: newReymarId })
    .eq("assigned_user_id", oldReymarId);
  
  if (taskError) {
    console.error("Failed to reassign tasks:", taskError.message);
  } else {
    console.log("✓ Tasks reassigned");
  }

  // Now delete the duplicate
  console.log("\nDeleting duplicate Reymar...");
  const { error: delError } = await supabase
    .from("users")
    .delete()
    .eq("id", oldReymarId);

  if (delError) {
    console.error("Failed to delete:", delError.message);
  } else {
    console.log("✓ Deleted duplicate Reymar");
  }

  console.log("\n\nRemaining users:");
  console.log("=================");
  
  const { data: users } = await supabase
    .from("users")
    .select("id, full_name, email")
    .order("full_name", { ascending: true });

  for (const user of users || []) {
    console.log(`- ${user.full_name} (${user.email})`);
  }
  
  console.log(`\nTotal: ${users?.length || 0} users`);
}

main().catch(console.error);
