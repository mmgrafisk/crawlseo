# CrawlSEO upstream README summary

This file summarizes the README and feature framing that existed in the CrawlSEO fork before the Reliva Visibility product re-foundation. It is retained for upstream context and feature provenance; it is not the active Reliva product specification.

---

# CrawlSEO

### Open-source SEO monitoring for founders, not SEO specialists

Google Search Console + Site Crawler + Core Web Vitals + MCP Server — all in one self-hosted dashboard.

## Upstream feature set

- GSC analytics for keywords/pages/clicks/impressions/positions
- concurrent site crawler (up to 2,000 pages in the upstream implementation)
- Core Web Vitals/PageSpeed
- MCP server
- DataForSEO-backed keyword research and backlinks (BYOK)
- rank tracking
- SEO opportunity heuristics
- alerts
- CSV export
- light/dark theme

## Upstream stack

- Next.js 16 App Router
- TypeScript
- PostgreSQL
- Prisma
- NextAuth.js v5
- shadcn/ui + Tailwind CSS v4
- Recharts
- Lucide React
- MCP SDK
- Docker Compose deployment

## Upstream quick start (historical)

```bash
git clone https://github.com/crawlseo/crawlseo.git
cd crawlseo
cp .env.example .env.local
docker compose up -d db
npm install
npx prisma migrate dev --name init
npm run dev
```

The active Reliva architecture differs materially: Vercel-first deployment, Reliva organizations/memberships, invite-only employees, i18n, evidence/task/verification semantics, explicit partial-scan handling, and a separate product design system.

See the repository `LICENSE` and `NOTICE.md` for upstream licensing/attribution.
