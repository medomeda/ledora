import type { Metadata } from "next";
import { PasswordForm, ProfileForm } from "@/components/forms/profile-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PLANS } from "@/lib/constants/plans";
import { requireUser } from "@/lib/auth/session";
import { getFeatures } from "@/lib/features";
import { getUsage } from "@/services/ai.service";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { getBusiness } from "@/services/business.service";

export const metadata: Metadata = { title: "Paramètres" };

function Meter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pctUsed = limit ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm"><span>{label}</span><span className="text-muted-foreground">{used} / {limit ?? "illimité"}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={limit ?? undefined} aria-label={label}><div className="h-full rounded-full bg-accent" style={{ width: `${pctUsed}%` }} /></div>
    </div>
  );
}

export default async function SettingsPage() {
  const user = await requireUser("/settings");
  const ctx = ctxFor(user.id);
  const { business, usage, quizzes, subs } = read((s) => {
    const business = getBusiness(s, ctx);
    const start = new Date(ctx.now.getFullYear(), ctx.now.getMonth(), 1).toISOString();
    return { business, usage: getUsage(s, business, ctx.now), quizzes: s.quizzes.filter((q) => q.businessId === business.id && q.status !== "archived").length, subs: s.quizSubmissions.filter((x) => x.businessId === business.id && x.startedAt >= start).length };
  });
  const plan = PLANS[business.plan];
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Paramètres" description="Votre compte, votre sécurité et votre offre." />
      <Card>
        <CardHeader><div><CardTitle>Profil</CardTitle><CardDescription>Vos informations personnelles.</CardDescription></div></CardHeader>
        <CardBody><ProfileForm firstName={user.firstName} lastName={user.lastName} email={user.email} /></CardBody>
      </Card>
      <Card>
        <CardHeader><div><CardTitle>Mot de passe</CardTitle><CardDescription>Vos autres sessions seront fermées après le changement.</CardDescription></div></CardHeader>
        <CardBody><PasswordForm /></CardBody>
      </Card>
      <Card>
        <CardHeader>
          <div><CardTitle>Mon offre</CardTitle><CardDescription>Les quotas se réinitialisent le 1er de chaque mois. Aucun paiement n'est demandé pendant la phase de test.</CardDescription></div>
          <Badge tone="warning">{plan.name}</Badge>
        </CardHeader>
        <CardBody className="space-y-4">
          <Meter label="Quiz actifs" used={quizzes} limit={plan.maxActiveQuizzes} />
          <Meter label="Participations ce mois-ci" used={subs} limit={plan.maxMonthlySubmissions} />
          {getFeatures().ai && <Meter label="Générations IA ce mois-ci" used={usage.used} limit={usage.limit} />}
        </CardBody>
      </Card>
      <Card>
        <CardHeader><div><CardTitle>Confidentialité et données</CardTitle><CardDescription>Le consentement marketing de chaque prospect est conservé avec sa date et la version de la politique acceptée. Un prospect peut être supprimé depuis sa fiche CRM : ses participations sont alors anonymisées.</CardDescription></div></CardHeader>
      </Card>
    </div>
  );
}
