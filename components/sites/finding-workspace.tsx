"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {
  Check,
  CheckSquare2,
  ExternalLink,
  Loader2,
  Search,
  Square,
  X,
} from "lucide-react";
import {cn} from "@/lib/utils";

type FindingRow = {
  id: string;
  url: string;
  type: string;
  severity: string;
  message: string;
  howToFix?: string | null;
  sameTypeCount: number;
  taskSent: boolean;
};

export function FindingWorkspace({
  siteId,
  findings,
  canCreateTasks,
}: {
  siteId: string;
  findings: FindingRow[];
  canCreateTasks: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [sent, setSent] = useState<Set<string>>(
    () => new Set(findings.filter((finding) => finding.taskSent).map((finding) => finding.id))
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openFinding = findings.find((finding) => finding.id === openId) ?? null;
  const selectable = findings.filter((finding) => !sent.has(finding.id)).map((finding) => finding.id);
  const selectedUnsent = [...selected].filter((id) => !sent.has(id));
  const allSelected = selectable.length > 0 && selectable.every((id) => selected.has(id));

  function toggle(id: string) {
    if (sent.has(id)) return;
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((previous) => {
      if (allSelected) return new Set();
      const next = new Set(previous);
      for (const id of selectable) next.add(id);
      return next;
    });
  }

  async function createTasks(ids: string[]) {
    const uniqueIds = [...new Set(ids)].filter((id) => !sent.has(id));
    if (!uniqueIds.length || !canCreateTasks) return;

    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/sites/${siteId}/tasks`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({findingIds: uniqueIds}),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(
          data.code === "ORG_MIGRATION_REQUIRED"
            ? "Website skal først knyttes til organisationen, før findings kan sendes til opgaver."
            : data.error || "Opgaverne kunne ikke oprettes."
        );
        return;
      }

      const affected = new Set<string>(data.findingIds ?? uniqueIds);
      setSent((previous) => new Set([...previous, ...affected]));
      setSelected((previous) => {
        const next = new Set(previous);
        for (const id of affected) next.delete(id);
        return next;
      });
      router.refresh();
    } catch {
      setError("Opgaverne kunne ikke oprettes. Prøv igen.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <section id="findings" className="reliva-panel overflow-hidden scroll-mt-20">
        <div className="border-b border-border px-4 py-3.5 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Findings</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Markér flere findings, eller åbn én for evidens og næste handling.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleAll}
                disabled={!selectable.length}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 text-xs font-semibold text-foreground transition hover:bg-[#f7f9fb] disabled:opacity-50"
              >
                {allSelected ? <CheckSquare2 className="size-3.5" /> : <Square className="size-3.5" />}
                {allSelected ? "Fjern markering" : "Markér alle"}
              </button>
              <button
                type="button"
                onClick={() => createTasks(selectedUnsent)}
                disabled={!canCreateTasks || selectedUnsent.length === 0 || sending}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#172331] px-3 text-xs font-semibold text-white transition hover:bg-[#223449] disabled:pointer-events-none disabled:opacity-45"
              >
                {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Opret {selectedUnsent.length || ""} {selectedUnsent.length === 1 ? "opgave" : "opgaver"}
              </button>
            </div>
          </div>
          {error ? <p className="mt-3 text-xs font-medium text-[#c83d3d]">{error}</p> : null}
          {!canCreateTasks ? (
            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
              Opgaveoprettelse aktiveres, når websitet er knyttet til en aktiv Reliva-organisation og din rolle har skriverettighed.
            </p>
          ) : null}
        </div>

        {findings.length ? (
          <div className="divide-y divide-border">
            {findings.map((finding) => {
              const isSent = sent.has(finding.id);
              const isSelected = selected.has(finding.id);
              return (
                <div
                  key={finding.id}
                  className={cn(
                    "grid gap-3 px-4 py-3.5 transition sm:px-5 lg:grid-cols-[26px_10px_minmax(260px,1fr)_110px_100px_94px] lg:items-center",
                    isSent && "bg-[#f3fbf7]"
                  )}
                >
                  <button
                    type="button"
                    disabled={isSent}
                    aria-label={isSelected ? "Fjern finding-markering" : "Markér finding"}
                    onClick={() => toggle(finding.id)}
                    className={cn(
                      "flex size-7 items-center justify-center rounded-md transition",
                      isSelected ? "bg-[#172331] text-white" : "text-[#8896a6] hover:bg-[#eef2f6] hover:text-foreground",
                      isSent && "text-[#24a56f]"
                    )}
                  >
                    {isSent ? <Check className="size-4" /> : isSelected ? <CheckSquare2 className="size-4" /> : <Square className="size-4" />}
                  </button>

                  <span className={cn("size-2 rounded-full", severityDot(finding.severity))} />

                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setOpenId(finding.id)}
                      className="block max-w-full text-left"
                    >
                      <p className="truncate text-sm font-semibold text-foreground hover:text-[#347fbf]">{finding.message}</p>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">{finding.url}</p>
                    </button>
                  </div>

                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-muted-foreground lg:hidden">Type</p>
                    <p className="truncate text-[11px] font-medium text-foreground">{typeLabel(finding.type)}</p>
                  </div>

                  <span className={cn("w-fit rounded-md px-2 py-1 text-[10px] font-semibold", severityBadge(finding.severity))}>
                    {severityLabel(finding.severity)}
                  </span>

                  <button
                    type="button"
                    onClick={() => (isSent ? undefined : createTasks([finding.id]))}
                    disabled={isSent || !canCreateTasks || sending}
                    className={cn(
                      "inline-flex h-8 items-center justify-center rounded-lg border px-2.5 text-[11px] font-semibold transition",
                      isSent
                        ? "border-[#bfe4d3] bg-[#eaf8f1] text-[#16895f]"
                        : "border-border bg-white text-foreground hover:border-[#c9d6e2] hover:bg-[#f8fafc]",
                      !canCreateTasks && !isSent && "opacity-45"
                    )}
                  >
                    {isSent ? "Sendt" : "Opret opgave"}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center">
            <Search className="size-7 text-[#388ee8]" />
            <p className="mt-3 text-sm font-semibold text-foreground">Ingen findings i denne scanning</p>
            <p className="mt-1 text-xs text-muted-foreground">Scan-status og dækning afgør, om det kan tolkes som et reelt OK-resultat.</p>
          </div>
        )}
      </section>

      {openFinding ? (
        <FindingDrawer
          finding={openFinding}
          sent={sent.has(openFinding.id)}
          canCreateTasks={canCreateTasks}
          sending={sending}
          onClose={() => setOpenId(null)}
          onCreate={() => createTasks([openFinding.id])}
        />
      ) : null}
    </>
  );
}

function FindingDrawer({
  finding,
  sent,
  canCreateTasks,
  sending,
  onClose,
  onCreate,
}: {
  finding: FindingRow;
  sent: boolean;
  canCreateTasks: boolean;
  sending: boolean;
  onClose: () => void;
  onCreate: () => void;
}) {
  const evidence = evidenceLevel(finding.type);

  return (
    <div className="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-modal="true" aria-label="Finding details">
      <button type="button" aria-label="Luk finding" className="absolute inset-0 bg-slate-950/35" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-[560px] flex-col border-l border-border bg-[#f7f9fb] shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border bg-white px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-md px-2 py-1 text-[10px] font-semibold", severityBadge(finding.severity))}>
                {severityLabel(finding.severity)}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">{typeLabel(finding.type)}</span>
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.025em] text-foreground">{finding.message}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Luk" className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-4.5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <DetailPanel title="Evidens">
            <DetailRow label="URL">
              <a href={finding.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 break-all text-xs font-medium text-[#347fbf] hover:underline">
                {finding.url} <ExternalLink className="size-3 shrink-0" />
              </a>
            </DetailRow>
            <DetailRow label="Evidensniveau">
              <span className="text-xs font-medium text-foreground">{evidence.label}</span>
            </DetailRow>
            <DetailRow label="Samme finding-type">
              <span className="text-xs font-medium text-foreground">{finding.sameTypeCount} {finding.sameTypeCount === 1 ? "forekomst" : "forekomster"} i scanningen</span>
            </DetailRow>
            <p className="mt-3 rounded-lg bg-[#f4f7fa] px-3 py-2.5 text-[11px] leading-5 text-muted-foreground">
              {evidence.description}
            </p>
          </DetailPanel>

          <DetailPanel title="Hvorfor det betyder noget">
            <p className="text-xs leading-6 text-muted-foreground">{whyItMatters(finding.type)}</p>
          </DetailPanel>

          <DetailPanel title="Foreslået handling">
            <p className="text-xs leading-6 text-muted-foreground">
              {finding.howToFix || "Ingen specifik remediation er dokumenteret endnu. Behandl finding som evidens og verificér løsningen mod den relevante officielle kilde før ændring."}
            </p>
          </DetailPanel>

          <DetailPanel title="Verifikation">
            <p className="text-xs leading-6 text-muted-foreground">
              Når en opgave er implementeret, flyttes den til “Afventer verifikation”. Den bliver først “Verificeret”, når en ny scanning eller anden dokumenteret evidens bekræfter resultatet.
            </p>
          </DetailPanel>
        </div>

        <footer className="border-t border-border bg-white p-4">
          <button
            type="button"
            onClick={onCreate}
            disabled={sent || !canCreateTasks || sending}
            className={cn(
              "inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition",
              sent ? "bg-[#e5f7ef] text-[#16895f]" : "bg-[#172331] text-white hover:bg-[#223449]",
              !canCreateTasks && !sent && "opacity-45"
            )}
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : sent ? <Check className="size-4" /> : null}
            {sent ? "Sendt til opgaver" : "Opret opgave"}
          </button>
        </footer>
      </aside>
    </div>
  );
}

function DetailPanel({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-[0.07em] text-muted-foreground">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function DetailRow({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div className="grid gap-1 border-b border-border py-2.5 first:pt-0 last:border-0 last:pb-0 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-3">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function evidenceLevel(type: string) {
  if (type === "THIN_CONTENT") {
    return {
      label: "Ekstern SEO-heuristik",
      description: "Denne finding er en heuristik fra Relivas analysemodel. Den må ikke fremstilles som en officiel Google-regel.",
    };
  }
  if (type === "CRAWL_SUMMARY") {
    return {
      label: "Systemmetadata",
      description: "Intern scan-metadata og ikke en SEO-finding. Denne type skal normalt ikke vises som en handling.",
    };
  }
  return {
    label: "Dokumenteret observation",
    description: "Reliva har observeret forholdet direkte i crawl-data. Betydning og remediation skal vurderes efter den relevante officielle kildehierarki.",
  };
}

function whyItMatters(type: string) {
  const explanations: Record<string, string> = {
    BROKEN_LINK: "En URL eller ressource kunne ikke hentes som forventet. Det kan påvirke brugerflow, crawlbarhed eller intern linkværdi afhængigt af konteksten.",
    MISSING_TITLE: "Siden mangler et title-element i den observerede HTML. Title bruges af browsere og kan anvendes af søgemaskiner som input til søgeresultater.",
    MISSING_DESCRIPTION: "Siden mangler en meta description i den observerede HTML. Søgemaskiner kan vælge andre snippets, men en beskrivelse kan give redaktionel kontrol over kandidatteksten.",
    MISSING_H1: "Ingen H1 blev observeret. Heading-struktur er primært et dokument- og tilgængelighedssignal og bør vurderes i sidens faktiske indholdskontekst.",
    MULTIPLE_H1: "Flere H1-elementer blev observeret. Det er ikke automatisk en SEO-fejl; finding bruges til at kontrollere dokumentets informationshierarki.",
    MISSING_ALT: "Et eller flere billeder mangler alt-attribut. Det er især et tilgængelighedsproblem og kan samtidig reducere den tekstlige kontekst omkring billedet.",
    MISSING_CANONICAL: "Ingen canonical blev observeret. Det er ikke nødvendigvis forkert, men bør kontrolleres på sider hvor duplicate/variant-signaler forventes.",
    MISSING_SCHEMA: "Ingen understøttet structured-data markup blev observeret. Structured data er kun relevant, hvor indholdet faktisk kvalificerer sig til den pågældende type.",
    ORPHAN_PAGE: "Crawleren fandt ingen interne indgående links til siden i den observerede linkgraf. Det er en kandidat, ikke endeligt bevis på en orphan page.",
    THIN_CONTENT: "Relivas heuristik vurderer siden som indholdsmæssigt tynd ud fra simple mål. Kvalitet kan ikke afgøres af ordtal alene.",
  };
  return explanations[type] || "Finding viser et observeret teknisk forhold. Vurdér konteksten og den relevante officielle dokumentation før ændring.";
}

function typeLabel(type: string) {
  return type.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
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
