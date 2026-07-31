const path = require("path");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const macUserId = "1b9b278b-0508-4bb5-84f0-977ee3063876";
const apply = process.argv.includes("--apply");

async function listFolder(bucketId, folder = "") {
  const entries = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(bucketId).list(folder, {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    entries.push(...data);
    if (data.length < 1000) break;
    offset += data.length;
  }

  const files = [];
  for (const entry of entries) {
    const objectPath = folder ? `${folder}/${entry.name}` : entry.name;
    if (entry.id === null) {
      files.push(...await listFolder(bucketId, objectPath));
    } else {
      files.push({ bucketId, path: objectPath, ...entry });
    }
  }
  return files;
}

async function main() {
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) throw bucketsError;

  const owned = [];
  for (const bucket of buckets) {
    const files = await listFolder(bucket.id);
    owned.push(...files.filter((file) =>
      file.owner_id === macUserId || file.owner === macUserId
    ));
  }

  console.log(`${apply ? "Applying" : "Dry run"}: ${owned.length} Mac-owned storage object(s)`);
  for (const file of owned) console.log(`${file.bucketId} | ${file.path}`);
  if (!apply) return;

  const referencesToClear = [
    ["tasks", "created_by_user_id"],
    ["tasks", "assigned_user_id"],
    ["task_comments", "author_user_id"],
    ["task_history", "changed_by_user_id"],
  ];
  for (const [table, column] of referencesToClear) {
    const { error } = await supabase
      .from(table)
      .update({ [column]: null })
      .eq(column, macUserId);
    if (error) throw error;
    console.log(`Cleared ${table}.${column}`);
  }

  const { error: creditsError } = await supabase
    .from("ws_credits")
    .delete()
    .eq("user_id", macUserId);
  if (creditsError) throw creditsError;
  console.log("Deleted Mac's WS-credit records");

  for (const bucket of buckets) {
    const paths = owned
      .filter((file) => file.bucketId === bucket.id)
      .map((file) => file.path);
    if (!paths.length) continue;
    const { error } = await supabase.storage.from(bucket.id).remove(paths);
    if (error) throw error;
    console.log(`Deleted ${paths.length} object(s) from ${bucket.id}`);
  }

  const { error: profileError } = await supabase
    .from("users")
    .delete()
    .eq("id", macUserId);
  if (profileError) throw profileError;
  console.log("Deleted Mac's user profile");

  const { error: deleteError } = await supabase.auth.admin.deleteUser(macUserId);
  if (deleteError) throw deleteError;
  console.log("Deleted mac@mutant.ae");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
