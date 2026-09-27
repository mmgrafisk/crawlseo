import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import {PrismaAdapter} from "@auth/prisma-adapter";
import {db} from "./db";

const isBuild =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.SKIP_ENV_VALIDATION === "1";

if (!isBuild && (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)) {
  throw new Error("Missing Google OAuth credentials");
}

export const {handlers, auth, signIn, signOut} = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          // Employee authentication is deliberately separate from external
          // product integrations. Search Console consent is requested only
          // from the Connections workspace when the user chooses to connect it.
          scope: "openid email profile",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({user}) {
      const email = user.email?.trim().toLowerCase();
      if (!email) return false;

      const existing = await db.user.findUnique({
        where: {email},
        select: {
          id: true,
          memberships: {select: {status: true}},
        },
      });

      if (existing) {
        // Transitional compatibility for pre-organization CrawlSEO users.
        // Once memberships exist, at least one must remain active.
        if (existing.memberships.length === 0) return true;
        return existing.memberships.some((membership) => membership.status === "ACTIVE");
      }

      const invitation = await db.invitation.findFirst({
        where: {
          email,
          acceptedAt: null,
          expiresAt: {gt: new Date()},
        },
        select: {id: true},
      });

      return Boolean(invitation);
    },
    async session({session, user}) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
  events: {
    async signIn({user}) {
      const email = user.email?.trim().toLowerCase();
      if (!email) return;

      const persistedUser = user.id
        ? {id: user.id}
        : await db.user.findUnique({where: {email}, select: {id: true}});
      if (!persistedUser) return;

      const invitation = await db.invitation.findFirst({
        where: {
          email,
          acceptedAt: null,
          expiresAt: {gt: new Date()},
        },
        orderBy: {createdAt: "desc"},
        select: {id: true, organizationId: true, role: true},
      });

      if (!invitation) return;

      await db.$transaction([
        db.membership.upsert({
          where: {
            organizationId_userId: {
              organizationId: invitation.organizationId,
              userId: persistedUser.id,
            },
          },
          create: {
            organizationId: invitation.organizationId,
            userId: persistedUser.id,
            role: invitation.role,
            status: "ACTIVE",
          },
          update: {
            role: invitation.role,
            status: "ACTIVE",
          },
        }),
        db.invitation.update({
          where: {id: invitation.id},
          data: {acceptedAt: new Date()},
        }),
      ]);
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "database",
  },
  secret: process.env.NEXTAUTH_SECRET,
});
