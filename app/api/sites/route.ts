import {auth} from "@/lib/auth";
import {db} from "@/lib/db";
import {assertPublicDomain} from "@/lib/crawler/engine";
import {syncGSCDataForSite} from "@/lib/workers/gsc-sync";
import {ensureDefaultAlerts} from "@/lib/alerts/evaluate";
import {siteDomainFromProperty} from "@/lib/site-domain";
import {
  canManageSite,
  getAccessibleOrganizationIds,
  getOrganizationAccess,
} from "@/lib/permissions";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return Response.json({error: "Unauthorized"}, {status: 401});
    }

    const organizationIds = await getAccessibleOrganizationIds(userId);
    const sites = await db.site.findMany({
      where: {
        OR: [
          {userId},
          ...(organizationIds.length ? [{organizationId: {in: organizationIds}}] : []),
        ],
      },
      select: {
        id: true,
        domain: true,
        gscProperty: true,
        organizationId: true,
        marketCode: true,
        contentLocale: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            keywords: true,
            crawls: true,
          },
        },
      },
      orderBy: {createdAt: "desc"},
      distinct: ["id"],
    });

    return Response.json(sites);
  } catch (error) {
    console.error("Error fetching sites:", error);
    return Response.json(
      {error: error instanceof Error ? error.message : "Failed to fetch sites"},
      {status: 500}
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return Response.json({error: "Unauthorized"}, {status: 401});
    }

    const body = (await req.json()) as {
      gscProperty?: string;
      organizationId?: string;
    };
    const gscProperty = body.gscProperty;

    if (typeof gscProperty !== "string" || !gscProperty.trim()) {
      return Response.json({error: "Missing gscProperty"}, {status: 400});
    }

    const domain = siteDomainFromProperty(gscProperty);
    if (!domain) {
      return Response.json(
        {error: "Could not derive a domain from gscProperty"},
        {status: 400}
      );
    }

    try {
      await assertPublicDomain(domain);
    } catch {
      return Response.json(
        {error: "Domain must resolve to a public IP address"},
        {status: 400}
      );
    }

    let organizationId = body.organizationId?.trim() || null;
    let organizationRole = null;

    if (organizationId) {
      const access = await getOrganizationAccess(userId, organizationId);
      if (!access) {
        return Response.json({error: "Organization not found or unauthorized"}, {status: 404});
      }
      if (!canManageSite(access.role)) {
        return Response.json({error: "Admin access required to add websites"}, {status: 403});
      }
      organizationRole = access.role;
    } else {
      const memberships = await db.membership.findMany({
        where: {userId, status: "ACTIVE"},
        select: {organizationId: true, role: true},
      });

      if (memberships.length === 1) {
        organizationId = memberships[0].organizationId;
        organizationRole = memberships[0].role;
        if (!canManageSite(memberships[0].role)) {
          return Response.json({error: "Admin access required to add websites"}, {status: 403});
        }
      } else if (memberships.length > 1) {
        return Response.json(
          {error: "organizationId is required when you belong to multiple organizations"},
          {status: 400}
        );
      }
    }

    const existing = organizationId
      ? await db.site.findFirst({where: {organizationId, domain}, select: {id: true}})
      : await db.site.findUnique({
          where: {userId_domain: {userId, domain}},
          select: {id: true},
        });

    if (existing) {
      return Response.json({error: "Site already exists"}, {status: 409});
    }

    const site = await db.site.create({
      data: {
        userId,
        organizationId,
        domain,
        gscProperty,
      },
      select: {
        id: true,
        domain: true,
        gscProperty: true,
        organizationId: true,
        createdAt: true,
      },
    });

    await ensureDefaultAlerts(userId, site.id);

    if (organizationId) {
      await db.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: "site.created",
          entityType: "Site",
          entityId: site.id,
          after: {
            domain,
            gscProperty,
            role: organizationRole,
          },
        },
      });
    }

    void syncGSCDataForSite(userId, site.id, 28).catch((err) =>
      console.error("Initial GSC sync failed:", err)
    );

    return Response.json(site, {status: 201});
  } catch (error) {
    console.error("Error creating site:", error);
    return Response.json(
      {error: error instanceof Error ? error.message : "Failed to create site"},
      {status: 500}
    );
  }
}
