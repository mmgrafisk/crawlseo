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
          scope: "openid email profile https://www.googleapis.com/auth/webmasters.readonly",
          access_type: "offline",
          prompt: "consent",
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
        // Legacy users are allowed during the organization migration. Once a
        // user has memberships, at least one must be active.
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
    async signIn({user, account}) {
      const email = user.email?.trim().toLowerCase();
      if (!email) return;

      const persistedUser = user.id
        ? {id: user.id}
        : await db.user.findUnique({where: {email}, select: {id: true}});

      if (account?.access_token) {
        try {
          await db.user.update({
            where: {email},
            data: {
              googleTokens: {
                accessToken: account.access_token,
                refreshToken: account.refresh_token,
                expiresAt: account.expires_at ? account.expires_at * 1000 : undefined,
                tokenType: account.token_type,
                scope: account.scope,
              },
            },
          });
        } catch (error) {
          console.error("Failed to save Google tokens:", error);
        }
      }

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
