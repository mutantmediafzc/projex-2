"use client";

import Link from "next/link";
import { useUserRole } from "@/app/profile/hooks/useUserRole";

const ADMIN_ONLY_PATHS = ["/companies", "/contacts", "/accounts", "/financials", "/users"];

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  gradient: { from: string; to: string; hover: string; shadow: string };
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    gradient: { from: "from-purple-100 to-violet-100", to: "from-purple-500 to-violet-500", hover: "from-purple-50 to-violet-50", shadow: "shadow-purple-500/25" },
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M5 10.5V20h4v-5h6v5h4v-9.5" />
      </svg>
    ),
  },
  {
    href: "/companies",
    label: "Companies",
    adminOnly: true,
    gradient: { from: "from-purple-100 to-violet-100", to: "from-purple-500 to-violet-500", hover: "from-purple-50 to-violet-50", shadow: "shadow-purple-500/25" },
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4v18" />
        <path d="M19 21V11l-6-4" />
        <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
      </svg>
    ),
  },
  {
    href: "/contacts",
    label: "Contacts",
    adminOnly: true,
    gradient: { from: "from-purple-100 to-violet-100", to: "from-purple-500 to-violet-500", hover: "from-purple-50 to-violet-50", shadow: "shadow-purple-500/25" },
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/accounts",
    label: "Accounts",
    adminOnly: true,
    gradient: { from: "from-purple-100 to-violet-100", to: "from-purple-500 to-violet-500", hover: "from-purple-50 to-violet-50", shadow: "shadow-purple-500/25" },
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/projects",
    label: "Projects",
    gradient: { from: "from-purple-100 to-violet-100", to: "from-purple-500 to-violet-500", hover: "from-purple-50 to-violet-50", shadow: "shadow-purple-500/25" },
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        <path d="M12 11v6" />
        <path d="M9 14h6" />
      </svg>
    ),
  },
  {
    href: "/social-media",
    label: "Integrated Marketing",
    gradient: { from: "from-purple-100 to-violet-100", to: "from-purple-500 to-violet-500", hover: "from-purple-50 to-violet-50", shadow: "shadow-purple-500/25" },
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    href: "/seo",
    label: "SEO",
    gradient: { from: "from-emerald-100 to-teal-100", to: "from-emerald-500 to-teal-500", hover: "from-emerald-50 to-teal-50", shadow: "shadow-emerald-500/25" },
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
        <path d="M11 8v6M8 11h6" />
      </svg>
    ),
  },
  {
    href: "/appointments",
    label: "Calendar",
    gradient: { from: "from-purple-100 to-violet-100", to: "from-purple-500 to-violet-500", hover: "from-purple-50 to-violet-50", shadow: "shadow-purple-500/25" },
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18" />
      </svg>
    ),
  },
  {
    href: "/financials",
    label: "Financials",
    adminOnly: true,
    gradient: { from: "from-purple-100 to-violet-100", to: "from-purple-500 to-violet-500", hover: "from-purple-50 to-violet-50", shadow: "shadow-purple-500/25" },
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M7 10h4M7 14h2" />
      </svg>
    ),
  },
  {
    href: "/tasks",
    label: "Tasks",
    gradient: { from: "from-purple-100 to-violet-100", to: "from-purple-500 to-violet-500", hover: "from-purple-50 to-violet-50", shadow: "shadow-purple-500/25" },
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    href: "/motion",
    label: "Motion",
    gradient: { from: "from-purple-100 to-violet-100", to: "from-purple-500 to-violet-500", hover: "from-purple-50 to-violet-50", shadow: "shadow-purple-500/25" },
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </svg>
    ),
  },
  {
    href: "/users",
    label: "User Management",
    adminOnly: true,
    gradient: { from: "from-purple-100 to-violet-100", to: "from-purple-500 to-violet-500", hover: "from-purple-50 to-violet-50", shadow: "shadow-purple-500/25" },
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/admin/scorecards",
    label: "Scorecards",
    adminOnly: true,
    gradient: { from: "from-violet-100 to-purple-100", to: "from-violet-500 to-purple-500", hover: "from-violet-50 to-purple-50", shadow: "shadow-violet-500/25" },
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
  {
    href: "/chat",
    label: "Chat with Colton",
    gradient: { from: "from-purple-100 to-violet-100", to: "from-purple-500 to-violet-500", hover: "from-purple-50 to-violet-50", shadow: "shadow-purple-500/25" },
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M8 10h.01" />
        <path d="M12 10h.01" />
        <path d="M16 10h.01" />
      </svg>
    ),
  },
  {
    href: "/danote",
    label: "Danote",
    gradient: { from: "from-purple-100 to-violet-100", to: "from-purple-500 to-violet-500", hover: "from-purple-50 to-violet-50", shadow: "shadow-purple-500/25" },
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/dischat",
    label: "Dischat",
    gradient: { from: "from-purple-100 to-violet-100", to: "from-purple-500 to-violet-500", hover: "from-purple-50 to-violet-50", shadow: "shadow-purple-500/25" },
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        <path d="M8 12h.01" />
        <path d="M12 12h.01" />
        <path d="M16 12h.01" />
      </svg>
    ),
  },
  {
    href: "/ws-reports",
    label: "WS Reports",
    gradient: { from: "from-purple-100 to-violet-100", to: "from-purple-500 to-violet-500", hover: "from-purple-50 to-violet-50", shadow: "shadow-purple-500/25" },
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
];

export default function SidebarNav() {
  const { role, loading } = useUserRole();
  const isAdmin = role === "admin";

  // Filter nav items based on role
  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  if (loading) {
    return (
      <nav className="relative mt-1 flex-1 space-y-1 text-sm">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </nav>
    );
  }

  return (
    <nav className="relative mt-1 flex-1 space-y-1 text-sm">
      {visibleItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-600 transition-all hover:bg-gradient-to-r hover:${item.gradient.hover} hover:text-slate-900 hover:shadow-sm`}
        >
          <span className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient.from} text-current shadow-sm transition-all group-hover:${item.gradient.to} group-hover:text-white group-hover:shadow-lg group-hover:${item.gradient.shadow}`}>
            {item.icon}
          </span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
