const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const targetIds = new Map([
  ["c341f6f2-67ac-4968-b4c7-f3d10b22c926", "jofredmaranon@gmail.com"],
  ["cb302cc6-9d4b-4534-afa7-0cf92e8d6206", "reymar@mutant.ae"],
  ["caabbbe4-ec58-4bb9-8086-02190f38b5db", "corbine@mutant.ae"],
  ["1b9b278b-0508-4bb5-84f0-977ee3063876", "mac@mutant.ae"],
  ["f5e5cba8-40a8-4ce2-b78b-4e7a436fd9b0", "wilson@mutant.ae"],
]);

function sqlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sqlFiles(full);
    return entry.name.endsWith(".sql") ? [full] : [];
  });
}

function discoverReferences() {
  const pairs = new Map();
  for (const file of sqlFiles(path.join(__dirname, "..", "supabase"))) {
    const sql = fs.readFileSync(file, "utf8");
    let table = null;
    for (const rawLine of sql.split(/\r?\n/)) {
      const line = rawLine.trim();
      const create = line.match(/^create table(?: if not exists)?\s+(?:public\.)?("?[\w]+"?)/i);
      if (create) table = create[1].replaceAll('"', "");
      if (table && /^\);?$/.test(line)) table = null;

      const alter = line.match(/^alter table(?: if exists)?\s+(?:public\.)?("?[\w]+"?).*add column(?: if not exists)?\s+("?[\w]+"?).*references\s+(?:public\.)?(?:auth\.)?users\s*\(id\)/i);
      if (alter) pairs.set(`${alter[1]}:${alter[2]}`.replaceAll('"', ""), {
        table: alter[1].replaceAll('"', ""),
        column: alter[2].replaceAll('"', ""),
      });

      if (table && /references\s+(?:public\.)?(?:auth\.)?users\s*\(id\)/i.test(line)) {
        const column = line.match(/^"?([\w]+)"?\s+/)?.[1];
        if (column) pairs.set(`${table}:${column}`, { table, column });
      }
    }
  }
  return [...pairs.values()];
}

function summarize(row) {
  const preferred = [
    "id", "title", "name", "full_name", "email", "content", "message",
    "status", "project_id", "task_id", "created_at",
  ];
  return Object.fromEntries(
    preferred
      .filter((key) => row[key] !== undefined)
      .map((key) => [key, typeof row[key] === "string" && row[key].length > 100
        ? `${row[key].slice(0, 100)}…`
        : row[key]]),
  );
}

async function main() {
  const results = [];
  for (const { table, column } of discoverReferences()) {
    for (const [id, email] of targetIds) {
      const { data, error, count } = await supabase
        .from(table)
        .select("*", { count: "exact" })
        .eq(column, id)
        .limit(20);

      if (error) continue;
      if (count) {
        results.push({ email, table, column, count, rows: data.map(summarize) });
      }
    }
  }
  if (process.argv.includes("--summary")) {
    console.log(JSON.stringify(results.map(({ email, table, column, count }) => ({
      email, table, column, count,
    })), null, 2));
  } else {
    console.log(JSON.stringify(results, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
