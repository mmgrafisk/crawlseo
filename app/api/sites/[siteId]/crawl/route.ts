import {auth} from "@/lib/auth";
import {db} from "@/lib/db";
import {runSiteCrawl} from "@/lib/crawler/engine";
import {normalizeRelivaCrawl} from "@/lib/crawler/reliva-normalize";

export async function POST(
  req: Request,
  {params}: {params: Promise<{siteId: string}>}
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({error: "Unauthorized"}, {status: 401});
    }

    const {siteId} = await params;
    const site = await db.site.findUnique({
      where: {id: siteId},
      select: {userId: true, domain: true},
    });

    if (!site || site.userId !== session.user.id) {
      return Response.json({error: "Not found"}, {status: 404});
    }

    const running = await db.crawl.findFirst({
      where: {siteId, status: "RUNNING"},
    });
    if (running) {
      return Response.json(
        {error: "A crawl is already running", crawlId: running.id},
        {status: 409}
      );
    }

    let maxPages: number | undefined;
    try {
      const body = (await req.json()) as {maxPages?: number};
      if (body.maxPages && typeof body.maxPages === "number" && body.maxPages > 0) {
        maxPages = body.maxPages;
      }
    } catch {
      // Empty/invalid body: crawler default is used.
    }

    const crawl = await db.crawl.create({
      data: {
        siteId,
        status: "PENDING",
        ...(maxPages && {maxPages}),
      },
    });

    // The upstream engine persists its raw result first. Reliva then performs a
    // second, explicit normalization pass so semantic issue IDs and coverage
    // state are correct before the scan is shown as complete.
    runSiteCrawl(siteId, site.domain, maxPages, crawl.id)
      .then((result) => normalizeRelivaCrawl(crawl.id, result))
      .catch((error) => {
        console.error(`Background crawl failed for site ${siteId}:`, error);
      });

    return Response.json(
      {crawlId: crawl.id, status: "RUNNING"},
      {status: 202}
    );
  } catch (error) {
    console.error("Crawl error:", error);
    return Response.json(
      {error: error instanceof Error ? error.message : "Crawl failed"},
      {status: 500}
    );
  }
}

export async function GET(
  _req: Request,
  {params}: {params: Promise<{siteId: string}>}
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({error: "Unauthorized"}, {status: 401});
    }

    const {siteId} = await params;
    const site = await db.site.findUnique({
      where: {id: siteId},
      select: {userId: true},
    });
    if (!site || site.userId !== session.user.id) {
      return Response.json({error: "Not found"}, {status: 404});
    }

    const crawls = await db.crawl.findMany({
      where: {siteId},
      orderBy: {startedAt: "desc"},
      take: 10,
      include: {
        issues: {
          take: 200,
          orderBy: {severity: "asc"},
        },
      },
    });

    return Response.json(crawls);
  } catch (error) {
    console.error(error);
    return Response.json({error: "Failed to load crawls"}, {status: 500});
  }
}
