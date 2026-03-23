import { supabaseAdmin } from "@/lib/supabaseAdmin";
import UsersPageClient from "./UsersPageClient";

// Disable caching for this page to always get fresh data
export const dynamic = "force-dynamic";
export const revalidate = 0;

type WorkStatus = "available" | "on_leave" | "wfh";

type UserRow = {
  id: string;
  email: string | null;
  role: string | null;
  firstName: string | null;
  lastName: string | null;
  designation: string | null;
  createdAt: string | null;
  work_status: WorkStatus | null;
  is_active?: boolean;
  avatar_url?: string | null;
};

async function getUsers(): Promise<UserRow[]> {
  // Get auth users
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 50,
  });

  if (error || !data?.users) {
    return [];
  }

  // Get user statuses and active status from database
  const userIds = data.users.map(u => u.id);
  const { data: statusData } = await supabaseAdmin
    .from("users")
    .select("id, work_status, is_active, avatar_url")
    .in("id", userIds);

  const statusMap = new Map<string, { work_status: WorkStatus; is_active: boolean; avatar_url: string | null }>();
  if (statusData) {
    statusData.forEach((row: any) => {
      statusMap.set(row.id, {
        work_status: row.work_status || "available",
        is_active: row.is_active !== false,
        avatar_url: row.avatar_url || null,
      });
    });
  }

  return data.users.map((user) => {
    const meta = (user.user_metadata || {}) as Record<string, unknown>;
    const dbData = statusMap.get(user.id);

    return {
      id: user.id,
      email: user.email ?? null,
      role: (meta["role"] as string) ?? null,
      firstName: (meta["first_name"] as string) ?? null,
      lastName: (meta["last_name"] as string) ?? null,
      designation: (meta["designation"] as string) ?? null,
      createdAt: (user as any).created_at ?? null,
      work_status: dbData?.work_status || "available",
      is_active: dbData?.is_active !== false,
      avatar_url: dbData?.avatar_url || null,
    };
  });
}

export default async function UsersPage() {
  const users = await getUsers();
  return <UsersPageClient users={users} />;
}
