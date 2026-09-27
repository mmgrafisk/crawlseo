import Link from "next/link";
import {redirect} from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Gauge,
  Layers3,
  SearchCheck,
} from "lucide-react";
import {auth} from "@/lib/auth";
import {db} from "@/lib/db";
import {CrawlButton} from "@/components/sites/action-buttons";
import {CrawlStatusPoller} from "@/components/sites/crawl-status-poller";
import {CrawledPagesTable} from "@/components/sites/crawled-pages-table";
import {cn} from "@/lib/utils";

interface Props {
  params: Promise<{siteId: string}>;
}

export default async function CrawlPage({params}: Props) {
  const session = await auth();
  const {siteId} = await params;

  const site = await db.site.findUnique({
    where: {id: siteId},
    select: {userId: true, domain: true},
  });
  if (!site || site.userId !== session?.user?.id) redirect("/sites");

  const runningCrawl = await db.crawl.findFirst({
    where: {siteId, status: "RUNNING"},
    select: {id: true, pagesFound: true, startedAt: true, coveragePercent: true},
  });

  const latest = await db.crawl.findFirst({
    where: {siteId, status: {in: ["COMPLETED", "PARTIAL", "FAILED", "CANCELLED"]}},
    orderBy: {startedAt: "desc"},
    include: {
      issues: {
        where: {
          NOT: {details: {path: ["kind"], equals: "crawl_summary"}},
        },
        take: 200,
      },
    },
  });

  const auditPages = latest
    ? await db.auditPage.findMany({
        where: {crawlId: latest.id},
        orderBy: {contentScore: "desc"},
        take: 200,
      })
    : [];

  const realIssues =
    latest?.issues.filter((issue) => {
      const kind = (issue.details as {kind?: string} | null)?.kind;
      return kind !== "crawl_summary" && kind !== "content_score";
    }) || [];

  const bySeverity = {
    CRITICAL: realIssues.filter((issue) => issue.severity === "CRITICAL").length,
    WARNING: realIssues.filter((issue) => issue.severity === "WARNING").length,
    INFO: realIssues.filter((issue) => issue.severity === "INFO").length,
  };

  const avgContentScore = auditPages.length
    ? Math.round(auditPages.reduce((sum, page) => sum + page.contentScore, 0) / auditPages.length)
    : null;
  const orphanCount = auditPages.filter((page) => page.internalLinks === 0 && page.url !== "/").length;
  const sortedIssues = [...realIssues].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  const isComplete = latest?.status === "COMPLETED";

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{site.domain}</span>
            <span>·</span>
            <span>SEO Audit</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-[34px]">
            Findings & scanninger
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
            Teknisk evidens fra crawl, metadata, links, indexability, sitemap og on-page signaler.
          </p>
        </div>
        <CrawlButton siteId={siteId} />
      </section>

      {runningCrawl ? (
        <section className="reliva-panel overflow-hidden border-[#bcdaf0] bg-[#f7fbfe] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#388ee8] shadow-[0_0_0_4px_rgba(56,142,232,.12)]" />
              <p className="text-sm font-semibold text-foreground">Scanning kører</p>
            </div>
            {runningCrawl.coveragePercent != null ? (
              <span className="font-data text-xs font-semibold text-[#347fbf]">
                {Math.round(runningCrawl.coveragePercent)}%
              </span>
            ) : null}
          </div>
          <CrawlStatusPoller siteId={siteId} crawlId={runningCrawl.id} />
        </section>
      ) : null}

      {latest && !isComplete ? (
        <CoverageWarning
          status={latest.status}
          coveragePercent={latest.coveragePercent}
          coverageReason={latest.coverageReason}
          pagesFound={latest.pagesFound}
          attemptedUrls={latest.attemptedUrls}
          failedUrls={latest.failedUrls}
        />
      ) : null}

      {!latest ? (
        <section className="reliva-panel flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-[#edf5ff] text-[#388ee8]">
            <SearchCheck className="size-5" strokeWidth={1.8} />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-foreground">Ingen afsluttet scanning endnu</h2>
          <p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">
            Start første crawl for at kontrollere titles, descriptions, headings, canonicals, links, sitemap, schema og performance-signaler.
          </p>
          <div className="mt-5">
            <CrawlButton siteId={siteId} />
          </div>
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <AuditMetric
              icon={Gauge}
              label="Site health"
              value={isComplete && latest.healthScore != null ? `${latest.healthScore}` : "—"}
              suffix={isComplete && latest.healthScore != null ? "/100" : undefined}
              note={isComplete ? "Komplet scan" : "Skjult indtil scan er komplet"}
              tone={isComplete ? healthTone(latest.healthScore) : "amber"}
            />
            <AuditMetric
              icon={FileText}
              label="Observerede sider"
              value={latest.pagesFound.toLocaleString("da-DK")}
              note={isComplete ? "Komplet scanning" : scanStatusLabel(latest.status, latest.coveragePercent)}
              tone={isComplete ? "blue" : "amber"}
            />
            <AuditMetric
              icon={AlertTriangle}
              label="Findings"
              value={realIssues.length.toLocaleString("da-DK")}
              note={isComplete ? `${bySeverity.CRITICAL} kritiske` : "Foreløbige findings"}
              tone={isComplete ? "red" : "amber"}
            />
            <AuditMetric
              icon={Layers3}
              label="Content score"
              value={isComplete && avgContentScore != null ? `${avgContentScore}` : "—"}
              suffix={isComplete && avgContentScore != null ? "/100" : undefined}
              note={isComplete ? "Ekstern heuristik" : "Skjult ved ufuldstændig dækning"}
              tone="amber"
            />
            <AuditMetric
              icon={SearchCheck}
              label="Orphan candidates"
              value={orphanCount.toLocaleString("da-DK")}
              note={isComplete ? "Kræver separat evidens" : "Foreløbige kandidater"}
              tone={isComplete ? "blue" : "amber"}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,.9fr)]">
            <div className="reliva-panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-5">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Crawlede sider</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{auditPages.length} sider med gemt metadata</p>
                </div>
                <span className={cn(
                  "rounded-md px-2 py-1 text-[10px] font-semibold",
                  isComplete ? "bg-[#e5f7ef] text-[#16895f]" : "bg-[#fff4dd] text-[#9b6816]"
                )}>
                  {isComplete ? "Komplet scan" : "Ufuldstændig dækning"}
                </span>
              </div>
              {auditPages.length ? (
                <CrawledPagesTable
                  rows={auditPages.slice(0, 100).map((page) => ({
                    id: page.id,
                    url: page.url,
                    statusCode: page.statusCode,
                    contentScore: page.contentScore,
                    wordCount: page.wordCount,
                    h1Count: page.h1Count,
                    imageCount: page.imageCount,
                    imagesMissingAlt: page.imagesMissingAlt,
                    internalLinks: page.internalLinks,
                    responseTimeMs: page.responseTimeMs,
                  }))}
                />
              ) : (
                <div className="px-5 py-10 text-sm text-muted-foreground">Ingen crawl-data gemt.</div>
              )}
            </div>

            <div id="findings" className="reliva-panel overflow-hidden scroll-mt-20">
              <div className="border-b border-border px-4 py-3.5 sm:px-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Findings</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {bySeverity.CRITICAL} kritiske · {bySeverity.WARNING} advarsler · {bySeverity.INFO} info
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#347fbf]">{realIssues.length}</span>
                </div>
              </div>

              {sortedIssues.length ? (
                <div className="divide-y divide-border">
                  {sortedIssues.slice(0, 14).map((issue) => {
                    const details = issue.details as {howToFix?: string; kind?: string} | null;
                    return (
                      <div key={issue.id} className="px-4 py-3 sm:px-5">
                        <div className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-start gap-2.5">
                          <span className={cn("mt-1.5 size-2 rounded-full", severityDot(issue.severity))} />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold leading-5 text-foreground">{issue.message}</p>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{issue.url}</p>
                          </div>
                          <span className={cn("rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.04em]", severityBadge(issue.severity))}>
                            {severityLabel(issue.severity)}
                          </span>
                        </div>
                        {details?.howToFix ? (
                          <p className="mt-2 pl-[18px] text-[11px] leading-5 text-muted-foreground">
                            <span className="font-semibold text-foreground/80">Forslag: </span>
                            {details.howToFix}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center">
                  {isComplete ? (
                    <CheckCircle2 className="size-7 text-[#24a56f]" />
                  ) : (
                    <SearchCheck className="size-7 text-[#388ee8]" />
                  )}
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    {isComplete ? "Ingen findings i den komplette scanning" : "Ingen findings i de observerede sider"}
                  </p>
                  <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                    {isComplete
                      ? "Resultatet gælder den dokumenterede scan-dækning."
                      : "Det er ikke et OK-signal. Scan-dækningen er ufuldstændig."}
                  </p>
                </div>
              )}

              {realIssues.length > 14 ? (
                <div className="border-t border-border px-4 py-3 sm:px-5">
                  <Link href="#findings" className="inline-flex items-center gap-1 text-xs font-semibold text-[#347fbf]">
                    Vis flere findings <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              ) : null}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function CoverageWarning({
  status,
  coveragePercent,
  coverageReason,
  pagesFound,
  attemptedUrls,
  failedUrls,
}: {
  status: string;
  coveragePercent: number | null;
  coverageReason: string | null;
  pagesFound: number;
  attemptedUrls: number;
  failedUrls: number;
}) {
  return (
    <section className="reliva-panel border-[#ead7aa] bg-[#fffaf0] px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-[#b97b13]" strokeWidth={1.9} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#80570e]">Denne scanning må ikke læses som komplet/OK</p>
          <p className="mt-1 text-xs leading-5 text-[#76664b]">
            {scanStatusLabel(status, coveragePercent)} · {pagesFound.toLocaleString("da-DK")} sider observeret
            {attemptedUrls > 0 ? ` · ${attemptedUrls.toLocaleString("da-DK")} URL-forsøg` : ""}
            {failedUrls > 0 ? ` · ${failedUrls.toLocaleString("da-DK")} fejlede` : ""}.
            {coverageReason ? ` ${coverageReason}` : " Findings og kandidater er foreløbige, indtil dækningen er komplet."}
          </p>
        </div>
      </div>
    </section>
  );
}

function AuditMetric({
  icon: Icon,
  label,
  value,
  suffix,
  note,
  tone,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  suffix?: string;
  note?: string;
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="reliva-kpi text-2xl font-semibold text-foreground">{value}</span>
            {suffix ? <span className="text-xs text-muted-foreground">{suffix}</span> : null}
          </div>
        </div>
        <span className={cn("flex size-9 items-center justify-center rounded-full", tones[tone])}>
          <Icon className="size-4" strokeWidth={1.8} />
        </span>
      </div>
      {note ? <p className="mt-2 text-[11px] text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function healthTone(score: number | null) {
  if (score == null) return "blue" as const;
  if (score >= 80) return "green" as const;
  if (score >= 60) return "amber" as const;
  return "red" as const;
}

function scanStatusLabel(status: string, coveragePercent: number | null) {
  if (status === "PARTIAL") return `Delvis scanning${coveragePercent != null ? ` · ${Math.round(coveragePercent)}% dækning` : ""}`;
  if (status === "FAILED") return "Scanning fejlede";
  if (status === "CANCELLED") return "Scanning annulleret";
  return "Ufuldstændig scanning";
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
