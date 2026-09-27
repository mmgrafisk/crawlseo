"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useTranslations} from "next-intl";
import {
  Activity,
  ChartNoAxesCombined,
  ClipboardCheck,
  Globe2,
  Languages,
  LayoutDashboard,
  PlugZap,
  SearchCheck,
  ShoppingBag,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {RELIVA_PRIMARY_AREAS, areaHref, type RelivaAreaKey} from "@/lib/reliva-ia";
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

const areaIcons: Record<RelivaAreaKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  seoAudit: SearchCheck,
  tasks: ClipboardCheck,
  shopify: ShoppingBag,
  international: Languages,
  googleImpact: ChartNoAxesCombined,
  monitoring: Activity,
  operations: Wrench,
  connections: PlugZap,
};

export function SidebarNav({
  sites,
  collapsed = false,
  onNavigate,
}: {
  sites: {id: string; domain: string}[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const match = pathname.match(/\/sites\/([^/]+)/);
  const activeSiteId = match?.[1] && sites.some((site) => site.id === match[1])
    ? match[1]
    : sites[0]?.id;

  const dashboardArea = RELIVA_PRIMARY_AREAS.find((area) => area.key === "dashboard")!;
  const connectionArea = RELIVA_PRIMARY_AREAS.find((area) => area.key === "connections")!;
  const workspaceAreas = RELIVA_PRIMARY_AREAS.filter(
    (area) => area.key !== "dashboard" && area.key !== "connections"
  );

  const groups: NavGroup[] = [
    {
      items: [
        {
          href: areaHref(dashboardArea, activeSiteId) ?? "/dashboard",
          label: t("dashboard"),
          icon: areaIcons.dashboard,
          exact: true,
        },
        {href: "/sites", label: t("websites"), icon: Globe2, exact: true},
      ],
    },
  ];

  const workspaceItems = workspaceAreas.flatMap((area) => {
    const href = areaHref(area, activeSiteId);
    if (!href) return [];
    return [{href, label: t(area.key), icon: areaIcons[area.key]}];
  });

  if (workspaceItems.length > 0) {
    groups.push({label: t("workspaces"), items: workspaceItems});
  }

  const connectionHref = areaHref(connectionArea, activeSiteId);
  if (connectionHref) {
    groups.push({
      label: t("system"),
      items: [{href: connectionHref, label: t("connections"), icon: areaIcons.connections}],
    });
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
              <SidebarLink
                key={item.href}
                item={item}
                pathname={pathname}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarLink({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const active = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className={cn(
        "group flex h-10 items-center rounded-lg text-[13px] font-medium transition-colors",
        collapsed ? "justify-center px-0" : "gap-3 px-3",
        active
          ? "bg-[#293b50] text-white shadow-[inset_3px_0_0_#78baf0]"
          : "text-slate-300 hover:bg-white/[0.055] hover:text-white"
      )}
    >
      <Icon
        className={cn(
          "size-[17px] shrink-0",
          active ? "text-[#b7ddf8]" : "text-slate-400 group-hover:text-slate-200"
        )}
        strokeWidth={1.75}
      />
      {!collapsed ? <span>{item.label}</span> : null}
    </Link>
  );
}
