"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

// Routes that should hide the app shell (sidebar, header)
const headlessRoutes = ["/login", "/roca", "/strategy", "/elitestory", "/public", "/project-completion"];

function isHeadlessRoute(pathname: string) {
  return headlessRoutes.some(route => pathname === route || pathname.startsWith(route + "/"));
}

export function ShellSidebar({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isHeadlessRoute(pathname)) {
    return null;
  }
  return <>{children}</>;
}

export function ShellHeader({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isHeadlessRoute(pathname)) {
    return null;
  }
  return <>{children}</>;
}

export function ShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return (
      <div className="mx-auto flex max-w-6xl min-h-[80vh] items-center justify-center">
        {children}
      </div>
    );
  }

  // For /roca and other headless routes, render without app shell wrapper
  if (isHeadlessRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[80vh] w-full overflow-x-hidden overflow-y-auto">
      {children}
    </div>
  );
}
