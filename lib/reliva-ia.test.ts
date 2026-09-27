import {describe, expect, it} from "vitest";
import {RELIVA_PRIMARY_AREAS, areaHref} from "./reliva-ia";

describe("Reliva primary information architecture", () => {
  it("keeps the approved workspace order", () => {
    expect(RELIVA_PRIMARY_AREAS.map((area) => area.key)).toEqual([
      "dashboard",
      "seoAudit",
      "tasks",
      "shopify",
      "international",
      "googleImpact",
      "monitoring",
      "operations",
      "connections",
    ]);
  });

  it("resolves global and site-scoped routes without inventing a site", () => {
    const dashboard = RELIVA_PRIMARY_AREAS.find((area) => area.key === "dashboard")!;
    const audit = RELIVA_PRIMARY_AREAS.find((area) => area.key === "seoAudit")!;

    expect(areaHref(dashboard)).toBe("/dashboard");
    expect(areaHref(audit)).toBeNull();
    expect(areaHref(audit, "site-1")).toBe("/sites/site-1/crawl");
  });
});
