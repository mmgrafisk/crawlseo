import Link from "next/link";
import {redirect} from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Globe2,
  Lightbulb,
  SearchCheck,
} from "lucide-react";
import {auth} from "@/lib/auth";
import {db} from "@/lib/db";
import {getAllOpportunities} from "@/lib/seo-opportunities";
import {DashboardMetrics} from "@/components/dashboard/metrics";
import {TrafficChart} from "@/components/dashboard/traffic-chart";
import {TopKeywords} from "@/components/dashboard/top-keywords";
import {SyncButton} from "@/components/sites/sync-button";
import {CrawlButton, VitalsButton} from "@/components/sites/action-buttons";
import {DataLagBadge} from "@/components/ui/data-lag-badge";
import {cn} from "@/lib/utils";

interface SitePageProps {
  params: Promise<{siteId: string}>;
}

export default async function SiteOverviewPage({params}: SitePageProps) {
  const session = await auth();
  const {siteId} = await params;

  const site = await db.site.findUnique({
    where: {id: siteId},
    select: {
      userId: true,
      domain: true,
      gscProperty: true,
      _count: {select: {keywords: true, pages: true}},
    },
  });

  if (!site || site.userId !== session?.user?.id) redirect("/sites");

  const latestCrawl = await db.crawl.findFirst({
    where: {siteId},
    orderBy: {startedAt: "desc"},
    select: {
      id: true,
      status: true,
      healthScore: true,
      issuesFound: true,
      pagesFound: true,
      finishedAt: true,
    },
  });

  const latestVital = await db.vitalsReport.findFirst({
    where: {siteId},
    orderBy: {date: "desc"},
    select: {perfScore: true, lcp: true, url: true},
  });

  const topIssues = latestCrawl
    ? await db.crawlIssue.findMany({
        where: {crawlId: latestCrawl.id},
        select: {id: true, type: true, severity: true, message: true, url: true},
        take: 8,
      })
    : [];

  const hasData = site._count.keywords > 0 || site._count.pages > 0;
  const opportunities = hasData ? await getAllOpportunities(siteId) : null;
  const sortedIssues = [...topIssues].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 border-b border-border pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Globe2 className="size-3.5" />
            <span>{site.gscProperty || "Search Console ikke forbundet"}</span>
            {site.gscProperty ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e5f7ef] px-2 py-1 font-medium text-[#157a55]">
                <span className="size-1.5 rounded-full bg-[#24a56f]" />
                Forbundet
              </span>
            ) : null}
          </div>
          <h1 className="truncate text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-[34px]">
            {site.domain}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            SEO-overblik, findings, performance og næste handlinger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DataLagBadge />
          <SyncButton siteId={siteId} />
          <CrawlButton siteId={siteId} />
          <VitalsButton siteId={siteId} />
        </div>
      </section>

      <nav className="flex gap-1 overflow-x-auto border-b border-border" aria-label="Site navigation">
        {[
          ["Overblik", ""],
          ["Sider", "pages"],
          ["SEO Audit", "crawl"],
          ["Muligheder", "opportunities"],
          ["Google & effekt", "keywords"],
          ["Performance", "vitals"],
          ["Monitorering", "alerts"],
          ["Forbindelser", "settings"],
        ].map(([label, path], index) => (
          <Link
            key={label}
            href={path ? `/sites/${siteId}/${path}` : `/sites/${siteId}`}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition",
              index === 0
                ? "border-[#172331] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={SearchCheck}
          label="Site health"
          value={latestCrawl?.healthScore != null ? `${latestCrawl.healthScore}` : "—"}
          suffix={latestCrawl?.healthScore != null ? "/100" : undefined}
          note={latestCrawl ? `${latestCrawl.pagesFound} crawlede sider` : "Kør første scanning"}
          tone="green"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Findings"
          value={latestCrawl?.issuesFound?.toLocaleString() ?? "—"}
          note={latestCrawl ? crawlStatusLabel(latestCrawl.status) : "Ingen scan endnu"}
          tone="red"
        />
        <MetricCard
          icon={FileText}
          label="Sider"
          value={site._count.pages.toLocaleString()}
          note="Search Console landing pages"
          tone="blue"
        />
        <MetricCard
          icon={Lightbulb}
          label="Muligheder"
          value={(opportunities?.feed.length ?? 0).toLocaleString()}
          note="Prioriterbare signaler i perioden"
          tone="amber"
        />
      </section>

      {hasData ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,.9fr)]">
          <div className="reliva-panel overflow-hidden p-1">
            <TrafficChart siteId={siteId} />
          </div>

          <div className="reliva-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Vigtigste findings</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Seneste scanning</p>
              </div>
              <Link
                href={`/sites/${siteId}/crawl`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#347fbf] hover:text-[#286b9f]"
              >
                Se alle <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {sortedIssues.length ? (
              <div className="divide-y divide-border">
                {sortedIssues.map((issue) => (
                  <div key={issue.id} className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3 text-xs">
                    <span className={cn("size-2 rounded-full", severityDot(issue.severity))} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{issue.message}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{issue.url}</p>
                    </div>
                    <span className={cn("rounded-md px-2 py-1 text-[10px] font-semibold", severityBadge(issue.severity))}>
                      {severityLabel(issue.severity)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center">
                <CheckCircle2 className="size-7 text-[#24a56f]" />
                <p className="mt-3 text-sm font-semibold text-foreground">Ingen findings at vise</p>
                <p className="mt-1 text-xs text-muted-foreground">Kør en scanning for at opdatere evidensen.</p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="reliva-panel flex min-h-64 flex-col items-center justify-center px-6 text-center">
          <SearchCheck className="size-8 text-[#388ee8]" strokeWidth={1.6} />
          <h2 className="mt-4 text-lg font-semibold text-foreground">Klar til første datasynk</h2>
          <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
            Synkronisér Search Console og kør en scanning. Reliva viser aldrig manglende data som et grønt nul.
          </p>
        </section>
      )}

      {hasData ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,.8fr)]">
          <div className="reliva-panel overflow-hidden p-1">
            <DashboardMetrics siteId={siteId} />
          </div>
          <div className="reliva-panel overflow-hidden p-1">
            <TopKeywords siteId={siteId} />
          </div>
        </section>
      ) : null}

      <section className="reliva-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Performance snapshot</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {latestVital
              ? `Seneste performance score ${latestVital.perfScore ?? "—"} · LCP ${latestVital.lcp ?? "—"}`
              : "Ingen Core Web Vitals-måling endnu"}
          </p>
        </div>
        <Link
          href={`/sites/${siteId}/vitals`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#347fbf]"
        >
          Åbn performance <ArrowRight className="size-3.5" />
        </Link>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  suffix,
  note,
  tone,
}: {
  icon: typeof SearchCheck;
  label: string;
  value: string;
  suffix?: string;
  note: string;
  tone: "green" | "red" | "blue" | "amber";
}) {
  const tones = {
    green: "bg-[#e5f7ef] text-[#159264]",
    red: "bg-[#ffeded] text-[#df4343]",
    blue: "bg-[#edf5ff] text-[#3d88df]",
    amber: "bg-[#fff5df] text-[#d28c16]",
  };

  return (
    <div className="reliva-panel reliva-panel-hover p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="reliva-kpi text-3xl font-semibold text-foreground">{value}</span>
            {suffix ? <span className="text-xs font-medium text-muted-foreground">{suffix}</span> : null}
          </div>
        </div>
        <span className={cn("flex size-10 items-center justify-center rounded-full", tones[tone])}>
          <Icon className="size-4.5" strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function severityRank(severity: string) {
  return severity === "CRITICAL" ? 0 : severity === "WARNING" ? 1 : 2;
}

function severityDot(severity: string) {
  return severity === "CRITICAL" ? "bg-[#e64949]" : severity === "WARNING" ? "bg-[#e8a223]" : "bg-[#388ee8]";
}

function severityBadge(severity: string) {
  return severity === "CRITICAL"
    ? "bg-[#ffeded] text-[#c93434]"
    : severity === "WARNING"
      ? "bg-[#fff4dd] text-[#a96b08]"
      : "bg-[#eaf4ff] text-[#2f74b7]";
}

function severityLabel(severity: string) {
  return severity === "CRITICAL" ? "Kritisk" : severity === "WARNING" ? "Advarsel" : "Info";
}

function crawlStatusLabel(status: string) {
  if (status === "COMPLETED") return "Seneste scanning gennemført";
  if (status === "RUNNING") return "Scanning kører";
  if (status === "FAILED") return "Seneste scanning fejlede";
  return "Scanning afventer";
}
