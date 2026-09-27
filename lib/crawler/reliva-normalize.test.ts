import {describe, expect, it} from "vitest";
import {decideCoverage} from "./reliva-normalize";

describe("Reliva crawl coverage semantics", () => {
  it("marks a crawl partial when the configured page limit is reached", () => {
    expect(
      decideCoverage({
        pagesFound: 200,
        maxPages: 200,
        discoveredUrls: 340,
        failedUrls: 0,
      })
    ).toMatchObject({status: "PARTIAL", coveragePercent: 58.8});
  });

  it("marks a crawl partial when discovered URLs could not be fetched", () => {
    expect(
      decideCoverage({
        pagesFound: 98,
        maxPages: 200,
        discoveredUrls: 100,
        failedUrls: 2,
      })
    ).toMatchObject({status: "PARTIAL", coveragePercent: 98});
  });

  it("marks a crawl partial when discovered URL evidence is incomplete", () => {
    expect(
      decideCoverage({
        pagesFound: 80,
        maxPages: 200,
        discoveredUrls: 100,
        failedUrls: 0,
      })
    ).toMatchObject({status: "PARTIAL", coveragePercent: 80});
  });

  it("marks a crawl complete only when observed coverage is complete", () => {
    expect(
      decideCoverage({
        pagesFound: 84,
        maxPages: 200,
        discoveredUrls: 84,
        failedUrls: 0,
      })
    ).toEqual({status: "COMPLETED", coveragePercent: 100, reason: null});
  });
});
