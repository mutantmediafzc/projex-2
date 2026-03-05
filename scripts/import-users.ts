/**
 * Import users from CSV and assign tasks to users
 * 
 * This script:
 * 1. Reads users from CSV
 * 2. Checks existing users in database
 * 3. Creates missing users via Supabase Auth with password = firstnametest
 * 4. Updates tasks with proper user assignments
 * 
 * Usage: npx tsx scripts/import-users.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load env
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// CSV Parser
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx];
      });
      rows.push(row);
    }
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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

interface CSVUser {
  ID: string;
  userFirstName: string;
  userLastName: string;
  email: string;
  loginEmail: string;
  jobtitle: string;
  active: string;
  userAccess: string;
}

// Map old user ID to new user ID
const userIdMapping = new Map<string, string>();

async function importUsers() {
  console.log("=".repeat(60));
  console.log("STEP 1: Loading Users from CSV");
  console.log("=".repeat(60));

  const csvPath = path.join(__dirname, "../public/Users/Users.csv");
  const csvContent = fs.readFileSync(csvPath, "utf8");
  const usersCSV = parseCSV(csvContent) as unknown as CSVUser[];

  console.log(`Found ${usersCSV.length} users in CSV\n`);

  // Get existing users from database
  console.log("=".repeat(60));
  console.log("STEP 2: Checking Existing Users in Database");
  console.log("=".repeat(60));

  const { data: existingUsers, error: fetchError } = await supabase
    .from("users")
    .select("id, email, full_name");

  if (fetchError) {
    console.error("Failed to fetch existing users:", fetchError.message);
    process.exit(1);
  }

  // Build email -> user ID map for existing users
  const existingEmailToId = new Map<string, string>();
  for (const user of existingUsers || []) {
    if (user.email) {
      existingEmailToId.set(user.email.toLowerCase(), user.id);
    }
  }

  console.log(`Found ${existingUsers?.length || 0} existing users in database\n`);

  // Process users
  console.log("=".repeat(60));
  console.log("STEP 3: Creating Missing Users");
  console.log("=".repeat(60));

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const csvUser of usersCSV) {
    const email = (csvUser.loginEmail || csvUser.email || "").trim().toLowerCase();
    const firstName = (csvUser.userFirstName || "").trim();
    const lastName = (csvUser.userLastName || "").trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const oldId = csvUser.ID;

    if (!email) {
      console.log(`Skipping user without email: ${fullName}`);
      skipped++;
      continue;
    }

    // Check if user already exists
    const existingId = existingEmailToId.get(email);
    if (existingId) {
      console.log(`User already exists: ${email} -> ${existingId}`);
      userIdMapping.set(oldId, existingId);
      skipped++;
      continue;
    }

    // Generate password: firstnametest (lowercase)
    const password = `${firstName.toLowerCase().replace(/\s+/g, "")}test`;

    try {
      // Create user via Supabase Auth Admin API
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Skip email confirmation
        user_metadata: {
          full_name: fullName,
        },
      });

      if (authError) {
        console.error(`Failed to create auth user ${email}:`, authError.message);
        errors++;
        continue;
      }

      const newUserId = authData.user.id;

      // Determine role based on userAccess
      let role = "staff";
      const accessLower = (csvUser.userAccess || "").toLowerCase();
      if (accessLower.includes("admin")) {
        role = "admin";
      }

      // Insert into users table
      const { error: insertError } = await supabase.from("users").insert({
        id: newUserId,
        email,
        full_name: fullName,
        designation: csvUser.jobtitle || null,
        role,
      });

      if (insertError) {
        console.error(`Failed to insert user record ${email}:`, insertError.message);
        errors++;
        continue;
      }

      userIdMapping.set(oldId, newUserId);
      console.log(`Created user: ${email} (${fullName}) with password: ${password}`);
      created++;
    } catch (err: any) {
      console.error(`Error creating user ${email}:`, err.message);
      errors++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("USER CREATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Created: ${created}`);
  console.log(`Skipped (already exists): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total mappings: ${userIdMapping.size}`);

  return userIdMapping;
}

async function updateTaskAssignments(userIdMapping: Map<string, string>) {
  console.log("\n" + "=".repeat(60));
  console.log("STEP 4: Loading Tasks from CSV");
  console.log("=".repeat(60));

  const tasksPath = path.join(__dirname, "../public/projex-data/Projects/Tasks+-+Projects.csv");
  const tasksContent = fs.readFileSync(tasksPath, "utf8");
  const tasksCSV = parseCSV(tasksContent);

  console.log(`Found ${tasksCSV.length} tasks in CSV\n`);

  // Get existing projects
  const { data: projects, error: projError } = await supabase
    .from("projects")
    .select("id, name");

  if (projError) {
    console.error("Failed to fetch projects:", projError.message);
    return;
  }

  const projectIds = new Set(projects?.map((p) => p.id) || []);
  console.log(`Found ${projects?.length || 0} projects in database\n`);

  // Get existing tasks
  const { data: existingTasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, name, project_id, assigned_user_id");

  if (tasksError) {
    console.error("Failed to fetch existing tasks:", tasksError.message);
    return;
  }

  console.log(`Found ${existingTasks?.length || 0} existing tasks in database`);

  // Build a map of task names + project IDs for matching
  const taskMap = new Map<string, string>();
  for (const task of existingTasks || []) {
    if (task.project_id) {
      const key = `${task.project_id}:${task.name}`;
      taskMap.set(key, task.id);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("STEP 5: Updating Task Assignments");
  console.log("=".repeat(60));

  let updated = 0;
  let notFound = 0;
  let noUser = 0;

  for (const csvTask of tasksCSV) {
    const oldUserId = csvTask.user;
    const projectId = csvTask.project;
    const taskName = csvTask.task;

    if (!oldUserId) {
      noUser++;
      continue;
    }

    const newUserId = userIdMapping.get(oldUserId);
    if (!newUserId) {
      console.log(`User mapping not found for: ${oldUserId}`);
      noUser++;
      continue;
    }

    // Try to find matching task by project and name
    if (projectId && projectIds.has(projectId)) {
      const key = `${projectId}:${taskName}`;
      const taskId = taskMap.get(key);

      if (taskId) {
        // Get user full name for assignment
        const { data: userData } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", newUserId)
          .single();

        const { error: updateError } = await supabase
          .from("tasks")
          .update({
            assigned_user_id: newUserId,
            assigned_user_name: userData?.full_name || null,
          })
          .eq("id", taskId);

        if (updateError) {
          console.error(`Failed to update task ${taskId}:`, updateError.message);
        } else {
          updated++;
        }
      } else {
        notFound++;
      }
    } else {
      notFound++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("TASK UPDATE SUMMARY");
  console.log("=".repeat(60));
  console.log(`Updated: ${updated}`);
  console.log(`Task not found: ${notFound}`);
  console.log(`No user mapping: ${noUser}`);
}

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("USER IMPORT & TASK ASSIGNMENT SCRIPT");
  console.log("=".repeat(60) + "\n");

  const mapping = await importUsers();
  await updateTaskAssignments(mapping);

  console.log("\n" + "=".repeat(60));
  console.log("IMPORT COMPLETED!");
  console.log("=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  });
