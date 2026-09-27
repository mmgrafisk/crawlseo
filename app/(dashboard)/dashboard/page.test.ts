import {renderToString} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";

// Search Console can store page rows while anonymising low-volume query rows.
// Reliva must therefore treat pages OR keywords as proof that a GSC sync arrived.
const counts = vi.hoisted(() => ({keywords: 0, pages: 0, crawls: 0}));

vi.mock("@/lib/auth", () => ({auth: async () => ({user: {id: "user-1"}})}));
vi.mock("@/lib/permissions", () => ({getAccessibleOrganizationIds: async () => []}));
vi.mock("@/lib/db", () => ({
  db: {
    site: {
      findMany: async () => [
        {
          id: "site-a",
          domain: "a.example",
          gscProperty: "https://a.example/",
          _count: counts,
        },
      ],
    },
    crawl: {findFirst: async () => null},
  },
}));
vi.mock("@/lib/seo-metrics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/seo-metrics")>();
  return {
    ...actual,
    getSitePeriodMetrics: async () => ({
      current: {clicks: 120, impressions: 4800, avgPosition: 9.2, avgCtr: 0.025, uniqueKeywords: 0},
      previous: {clicks: 90, impressions: 4000, avgPosition: 11.4, avgCtr: 0.0225, uniqueKeywords: 0},
      deltas: {clicks: 33.3, impressions: 20, avgPosition: 2.2, avgCtr: 11.1},
    }),
  };
});
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: () => ({push: vi.fn(), refresh: vi.fn()}),
  usePathname: () => "/dashboard",
}));
vi.mock("next-auth/react", () => ({signIn: vi.fn()}));
vi.mock("@/components/sites/add-site-modal", () => ({AddSiteModal: () => null}));
vi.mock("@/components/ui/data-lag-badge", () => ({DataLagBadge: () => null}));

import DashboardPage from "./page";

async function render(next: typeof counts): Promise<string> {
  Object.assign(counts, next);
  const tree = await DashboardPage();
  return renderToString(tree);
}

describe("portfolio dashboard GSC evidence gates", () => {
  it("treats a site with pages but no keywords as synced and shows metrics", async () => {
    const html = await render({keywords: 0, pages: 27, crawls: 1});
    expect(html).not.toContain("Synkronisér GSC data");
    expect(html).toContain("Clicks");
    expect(html).toContain("Impressions");
  });

  it("keeps the sync step visible before any GSC rows arrive", async () => {
    const html = await render({keywords: 0, pages: 0, crawls: 0});
    expect(html).toContain("Synkronisér GSC data");
    expect(html).toContain("Kør første SEO Audit");
  });

  it("treats a site with keywords as synced", async () => {
    const html = await render({keywords: 5, pages: 3, crawls: 1});
    expect(html).not.toContain("Synkronisér GSC data");
    expect(html).toContain("Clicks");
  });
});
