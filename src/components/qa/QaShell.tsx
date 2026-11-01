"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  loading: boolean;
  allowed: boolean;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

const TABS = [
  { href: "/qa", label: "Projects" },
  { href: "/qa/reports", label: "Reports & History" },
];

export default function QaShell({ loading, allowed, title, subtitle, actions, children }: Props) {
  const pathname = usePathname();

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-xs text-slate-500">Loading QA Tracking...</div>;
  }

  if (!allowed) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">No access</h1>
        <p className="mt-2 text-sm text-slate-500">QA Tracking is restricted to the QA lead.</p>
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
            {subtitle && <div className="text-[13px] text-slate-500">{subtitle}</div>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      <nav className="flex gap-1 rounded-xl border border-slate-200/80 bg-white/80 p-1 shadow-sm w-fit">
        {TABS.map((tab) => {
          const active = tab.href === "/qa" ? pathname === "/qa" || pathname.startsWith("/qa/projects") || pathname.startsWith("/qa/tasks") : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </main>
  );
}

export function Badge({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${className}`}>{children}</span>;
}

export const qaButton = {
  primary:
    "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-[13px] font-medium text-white shadow-lg shadow-emerald-500/25 transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50",
  danger:
    "inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-[12px] font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50",
};

export const qaInput =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";
