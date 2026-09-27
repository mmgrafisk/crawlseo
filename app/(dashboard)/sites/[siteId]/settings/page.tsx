import {CheckCircle2, Database, Globe2, KeyRound, ShieldCheck} from "lucide-react";
import {auth} from "@/lib/auth";
import {db} from "@/lib/db";
import {redirect} from "next/navigation";
import {PageHeader} from "@/components/ui/page-header";
import {DeleteSiteButton} from "@/components/sites/delete-site-button";
import {ApiKeysSection} from "@/components/settings/api-keys-section";

interface Props {
  params: Promise<{siteId: string}>;
}

export default async function SettingsPage({params}: Props) {
  const session = await auth();
  const {siteId} = await params;

  const site = await db.site.findUnique({
    where: {id: siteId},
    select: {
      userId: true,
      domain: true,
      gscProperty: true,
      marketCode: true,
      contentLocale: true,
      createdAt: true,
      _count: {
        select: {
          keywords: true,
          pages: true,
          crawls: true,
          vitals: true,
          alerts: true,
          savedKeywords: true,
        },
      },
    },
  });
  if (!site || site.userId !== session?.user?.id) redirect("/sites");

  const apiKeys = await db.apiKey.findMany({
    where: {userId: session.user.id},
    select: {provider: true, updatedAt: true},
  });
  const apiKeyStatus: Record<string, {connected: boolean; updatedAt?: string}> = {
    dataforseo: {connected: false},
    google_pagespeed: {connected: false},
  };
  for (const key of apiKeys) {
    apiKeyStatus[key.provider] = {
      connected: true,
      updatedAt: key.updatedAt.toISOString(),
    };
  }

  return (
    <div>
      <PageHeader
        title="Forbindelser"
        description={`Datakilder, API-nøgler og website-indstillinger for ${site.domain}. Eksterne tjenester bruger mindst mulige scopes, og Shopify forbliver read-only.`}
      />

      <div className="space-y-5">
        <section className="grid gap-3 lg:grid-cols-3">
          <ConnectionSummary
            icon={Globe2}
            label="Google Search Console"
            status={site.gscProperty ? "Forbundet" : "Ikke forbundet"}
            detail={site.gscProperty || "Tilføj eller genforbind via website-flowet"}
            connected={Boolean(site.gscProperty)}
          />
          <ConnectionSummary
            icon={ShieldCheck}
            label="Adgangsmodel"
            status="Read-only"
            detail="Reliva analyserer data og evidens uden at skrive ændringer til eksterne systemer."
            connected
          />
          <ConnectionSummary
            icon={KeyRound}
            label="Eksterne API-nøgler"
            status={`${apiKeys.length} konfigureret`}
            detail="Nøgler lagres server-side og vises aldrig igen i klartekst."
            connected={apiKeys.length > 0}
          />
        </section>

        <ApiKeysSection initialStatus={apiKeyStatus} />

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
          <div className="reliva-panel overflow-hidden">
            <div className="border-b border-border px-4 py-4 sm:px-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#edf5ff] text-[#3d88df]">
                  <Database className="size-4.5" strokeWidth={1.8} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Gemte data</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Aktuelle records knyttet til websitet</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
              <DataStat label="Keyword records" value={site._count.keywords} />
              <DataStat label="Page records" value={site._count.pages} />
              <DataStat label="Scanninger" value={site._count.crawls} />
              <DataStat label="Vitals reports" value={site._count.vitals} />
              <DataStat label="Alert-regler" value={site._count.alerts} />
              <DataStat label="Gemte keywords" value={site._count.savedKeywords} />
            </div>
          </div>

          <div className="reliva-panel p-5">
            <h2 className="text-sm font-semibold text-foreground">Website</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <DetailRow label="Domæne" value={site.domain} />
              <DetailRow label="Market" value={site.marketCode || "Ikke angivet"} />
              <DetailRow label="Content locale" value={site.contentLocale || "Ikke angivet"} />
              <DetailRow
                label="Tilføjet"
                value={site.createdAt.toLocaleDateString("da-DK", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              />
            </dl>
          </div>
        </section>

        <section className="reliva-panel border-[#efcaca] p-5">
          <h2 className="text-sm font-semibold text-[#c73f3f]">Farezone</h2>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">
            Sletning fjerner websitet og dets tilknyttede CrawlSEO/Reliva-data permanent. Denne handling bruges ikke som del af Directus-migrationen og må ikke bruges til at rydde legacy-data.
          </p>
          <div className="mt-4">
            <DeleteSiteButton siteId={siteId} domain={site.domain} />
          </div>
        </section>
      </div>
    </div>
  );
}

function ConnectionSummary({
  icon: Icon,
  label,
  status,
  detail,
  connected,
}: {
  icon: typeof Globe2;
  label: string;
  status: string;
  detail: string;
  connected: boolean;
}) {
  return (
    <div className="reliva-panel p-4">
      <div className="flex items-start gap-3">
        <span className={connected ? "flex size-9 items-center justify-center rounded-xl bg-[#e5f7ef] text-[#159264]" : "flex size-9 items-center justify-center rounded-xl bg-[#eef2f6] text-[#7b8797]"}>
          <Icon className="size-4.5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className="mt-1 flex items-center gap-1.5">
            {connected ? <CheckCircle2 className="size-3.5 text-[#159264]" /> : null}
            <p className="text-sm font-semibold text-foreground">{status}</p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function DataStat({label, value}: {label: string; value: number}) {
  return (
    <div className="bg-card px-4 py-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="reliva-kpi mt-1.5 text-xl font-semibold text-foreground">{value.toLocaleString("da-DK")}</p>
    </div>
  );
}

function DetailRow({label, value}: {label: string; value: string}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="max-w-[65%] break-words text-right text-xs font-medium text-foreground">{value}</dd>
    </div>
  );
}
