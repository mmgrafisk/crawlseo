import Link from "next/link";
import {ArrowRight, CheckCircle2, Globe2, SearchCheck, ShieldAlert} from "lucide-react";
import {auth} from "@/lib/auth";
import {db} from "@/lib/db";
import {getSitePeriodMetrics, formatCompact} from "@/lib/seo-metrics";
import {AddSiteModal} from "@/components/sites/add-site-modal";
import {OnboardingChecklist} from "@/components/dashboard/onboarding-checklist";
import {DataLagBadge} from "@/components/ui/data-lag-badge";
import {formatDeltaPercent} from "@/lib/format";
import {cn} from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();

  const sites = await db.site.findMany({
    where: {userId: session?.user?.id},
    select: {
      id: true,
      domain: true,
      gscProperty: true,
      _count: {select: {keywords: true, pages: true, crawls: true}},
    },
    orderBy: {domain: "asc"},
  });

  const hasData = (site: (typeof sites)[number]) => site._count.keywords > 0 || site._count.pages > 0;
  const hasSites = sites.length > 0;
  const hasGscConnected = sites.some((site) => site.gscProperty);
  const hasSyncedData = sites.some(hasData);
  const hasCrawled = sites.some((site) => site._count.crawls > 0);

  const siteCards = await Promise.all(
    sites.map(async (site) => {
      const [metrics, latestCrawl] = await Promise.all([
        hasData(site) ? getSitePeriodMetrics(site.id, 28).catch(() => null) : Promise.resolve(null),
        db.crawl.findFirst({
          where: {siteId: site.id},
          orderBy: {startedAt: "desc"},
          select: {healthScore: true, issuesFound: true, status: true, finishedAt: true},
        }),
      ]);
      return {site, metrics, latestCrawl};
    })
  );

  const connectedCount = sites.filter((site) => site.gscProperty).length;
  const totalIssues = siteCards.reduce((sum, item) => sum + (item.latestCrawl?.issuesFound ?? 0), 0);
  const averageHealthValues = siteCards
    .map((item) => item.latestCrawl?.healthScore)
    .filter((value): value is number => typeof value === "number");
  const averageHealth = averageHealthValues.length
    ? Math.round(averageHealthValues.reduce((sum, value) => sum + value, 0) / averageHealthValues.length)
    : null;

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Reliva Visibility</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-[34px]">
            Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Overblik over websites, datadækning, findings og næste handlinger.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DataLagBadge />
          <AddSiteModal triggerLabel="Tilføj website" />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Globe2}
          label="Websites"
          value={sites.length.toLocaleString()}
          note={sites.length === 1 ? "1 website i workspace" : `${sites.length} websites i workspace`}
          tone="blue"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Google forbundet"
          value={`${connectedCount}/${sites.length || 0}`}
          note="Search Console read-only"
          tone="green"
        />
        <SummaryCard
          icon={SearchCheck}
          label="Gns. site health"
          value={averageHealth == null ? "—" : `${averageHealth}`}
          note={averageHealth == null ? "Kræver mindst én scanning" : "Baseret på seneste scanning pr. site"}
          tone="green"
        />
        <SummaryCard
          icon={ShieldAlert}
          label="Aktive findings"
          value={totalIssues.toLocaleString()}
          note="Seneste scanning på tværs af sites"
          tone="red"
        />
      </section>

      {!hasSites ? (
        <section className="reliva-panel p-5 sm:p-6">
          <OnboardingChecklist
            hasSites={false}
            hasGscConnected={false}
            hasSyncedData={false}
            hasCrawled={false}
          />
          <div className="mt-5 flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-[#f9fbfc] px-6 text-center">
            <Globe2 className="size-7 text-[#388ee8]" strokeWidth={1.7} />
            <h2 className="mt-3 text-base font-semibold text-foreground">Tilføj dit første website</h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
              Forbind Search Console med read-only adgang og start derefter første scanning.
            </p>
          </div>
        </section>
      ) : (
        <>
          <OnboardingChecklist
            hasSites={hasSites}
            hasGscConnected={hasGscConnected}
            hasSyncedData={hasSyncedData}
            hasCrawled={hasCrawled}
            firstSiteId={sites[0]?.id}
          />

          <section className="reliva-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Websites</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">28 dage sammenlignet med forrige periode</p>
              </div>
              <Link href="/sites" className="inline-flex items-center gap-1 text-xs font-semibold text-[#347fbf]">
                Administrér <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-border">
              {siteCards.map(({site, metrics, latestCrawl}) => (
                <Link
                  key={site.id}
                  href={`/sites/${site.id}`}
                  className="grid gap-4 px-4 py-4 transition hover:bg-[#f8fafc] sm:px-5 lg:grid-cols-[minmax(180px,1.35fr)_repeat(4,minmax(90px,.65fr))_24px] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("size-2 rounded-full", site.gscProperty ? "bg-[#24a56f]" : "bg-[#a9b3bf]")} />
                      <p className="truncate text-sm font-semibold text-foreground">{site.domain}</p>
                    </div>
                    <p className="mt-1 truncate pl-4 text-[11px] text-muted-foreground">
                      {site.gscProperty || "Search Console ikke forbundet"}
                    </p>
                  </div>

                  <RowMetric label="Health" value={latestCrawl?.healthScore == null ? "—" : `${latestCrawl.healthScore}/100`} />
                  <RowMetric label="Findings" value={latestCrawl?.issuesFound?.toLocaleString() ?? "—"} />
                  <RowMetric label="Clicks" value={metrics ? formatCompact(metrics.current.clicks) : "—"} delta={metrics ? formatDeltaPercent(metrics.deltas.clicks) : undefined} positive={metrics ? metrics.deltas.clicks >= 0 : undefined} />
                  <RowMetric label="Impressions" value={metrics ? formatCompact(metrics.current.impressions) : "—"} delta={metrics ? formatDeltaPercent(metrics.deltas.impressions) : undefined} positive={metrics ? metrics.deltas.impressions >= 0 : undefined} />
                  <ArrowRight className="hidden size-4 text-muted-foreground lg:block" />
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: typeof Globe2;
  label: string;
  value: string;
  note: string;
  tone: "green" | "blue" | "red";
}) {
  const tones = {
    green: "bg-[#e5f7ef] text-[#159264]",
    blue: "bg-[#edf5ff] text-[#3d88df]",
    red: "bg-[#ffeded] text-[#df4343]",
  };

  return (
    <div className="reliva-panel reliva-panel-hover p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="reliva-kpi mt-2 text-3xl font-semibold text-foreground">{value}</p>
        </div>
        <span className={cn("flex size-10 items-center justify-center rounded-full", tones[tone])}>
          <Icon className="size-4.5" strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function RowMetric({label, value, delta, positive}: {label: string; value: string; delta?: string; positive?: boolean}) {
  return (
    <div className="grid grid-cols-[90px_1fr] items-baseline gap-3 lg:block">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <div className="mt-0.5 flex items-baseline gap-2">
        <p className="font-data text-sm font-semibold text-foreground">{value}</p>
        {delta ? (
          <span className={cn("text-[10px] font-semibold", positive ? "text-[#159264]" : "text-[#d04444]")}>{delta}</span>
        ) : null}
      </div>
    </div>
  );
}
