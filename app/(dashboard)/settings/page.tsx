import {Mail, ShieldCheck, UserPlus, UsersRound} from "lucide-react";
import {auth} from "@/lib/auth";
import {db} from "@/lib/db";
import {PageHeader} from "@/components/ui/page-header";
import {inviteEmployee} from "./actions";
import {cn} from "@/lib/utils";

type Props = {
  searchParams: Promise<{invite?: string}>;
};

export default async function SettingsPage({searchParams}: Props) {
  const session = await auth();
  const userId = session?.user?.id;
  const {invite} = await searchParams;

  const membership = userId
    ? await db.membership.findFirst({
        where: {userId, status: "ACTIVE"},
        select: {
          role: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              memberships: {
                orderBy: {joinedAt: "asc"},
                select: {
                  id: true,
                  role: true,
                  status: true,
                  joinedAt: true,
                  user: {select: {name: true, email: true, image: true}},
                },
              },
              invitations: {
                where: {acceptedAt: null, expiresAt: {gt: new Date()}},
                orderBy: {createdAt: "desc"},
                take: 20,
                select: {id: true, email: true, role: true, expiresAt: true},
              },
            },
          },
        },
      })
    : null;

  const canInvite = membership?.role === "OWNER" || membership?.role === "ADMIN";

  return (
    <div>
      <PageHeader
        title="Team & indstillinger"
        description="Medarbejderadgang, roller og organisationsindstillinger. Nye medarbejdere får kun adgang efter en eksplicit invitation."
      />

      {!membership ? (
        <section className="reliva-panel flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
          <UsersRound className="size-8 text-[#388ee8]" strokeWidth={1.6} />
          <h2 className="mt-4 text-base font-semibold text-foreground">Organisation mangler migration</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Din eksisterende bruger er fortsat tilladt som legacy-bruger, men teamfunktionerne aktiveres først, når brugeren er knyttet til en Reliva-organisation.
          </p>
        </section>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.75fr)]">
          <section className="reliva-panel overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">{membership.organization.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {membership.organization.memberships.length} aktive eller deaktiverede medlemskaber
                </p>
              </div>
              <div className="rounded-lg border border-border bg-[#f7f9fb] px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground">
                {formatRole(membership.role)}
              </div>
            </div>

            <div className="divide-y divide-border">
              {membership.organization.memberships.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-3 px-4 py-3.5 sm:px-5 md:grid-cols-[minmax(220px,1fr)_120px_120px] md:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {item.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.user.image} alt="" className="size-9 rounded-full object-cover" />
                    ) : (
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#eef3f7] text-xs font-semibold text-[#53657a]">
                        {(item.user.name || item.user.email).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {item.user.name || item.user.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{item.user.email}</p>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-foreground">{formatRole(item.role)}</p>
                  <span
                    className={cn(
                      "w-fit rounded-md px-2 py-1 text-[10px] font-semibold",
                      item.status === "ACTIVE"
                        ? "bg-[#e6f7ef] text-[#16895f]"
                        : "bg-[#f0f2f5] text-[#758294]"
                    )}
                  >
                    {item.status === "ACTIVE" ? "Aktiv" : "Deaktiveret"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-5">
            <section className="reliva-panel p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#edf5ff] text-[#3d88df]">
                  <ShieldCheck className="size-4.5" strokeWidth={1.8} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Invite-only adgang</h2>
                  <p className="text-xs text-muted-foreground">Ingen offentlig registrering</p>
                </div>
              </div>

              {canInvite ? (
                <form action={inviteEmployee} className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="employee-email" className="mb-1.5 block text-xs font-semibold text-foreground">
                      Medarbejderens e-mail
                    </label>
                    <input
                      id="employee-email"
                      name="email"
                      type="email"
                      required
                      placeholder="navn@firma.dk"
                      className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-[#9ec7e5] focus:ring-2 focus:ring-[#3aa9e8]/15"
                    />
                  </div>
                  <div>
                    <label htmlFor="employee-role" className="mb-1.5 block text-xs font-semibold text-foreground">
                      Rolle
                    </label>
                    <select
                      id="employee-role"
                      name="role"
                      defaultValue="EMPLOYEE"
                      className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none focus:border-[#9ec7e5] focus:ring-2 focus:ring-[#3aa9e8]/15"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                      <option value="EMPLOYEE">Medarbejder</option>
                      <option value="VIEWER">Read-only</option>
                    </select>
                  </div>

                  {invite ? <InviteFeedback state={invite} /> : null}

                  <button
                    type="submit"
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#172331] px-4 text-sm font-semibold text-white transition hover:bg-[#223449]"
                  >
                    <UserPlus className="size-4" />
                    Invitér medarbejder
                  </button>
                  <p className="text-[11px] leading-5 text-muted-foreground">
                    Invitationen giver kun den angivne e-mail adgang. Medarbejderen logger ind med sin Google-konto. E-mailudsendelse tilføjes som separat provider senere.
                  </p>
                </form>
              ) : (
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  Kun ejer eller admin kan invitere og ændre medarbejderadgang.
                </p>
              )}
            </section>

            {membership.organization.invitations.length > 0 ? (
              <section className="reliva-panel overflow-hidden">
                <div className="border-b border-border px-4 py-3.5">
                  <h2 className="text-sm font-semibold text-foreground">Åbne invitationer</h2>
                </div>
                <div className="divide-y divide-border">
                  {membership.organization.invitations.map((pending) => (
                    <div key={pending.id} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Mail className="size-3.5 text-muted-foreground" />
                        <p className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{pending.email}</p>
                        <span className="text-[10px] font-semibold text-muted-foreground">{formatRole(pending.role)}</span>
                      </div>
                      <p className="mt-1 pl-5.5 text-[10px] text-muted-foreground">
                        Udløber {pending.expiresAt.toLocaleDateString("da-DK")}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function InviteFeedback({state}: {state: string}) {
  const copy = {
    created: ["Invitation oprettet", "Medarbejderen kan nu logge ind med den inviterede Google-e-mail."],
    invalid: ["Kontrollér oplysningerne", "Indtast en gyldig e-mail og rolle."],
    forbidden: ["Manglende rettighed", "Kun ejer eller admin kan invitere medarbejdere."],
  } as const;
  const [title, text] = copy[state as keyof typeof copy] || copy.invalid;
  const positive = state === "created";

  return (
    <div className={cn("rounded-lg border px-3 py-2.5", positive ? "border-[#bfe4d3] bg-[#effaf5]" : "border-[#efd3b5] bg-[#fff8ee]")}>
      <p className={cn("text-xs font-semibold", positive ? "text-[#167f59]" : "text-[#9b6816]")}>{title}</p>
      <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}

function formatRole(role: string) {
  return ({OWNER: "Ejer", ADMIN: "Admin", MANAGER: "Manager", EMPLOYEE: "Medarbejder", VIEWER: "Read-only"} as Record<string, string>)[role] || role;
}
