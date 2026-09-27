# Reliva Visibility

Reliva Visibility is a standalone, design-first SEO operations workspace for turning evidence into prioritized work and verified improvements.

The application is being re-founded on a fork of the MIT-licensed CrawlSEO project. CrawlSEO remains an upstream donor for useful crawler, Search Console, PageSpeed and MCP primitives; Reliva owns the product architecture, design system, organization/team model, evidence semantics, task verification workflow and integrations built on top.

> **Current status:** active foundation build. The design-foundation pull request is intentionally draft until live visual QA, database migration verification, security triage and canonical MASTER writeback are complete.

## Product rules

- Findings are evidence, not automatic external changes.
- Shopify is read-only unless an explicit future product decision changes that rule.
- `IMPLEMENTED_PENDING_VERIFICATION` is not `VERIFIED`; verification requires later evidence.
- Partial scans must never be presented as complete or healthy.
- Missing/unknown data is never rendered as a green zero.
- Existing Directus `rv_*` data is preserved as a legacy migration source.
- SEO guidance follows: Shopify official → Google official → documented observation → external heuristic.

## Foundation stack

| Layer | Decision |
|---|---|
| App | Next.js 16 + React 19 |
| Language | TypeScript strict |
| UI | Tailwind CSS v4 + shadcn/ui + Reliva Design System |
| i18n | next-intl (`da`, `en`) |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | Auth.js / NextAuth v5 |
| Employees | Invite-only, Organization → Membership → User |
| Roles | Owner / Admin / Manager / Employee / Viewer |
| Validation | Zod |
| Charts | Recharts |
| Icons | Lucide React |
| AI integration | MCP foundation |
| Production direction | Vercel-first |
| Docker | local/fallback only |
| Knowledge CMS | Sanity (separate; not operational DB) |

## Design contract

The interface is a desktop-first operational workspace: dark navy navigation, cool light primary canvas, restrained green/blue accents, clear status semantics, table/list-first operational data and compact but readable density.

Read [`docs/RELIVA_DESIGN_SYSTEM.md`](docs/RELIVA_DESIGN_SYSTEM.md) before adding or restyling product UI.

## Core domain model

```text
Organization
  └─ Membership
      └─ User

Organization
  ├─ Site
  │   ├─ Crawl
  │   │   ├─ AuditPage
  │   │   ├─ AuditLink
  │   │   └─ CrawlIssue
  │   ├─ GSC data
  │   └─ Vitals
  ├─ Task
  ├─ Notification
  └─ AuditLog
```

Task verification flow:

```text
Finding
  → Task
  → In progress
  → Implemented / pending verification
  → later scan or other evidence
  → Verified
```

## Scan coverage

Reliva tracks explicit coverage fields (`discoveredUrls`, `attemptedUrls`, `fetchedUrls`, `failedUrls`, `excludedUrls`, `sitemapUrls`, `coveragePercent`, `coverageReason`) and supports `PARTIAL` and `CANCELLED` scan states in addition to normal pending/running/completed/failed states.

A health score from an incomplete scan must not be surfaced as a completed site-health result.

## Authentication and employee access

There is no public employee registration. New employees require a valid, non-expired invitation for their e-mail address. Current roles are:

- `OWNER`
- `ADMIN`
- `MANAGER`
- `EMPLOYEE`
- `VIEWER`

Google login currently also supplies read-only Search Console authorization. Legacy users without memberships are temporarily supported while the organization migration is completed.

## Local development

Prerequisites: Node.js 20+ and PostgreSQL.

```bash
npm install
cp .env.example .env.local
npx prisma generate
npx prisma migrate dev
npm run dev
```

The existing Docker Compose setup may be used as a local database/runtime fallback. It is no longer the default production direction.

## Automated gates

The standard pull-request workflow runs:

```text
npm ci
Prisma generate
Prisma validate
TypeScript typecheck
ESLint on changed TypeScript files
Vitest
Next.js production build
```

Passing CI means **automated-tested**, not live-tested or production-verified.

## Current production blockers

Before the foundation can be called production-verified:

- run desktop/mobile live visual QA against the accepted design direction
- test the additive Prisma migration on a disposable copy/database
- triage dependency audit findings; do not use `npm audit fix --force`
- review Google OAuth token-at-rest hardening
- wire an employee invitation e-mail provider if e-mail delivery is required
- configure the Vercel production environment and production PostgreSQL target
- update the canonical Reliva Visibility MASTER

## Source of truth

The canonical project governance/source of truth remains `Reliva_Visibility_MASTER.md` in the private `mmgrafisk/Reliva-Visibility` repository until the migration of governance files is explicitly changed.

## Upstream and license

Reliva Visibility currently incorporates and adapts MIT-licensed CrawlSEO code. The original MIT copyright/license notice remains in [`LICENSE`](LICENSE). See [`NOTICE.md`](NOTICE.md) for attribution and [`docs/UPSTREAM_CRAWLSEO_README.md`](docs/UPSTREAM_CRAWLSEO_README.md) for upstream context.
