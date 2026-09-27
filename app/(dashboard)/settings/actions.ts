"use server";

import {randomBytes} from "node:crypto";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {z} from "zod";
import {auth} from "@/lib/auth";
import {db} from "@/lib/db";

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE", "VIEWER"]),
});

export async function inviteEmployee(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) redirect("/settings?invite=invalid");

  const membership = await db.membership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      role: {in: ["OWNER", "ADMIN"]},
    },
    select: {organizationId: true},
  });
  if (!membership) redirect("/settings?invite=forbidden");

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const existing = await db.invitation.findFirst({
    where: {
      organizationId: membership.organizationId,
      email: parsed.data.email,
      acceptedAt: null,
    },
    orderBy: {createdAt: "desc"},
    select: {id: true},
  });

  const invitation = existing
    ? await db.invitation.update({
        where: {id: existing.id},
        data: {
          role: parsed.data.role,
          token: randomBytes(32).toString("hex"),
          expiresAt,
          invitedById: userId,
        },
      })
    : await db.invitation.create({
        data: {
          organizationId: membership.organizationId,
          email: parsed.data.email,
          role: parsed.data.role,
          token: randomBytes(32).toString("hex"),
          expiresAt,
          invitedById: userId,
        },
      });

  await db.auditLog.create({
    data: {
      organizationId: membership.organizationId,
      actorUserId: userId,
      action: existing ? "invitation.renewed" : "invitation.created",
      entityType: "Invitation",
      entityId: invitation.id,
      after: {
        email: parsed.data.email,
        role: parsed.data.role,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    },
  });

  revalidatePath("/settings");
  redirect("/settings?invite=created");
}
