# Reliva Visibility — Foundation Build Status

Updated: 27 September 2026
Branch: `feature/reliva-design-foundation`

## Current gate

The new standalone Reliva build is **BUILT, awaiting automated verification**. It is not live-tested or production-verified.

## Implemented in this branch

- Reliva design system and redesigned app shell
- Dashboard, site overview, SEO Audit/findings workspace, tasks and connections/settings surfaces
- Next.js + TypeScript + Tailwind/shadcn foundation retained from CrawlSEO
- `next-intl` foundation with Danish default and English messages
- Auth.js employee-login foundation
- Organization / Membership / Invitation / RBAC data model
- Task, audit-log and notification domain models
- Partial/cancelled crawl state plus explicit coverage fields
- Semantic normalization layer for CrawlSEO findings
- Vercel-first application configuration; Docker retained for local/dev fallback

## Verification required before merge

1. `npm ci`
2. `npx prisma generate`
3. `npx prisma validate`
4. `npx tsc --noEmit`
5. lint changed files
6. `npm test`
7. `npm run build`
8. authenticated browser QA at desktop and mobile widths
9. visual review against the approved Reliva design direction
10. migration review against existing data before any production database change

## Non-negotiable guardrails

- Shopify remains read-only.
- Existing Directus `rv_*` data is preserved as migration evidence/source until an approved migration is verified.
- Findings are evidence, not automatic external changes.
- Implemented work requiring verification remains awaiting verification until a later scan confirms it.
- Partial scans must never be represented as complete/healthy.
