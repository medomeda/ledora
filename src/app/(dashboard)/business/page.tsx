import type { Metadata } from "next";
import { BusinessForm } from "@/components/forms/business-form";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { guard } from "@/lib/auth/guard";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { getBusiness } from "@/services/business.service";

export const metadata: Metadata = { title: "Mon Business — Informations" };

export default async function BusinessPage() {
  const user = await requireUser("/business");
  const business = await guard(() => read({ user: user.id }, (s) => getBusiness(s, ctxFor(user.id))));
  return (
    <Card>
      <CardHeader><div><CardTitle>Informations de l&apos;activité</CardTitle><CardDescription>Qui vous êtes et comment vous contacter.</CardDescription></div></CardHeader>
      <CardBody className="sm:p-7"><BusinessForm business={business} mode="full" /></CardBody>
    </Card>
  );
}
