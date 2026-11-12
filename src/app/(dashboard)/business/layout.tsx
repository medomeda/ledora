import type { ReactNode } from "react";
import { TabNav } from "@/components/layout/tab-nav";
import { PageHeader } from "@/components/ui/page-header";

export default function BusinessLayout({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Mon Business" description="Votre activité et vos offres. Ces informations personnalisent vos quiz publics." />
      <TabNav label="Mon Business" tabs={[{ href: "/business", label: "Informations" }, { href: "/business/offers", label: "Offres et services" }]} />
      {children}
    </div>
  );
}
