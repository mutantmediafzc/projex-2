"use client";

import { useMemo, useState } from "react";
import type { QaUser } from "@/lib/qaTracking";
import { qaInput } from "./QaShell";

type Props = {
  users: QaUser[];
  selected: string[];
  onChange: (ids: string[]) => void;
};

export default function MemberPicker({ users, selected, onChange }: Props) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => (u.full_name || "").toLowerCase().includes(term) || (u.email || "").toLowerCase().includes(term));
  }, [users, search]);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-2">
      <input className={qaInput} placeholder="Search team members" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
        {filtered.length === 0 && <p className="p-3 text-[12px] text-slate-500">No team members found</p>}
        {filtered.map((u) => (
          <label key={u.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-[13px] hover:bg-slate-50">
            <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} />
            <span className="font-medium text-slate-800">{u.full_name || u.email}</span>
            {u.full_name && u.email && <span className="text-[11px] text-slate-400">{u.email}</span>}
          </label>
        ))}
      </div>
      <p className="text-[11px] text-slate-500">{selected.length} selected</p>
    </div>
  );
}
