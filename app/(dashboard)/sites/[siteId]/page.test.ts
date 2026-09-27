import {renderToString} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";

// Search Console can store page rows while anonymising low-volume query rows.
// The site overview must treat either dimension as evidence of a completed sync.
const counts = vi.hoisted(() => ({keywords: 0, pages: 0}));

vi.mock("@/lib/auth", () => ({auth: async () => ({user: {id: "user-1"}})}));
vi.mock("@/lib/db", () => ({
  db: {
    site: {
      findUnique: async () => ({
        userId: "user-1",
        domain: "a.example",
        gscProperty: "https://a.example/",
        _count: counts,
      }),
    },
    crawl: {findFirst: async () => null},
    vitalsReport: {findFirst: async () => null},
  },
}));
vi.mock("@/lib/seo-opportunities", () => ({
  getAllOpportunities: async () => ({feed: []}),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: () => ({push: vi.fn(), refresh: vi.fn()}),
  usePathname: () => "/sites/site-a",
}));
vi.mock("next-auth/react", () => ({signIn: vi.fn()}));
vi.mock("@/components/dashboard/metrics", () => ({DashboardMetrics: () => null}));
vi.mock("@/components/dashboard/traffic-chart", () => ({TrafficChart: () => null}));
vi.mock("@/components/dashboard/top-keywords", () => ({TopKeywords: () => null}));

import SiteOverviewPage from "./page";

async function render(next: typeof counts): Promise<string> {
  Object.assign(counts, next);
  const tree = await SiteOverviewPage({params: Promise.resolve({siteId: "site-a"})});
  return renderToString(tree);
}

describe("site overview GSC evidence state", () => {
  it("shows an explicit not-yet-synced state before GSC rows arrive", async () => {
    const html = await render({keywords: 0, pages: 0});
    expect(html).toContain("Klar til første datasynk");
    expect(html).toContain("Reliva viser aldrig manglende data som et grønt nul");
  });

  it("renders the operational overview when pages exist without keywords", async () => {
    const html = await render({keywords: 0, pages: 27});
    expect(html).not.toContain("Klar til første datasynk");
    expect(html).toContain("Site health");
  });

  it("renders the operational overview when keyword rows exist", async () => {
    const html = await render({keywords: 5, pages: 3});
    expect(html).not.toContain("Klar til første datasynk");
    expect(html).toContain("Site health");
  });
});
