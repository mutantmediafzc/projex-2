require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const shouldApply = process.argv.includes("--apply");

const targets = [
  {
    fullName: "Majd Saleh",
    leaveType: "sick",
    startDate: "2026-08-04",
    endDate: "2026-08-04",
    daysCount: 1,
    status: "approved",
  },
  {
    fullName: "Ralf Jovenal",
    leaveType: "annual",
    startDate: "2026-08-02",
    endDate: "2026-08-02",
    daysCount: 1,
    status: "rejected",
  },
  {
    fullName: "Majd Saleh",
    leaveType: "annual",
    startDate: "2026-07-31",
    endDate: "2026-08-03",
    daysCount: 4,
    status: "approved",
  },
];

async function findTarget(target) {
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id, full_name, email, annual_leave_used, sick_leave_used")
    .eq("full_name", target.fullName);
  if (userError) throw userError;
  if (users.length !== 1) {
    throw new Error(`Expected exactly one user named ${target.fullName}; found ${users.length}.`);
  }

  const user = users[0];
  const { data: leaves, error: leaveError } = await supabase
    .from("leaves")
    .select("*")
    .eq("user_id", user.id)
    .eq("leave_type", target.leaveType)
    .eq("start_date", target.startDate)
    .eq("end_date", target.endDate)
    .eq("status", target.status);
  if (leaveError) throw leaveError;

  const exactLeaves = leaves.filter((leave) => Number(leave.days_count) === target.daysCount);
  if (exactLeaves.length !== 1) {
    throw new Error(
      `Expected exactly one ${target.status} ${target.leaveType} record for ${target.fullName} ` +
      `${target.startDate} to ${target.endDate}; found ${exactLeaves.length}.`,
    );
  }

  return { user, leave: exactLeaves[0] };
}

async function main() {
  const matches = [];
  for (const target of targets) matches.push(await findTarget(target));

  console.table(matches.map(({ user, leave }) => ({
    id: leave.id,
    employee: user.full_name,
    email: user.email,
    type: leave.leave_type,
    dates: `${leave.start_date} to ${leave.end_date}`,
    days: Number(leave.days_count),
    status: leave.status,
  })));

  if (!shouldApply) {
    console.log("Dry run only. Re-run with --apply to delete these records and refund approved leave.");
    return;
  }

  for (const { user, leave } of matches) {
    const { error: deleteError } = await supabase.from("leaves").delete().eq("id", leave.id);
    if (deleteError) throw deleteError;

    if (leave.status !== "approved") continue;

    const balanceColumn = leave.leave_type === "annual"
      ? "annual_leave_used"
      : leave.leave_type === "sick"
        ? "sick_leave_used"
        : null;
    if (!balanceColumn) throw new Error(`Unsupported approved leave type: ${leave.leave_type}`);

    const newUsedBalance = Math.max(0, Number(user[balanceColumn] || 0) - Number(leave.days_count));
    const { error: refundError } = await supabase
      .from("users")
      .update({ [balanceColumn]: newUsedBalance })
      .eq("id", user.id);
    if (refundError) throw refundError;

    user[balanceColumn] = newUsedBalance;
    console.log(`Refunded ${leave.days_count} ${leave.leave_type} day(s) to ${user.full_name}.`);
  }

  for (const target of targets) {
    try {
      await findTarget(target);
      throw new Error(`Verification failed: target record still exists for ${target.fullName}.`);
    } catch (error) {
      if (!String(error.message).includes("found 0")) throw error;
    }
  }

  const userIds = [...new Set(matches.map(({ user }) => user.id))];
  const { data: balances, error: balanceError } = await supabase
    .from("users")
    .select("id, full_name, email, annual_leave_used, sick_leave_used")
    .in("id", userIds);
  if (balanceError) throw balanceError;
  console.table(balances);
  console.log("Deleted all three leave records and verified their removal.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
