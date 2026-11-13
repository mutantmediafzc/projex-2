"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import RequireAdmin from "@/components/RequireAdmin";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  formatDuration,
  gstDateString,
  type ActivityReport,
  type ActivitySettings,
  type LiveRow,
  type LiveState,
} from "@/lib/activityTracking";

type Tab = "live" | "reports" | "settings";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabaseClient.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(path, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body as T;
}

const STATE_STYLE: Record<LiveState, { label: string; dot: string; pill: string }> = {
  active: { label: "Active", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  idle: { label: "Idle", dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700 ring-amber-200" },
  tracker_offline: { label: "Tracker offline", dot: "bg-rose-500", pill: "bg-rose-50 text-rose-700 ring-rose-200" },
  checked_out: { label: "Checked out", dot: "bg-slate-300", pill: "bg-slate-50 text-slate-500 ring-slate-200" },
};

function timeOf(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function Initials({ name }: { name: string }) {
  const parts = name.split(" ").filter(Boolean);
  const initials = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 text-[11px] font-bold text-white">
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live tab
// ---------------------------------------------------------------------------
function LiveTab({ onOpenReport }: { onOpenReport: (userId: string) => void }) {
  const [rows, setRows] = useState<LiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "checked_in">("checked_in");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const body = await api<{ rows: LiveRow[] }>("/api/activity/admin/live");
      setRows(body.rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load live activity");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30 * 1000);
    return () => clearInterval(t);
  }, [load]);

  async function forceCheckOut(userId: string, name: string) {
    if (!window.confirm(`Check out ${name}? Their session will close at the tracker's last activity.`)) return;
    try {
      await api("/api/activity/admin/check-out", { method: "POST", body: JSON.stringify({ user_id: userId }) });
      load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not check out");
    }
  }

  const counts = useMemo(() => {
    const c: Record<LiveState, number> = { active: 0, idle: 0, tracker_offline: 0, checked_out: 0 };
    rows.forEach((r) => (c[r.state] += 1));
    return c;
  }, [rows]);

  const visible = rows.filter((r) => {
    if (filter === "checked_in" && r.state === "checked_out") return false;
    if (search && !`${r.full_name} ${r.email ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(Object.keys(STATE_STYLE) as LiveState[]).map((state) => (
          <div key={state} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              <span className={`h-2 w-2 rounded-full ${STATE_STYLE[state].dot}`} />
              {STATE_STYLE[state].label}
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{counts[state]}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search team member"
          className="h-9 w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400"
        />
        <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-medium">
          {(["checked_in", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 ${filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            >
              {f === "checked_in" ? "Checked in" : "Everyone"}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[11px] text-slate-400">Refreshes every 30 seconds</span>
      </div>

      {error ? <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Team member</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">On screen now</th>
              <th className="px-4 py-3 font-medium">Checked in</th>
              <th className="px-4 py-3 font-medium">Active today</th>
              <th className="px-4 py-3 font-medium">Idle today</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">Loading...</td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  {filter === "checked_in" ? "Nobody is checked in right now." : "No team members found."}
                </td>
              </tr>
            ) : (
              visible.map((r) => {
                const style = STATE_STYLE[r.state];
                const total = r.today_active_seconds + r.today_idle_seconds;
                return (
                  <tr key={r.user_id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Initials name={r.full_name} />
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-800">{r.full_name}</div>
                          <div className="truncate text-[11px] text-slate-400">{r.designation || r.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${style.pill}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                        {style.label}
                      </span>
                    </td>
                    <td className="max-w-[280px] px-4 py-3">
                      {r.session && r.state !== "tracker_offline" ? (
                        <>
                          <div className="truncate font-medium text-slate-700">{r.session.current_app || "-"}</div>
                          <div className="truncate text-[11px] text-slate-400" title={r.session.current_title ?? ""}>
                            {r.session.current_title || r.session.current_domain || ""}
                          </div>
                        </>
                      ) : r.state === "tracker_offline" ? (
                        <span className="text-[12px] text-rose-500">
                          {r.session?.last_heartbeat_at ? `Last seen ${timeOf(r.session.last_heartbeat_at)}` : "Tracker never connected"}
                        </span>
                      ) : (
                        <span className="text-[12px] text-slate-400">
                          {r.last_checkout_at ? `Checked out ${timeOf(r.last_checkout_at)}` : "-"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.session ? timeOf(r.session.checked_in_at) : "-"}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{formatDuration(r.today_active_seconds)}</div>
                      {total > 0 ? <div className="text-[11px] text-emerald-600">{pct(r.today_active_seconds, total)}% active</div> : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDuration(r.today_idle_seconds)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenReport(r.user_id)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Report
                        </button>
                        {r.session ? (
                          <button
                            type="button"
                            onClick={() => forceCheckOut(r.user_id, r.full_name)}
                            className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                          >
                            Check out
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reports tab
// ---------------------------------------------------------------------------
function ReportsTab({ initialUserId }: { initialUserId: string | null }) {
  const [users, setUsers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [userId, setUserId] = useState<string | null>(initialUserId);
  const [date, setDate] = useState(gstDateString());
  const [report, setReport] = useState<ActivityReport | null>(null);
  // Key of the last finished request, so loading is derived instead of set in an effect.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const requestKey = userId ? `${userId}|${date}` : null;
  const loading = requestKey !== null && requestKey !== loadedKey;

  useEffect(() => {
    api<{ rows: LiveRow[] }>("/api/activity/admin/live")
      .then((body) => {
        const list = body.rows.map((r) => ({ id: r.user_id, full_name: r.full_name })).sort((a, b) => a.full_name.localeCompare(b.full_name));
        setUsers(list);
        setUserId((current) => current ?? list[0]?.id ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load team members"));
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const key = `${userId}|${date}`;
    api<ActivityReport>(`/api/activity/admin/report?userId=${encodeURIComponent(userId)}&date=${date}`)
      .then((body) => {
        if (cancelled) return;
        setReport(body);
        setError(null);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Could not load report"))
      .finally(() => !cancelled && setLoadedKey(key));
    return () => {
      cancelled = true;
    };
  }, [userId, date]);

  const t = report?.totals;
  const maxHour = report ? Math.max(1, ...report.hourly.map((h) => h.active_seconds + h.idle_seconds)) : 1;
  const firstHour = report?.hourly.findIndex((h) => h.active_seconds + h.idle_seconds > 0) ?? -1;
  const lastHour = report ? 23 - [...report.hourly].reverse().findIndex((h) => h.active_seconds + h.idle_seconds > 0) : -1;
  const hours = report && firstHour >= 0 ? report.hourly.slice(Math.min(firstHour, 8), Math.max(lastHour, 18) + 1) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={userId ?? ""}
          onChange={(e) => setUserId(e.target.value)}
          className="h-9 min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          max={gstDateString()}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400"
        />
        <span className="text-[11px] text-slate-400">Times shown in your local time. Days follow GST.</span>
      </div>

      {error ? <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
      {loading && !report ? <div className="py-10 text-center text-slate-400">Loading report...</div> : null}

      {report && t ? (
        <div className={`space-y-4 ${loading ? "opacity-60" : ""}`}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Checked in", value: t.worked_seconds, tone: "text-slate-900" },
              { label: "Active", value: t.active_seconds, tone: "text-emerald-600" },
              { label: "Idle", value: t.idle_seconds, tone: "text-amber-600" },
              { label: "Tracker not running", value: t.untracked_seconds, tone: "text-rose-600" },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{card.label}</div>
                <div className={`mt-1 text-2xl font-bold ${card.tone}`}>{formatDuration(card.value)}</div>
                {card.label !== "Checked in" && t.worked_seconds > 0 ? (
                  <div className="text-[11px] text-slate-400">{pct(card.value, t.worked_seconds)}% of checked-in time</div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800">Sessions</h3>
            {report.sessions.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">No check-in on this day.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {report.sessions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-x-3">
                    <span className="font-medium text-slate-800">
                      {timeOf(s.checked_in_at)} to {s.checked_out_at ? timeOf(s.checked_out_at) : "now"}
                    </span>
                    <span className="text-[12px] text-slate-400">
                      {s.checkout_reason === "auto_stale"
                        ? "Closed automatically (no check-out)"
                        : s.checkout_reason === "admin"
                          ? "Checked out by admin"
                          : s.checked_out_at
                            ? "Checked out"
                            : "In progress"}
                      {s.agent_device ? ` · ${s.agent_device}${s.agent_os ? ` (${s.agent_os})` : ""}` : " · Tracker never connected"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {hours.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Hour by hour (GST)</h3>
                <div className="flex gap-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" />Active</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-400" />Idle</span>
                </div>
              </div>
              <div className="mt-3 flex h-32 items-end gap-1">
                {hours.map((h) => (
                  <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="flex w-full flex-col justify-end overflow-hidden rounded-md bg-slate-50"
                      style={{ height: "100px" }}
                      title={`${h.hour}:00 · Active ${formatDuration(h.active_seconds)} · Idle ${formatDuration(h.idle_seconds)}`}
                    >
                      <div className="w-full bg-amber-400" style={{ height: `${(h.idle_seconds / maxHour) * 100}%` }} />
                      <div className="w-full bg-emerald-500" style={{ height: `${(h.active_seconds / maxHour) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400">{h.hour}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800">Apps used (active time)</h3>
              {report.apps.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">No activity recorded.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {report.apps.slice(0, 15).map((app) => (
                    <li key={app.app_name}>
                      <details>
                        <summary className="cursor-pointer list-none">
                          <div className="flex items-center justify-between text-sm">
                            <span className="truncate font-medium text-slate-700">{app.app_name}</span>
                            <span className="shrink-0 text-slate-500">
                              {formatDuration(app.seconds)} · {pct(app.seconds, t.active_seconds)}%
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct(app.seconds, report.apps[0].seconds)}%` }} />
                          </div>
                        </summary>
                        {app.top_titles.length ? (
                          <ul className="mt-2 space-y-1 border-l-2 border-slate-100 pl-3">
                            {app.top_titles.map((title) => (
                              <li key={title.title} className="flex justify-between gap-3 text-[12px] text-slate-500">
                                <span className="truncate" title={title.title}>{title.title}</span>
                                <span className="shrink-0">{formatDuration(title.seconds)}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800">Websites (active time)</h3>
              {report.domains.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">
                  No websites recorded. Website addresses are captured on Mac. On Windows, browser tab titles appear under the browser in Apps used.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {report.domains.map((d) => (
                    <li key={d.domain} className="flex justify-between text-sm">
                      <span className="truncate text-slate-700">{d.domain}</span>
                      <span className="text-slate-500">{formatDuration(d.seconds)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {report.screenshots.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800">Screenshots ({report.screenshots.length})</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {report.screenshots.map((shot) => (
                  <button
                    key={shot.id}
                    type="button"
                    onClick={() => shot.url && setPreview(shot.url)}
                    className="group overflow-hidden rounded-xl border border-slate-200 text-left"
                  >
                    {shot.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={shot.url} alt={`Screenshot at ${timeOf(shot.captured_at)}`} className="aspect-video w-full object-cover" />
                    ) : (
                      <div className="aspect-video w-full bg-slate-100" />
                    )}
                    <div className="p-2 text-[11px]">
                      <div className="font-semibold text-slate-700">{timeOf(shot.captured_at)}</div>
                      <div className="truncate text-slate-400">{shot.app_name || ""}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800">Timeline (latest first)</h3>
            {report.timeline.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">No activity recorded.</p>
            ) : (
              <ul className="mt-3 max-h-[480px] divide-y divide-slate-50 overflow-y-auto">
                {report.timeline.map((seg) => (
                  <li key={seg.started_at} className="flex items-start gap-3 py-2 text-sm">
                    <span className="w-24 shrink-0 text-[12px] text-slate-400">
                      {timeOf(seg.started_at)} to {timeOf(seg.ended_at)}
                    </span>
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${seg.is_idle ? "bg-amber-400" : "bg-emerald-500"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-slate-700">
                        {seg.is_idle ? `Idle (${seg.app_name})` : seg.app_name}
                      </div>
                      {seg.window_title ? (
                        <div className="truncate text-[12px] text-slate-400" title={seg.window_title}>{seg.window_title}</div>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-[12px] text-slate-500">{formatDuration(seg.duration_seconds)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {preview ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/80 p-4" onClick={() => setPreview(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Screenshot" className="max-h-full max-w-full rounded-xl shadow-2xl" />
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings tab
// ---------------------------------------------------------------------------
function SettingsTab() {
  const [settings, setSettings] = useState<ActivitySettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    api<{ settings: ActivitySettings }>("/api/activity/admin/settings")
      .then((body) => setSettings(body.settings))
      .catch((err) => setMessage({ tone: "error", text: err instanceof Error ? err.message : "Could not load settings" }));
  }, []);

  async function save(extra?: Record<string, unknown>) {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const before = settings.policy_version;
      const body = await api<{ settings: ActivitySettings }>("/api/activity/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ ...settings, ...extra }),
      });
      setSettings(body.settings);
      setMessage({
        tone: "ok",
        text:
          body.settings.policy_version !== before
            ? "Saved. Because more data will now be collected, every team member must accept the updated notice in the tracker app before tracking continues."
            : "Settings saved. Tracker apps pick up changes within a minute.",
      });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Could not save settings" });
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return message ? <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{message.text}</div> : <div className="py-10 text-center text-slate-400">Loading...</div>;
  }

  const set = <K extends keyof ActivitySettings>(key: K, value: ActivitySettings[K]) => setSettings({ ...settings, [key]: value });

  const toggle = (key: "capture_window_titles" | "screenshots_enabled" | "screenshot_blur", label: string, help: string) => (
    <label className="flex items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        <span className="block text-[12px] text-slate-500">{help}</span>
      </span>
      <input type="checkbox" checked={settings[key]} onChange={(e) => set(key, e.target.checked)} className="mt-1 h-4 w-4 accent-violet-600" />
    </label>
  );

  const number = (key: "idle_threshold_seconds" | "screenshot_interval_minutes" | "retention_days", label: string, help: string, min: number, max: number, unit: string) => (
    <label className="flex items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        <span className="block text-[12px] text-slate-500">{help}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <input
          type="number"
          min={min}
          max={max}
          value={key === "idle_threshold_seconds" ? Math.round(settings[key] / 60) : settings[key]}
          onChange={(e) => set(key, key === "idle_threshold_seconds" ? Number(e.target.value) * 60 : Number(e.target.value))}
          className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-violet-400"
        />
        <span className="text-[12px] text-slate-500">{unit}</span>
      </span>
    </label>
  );

  return (
    <div className="max-w-2xl space-y-4">
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
        {number("idle_threshold_seconds", "Idle after", "No keyboard or mouse input for this long counts as idle.", 1, 60, "minutes")}
        {toggle("capture_window_titles", "Record window titles", "Stores titles such as \"Chrome: Meta Ads Manager\". Off means app names only.")}
        {toggle("screenshots_enabled", "Take screenshots", "Captures the screen at a set interval while the person is active.")}
        {settings.screenshots_enabled ? (
          <>
            {number("screenshot_interval_minutes", "Screenshot every", "How often a screenshot is taken.", 1, 120, "minutes")}
            {toggle("screenshot_blur", "Blur screenshots", "Blurred on the user's PC before upload, so text such as chats or patient details cannot be read. Recommended.")}
          </>
        ) : null}
        {number("retention_days", "Keep data for", "Activity and screenshots older than this are deleted automatically.", 7, 730, "days")}
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[12px] text-amber-800">
        Staff must accept the monitoring notice in the tracker app before anything is recorded. Notice version:{" "}
        <strong>{settings.policy_version}</strong>. Turning on screenshots or window titles, or turning off blur,
        issues a new version automatically so everyone is asked again.
      </div>

      {message ? (
        <div className={`rounded-xl p-3 text-sm ${message.tone === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{message.text}</div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => save()}
          disabled={saving}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save settings"}
        </button>
        <button
          type="button"
          onClick={() => window.confirm("Ask every team member to accept the monitoring notice again?") && save({ bump_policy_version: true })}
          disabled={saving}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          Ask everyone to re-accept notice
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ActivityMonitorPage() {
  const [tab, setTab] = useState<Tab>("live");
  const [reportUserId, setReportUserId] = useState<string | null>(null);

  return (
    <RequireAdmin>
      <div className="space-y-5 pb-20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Activity Monitor</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              What the team has on screen and whether they are active, between CRM check-in and check-out.
            </p>
          </div>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm font-medium">
            {(
              [
                ["live", "Live"],
                ["reports", "Reports"],
                ["settings", "Settings"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-lg px-4 py-1.5 ${tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === "live" ? (
          <LiveTab
            onOpenReport={(id) => {
              setReportUserId(id);
              setTab("reports");
            }}
          />
        ) : null}
        {tab === "reports" ? <ReportsTab initialUserId={reportUserId} /> : null}
        {tab === "settings" ? <SettingsTab /> : null}
      </div>
    </RequireAdmin>
  );
}
