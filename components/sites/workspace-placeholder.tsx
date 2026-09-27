import Link from "next/link";
import {ArrowRight, CircleAlert, type LucideIcon} from "lucide-react";
import {PageHeader} from "@/components/ui/page-header";
import {cn} from "@/lib/utils";

type WorkspacePlaceholderProps = {
  siteId: string;
  domain: string;
  title: string;
  description: string;
  icon: LucideIcon;
  status: "planned" | "read-only" | "needs-connection";
  statusText: string;
  note: string;
  items: Array<{title: string; description: string}>;
  nextHref?: string;
  nextLabel?: string;
};

export function WorkspacePlaceholder({
  siteId,
  domain,
  title,
  description,
  icon: Icon,
  status,
  statusText,
  note,
  items,
  nextHref = `/sites/${siteId}/settings`,
  nextLabel = "Åbn forbindelser",
}: WorkspacePlaceholderProps) {
  const statusStyle = {
    planned: "border-[#dce4ec] bg-[#f7f9fb] text-[#627286]",
    "read-only": "border-[#c7e5d7] bg-[#eff9f4] text-[#187b59]",
    "needs-connection": "border-[#ead8ae] bg-[#fff8e9] text-[#96650f]",
  }[status];

  return (
    <div>
      <PageHeader eyebrow={domain} title={title} description={description} />

      <section className="reliva-panel overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#edf5ff] text-[#3d88df]">
                <Icon className="size-5" strokeWidth={1.7} />
              </span>
              <div className="min-w-0">
                <div className={cn("inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold", statusStyle)}>
                  {statusText}
                </div>
                <h2 className="mt-3 text-base font-semibold text-foreground">Arbejdsområdet er klar i Reliva-strukturen</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{note}</p>
              </div>
            </div>

            <div className="mt-6 border-t border-border pt-5">
              <p className="reliva-label">Området skal samle</p>
              <div className="mt-3 divide-y divide-border">
                {items.map((item) => (
                  <div key={item.title} className="grid gap-1 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-5">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="border-t border-border bg-[#f8fafc] p-5 sm:p-6 lg:border-l lg:border-t-0">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-[#6f7e92]" strokeWidth={1.8} />
              <div>
                <p className="text-sm font-semibold text-foreground">Ingen falsk status</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Reliva viser ikke nul, grøn status eller komplet dækning, før der findes reel evidens fra en tilsluttet datakilde.
                </p>
              </div>
            </div>

            <Link
              href={nextHref}
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[#347fbf] hover:text-[#286b9f]"
            >
              {nextLabel}
              <ArrowRight className="size-3.5" />
            </Link>
          </aside>
        </div>
      </section>
    </div>
  );
}
