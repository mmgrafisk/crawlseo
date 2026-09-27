import {auth} from "@/lib/auth";
import {db} from "@/lib/db";
import {getSiteAccess} from "@/lib/permissions";

export async function GET(
  _req: Request,
  {params}: {params: Promise<{siteId: string; crawlId: string}>}
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return Response.json({error: "Unauthorized"}, {status: 401});

    const {siteId, crawlId} = await params;
    const access = await getSiteAccess(userId, siteId);
    if (!access) return Response.json({error: "Not found"}, {status: 404});

    const crawl = await db.crawl.findUnique({
      where: {id: crawlId},
      select: {
        id: true,
        siteId: true,
        status: true,
        pagesFound: true,
        issuesFound: true,
        healthScore: true,
        startedAt: true,
        finishedAt: true,
        discoveredUrls: true,
        attemptedUrls: true,
        fetchedUrls: true,
        failedUrls: true,
        excludedUrls: true,
        sitemapUrls: true,
        coveragePercent: true,
        coverageReason: true,
      },
    });

    if (!crawl || crawl.siteId !== siteId) {
      return Response.json({error: "Crawl not found"}, {status: 404});
    }

    return Response.json(crawl);
  } catch (error) {
    console.error("Crawl status error:", error);
    return Response.json({error: "Failed to load crawl status"}, {status: 500});
  }
}
