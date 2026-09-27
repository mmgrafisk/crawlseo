"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useTranslations} from "next-intl";
import {
  Activity,
  Bot,
  ChartNoAxesCombined,
  CircleGauge,
  ClipboardCheck,
  FileSearch,
  Globe2,
  LayoutDashboard,
  Lightbulb,
  Link2,
  SearchCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";
import {cn} from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

export function SidebarNav({
  sites,
  collapsed = false,
}: {
  sites: {id: string; domain: string}[];
  collapsed?: boolean;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const match = pathname.match(/\/sites\/([^/]+)/);
  const activeSiteId = match?.[1] && sites.some((site) => site.id === match[1]) ? match[1] : sites[0]?.id;

  const groups: NavGroup[] = [
    {
      items: [
        {href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard, exact: true},
        {href: "/sites", label: t("websites"), icon: Globe2, exact: true},
        {href: "/tasks", label: t("tasks"), icon: ClipboardCheck},
      ],
    },
  ];

  if (activeSiteId) {
    groups.push(
      {
        label: t("seoWorkspace"),
        items: [
          {href: `/sites/${activeSiteId}/crawl`, label: t("seoAudit"), icon: SearchCheck},
          {href: `/sites/${activeSiteId}/pages`, label: t("pagesContent"), icon: FileSearch},
          {href: `/sites/${activeSiteId}/opportunities`, label: t("opportunities"), icon: Lightbulb},
          {href: `/sites/${activeSiteId}/keywords`, label: t("googleImpact"), icon: ChartNoAxesCombined},
          {href: `/sites/${activeSiteId}/vitals`, label: t("performance"), icon: CircleGauge},
          {href: `/sites/${activeSiteId}/alerts`, label: t("monitoring"), icon: Activity},
        ],
      },
      {
        label: t("research"),
        items: [
          {href: `/sites/${activeSiteId}/keyword-research`, label: t("keywordResearch"), icon: SearchCheck},
          {href: `/sites/${activeSiteId}/backlinks`, label: t("backlinks"), icon: Link2},
        ],
      },
      {
        label: t("system"),
        items: [
          {href: `/sites/${activeSiteId}/mcp`, label: t("aiMcp"), icon: Bot},
          {href: `/sites/${activeSiteId}/settings`, label: t("connections"), icon: Settings},
        ],
      }
    );
  }

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-2.5 py-2 text-sm">
      {groups.map((group, index) => (
        <div key={group.label ?? `primary-${index}`}>
          {!collapsed && group.label ? (
            <p className="mb-2 px-2.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {group.label}
            </p>
          ) : null}
          <div className="space-y-1">
            {group.items.map((item) => (
              <SidebarLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarLink({item, pathname, collapsed}: {item: NavItem; pathname: string; collapsed: boolean}) {
  const active = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group flex h-10 items-center rounded-lg text-[13px] font-medium transition-colors",
        collapsed ? "justify-center px-0" : "gap-3 px-3",
        active
          ? "bg-[#293b50] text-white shadow-[inset_3px_0_0_#78baf0]"
          : "text-slate-300 hover:bg-white/[0.055] hover:text-white"
      )}
    >
      <Icon
        className={cn("size-[17px] shrink-0", active ? "text-[#b7ddf8]" : "text-slate-400 group-hover:text-slate-200")}
        strokeWidth={1.75}
      />
      {!collapsed ? <span>{item.label}</span> : null}
    </Link>
  );
}
