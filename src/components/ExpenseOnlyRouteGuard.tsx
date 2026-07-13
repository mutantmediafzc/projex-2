"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUserRole } from "@/app/profile/hooks/useUserRole";

export default function ExpenseOnlyRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, loading } = useUserRole();
  const isBlocked = role === "expense" && !pathname.startsWith("/financials");

  useEffect(() => {
    if (!loading && isBlocked) router.replace("/financials");
  }, [isBlocked, loading, router]);

  if (loading || isBlocked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
