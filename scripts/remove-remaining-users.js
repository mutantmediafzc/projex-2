const path = require("path");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const targets = [
  { id: "c341f6f2-67ac-4968-b4c7-f3d10b22c926", email: "jofredmaranon@gmail.com" },
  { id: "cb302cc6-9d4b-4534-afa7-0cf92e8d6206", email: "reymar@mutant.ae" },
  { id: "caabbbe4-ec58-4bb9-8086-02190f38b5db", email: "corbine@mutant.ae" },
];

async function main() {
  for (const target of targets) {
    const { count, error: countError } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("assigned_user_id", target.id);
    if (countError) throw countError;
    console.log(`${target.email}: preserving ${count || 0} assigned task(s)`);
  }

  if (!process.argv.includes("--apply")) return;

  for (const target of targets) {
    const { error: taskError } = await supabase
      .from("tasks")
      .update({ assigned_user_id: null })
      .eq("assigned_user_id", target.id);
    if (taskError) throw taskError;

    const { error: profileError } = await supabase
      .from("users")
      .delete()
      .eq("id", target.id);
    if (profileError) throw profileError;

    const { error: authError } = await supabase.auth.admin.deleteUser(target.id);
    if (authError) throw authError;

    console.log(`Deleted ${target.email}`);
  }

  const { data: authData, error: authListError } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authListError) throw authListError;

  const remainingTargetEmails = new Set(targets.map((target) => target.email));
  const leftovers = authData.users.filter((user) =>
    remainingTargetEmails.has((user.email || "").toLowerCase())
  );
  const wilson = authData.users.find(
    (user) => (user.email || "").toLowerCase() === "wilson@mutant.ae",
  );

  console.log(`Verification: ${leftovers.length} deleted account(s) still present`);
  console.log(`Verification: Wilson account ${wilson ? "retained" : "NOT FOUND"}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
