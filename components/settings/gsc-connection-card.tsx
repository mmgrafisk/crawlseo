import {CheckCircle2, ExternalLink, SearchCheck} from "lucide-react";
import {cn} from "@/lib/utils";

type Props = {
  siteId: string;
  property: string | null;
  authorized: boolean;
  canManage: boolean;
  feedback?: string;
};

export function GscConnectionCard({
  siteId,
  property,
  authorized,
  canManage,
  feedback,
}: Props) {
  const connected = authorized && Boolean(property);
  const status = connected
    ? "Forbundet"
    : authorized
      ? "Google-adgang godkendt"
      : "Ikke autoriseret";
  const detail = connected
    ? property!
    : authorized
      ? "Read-only Search Console-adgang er godkendt. Vælg eller tilknyt derefter den korrekte Search Console-property til websitet."
      : "Search Console kræver en separat read-only godkendelse. Medarbejderlogin giver ikke automatisk adgang til SEO-data.";

  return (
    <div className="reliva-panel p-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-xl",
            connected || authorized
              ? "bg-[#e5f7ef] text-[#159264]"
              : "bg-[#eef2f6] text-[#7b8797]"
          )}
        >
          <SearchCheck className="size-4.5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">Google Search Console</p>
          <div className="mt-1 flex items-center gap-1.5">
            {connected || authorized ? <CheckCircle2 className="size-3.5 text-[#159264]" /> : null}
            <p className="text-sm font-semibold text-foreground">{status}</p>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">{detail}</p>
      {feedback ? <GscFeedback state={feedback} /> : null}

      {canManage ? (
        <a
          href={`/api/connections/google-search-console/start?siteId=${encodeURIComponent(siteId)}`}
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-[#cfd9e4] bg-white px-3 text-xs font-semibold text-[#26374b] shadow-sm transition hover:border-[#abc4d8] hover:bg-[#f8fbfd]"
        >
          <ExternalLink className="size-3.5" />
          {authorized ? "Genautoriser read-only" : "Forbind read-only"}
        </a>
      ) : (
        <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
          Kun ejer eller admin kan ændre integrationer. Du kan stadig se den dokumenterede forbindelsesstatus.
        </p>
      )}
    </div>
  );
}

function GscFeedback({state}: {state: string}) {
  const copy: Record<string, {title: string; text: string; positive: boolean}> = {
    authorized: {
      title: "Google-adgang godkendt",
      text: "Reliva har nu read-only Search Console-tilladelse. Ingen Google write scopes blev anmodet.",
      positive: true,
    },
    denied: {
      title: "Forbindelsen blev ikke godkendt",
      text: "Der blev ikke gemt ny Search Console-adgang.",
      positive: false,
    },
    forbidden: {
      title: "Manglende rettighed",
      text: "Kun ejer eller admin kan ændre Search Console-forbindelsen.",
      positive: false,
    },
    state_error: {
      title: "Forbindelsen blev afbrudt sikkert",
      text: "OAuth state kunne ikke verificeres. Start forbindelsen igen fra denne side.",
      positive: false,
    },
    missing_code: {
      title: "Google returnerede ingen autorisationskode",
      text: "Start forbindelsen igen. Ingen ny adgang blev gemt.",
      positive: false,
    },
    error: {
      title: "Search Console kunne ikke forbindes",
      text: "Godkendelsen kunne ikke færdiggøres. Prøv igen eller kontrollér OAuth-konfigurationen.",
      positive: false,
    },
  };
  const message = copy[state];
  if (!message) return null;

  return (
    <div
      className={cn(
        "mt-3 rounded-lg border px-3 py-2.5",
        message.positive
          ? "border-[#bfe4d3] bg-[#effaf5]"
          : "border-[#efd3b5] bg-[#fff8ee]"
      )}
    >
      <p className={cn("text-xs font-semibold", message.positive ? "text-[#167f59]" : "text-[#9b6816]")}>
        {message.title}
      </p>
      <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{message.text}</p>
    </div>
  );
}
