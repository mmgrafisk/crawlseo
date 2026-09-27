"use client";

import {useState} from "react";
import Link from "next/link";
import {Check, ChevronRight, Globe2, Link2, RefreshCw, SearchCheck, X} from "lucide-react";
import {cn} from "@/lib/utils";

type Step = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  done: boolean;
  href: string;
  actionLabel: string;
};

interface OnboardingChecklistProps {
  hasSites: boolean;
  hasGscConnected: boolean;
  hasSyncedData: boolean;
  hasCrawled: boolean;
  firstSiteId?: string;
}

export function OnboardingChecklist({
  hasSites,
  hasGscConnected,
  hasSyncedData,
  hasCrawled,
  firstSiteId,
}: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(false);
  const allDone = hasSites && hasGscConnected && hasSyncedData && hasCrawled;
  if (allDone || dismissed) return null;

  const steps: Step[] = [
    {
      id: "add-site",
      label: "Tilføj website",
      description: "Opret det website Reliva skal arbejde med.",
      icon: <Globe2 className="size-4" />,
      done: hasSites,
      href: "/sites",
      actionLabel: "Tilføj",
    },
    {
      id: "connect-gsc",
      label: "Forbind Search Console",
      description: "Read-only adgang til søgeperformance og landing pages.",
      icon: <Link2 className="size-4" />,
      done: hasGscConnected,
      href: firstSiteId ? `/sites/${firstSiteId}` : "/sites",
      actionLabel: "Forbind",
    },
    {
      id: "first-sync",
      label: "Synkronisér GSC data",
      description: "Hent den første dokumenterede periode fra Search Console.",
      icon: <RefreshCw className="size-4" />,
      done: hasSyncedData,
      href: firstSiteId ? `/sites/${firstSiteId}` : "/sites",
      actionLabel: "Synkronisér",
    },
    {
      id: "first-crawl",
      label: "Kør første SEO Audit",
      description: "Scan websitet og opret findings med evidens.",
      icon: <SearchCheck className="size-4" />,
      done: hasCrawled,
      href: firstSiteId ? `/sites/${firstSiteId}/crawl` : "/sites",
      actionLabel: "Start scan",
    },
  ];

  const completedCount = steps.filter((step) => step.done).length;

  return (
    <section className="reliva-panel overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Kom godt i gang</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {completedCount}/{steps.length} grundtrin er færdige
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Skjul onboarding"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="h-1 bg-[#eef2f6]">
        <div
          className="h-full bg-[#24a56f] transition-[width] duration-300"
          style={{width: `${(completedCount / steps.length) * 100}%`}}
        />
      </div>

      <div className="divide-y divide-border">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full",
                step.done ? "bg-[#e5f7ef] text-[#159264]" : "bg-[#edf5ff] text-[#3d88df]"
              )}
            >
              {step.done ? <Check className="size-4" strokeWidth={2.1} /> : step.icon}
            </span>

            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-medium", step.done ? "text-muted-foreground" : "text-foreground")}>
                {step.label}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{step.description}</p>
            </div>

            {step.done ? (
              <span className="hidden text-[11px] font-semibold text-[#159264] sm:inline">Færdig</span>
            ) : (
              <Link
                href={step.href}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:border-[#c9d6e2] hover:bg-[#f8fafc]"
              >
                <span className="hidden sm:inline">{step.actionLabel}</span>
                <ChevronRight className="size-3.5" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
