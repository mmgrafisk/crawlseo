import {redirect} from "next/navigation";
import {Wrench} from "lucide-react";
import {auth} from "@/lib/auth";
import {getSiteAccess} from "@/lib/permissions";
import {WorkspacePlaceholder} from "@/components/sites/workspace-placeholder";

type Props = {params: Promise<{siteId: string}>};

export default async function OperationsWorkspacePage({params}: Props) {
  const session = await auth();
  const userId = session?.user?.id;
  const {siteId} = await params;
  if (!userId) redirect("/login");

  const access = await getSiteAccess(userId, siteId);
  if (!access) redirect("/sites");

  return (
    <WorkspacePlaceholder
      siteId={siteId}
      domain={access.site.domain}
      title="Drift"
      description="Launch readiness, systemoverblik og dokumenteret driftsstatus samlet uden at blande det med SEO-findings."
      icon={Wrench}
      status="planned"
      statusText="Migration planlagt"
      note="Den gamle Reliva-løsning har Launch og Systemer & Drift som separate Directus-flader. I standalone-appen samles de under Drift, men eksisterende records migreres først efter schema-mapping, backup og sammenligning mod kilden."
      items={[
        {
          title: "Launch",
          description: "Actionpoints, blockers, ansvarlig, deadline, evidens og verifikationsnote i en kompakt operationel tabel.",
        },
        {
          title: "Systemer",
          description: "Register for forretningssystemer, integrationer, ejerskab, dokumentation og launch-relevans — uden at lagre secrets.",
        },
        {
          title: "Historik",
          description: "Audit-log og ændringshistorik gør det tydeligt hvem der ændrede hvad, hvornår og med hvilken evidens.",
        },
      ]}
    />
  );
}
