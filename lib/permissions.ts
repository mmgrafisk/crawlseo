import {db} from "@/lib/db";

export type RelivaRole = "OWNER" | "ADMIN" | "MANAGER" | "EMPLOYEE" | "VIEWER";

const roleRank: Record<RelivaRole, number> = {
  VIEWER: 0,
  EMPLOYEE: 1,
  MANAGER: 2,
  ADMIN: 3,
  OWNER: 4,
};

export async function getAccessibleOrganizationIds(userId: string) {
  const memberships = await db.membership.findMany({
    where: {userId, status: "ACTIVE"},
    select: {organizationId: true},
  });
  return memberships.map((membership) => membership.organizationId);
}

export async function getOrganizationAccess(userId: string, organizationId: string) {
  const membership = await db.membership.findUnique({
    where: {organizationId_userId: {organizationId, userId}},
    select: {role: true, status: true},
  });
  if (membership?.status !== "ACTIVE") return null;
  return {organizationId, role: membership.role as RelivaRole};
}

export async function getSiteAccess(userId: string, siteId: string) {
  const site = await db.site.findUnique({
    where: {id: siteId},
    select: {id: true, userId: true, organizationId: true, domain: true},
  });
  if (!site) return null;

  if (site.organizationId) {
    const membership = await db.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: site.organizationId,
          userId,
        },
      },
      select: {role: true, status: true},
    });

    if (membership?.status === "ACTIVE") {
      return {
        site,
        organizationId: site.organizationId,
        role: membership.role as RelivaRole,
        legacyOwner: false,
      };
    }
  }

  // Transitional compatibility while existing CrawlSEO-owned sites are being
  // moved into organizations. This path disappears after migration verification.
  if (site.userId === userId) {
    return {
      site,
      organizationId: site.organizationId,
      role: "OWNER" as const,
      legacyOwner: true,
    };
  }

  return null;
}

export function hasMinimumRole(role: RelivaRole, minimum: RelivaRole) {
  return roleRank[role] >= roleRank[minimum];
}

export function canWriteWorkspace(role: RelivaRole) {
  return hasMinimumRole(role, "EMPLOYEE");
}

export function canManageTeam(role: RelivaRole) {
  return hasMinimumRole(role, "ADMIN");
}

export function canManageSite(role: RelivaRole) {
  return hasMinimumRole(role, "ADMIN");
}
