# Reliva Visibility — Foundation Scope v0.1

## Product platform

Reliva Visibility is being rebuilt as a standalone application using the forked CrawlSEO codebase as an upstream donor/base. Directus is legacy/migration source, not the long-term product shell.

## Target stack

- Next.js 16 + React 19
- TypeScript strict
- Tailwind CSS v4 + shadcn/ui
- Prisma + PostgreSQL
- Auth.js / NextAuth employee login
- `next-intl` from day one: Danish default, English supported
- Vercel-first runtime/deployment
- Sanity for knowledge/editorial content only
- Zod validation
- Vitest + browser E2E gate

## Domain foundations

- Organization → Membership → User
- Roles: Owner, Admin, Manager, Employee, Viewer
- Website/Site belongs to an organization after migration
- UI locale is distinct from website market/content locale
- Findings → Tasks → Implemented pending verification → later verification scan
- Partial crawl state and coverage are first-class data

## Authentication and external connections

Employee authentication and third-party data authorization are separate security boundaries.

- Employee Google login requests only `openid email profile`.
- Reliva is invite-only; a login identity alone does not create organization membership.
- Google Search Console is authorized explicitly from Connections and requests only `webmasters.readonly`.
- Search Console OAuth state is verified before token exchange.
- New Search Console token writes are encrypted at rest; legacy plain-token reads exist only as a migration compatibility path.
- Changing site connections requires Owner/Admin permission.
- Shopify stays read-only and must never inherit employee-login authorization as an implicit permission to mutate external systems.

The current CrawlSEO-compatible `User.googleTokens` field remains transitional. Before multi-user production rollout, integration credentials should move to a site/organization-scoped integration record so scheduled syncs do not depend on whichever employee authorized Google.

## Design foundation

Design quality is a release gate. The visual system is light-first for the main workspace with a dark navy navigation rail, restrained cards, dense operational tables, clear hierarchy, explicit status semantics and desktop-productivity-first responsive behavior.

Representative surfaces must be visually proven before broad feature rollout: login, dashboard, site overview, SEO Audit/findings, tasks and connections/settings.

## Upstream CrawlSEO reuse

Adapt selectively: crawler/security primitives, robots/sitemap, link graph, page snapshot parsing, GSC, PageSpeed/Core Web Vitals, opportunity patterns, alerts and MCP concepts.

Do not inherit weak semantics. Orphan pages, thin content and crawl summaries need distinct rule IDs. Heuristics must be labelled as heuristics rather than official Google rules.

## Guardrails

Shopify is permanently read-only. Existing `rv_*` data is preserved until an approved and verified migration. External access is not permission to mutate external systems. Production is not considered verified until automated tests, browser QA and migration/data checks pass.
