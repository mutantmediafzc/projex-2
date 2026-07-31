const path = require("path");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const requestedEmails = new Set([
  "yusha@mutant.ae",
  "rey@mutant.ae",
  "rome@mutant.ae",
  "jofredmaranon@gmail.com",
  "mac@mutant.ae",
  "xhq@mutant.ae",
  "dataintern@mutant.ae",
]);

async function listAllAuthUsers() {
  const users = [];
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < perPage) return users;
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const authUsers = await listAllAuthUsers();
  const { data: inactiveRows, error } = await supabase
    .from("users")
    .select("id, email, full_name, designation, is_active")
    .eq("is_active", false);

  if (error) throw error;

  const inactiveIds = new Set(inactiveRows.map((row) => row.id));
  const targets = authUsers.filter((user) => {
    const email = (user.email || "").toLowerCase();
    return requestedEmails.has(email) || inactiveIds.has(user.id);
  });
  const foundRequested = new Set(
    targets
      .map((user) => (user.email || "").toLowerCase())
      .filter((email) => requestedEmails.has(email)),
  );
  const missingRequested = [...requestedEmails].filter(
    (email) => !foundRequested.has(email),
  );

  console.log(`${apply ? "Applying" : "Dry run"}: ${targets.length} account(s)`);
  for (const user of targets) {
    const meta = user.user_metadata || {};
    const reasons = [];
    if (requestedEmails.has((user.email || "").toLowerCase())) reasons.push("requested");
    if (inactiveIds.has(user.id)) reasons.push("inactive");
    console.log(
      `${user.id} | ${user.email || "(no email)"} | ${[meta.first_name, meta.last_name].filter(Boolean).join(" ") || "(unnamed)"} | ${reasons.join("+")}`,
    );
  }

  if (missingRequested.length) {
    console.log(`Not found: ${missingRequested.join(", ")}`);
  }

  if (!apply) return;

  let deleted = 0;
  for (const user of targets) {
    const { error: profileDeleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", user.id);
    if (profileDeleteError) {
      console.error(
        `FAILED PROFILE | ${user.email || user.id} | ${profileDeleteError.message} | ${profileDeleteError.details || ""}`,
      );
      continue;
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error(`FAILED | ${user.email || user.id} | ${deleteError.message}`);
      continue;
    }
    deleted += 1;
    console.log(`DELETED | ${user.email || user.id}`);
  }

  console.log(`Deleted ${deleted}/${targets.length} account(s).`);
  if (deleted !== targets.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
