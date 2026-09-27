import {redirect} from "next/navigation";
import {Languages} from "lucide-react";
import {auth} from "@/lib/auth";
import {getSiteAccess} from "@/lib/permissions";
import {WorkspacePlaceholder} from "@/components/sites/workspace-placeholder";

type Props = {params: Promise<{siteId: string}>};

export default async function InternationalWorkspacePage({params}: Props) {
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
      title="International"
      description="Markeder, sprog, hreflang og cross-market evidens uden at blande UI-sprog med website-locale."
      icon={Languages}
      status="planned"
      statusText="Datamigrering afventer"
      note="Standalone-fundamentet skelner mellem medarbejderens UI-sprog, website-marked og content locale. Den eksisterende internationale scan-evidens migreres først, når mapping og coverage er verificeret."
      items={[
        {
          title: "Marked & locale",
          description: "Knyt hvert website og relevante URL-grupper til marked og content locale som separate felter.",
        },
        {
          title: "Hreflang",
          description: "Vis reciprocal pairs, manglende targets, language/region mismatch og dokumenteret coverage uden at gøre partial til OK.",
        },
        {
          title: "Cross-market content",
          description: "Sammenlign dokumenteret indhold på tværs af markeder og markér identisk/afvigende tekst som observation — ikke automatisk fejl.",
        },
      ]}
    />
  );
}
