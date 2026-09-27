import {auth} from "@/lib/auth";
import {db} from "@/lib/db";
import {ReauthRequiredError} from "@/lib/google";
import {canWriteWorkspace, getSiteAccess} from "@/lib/permissions";
import {runGSCSync} from "@/lib/workers/gsc-sync";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return Response.json({error: "Unauthorized"}, {status: 401});
    }

    const {siteId} = (await req.json()) as {siteId?: string};
    if (!siteId) {
      return Response.json({error: "Missing siteId"}, {status: 400});
    }

    const access = await getSiteAccess(userId, siteId);
    if (!access) {
      return Response.json({error: "Site not found"}, {status: 404});
    }
    if (!canWriteWorkspace(access.role)) {
      return Response.json({error: "Write access required to refresh data"}, {status: 403});
    }

    const fullSite = await db.site.findUnique({
      where: {id: siteId},
      select: {gscProperty: true},
    });
    if (!fullSite?.gscProperty) {
      return Response.json(
        {error: "Site does not have GSC property connected"},
        {status: 400}
      );
    }

    const result = await runGSCSync(userId, siteId, fullSite.gscProperty);
    return Response.json({
      success: true,
      keywordsInserted: result.keywordsInserted,
      pagesInserted: result.pagesInserted,
    });
  } catch (error) {
    if (error instanceof ReauthRequiredError) {
      return Response.json(
        {error: error.message, code: "REAUTH_REQUIRED"},
        {status: 401}
      );
    }

    console.error("Error syncing GSC data:", error);
    return Response.json(
      {error: error instanceof Error ? error.message : "Failed to sync GSC data"},
      {status: 500}
    );
  }
}
