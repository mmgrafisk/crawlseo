import {db} from "@/lib/db";
import {fetchSearchAnalytics, fetchPageAnalytics, gscDate} from "@/lib/google";
import {getDateRange, getDataLagDate} from "@/lib/date-utils";
import {getAccessibleOrganizationIds, getSiteAccess} from "@/lib/permissions";

interface SyncResult {
  success: boolean;
  keywordsInserted: number;
  pagesInserted: number;
  startDate: string;
  endDate: string;
  error?: string;
}

/** Syncs GSC data for a site the current user can access. */
export async function syncGSCDataForSite(
  userId: string,
  siteId: string,
  daysBack: number = 28
): Promise<SyncResult> {
  try {
    const access = await getSiteAccess(userId, siteId);
    if (!access) throw new Error("Site not found or unauthorized");

    const site = await db.site.findUnique({
      where: {id: siteId},
      select: {gscProperty: true},
    });
    if (!site?.gscProperty) {
      throw new Error("Site does not have GSC property connected");
    }

    return await runGSCSync(userId, siteId, site.gscProperty, daysBack);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[GSC Sync] Error syncing site ${siteId}:`, errorMessage);

    return {
      success: false,
      keywordsInserted: 0,
      pagesInserted: 0,
      startDate: "",
      endDate: "",
      error: errorMessage,
    };
  }
}

/**
 * Fetches and upserts GSC keywords and pages for a site whose access and GSC
 * property the caller has already checked.
 */
export async function runGSCSync(
  userId: string,
  siteId: string,
  gscProperty: string,
  daysBack: number = 28
): Promise<SyncResult> {
  const {start} = getDateRange(daysBack);
  const end = getDataLagDate();

  console.log(`[GSC Sync] Starting sync for site ${siteId}`);
  console.log(`[GSC Sync] Date range: ${start} to ${end}`);

  const [keywords, pages] = await Promise.all([
    fetchSearchAnalytics(
      userId,
      gscProperty,
      start,
      end,
      ["query", "page", "date", "device", "country"]
    ),
    fetchPageAnalytics(userId, gscProperty, start, end),
  ]);

  console.log(
    `[GSC Sync] Fetched ${keywords.length} keyword records and ${pages.length} page records`
  );

  let keywordsInserted = 0;
  for (const keyword of keywords) {
    try {
      const date = gscDate(keyword.date);
      await db.keyword.upsert({
        where: {
          siteId_query_date: {
            siteId,
            query: keyword.query,
            date,
          },
        },
        create: {
          siteId,
          query: keyword.query,
          date,
          clicks: keyword.clicks,
          impressions: keyword.impressions,
          ctr: keyword.ctr,
          position: keyword.position,
          page: keyword.page,
          device: keyword.device,
          country: keyword.country,
        },
        update: {
          clicks: keyword.clicks,
          impressions: keyword.impressions,
          ctr: keyword.ctr,
          position: keyword.position,
          page: keyword.page,
          device: keyword.device,
          country: keyword.country,
        },
      });
      keywordsInserted++;
    } catch (error) {
      console.warn(`[GSC Sync] Failed to upsert keyword: ${keyword.query}`, error);
    }
  }

  let pagesInserted = 0;
  for (const page of pages) {
    if (!page.page) continue;
    try {
      const date = gscDate(page.date);
      await db.page.upsert({
        where: {
          siteId_url_date: {
            siteId,
            url: page.page,
            date,
          },
        },
        create: {
          siteId,
          url: page.page,
          date,
          clicks: page.clicks,
          impressions: page.impressions,
          ctr: page.ctr,
          position: page.position,
        },
        update: {
          clicks: page.clicks,
          impressions: page.impressions,
          ctr: page.ctr,
          position: page.position,
        },
      });
      pagesInserted++;
    } catch (error) {
      console.warn(`[GSC Sync] Failed to upsert page: ${page.page}`, error);
    }
  }

  console.log(
    `[GSC Sync] Sync completed: ${keywordsInserted} keywords, ${pagesInserted} pages`
  );

  return {
    success: true,
    keywordsInserted,
    pagesInserted,
    startDate: start,
    endDate: end,
  };
}

/** Syncs all sites accessible to a user, including active organizations. */
export async function syncAllUserSites(userId: string): Promise<
  Array<{
    siteId: string;
    domain: string;
    result: SyncResult;
  }>
> {
  const organizationIds = await getAccessibleOrganizationIds(userId);
  const sites = await db.site.findMany({
    where: {
      OR: [
        {userId},
        ...(organizationIds.length ? [{organizationId: {in: organizationIds}}] : []),
      ],
    },
    select: {id: true, domain: true},
    distinct: ["id"],
  });

  const results = [];
  for (const site of sites) {
    const result = await syncGSCDataForSite(userId, site.id);
    results.push({siteId: site.id, domain: site.domain, result});
  }
  return results;
}
