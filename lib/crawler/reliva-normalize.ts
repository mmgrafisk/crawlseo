import {db} from "@/lib/db";
import type {CrawlResult} from "@/lib/crawler/engine";

type CoverageInput = {
  pagesFound: number;
  maxPages: number;
  discoveredUrls: number;
  failedUrls: number;
};

export function decideCoverage({
  pagesFound,
  maxPages,
  discoveredUrls,
  failedUrls,
}: CoverageInput) {
  const safeDiscovered = Math.max(discoveredUrls, pagesFound);
  const coveragePercent = safeDiscovered > 0
    ? Math.min(100, Math.round((pagesFound / safeDiscovered) * 1000) / 10)
    : null;

  if (pagesFound >= maxPages) {
    return {
      status: "PARTIAL" as const,
      coveragePercent,
      reason: `Configured crawl limit (${maxPages}) was reached; complete coverage cannot be proven.`,
    };
  }

  if (failedUrls > 0) {
    return {
      status: "PARTIAL" as const,
      coveragePercent,
      reason: `${failedUrls} discovered URL${failedUrls === 1 ? "" : "s"} could not be fetched.`,
    };
  }

  if (safeDiscovered > pagesFound) {
    return {
      status: "PARTIAL" as const,
      coveragePercent,
      reason: `${safeDiscovered - pagesFound} discovered URL${safeDiscovered - pagesFound === 1 ? "" : "s"} lack stored page evidence.`,
    };
  }

  return {
    status: "COMPLETED" as const,
    coveragePercent: 100,
    reason: null,
  };
}

export async function normalizeRelivaCrawl(crawlId: string, result: CrawlResult) {
  // Upstream CrawlSEO historically reused unrelated issue enums for these
  // concepts. Reliva keeps every finding semantically distinct.
  await Promise.all([
    db.crawlIssue.updateMany({
      where: {crawlId, details: {path: ["kind"], equals: "orphan"}},
      data: {type: "ORPHAN_PAGE"},
    }),
    db.crawlIssue.updateMany({
      where: {crawlId, details: {path: ["kind"], equals: "content_score"}},
      data: {type: "THIN_CONTENT"},
    }),
    db.crawlIssue.updateMany({
      where: {crawlId, details: {path: ["kind"], equals: "crawl_summary"}},
      data: {type: "CRAWL_SUMMARY"},
    }),
  ]);

  const crawl = await db.crawl.findUnique({
    where: {id: crawlId},
    select: {maxPages: true, pagesFound: true},
  });
  if (!crawl) return;

  const [pages, internalTargets, broken] = await Promise.all([
    db.auditPage.findMany({
      where: {crawlId},
      select: {url: true},
    }),
    db.auditLink.findMany({
      where: {crawlId, isInternal: true},
      distinct: ["targetUrl"],
      select: {targetUrl: true},
      take: 10000,
    }),
    db.crawlIssue.findMany({
      where: {crawlId, type: "BROKEN_LINK"},
      distinct: ["url"],
      select: {url: true},
      take: 10000,
    }),
  ]);

  const pageUrls = new Set(pages.map((page) => page.url));
  const failedUrls = broken.filter((issue) => !pageUrls.has(issue.url)).length;
  const discoveredUrls = Math.max(
    crawl.pagesFound,
    result.sitemapUrls,
    new Set([...pageUrls, ...internalTargets.map((link) => link.targetUrl)]).size
  );
  const attemptedUrls = Math.min(discoveredUrls, crawl.pagesFound + failedUrls);
  const excludedUrls = Math.max(0, discoveredUrls - attemptedUrls);
  const coverage = decideCoverage({
    pagesFound: crawl.pagesFound,
    maxPages: crawl.maxPages,
    discoveredUrls,
    failedUrls,
  });

  await db.crawl.update({
    where: {id: crawlId},
    data: {
      status: coverage.status,
      discoveredUrls,
      attemptedUrls,
      fetchedUrls: crawl.pagesFound,
      failedUrls,
      excludedUrls,
      sitemapUrls: result.sitemapUrls,
      coveragePercent: coverage.coveragePercent,
      coverageReason: coverage.reason,
      healthScore: coverage.status === "COMPLETED" ? result.healthScore : null,
    },
  });
}
