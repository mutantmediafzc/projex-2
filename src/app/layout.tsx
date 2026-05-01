import type { Metadata, Viewport } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import RequireAuth from "@/components/RequireAuth";
import { ShellSidebar, ShellHeader, ShellFrame } from "@/components/ShellVisibility";
import HeaderUser from "@/components/HeaderUser";
import HeaderMessagesButton from "@/components/HeaderMessagesButton";
import HeaderNotificationsButton from "@/components/HeaderNotificationsButton";
import HeaderSearch from "@/components/HeaderSearch";
import { MessagesUnreadProvider } from "@/components/MessagesUnreadContext";
import { TasksNotificationsProvider } from "@/components/TasksNotificationsContext";
import SupportChat from "@/components/SupportChat";
import { MobileSidebarProvider, MobileMenuButton } from "@/components/MobileSidebarContext";
import StatusPromptModal from "@/components/StatusPromptModal";
import SidebarNav from "@/components/SidebarNav";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Projex by Mutant",
  description: "Project management and collaboration platform",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Projex",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#f8fafc",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches && localStorage.getItem('theme') === 'system')) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${manrope.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#eef2ff,_#ffedd5_40%,_#fdf2ff_80%)] py-2 sm:py-4 md:py-6 safe-area-padding">
          <MessagesUnreadProvider>
          <TasksNotificationsProvider>
          <MobileSidebarProvider>
          <ShellFrame>
          <div className="flex min-h-[80vh] flex-1 overflow-hidden">
            <input
              id="sidebar-toggle"
              type="checkbox"
              className="peer sr-only"
            />
            <ShellSidebar>
              <aside className="hidden w-60 bg-gradient-to-b from-white/95 via-slate-50/90 to-slate-100/80 px-3 py-4 transition-all duration-200 ease-out sm:flex sm:flex-col peer-checked:sm:w-0 peer-checked:sm:px-0 peer-checked:sm:opacity-0 peer-checked:sm:pointer-events-none app-shell-sidebar relative overflow-hidden shrink-0">
              {/* Decorative gradient orb */}
              <div className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-gradient-to-br from-violet-200/40 to-sky-200/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br from-amber-200/30 to-orange-200/20 blur-2xl" />
              
              <div className="relative mb-5 flex justify-center px-2">
                <Image
                  src="/logos/cream-logo.png"
                  alt="Cream logo"
                  width={120}
                  height={28}
                  className="h-8 w-auto"
                />
              </div>
              <SidebarNav />
            </aside>
            </ShellSidebar>
            <main className="flex-1 min-w-0 bg-slate-50/40">
              <RequireAuth>
                <div className="flex h-full flex-col">
                  <ShellHeader>
                    <header className="relative z-[9999] flex items-center justify-between gap-2 sm:gap-4 bg-gradient-to-b from-slate-50/90 to-slate-50/40 px-3 py-2.5 sm:px-4 sm:py-3 md:px-6 lg:px-8 app-shell-header">
                      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                        {/* Mobile menu button */}
                        <MobileMenuButton />
                        {/* Desktop sidebar toggle */}
                        <label
                          htmlFor="sidebar-toggle"
                          className="hidden sm:inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-500 shadow-sm hover:bg-slate-50 transition-all"
                        >
                          <span className="sr-only">Toggle sidebar</span>
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M4 6h16M4 12h10M4 18h16" />
                          </svg>
                        </label>
                        <div className="flex items-center gap-3">
                          <Link
                            href="/"
                            aria-label="Go to dashboard"
                            className="inline-flex items-center"
                          >
                            <Image
                              src="/logos/mutant-logo.avif"
                              alt="Maison Tōa logo"
                              width={76}
                              height={28}
                              className="h-6 sm:h-7 w-auto"
                            />
                          </Link>
                        </div>
                      </div>
                      <div className="hidden flex-1 justify-center md:flex">
                        <div className="w-full max-w-xl">
                          <HeaderSearch />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 shrink-0">
                        <HeaderNotificationsButton />
                        <HeaderMessagesButton />
                        <HeaderUser />
                      </div>
                    </header>
                  </ShellHeader>
                  <div className="relative z-0 flex-1 px-3 py-3 sm:px-4 sm:py-4 md:px-6 lg:px-8">{children}</div>
                </div>
              </RequireAuth>
            </main>
          </div>
          </ShellFrame>
          </MobileSidebarProvider>
          <SupportChat />
          <StatusPromptModal />
          </TasksNotificationsProvider>
          </MessagesUnreadProvider>
        </div>
      </body>
    </html>
  );
}
