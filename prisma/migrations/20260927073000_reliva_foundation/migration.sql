-- Reliva Visibility standalone foundation
-- Additive migration: preserves all existing CrawlSEO rows while introducing
-- organizations, employee roles, tasks, auditability and explicit crawl coverage.

CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'VIEWER');
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'IMPLEMENTED_PENDING_VERIFICATION', 'VERIFIED', 'IGNORED');
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

ALTER TYPE "CrawlStatus" ADD VALUE IF NOT EXISTS 'PARTIAL';
ALTER TYPE "CrawlStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "IssueType" ADD VALUE IF NOT EXISTS 'ORPHAN_PAGE';
ALTER TYPE "IssueType" ADD VALUE IF NOT EXISTS 'THIN_CONTENT';
ALTER TYPE "IssueType" ADD VALUE IF NOT EXISTS 'CRAWL_SUMMARY';

ALTER TABLE "User"
  ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'da',
  ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'Europe/Copenhagen';

ALTER TABLE "Site"
  ADD COLUMN "organizationId" TEXT,
  ADD COLUMN "marketCode" TEXT,
  ADD COLUMN "contentLocale" TEXT;

ALTER TABLE "Crawl"
  ADD COLUMN "discoveredUrls" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "attemptedUrls" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "fetchedUrls" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "failedUrls" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "excludedUrls" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sitemapUrls" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "coveragePercent" DOUBLE PRECISION,
  ADD COLUMN "coverageReason" TEXT;

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Membership" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "OrganizationRole" NOT NULL DEFAULT 'EMPLOYEE',
  "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invitation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "OrganizationRole" NOT NULL DEFAULT 'EMPLOYEE',
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "invitedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Task" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "siteId" TEXT,
  "findingId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "createdById" TEXT NOT NULL,
  "assignedToId" TEXT,
  "completedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "verificationNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "before" JSONB,
  "after" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "Membership_organizationId_userId_key" ON "Membership"("organizationId", "userId");
CREATE INDEX "Membership_userId_status_idx" ON "Membership"("userId", "status");
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");
CREATE INDEX "Invitation_organizationId_email_idx" ON "Invitation"("organizationId", "email");
CREATE INDEX "Invitation_email_acceptedAt_idx" ON "Invitation"("email", "acceptedAt");
CREATE INDEX "Site_organizationId_domain_idx" ON "Site"("organizationId", "domain");
CREATE INDEX "Task_organizationId_status_idx" ON "Task"("organizationId", "status");
CREATE INDEX "Task_siteId_status_idx" ON "Task"("siteId", "status");
CREATE INDEX "Task_assignedToId_status_idx" ON "Task"("assignedToId", "status");
CREATE INDEX "Task_findingId_idx" ON "Task"("findingId");
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
CREATE INDEX "Notification_organizationId_createdAt_idx" ON "Notification"("organizationId", "createdAt");

ALTER TABLE "Site" ADD CONSTRAINT "Site_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_siteId_fkey"
  FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_findingId_fkey"
  FOREIGN KEY ("findingId") REFERENCES "CrawlIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
