"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useTranslations} from "next-intl";
import {
  Bell,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  X,
} from "lucide-react";
import {cn} from "@/lib/utils";
import {RelivaMark} from "@/components/brand/reliva-mark";
import {LocaleToggle} from "@/components/layout/locale-toggle";
import {SidebarNav} from "@/components/layout/sidebar-nav";
import {ThemeToggle} from "@/components/layout/theme-toggle";
import {SiteSwitcher} from "@/components/sites/site-switcher";

type AppShellProps = {
  email?: string | null;
  name?: string | null;
  image?: string | null;
  children: React.ReactNode;
  sites: {id: string; domain: string}[];
};

export function AppShell({email, name, image, children, sites}: AppShellProps) {
  const t = useTranslations("common");
  const displayName = name || email?.split("@")[0] || "User";
  const initial = displayName.charAt(0).toUpperCase();
  const pathname = usePathname();
  const [imgError, setImgError] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const showImage = image && !imgError;

  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    const saved = localStorage.getItem("reliva-sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("reliva-sidebar-collapsed", String(next));
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-[74px] items-center px-5", collapsed && "justify-center px-2")}>
        <Link href="/dashboard" aria-label="Reliva Visibility dashboard">
          <RelivaMark compact={collapsed} />
        </Link>
      </div>

      {sites.length > 0 && !collapsed ? (
        <div className="px-3 pb-3">
          <div className="rounded-xl border border-white/8 bg-white/[0.035] p-1.5">
            <SiteSwitcher sites={sites} />
          </div>
        </div>
      ) : null}

      <SidebarNav sites={sites} collapsed={collapsed} />

      <div className="mt-auto px-3 pb-4 pt-3">
        <button
          type="button"
          onClick={toggleCollapsed}
          className={cn(
            "mb-3 hidden w-full items-center rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/[0.055] hover:text-white md:flex",
            collapsed ? "justify-center" : "gap-2"
          )}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed ? <span>Skjul menu</span> : null}
        </button>

        <div className={cn("border-t border-white/8 pt-3", collapsed && "flex justify-center")}>
          <Link
            href="/settings"
            className={cn(
              "flex items-center rounded-xl transition hover:bg-white/[0.055]",
              collapsed ? "size-10 justify-center" : "gap-3 px-2 py-2"
            )}
          >
            {showImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt={displayName}
                className="size-9 rounded-full object-cover ring-1 ring-white/10"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                {initial}
              </div>
            )}
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{displayName}</p>
                <p className="truncate text-[11px] text-slate-400">{email}</p>
              </div>
            ) : null}
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="reliva-shell flex min-h-screen">
      <aside
        className={cn(
          "reliva-sidebar sticky top-0 z-30 hidden h-screen shrink-0 border-r border-white/5 transition-[width] duration-200 md:block",
          collapsed ? "w-[72px]" : "w-[238px]"
        )}
      >
        {sidebarContent}
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-slate-950/45 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "reliva-sidebar fixed inset-y-0 left-0 z-50 w-[280px] border-r border-white/5 transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white"
        >
          <X className="size-4.5" />
        </button>
        {sidebarContent}
      </aside>

      <div className="min-w-0 flex-1">
        <header className="reliva-topbar sticky top-0 z-20 flex h-[64px] items-center gap-3 px-4 sm:px-6 lg:px-7">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm md:hidden"
          >
            <Menu className="size-4.5" />
          </button>

          <div className="relative hidden w-full max-w-[540px] sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              aria-label="Search Reliva"
              placeholder={t("searchPlaceholder")}
              className="h-9 w-full rounded-lg border border-transparent bg-[#f0f3f6] pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[#cdd9e5] focus:bg-white focus:ring-2 focus:ring-[#3aa9e8]/15"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <LocaleToggle />
            <div className="hidden lg:block">
              <ThemeToggle />
            </div>
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Bell className="size-4.5" strokeWidth={1.8} />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-danger ring-2 ring-white" />
            </button>
            <Link
              href={sites[0] ? `/sites/${sites[0].id}/crawl` : "/sites"}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#20a56f] px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#198e60]"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">{t("newScan")}</span>
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-7 lg:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
