import Link from "next/link";
import {
  CheckCircle2,
  CircleDot,
  Clock3,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {auth} from "@/lib/auth";
import {db} from "@/lib/db";
import {PageHeader} from "@/components/ui/page-header";
import {cn} from "@/lib/utils";

export default async function TasksPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const membership = userId
    ? await db.membership.findFirst({
        where: {userId, status: "ACTIVE"},
        select: {organizationId: true, role: true, organization: {select: {name: true}}},
      })
    : null;

  const tasks = membership
    ? await db.task.findMany({
        where: {organizationId: membership.organizationId},
        orderBy: [{priority: "desc"}, {updatedAt: "desc"}],
        take: 200,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          updatedAt: true,
          verifiedAt: true,
          site: {select: {id: true, domain: true}},
          assignedTo: {select: {name: true, email: true}},
          finding: {select: {id: true, url: true, severity: true, type: true}},
        },
      })
    : [];

  const working = tasks.filter((task) => ["OPEN", "IN_PROGRESS", "BLOCKED"].includes(task.status));
  const awaiting = tasks.filter((task) => task.status === "IMPLEMENTED_PENDING_VERIFICATION");
  const verified = tasks.filter((task) => task.status === "VERIFIED");

  return (
    <div>
      <PageHeader
        title="Opgaver & historik"
        description="Arbejd fra dokumenteret finding til implementering og separat verifikation. En opgave er ikke verificeret, bare fordi ændringen er udført."
        actions={
          membership ? (
            <div className="rounded-lg border border-border bg-white px-3 py-2 text-xs text-muted-foreground shadow-sm">
              {membership.organization.name} · {formatRole(membership.role)}
            </div>
          ) : undefined
        }
      />

      {!membership ? (
        <section className="reliva-panel flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
          <UserRound className="size-8 text-[#388ee8]" strokeWidth={1.6} />
          <h2 className="mt-4 text-base font-semibold text-foreground">Ingen aktiv organisation endnu</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Medarbejder- og organisationsmodellen er oprettet i fundamentet. Eksisterende CrawlSEO-brugere migreres til en organisation, før denne arbejdsflade aktiveres i produktion.
          </p>
        </section>
      ) : (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-3">
            <TaskSummary
              icon={CircleDot}
              label="I arbejde"
              value={working.length}
              note="Åbne, i gang eller blokerede"
              tone="blue"
            />
            <TaskSummary
              icon={Clock3}
              label="Afventer verifikation"
              value={awaiting.length}
              note="Implementeret, men ikke verificeret"
              tone="amber"
            />
            <TaskSummary
              icon={ShieldCheck}
              label="Verificeret"
              value={verified.length}
              note="Bekræftet ved efterfølgende evidens"
              tone="green"
            />
          </section>

          <TaskSection title="Arbejde" description="Opgaver der kræver handling nu." tasks={working} empty="Ingen åbne opgaver." />
          <TaskSection
            title="Afventer verifikation"
            description="Implementeret er ikke det samme som verificeret. En senere scanning eller anden relevant evidens skal bekræfte resultatet."
            tasks={awaiting}
            empty="Ingen implementerede ændringer afventer verifikation."
          />
          <TaskSection
            title="Verificeret historik"
            description="Senest verificerede opgaver i organisationen."
            tasks={verified.slice(0, 40)}
            empty="Ingen opgaver er verificeret endnu."
          />
        </div>
      )}
    </div>
  );
}

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  updatedAt: Date;
  verifiedAt: Date | null;
  site: {id: string; domain: string} | null;
  assignedTo: {name: string | null; email: string} | null;
  finding: {id: string; url: string; severity: string; type: string} | null;
};

function TaskSection({
  title,
  description,
  tasks,
  empty,
}: {
  title: string;
  description: string;
  tasks: TaskRow[];
  empty: string;
}) {
  return (
    <section className="reliva-panel overflow-hidden">
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">{description}</p>
          </div>
          <span className="font-data text-xs text-muted-foreground">{tasks.length}</span>
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="divide-y divide-border">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="grid gap-3 px-4 py-3.5 sm:px-5 lg:grid-cols-[minmax(260px,1.6fr)_minmax(130px,.7fr)_120px_150px] lg:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={task.priority} />
                  <StatusLabel status={task.status} />
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-foreground">{task.title}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {task.finding?.url || task.description || "Ingen yderligere beskrivelse"}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Website</p>
                {task.site ? (
                  <Link href={`/sites/${task.site.id}`} className="mt-1 block truncate text-xs font-medium text-[#347fbf] hover:underline">
                    {task.site.domain}
                  </Link>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">Global</p>
                )}
              </div>

              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Ansvarlig</p>
                <p className="mt-1 truncate text-xs font-medium text-foreground">
                  {task.assignedTo?.name || task.assignedTo?.email || "Ikke tildelt"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {task.status === "VERIFIED" ? "Verificeret" : "Opdateret"}
                </p>
                <p className="mt-1 font-data text-xs text-foreground">
                  {(task.verifiedAt || task.updatedAt).toLocaleDateString("da-DK", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TaskSummary({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  note: string;
  tone: "blue" | "amber" | "green";
}) {
  const tones = {
    blue: "bg-[#edf5ff] text-[#3d88df]",
    amber: "bg-[#fff5df] text-[#cf8a12]",
    green: "bg-[#e5f7ef] text-[#159264]",
  };

  return (
    <div className="reliva-panel p-4">
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

function PriorityBadge({priority}: {priority: string}) {
  const styles = {
    CRITICAL: "border-[#f3c6c6] bg-[#fff0f0] text-[#c83d3d]",
    HIGH: "border-[#f0d9b0] bg-[#fff7e8] text-[#a96d08]",
    MEDIUM: "border-[#d7e2ee] bg-[#f4f7fa] text-[#63738a]",
    LOW: "border-[#e2e7ec] bg-white text-[#7a8796]",
  } as const;
  return (
    <span className={cn("rounded-md border px-1.5 py-0.5 text-[10px] font-semibold", styles[priority as keyof typeof styles] || styles.MEDIUM)}>
      {priorityLabel(priority)}
    </span>
  );
}

function StatusLabel({status}: {status: string}) {
  return <span className="text-[11px] font-medium text-muted-foreground">{statusLabel(status)}</span>;
}

function priorityLabel(priority: string) {
  return ({CRITICAL: "Kritisk", HIGH: "Høj", MEDIUM: "Mellem", LOW: "Lav"} as Record<string, string>)[priority] || priority;
}

function statusLabel(status: string) {
  return (
    {
      OPEN: "Åben",
      IN_PROGRESS: "I gang",
      BLOCKED: "Blokeret",
      IMPLEMENTED_PENDING_VERIFICATION: "Afventer verifikation",
      VERIFIED: "Verificeret",
      IGNORED: "Ignoreret",
    } as Record<string, string>
  )[status] || status;
}

function formatRole(role: string) {
  return ({OWNER: "Ejer", ADMIN: "Admin", MANAGER: "Manager", EMPLOYEE: "Medarbejder", VIEWER: "Read-only"} as Record<string, string>)[role] || role;
}
