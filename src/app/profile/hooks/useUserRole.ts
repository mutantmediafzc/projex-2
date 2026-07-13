"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

export type UserRole = "employee" | "admin" | "hr" | "staff" | "expense" | null;

interface UseUserRoleResult {
  role: UserRole;
  hasExpenseAccess: boolean;
  userId: string | null;
  loading: boolean;
}

export function useUserRole(): UseUserRoleResult {
  const [role, setRole] = useState<UserRole>(null);
  const [hasExpenseAccess, setHasExpenseAccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchUserRole() {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (!isMounted) return;

        if (!user) {
          setRole(null);
          setUserId(null);
          setLoading(false);
          return;
        }

        setUserId(user.id);

        // Check user metadata for role
        const meta = (user.user_metadata || {}) as Record<string, unknown>;
        const metaRole = (meta["role"] as string)?.toLowerCase();
        const expenseAccess = meta["expense_access"] === true || metaRole === "expense";
        setHasExpenseAccess(expenseAccess);

        if (metaRole === "admin" || metaRole === "hr" || metaRole === "expense") {
          // Legacy expense roles were created by replacing admin. Treat them as
          // admins while expense_access remains an additional permission.
          setRole(metaRole === "expense" ? "admin" : metaRole as UserRole);
        } else {
          // Fallback: check users table for role
          const { data: dbUser } = await supabaseClient
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

          const dbRole = (dbUser?.role as string)?.toLowerCase();
          if (dbRole === "admin" || dbRole === "hr" || dbRole === "expense") {
            setRole(dbRole === "expense" ? "admin" : dbRole as UserRole);
            if (dbRole === "expense") setHasExpenseAccess(true);
          } else {
            // Default to employee
            setRole("employee");
          }
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setRole("employee");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchUserRole();

    return () => {
      isMounted = false;
    };
  }, []);

  return { role, hasExpenseAccess, userId, loading };
}
