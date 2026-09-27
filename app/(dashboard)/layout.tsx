import {auth} from "@/lib/auth";
import {db} from "@/lib/db";
import {redirect} from "next/navigation";
import {AppShell} from "@/components/layout/app-shell";
import {getAccessibleOrganizationIds} from "@/lib/permissions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!session || !userId) redirect("/login");

  const organizationIds = await getAccessibleOrganizationIds(userId);
  const sites = await db.site.findMany({
    where: {
      OR: [
        {userId},
        ...(organizationIds.length ? [{organizationId: {in: organizationIds}}] : []),
      ],
    },
    select: {id: true, domain: true},
    orderBy: {domain: "asc"},
    distinct: ["id"],
  });

  return (
    <AppShell
      email={session.user?.email}
      name={session.user?.name}
      image={session.user?.image}
      sites={sites}
    >
      {children}
    </AppShell>
  );
}
