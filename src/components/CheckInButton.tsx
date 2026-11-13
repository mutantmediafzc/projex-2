"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { formatDuration, isTrackerOnline, type WorkSession } from "@/lib/activityTracking";

const TRACKER_DOWNLOAD_URL = process.env.NEXT_PUBLIC_TRACKER_DOWNLOAD_URL || "";
const POLL_MS = 60 * 1000;

async function authedFetch(path: string, init?: RequestInit) {
  const { data } = await supabaseClient.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return fetch(path, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
}

export default function CheckInButton() {
  const [session, setSession] = useState<WorkSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await authedFetch("/api/activity/session");
      if (res.ok) {
        const body = await res.json();
        setSession(body.session ?? null);
      }
    } catch {
      // Not signed in yet; the header will re-render after login.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [load]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        setConfirmOut(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function checkIn() {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch("/api/activity/check-in", { method: "POST", body: JSON.stringify({ source: "crm" }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not check in");
      setSession(body.session);
      setNow(Date.now());
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check in");
      setOpen(true);
    } finally {
      setBusy(false);
    }
  }

  async function checkOut() {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch("/api/activity/check-out", { method: "POST", body: JSON.stringify({ source: "crm" }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not check out");
      setSession(null);
      setOpen(false);
      setConfirmOut(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check out");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-200/70" />;
  }

  if (!session) {
    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={checkIn}
          disabled={busy}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 text-[11px] font-semibold text-white shadow-sm shadow-emerald-500/30 transition-all hover:shadow-md active:scale-95 disabled:opacity-60"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          {busy ? "Checking in..." : "Check in"}
        </button>
        {open && error ? (
          <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-xl border border-rose-200 bg-white p-3 text-xs text-rose-600 shadow-lg">
            {error}
          </div>
        ) : null}
      </div>
    );
  }

  const elapsed = (now - new Date(session.checked_in_at).getTime()) / 1000;
  const online = isTrackerOnline(session, now);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200 transition-all hover:shadow-sm"
        title={online ? "Checked in, tracker connected" : "Checked in, tracker not running"}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span>{formatDuration(elapsed)}</span>
        {!online ? <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-label="Tracker not running" /> : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Checked in</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-800">
            {new Date(session.checked_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            <span className="ml-1.5 font-normal text-slate-500">({formatDuration(elapsed)} ago)</span>
          </div>

          <div
            className={`mt-3 rounded-lg px-2.5 py-2 text-[12px] ${
              online ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {online ? (
              <>Tracker connected{session.agent_device ? ` on ${session.agent_device}` : ""}.</>
            ) : (
              <>
                Tracker app is not running on your PC. Open <strong>Mutant CRM Tracker</strong> and sign in so your
                work time is recorded.
                {TRACKER_DOWNLOAD_URL ? (
                  <a href={TRACKER_DOWNLOAD_URL} className="mt-1 block font-semibold underline" target="_blank" rel="noreferrer">
                    Download the tracker
                  </a>
                ) : null}
              </>
            )}
          </div>

          {error ? <div className="mt-2 text-xs text-rose-600">{error}</div> : null}

          {confirmOut ? (
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-600">Check out now?</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setConfirmOut(false)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={checkOut}
                  disabled={busy}
                  className="rounded-lg bg-rose-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
                >
                  {busy ? "..." : "Check out"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmOut(true)}
              className="mt-3 w-full rounded-lg bg-slate-100 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-rose-500 hover:text-white"
            >
              Check out
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
