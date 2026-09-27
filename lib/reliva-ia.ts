export type RelivaAreaKey =
  | "dashboard"
  | "seoAudit"
  | "tasks"
  | "shopify"
  | "international"
  | "googleImpact"
  | "monitoring"
  | "operations"
  | "connections";

export type RelivaArea = {
  key: RelivaAreaKey;
  scope: "global" | "site";
  href?: string;
  sitePath?: string;
};

export const RELIVA_PRIMARY_AREAS: readonly RelivaArea[] = [
  {key: "dashboard", scope: "global", href: "/dashboard"},
  {key: "seoAudit", scope: "site", sitePath: "crawl"},
  {key: "tasks", scope: "global", href: "/tasks"},
  {key: "shopify", scope: "site", sitePath: "shopify"},
  {key: "international", scope: "site", sitePath: "international"},
  {key: "googleImpact", scope: "site", sitePath: "keywords"},
  {key: "monitoring", scope: "site", sitePath: "alerts"},
  {key: "operations", scope: "site", sitePath: "operations"},
  {key: "connections", scope: "site", sitePath: "settings"},
] as const;

export function areaHref(area: RelivaArea, activeSiteId?: string) {
  if (area.scope === "global") return area.href ?? "/dashboard";
  if (!activeSiteId || !area.sitePath) return null;
  return `/sites/${activeSiteId}/${area.sitePath}`;
}
