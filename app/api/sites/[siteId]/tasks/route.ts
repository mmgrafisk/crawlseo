import {auth} from "@/lib/auth";
import {db} from "@/lib/db";
import {z} from "zod";

const payloadSchema = z.object({
  findingIds: z.array(z.string().min(1)).min(1).max(100),
});

export async function POST(
  request: Request,
  {params}: {params: Promise<{siteId: string}>}
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({error: "Unauthorized"}, {status: 401});

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({error: "Invalid finding selection"}, {status: 400});
  }

  const {siteId} = await params;
  const site = await db.site.findUnique({
    where: {id: siteId},
    select: {id: true, domain: true, userId: true, organizationId: true},
  });
  if (!site || site.userId !== userId) {
    return Response.json({error: "Not found"}, {status: 404});
  }
  if (!site.organizationId) {
    return Response.json(
      {error: "Organization migration required before tasks can be created", code: "ORG_MIGRATION_REQUIRED"},
      {status: 409}
    );
  }

  const membership = await db.membership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: site.organizationId,
        userId,
      },
    },
    select: {status: true, role: true},
  });
  if (!membership || membership.status !== "ACTIVE" || membership.role === "VIEWER") {
    return Response.json({error: "Insufficient permission"}, {status: 403});
  }

  const findings = await db.crawlIssue.findMany({
    where: {
      id: {in: parsed.data.findingIds},
      crawl: {siteId},
      type: {not: "CRAWL_SUMMARY"},
    },
    select: {
      id: true,
      type: true,
      severity: true,
      message: true,
      url: true,
      details: true,
    },
  });

  const existing = await db.task.findMany({
    where: {
      organizationId: site.organizationId,
      findingId: {in: findings.map((finding) => finding.id)},
      status: {not: "IGNORED"},
    },
    select: {findingId: true},
  });
  const existingIds = new Set(existing.map((task) => task.findingId).filter(Boolean));
  const toCreate = findings.filter((finding) => !existingIds.has(finding.id));

  if (toCreate.length > 0) {
    await db.$transaction(async (tx) => {
      for (const finding of toCreate) {
        const details = finding.details as {howToFix?: string} | null;
        const task = await tx.task.create({
          data: {
            organizationId: site.organizationId!,
            siteId,
            findingId: finding.id,
            title: finding.message,
            description: details?.howToFix
              ? `${finding.url}\n\nForslag: ${details.howToFix}`
              : finding.url,
            priority: priorityFromSeverity(finding.severity),
            createdById: userId,
          },
        });

        await tx.auditLog.create({
          data: {
            organizationId: site.organizationId!,
            actorUserId: userId,
            action: "task.created_from_finding",
            entityType: "Task",
            entityId: task.id,
            after: {
              siteId,
              findingId: finding.id,
              findingType: finding.type,
              severity: finding.severity,
              url: finding.url,
            },
          },
        });
      }
    });
  }

  return Response.json({
    created: toCreate.length,
    alreadySent: findings.length - toCreate.length,
    findingIds: findings.map((finding) => finding.id),
  });
}

function priorityFromSeverity(severity: "CRITICAL" | "WARNING" | "INFO") {
  if (severity === "CRITICAL") return "CRITICAL" as const;
  if (severity === "WARNING") return "HIGH" as const;
  return "MEDIUM" as const;
}
