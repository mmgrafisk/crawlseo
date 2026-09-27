import {redirect} from "next/navigation";
import {ShoppingBag} from "lucide-react";
import {auth} from "@/lib/auth";
import {getSiteAccess} from "@/lib/permissions";
import {WorkspacePlaceholder} from "@/components/sites/workspace-placeholder";

type Props = {params: Promise<{siteId: string}>};

export default async function ShopifyWorkspacePage({params}: Props) {
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
      title="Shopify"
      description="Read-only produkt-, indholds- og backend-evidens samlet med crawl-resultater."
      icon={ShoppingBag}
      status="read-only"
      statusText="Permanent read-only"
      note="Shopify er et evidenslag i Reliva, aldrig en automatisk ændringsmotor. Den nye standalone-app får først live Shopify-data, når den eksisterende read-only integration er migreret og verificeret uden write scopes."
      items={[
        {
          title: "Produkter & indhold",
          description: "Produkter, collections, pages, blogs og artikler med publicerings- og SEO-evidens uden mutation af webshoppen.",
        },
        {
          title: "Backend ↔ crawl",
          description: "Sammenhold Shopify-data med observeret storefront/crawl og markér manglende eller partial coverage eksplicit.",
        },
        {
          title: "Markets & sprog",
          description: "Shopify market- og resource-evidens leveres videre til International-workspacet uden at blande UI-sprog og website-locale.",
        },
      ]}
    />
  );
}
