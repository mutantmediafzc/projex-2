"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { isQaAdminEmail } from "@/lib/qaTracking";

export function useQaAccess() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabaseClient.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setAllowed(isQaAdminEmail(data.user?.email));
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const authFetch = useCallback(async (url: string, init?: RequestInit) => {
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    return fetch(url, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }, []);

  return { loading, allowed, authFetch };
}

export function formatQaDate(value: string | null | undefined, withTime = true): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}
