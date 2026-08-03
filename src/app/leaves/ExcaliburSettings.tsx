"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type Person = { id: string; full_name: string | null; email: string | null };
type Member = { user_id: string; user: Person | null };
type ExcaliburPolicy = {
  excaliburAnnualTotal: number;
  excaliburSickTotal: number;
};

async function token() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session?.access_token || null;
}

export default function ExcaliburSettings() {
  const [users, setUsers] = useState<Person[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [policy, setPolicy] = useState<ExcaliburPolicy>({
    excaliburAnnualTotal: 25,
    excaliburSickTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const accessToken = await token();
    if (!accessToken) return;
    const [membersResponse, settingsResponse] = await Promise.all([
      fetch("/api/leaves/excalibur", { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch("/api/leaves/settings", { headers: { Authorization: `Bearer ${accessToken}` } }),
    ]);
    const [membersData, settingsData] = await Promise.all([membersResponse.json(), settingsResponse.json()]);
    if (!membersResponse.ok || !settingsResponse.ok) {
      setMessage({ type: "error", text: membersData.error || settingsData.error || "Failed to load Excalibur." });
    } else {
      setUsers(membersData.users || []);
      setMembers(membersData.members || []);
      setPolicy({
        excaliburAnnualTotal: settingsData.settings.excalibur_annual_total,
        excaliburSickTotal: settingsData.settings.excalibur_sick_total,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const availableUsers = useMemo(() => {
    const ids = new Set(members.map((member) => member.user_id));
    return users.filter((user) => !ids.has(user.id));
  }, [members, users]);

  async function api(path: string, init: RequestInit) {
    const accessToken = await token();
    if (!accessToken) throw new Error("You must be signed in.");
    const response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to update Excalibur.");
  }

  async function savePolicy(event: React.FormEvent) {
    event.preventDefault();
    setBusy("policy");
    setMessage(null);
    try {
      await api("/api/leaves/settings", { method: "PUT", body: JSON.stringify(policy) });
      setMessage({ type: "success", text: "Excalibur leave allowance saved for all members." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to save policy." });
    } finally { setBusy(null); }
  }

  async function addMember() {
    if (!selectedUserId) return;
    setBusy("add");
    try {
      await api("/api/leaves/excalibur", { method: "POST", body: JSON.stringify({ userId: selectedUserId }) });
      setSelectedUserId("");
      await load();
      setMessage({ type: "success", text: "User added to Excalibur and assigned the shared allowance." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to add user." });
    } finally { setBusy(null); }
  }

  async function removeMember(userId: string) {
    setBusy(userId);
    try {
      await api(`/api/leaves/excalibur?userId=${encodeURIComponent(userId)}`, { method: "DELETE" });
      setMembers((current) => current.filter((member) => member.user_id !== userId));
      setMessage({ type: "success", text: "User removed from Excalibur." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to remove user." });
    } finally { setBusy(null); }
  }

  if (loading) return <p className="mt-6 border-t border-slate-200 py-8 text-center text-sm text-slate-500">Loading Excalibur...</p>;

  const fields = [
    ["excaliburAnnualTotal", "Annual leave"],
    ["excaliburSickTotal", "Sick leave"],
  ] as const;

  return (
    <section className="mt-6 border-t border-slate-200 pt-6">
      <h3 className="text-base font-semibold text-slate-900">Excalibur</h3>
      <p className="mt-1 text-sm text-slate-500">Every Excalibur member receives the same fixed leave allowance.</p>

      <form onSubmit={savePolicy} className="mt-5 grid gap-4 rounded-xl border border-violet-200 bg-violet-50/50 p-4 lg:grid-cols-[repeat(2,1fr)_auto] lg:items-end">
        {fields.map(([key, label]) => (
          <label key={key}>
            <span className="text-xs font-medium text-slate-700">{label}</span>
            <input type="number" min="0" max="999" step="0.5" value={policy[key]} onChange={(event) => setPolicy((current) => ({ ...current, [key]: Number(event.target.value) }))} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" />
          </label>
        ))}
        <button disabled={busy === "policy"} className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {busy === "policy" ? "Saving..." : "Save Excalibur Settings"}
        </button>
      </form>

      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="text-xs font-medium text-slate-700">Add user to Excalibur</span>
          <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">
            <option value="">Select a user</option>
            {availableUsers.map((user) => <option key={user.id} value={user.id}>{user.full_name || user.email || "Unnamed user"}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => void addMember()} disabled={!selectedUserId || busy === "add"} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {busy === "add" ? "Adding..." : "Add User"}
        </button>
      </div>

      {message && <p className={`mt-4 text-sm ${message.type === "success" ? "text-emerald-600" : "text-red-600"}`}>{message.text}</p>}

      <div className="mt-4 space-y-2">
        {members.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 py-7 text-center text-sm text-slate-500">No Excalibur members yet.</p>
        ) : members.map((member) => (
          <div key={member.user_id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{member.user?.full_name || member.user?.email || "Unnamed user"}</p>
              <p className="text-xs text-slate-500">{member.user?.email}</p>
            </div>
            <button type="button" onClick={() => void removeMember(member.user_id)} disabled={busy === member.user_id} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">Remove</button>
          </div>
        ))}
      </div>
    </section>
  );
}
