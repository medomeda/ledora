import type { Metadata } from "next";
import { BusinessForm } from "@/components/forms/business-form";
import { Card, CardBody } from "@/components/ui/card";
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
      <PageHeader title="Mon Business" description="Les informations de votre activité. Elles personnalisent vos quiz publics." />
      <Card><CardBody className="sm:p-7"><BusinessForm business={business} mode="full" /></CardBody></Card>
    </div>
  );
}
