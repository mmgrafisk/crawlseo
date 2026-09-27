import {auth} from "@/lib/auth";
import {db} from "@/lib/db";
import {assertPublicDomain} from "@/lib/crawler/engine";
import {canManageSite, getSiteAccess} from "@/lib/permissions";
import {siteDomainFromProperty} from "@/lib/site-domain";

export async function GET(
  _req: Request,
  {params}: {params: Promise<{siteId: string}>}
) {
  const {siteId} = await params;

  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return Response.json({error: "Unauthorized"}, {status: 401});
    }

    const access = await getSiteAccess(userId, siteId);
    if (!access) {
      return Response.json({error: "Site not found"}, {status: 404});
    }

    const site = await db.site.findUnique({
      where: {id: siteId},
      select: {
        id: true,
        domain: true,
        gscProperty: true,
        marketCode: true,
        contentLocale: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            keywords: true,
            pages: true,
            crawls: true,
            vitals: true,
          },
        },
      },
    });

    if (!site) return Response.json({error: "Site not found"}, {status: 404});
    return Response.json(site);
  } catch (error) {
    console.error("Error fetching site:", error);
    return Response.json(
      {error: error instanceof Error ? error.message : "Failed to fetch site"},
      {status: 500}
    );
  }
}

export async function PUT(
  req: Request,
  {params}: {params: Promise<{siteId: string}>}
) {
  const {siteId} = await params;

  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return Response.json({error: "Unauthorized"}, {status: 401});
    }

    const access = await getSiteAccess(userId, siteId);
    if (!access) {
      return Response.json({error: "Site not found"}, {status: 404});
    }
    if (!canManageSite(access.role)) {
      return Response.json({error: "Admin access required"}, {status: 403});
    }

    const {domain, gscProperty} = (await req.json()) as {
      domain?: string;
      gscProperty?: string;
    };

    const normalizedDomain = domain ? siteDomainFromProperty(domain) : null;
    if (domain && !normalizedDomain) {
      return Response.json({error: "Invalid domain"}, {status: 400});
    }

    if (normalizedDomain) {
      try {
        await assertPublicDomain(normalizedDomain);
      } catch {
        return Response.json(
          {error: "Domain must resolve to a public IP address"},
          {status: 400}
        );
      }
    }

    const updated = await db.site.update({
      where: {id: siteId},
      data: {
        ...(normalizedDomain && {domain: normalizedDomain}),
        ...(gscProperty && {gscProperty}),
      },
      select: {
        id: true,
        domain: true,
        gscProperty: true,
        updatedAt: true,
      },
    });

    if (access.organizationId) {
      await db.auditLog.create({
        data: {
          organizationId: access.organizationId,
          actorUserId: userId,
          action: "site.updated",
          entityType: "Site",
          entityId: siteId,
          after: {
            domain: updated.domain,
            gscProperty: updated.gscProperty,
          },
        },
      });
    }

    return Response.json(updated);
  } catch (error) {
    console.error("Error updating site:", error);
    return Response.json(
      {error: error instanceof Error ? error.message : "Failed to update site"},
      {status: 500}
    );
  }
}

export async function DELETE(
  _req: Request,
  {params}: {params: Promise<{siteId: string}>}
) {
  const {siteId} = await params;

  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return Response.json({error: "Unauthorized"}, {status: 401});
    }

    const access = await getSiteAccess(userId, siteId);
    if (!access) {
      return Response.json({error: "Site not found"}, {status: 404});
    }
    if (!canManageSite(access.role)) {
      return Response.json({error: "Admin access required"}, {status: 403});
    }

    if (access.organizationId) {
      await db.auditLog.create({
        data: {
          organizationId: access.organizationId,
          actorUserId: userId,
          action: "site.delete_requested",
          entityType: "Site",
          entityId: siteId,
          before: {domain: access.site.domain},
        },
      });
    }

    await db.site.delete({where: {id: siteId}});
    return Response.json({success: true});
  } catch (error) {
    console.error("Error deleting site:", error);
    return Response.json(
      {error: error instanceof Error ? error.message : "Failed to delete site"},
      {status: 500}
    );
  }
}
