import { supabaseAdmin } from "@/lib/supabaseAdmin";

const GST_OFFSET_MS = 4 * 60 * 60 * 1000;

// Records the user's first check-in of the day (GST). Later calls on the same
// day are ignored, so the earliest time is kept for late tracking.
export async function logFirstAttendance(userId: string, now: Date = new Date()) {
  const gstNow = new Date(now.getTime() + GST_OFFSET_MS);
  const todayStr = gstNow.toISOString().slice(0, 10);
  const gstHour = gstNow.getUTCHours();
  const minutes = gstNow.getUTCMinutes();
  const isLate = gstHour > 9 || (gstHour === 9 && minutes >= 10);

  const { error } = await supabaseAdmin.from("attendance_logs").upsert(
    {
      user_id: userId,
      log_date: todayStr,
      first_available_at: now.toISOString(),
      is_late: isLate,
    },
    { onConflict: "user_id,log_date", ignoreDuplicates: true },
  );
  if (error) console.error("Failed to log attendance", error);
}
