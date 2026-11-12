import type { Metadata } from "next";
import { BusinessForm } from "@/components/forms/business-form";
import { OffersForm } from "@/components/forms/offers-form";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";
import { guard } from "@/lib/auth/guard";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { getBusiness } from "@/services/business.service";

export const metadata: Metadata = { title: "Mon Business" };

export default async function BusinessPage() {
  const user = await requireUser("/business");
  const business = await guard(() => read((s) => getBusiness(s, ctxFor(user.id))));
  return (
    <div className="max-w-3xl">
      <PageHeader title="Mon Business" description="Votre activité et vos offres. Ces informations personnalisent vos quiz publics." />
      <div className="space-y-6">
        <Card>
          <CardHeader><div><CardTitle>Informations de l'activité</CardTitle><CardDescription>Qui vous êtes et comment vous contacter.</CardDescription></div></CardHeader>
          <CardBody className="sm:p-7"><BusinessForm business={business} mode="full" /></CardBody>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>Offres et services</CardTitle><CardDescription>Ce que vous proposez à vos prospects (jusqu'à 10). Enregistré séparément des informations ci-dessus.</CardDescription></div></CardHeader>
          <CardBody className="sm:p-7"><OffersForm initial={business.offers} /></CardBody>
        </Card>
      </div>
    </div>
  );
}
