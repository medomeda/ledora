import type { Metadata } from "next";
import { OffersForm } from "@/components/forms/offers-form";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { guard } from "@/lib/auth/guard";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { getBusiness } from "@/services/business.service";

export const metadata: Metadata = { title: "Mon Business — Offres et services" };

export default async function OffersPage() {
  const user = await requireUser("/business/offers");
  const business = await guard(() => read((s) => getBusiness(s, ctxFor(user.id))));
  return (
    <Card>
      <CardHeader><div><CardTitle>Offres et services</CardTitle><CardDescription>Ce que vous proposez à vos prospects (jusqu&apos;à 10).</CardDescription></div></CardHeader>
      <CardBody className="sm:p-7"><OffersForm initial={business.offers} /></CardBody>
    </Card>
  );
}
