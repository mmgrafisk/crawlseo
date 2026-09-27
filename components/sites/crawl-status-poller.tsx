"use client";

import {useCallback, useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {Loader2} from "lucide-react";

interface CrawlStatusPollerProps {
  siteId: string;
  crawlId: string;
}

interface CrawlStatus {
  id: string;
  status: string;
  pagesFound: number;
  issuesFound: number;
  healthScore: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  discoveredUrls: number;
  attemptedUrls: number;
  fetchedUrls: number;
  failedUrls: number;
  coveragePercent: number | null;
  coverageReason: string | null;
}

const terminalStates = new Set(["COMPLETED", "PARTIAL", "FAILED", "CANCELLED"]);

export function CrawlStatusPoller({siteId, crawlId}: CrawlStatusPollerProps) {
  const router = useRouter();
  const [status, setStatus] = useState<CrawlStatus | null>(null);

  const poll = useCallback(async () => {
    try {
      const response = await fetch(`/api/sites/${siteId}/crawl/${crawlId}/status`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as CrawlStatus;
      setStatus(data);
      if (terminalStates.has(data.status)) router.refresh();
    } catch {
      // A temporary polling error must not convert the scan itself to failed.
    }
  }, [siteId, crawlId, router]);

  useEffect(() => {
    // Timers are the external subscription here; keeping state updates inside
    // their callbacks avoids an effect-driven synchronous render cascade.
    const initial = window.setTimeout(() => void poll(), 250);
    const interval = window.setInterval(() => void poll(), 3000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [poll]);

  if (status && terminalStates.has(status.status)) return null;

  return (
    <div className="flex items-center gap-3">
      <Loader2 className="size-4 animate-spin text-[#388ee8]" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">Crawler website…</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {status?.fetchedUrls || status?.pagesFound
            ? `${(status.fetchedUrls || status.pagesFound).toLocaleString("da-DK")} sider gemt`
            : "Finder og henter interne URL'er"}
          {status?.failedUrls ? ` · ${status.failedUrls.toLocaleString("da-DK")} fejlede` : ""}
        </p>
      </div>
      {status?.coveragePercent != null ? (
        <span className="font-data text-xs font-semibold text-[#347fbf]">
          {Math.round(status.coveragePercent)}%
        </span>
      ) : null}
    </div>
  );
}
