import { AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Legend, TrendChart } from "@/components/analytics/charts";
import { PeriodFilter } from "@/components/admin/period-filter";
import { KpiStrip } from "@/components/analytics/kpi";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireStaffUser } from "@/lib/auth/session";
import { AUDIT_ACTION_LABELS } from "@/lib/constants/labels";
import { fmtRelative } from "@/lib/utils/dates";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { getOverview, resolveRange } from "@/services/admin.service";

export const metadata: Metadata = { title: { absolute: "Administration · Leadora" } };

type SP = Record<string, string | undefined>;

const trend = (now: number, before: number | null) => (before === null ? undefined : `${now >= before ? "+" : "−"}${Math.abs(now - before)} vs période précédente`);

export default async function AdminHome({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await requireStaffUser();
  const ctx = ctxFor(user.id);
  const o = read((s) => getOverview(s, ctx, resolveRange(s, { range: sp.range, from: sp.from, to: sp.to }, ctx.now)));
  const k = o.kpis;
  const unit = o.bucketDays === 1 ? "par jour" : o.bucketDays === 7 ? "par semaine" : "par mois";
  const totalAccounts = Math.max(1, o.plans.reduce((a, p) => a + p.count, 0));
  return (
    <div className="space-y-6">
      <PageHeader title="Vue d'ensemble" description={`${o.range.label} — l'état de la plateforme.`} actions={<PeriodFilter active={o.range.key} from={o.range.fromDay} to={o.range.toDay} />} />
      <KpiStrip items={[
        { label: "Comptes clients", value: k.accounts, hint: k.suspended ? `dont ${k.suspended} suspendu${k.suspended > 1 ? "s" : ""} (actuel)` : "à la fin de la période" },
        { label: "Nouveaux comptes", value: k.newAccounts, hint: trend(k.newAccounts, k.previousNewAccounts) },
        { label: "Comptes actifs", value: k.activeAccounts, hint: "au moins une participation" },
        { label: "Quiz publiés", value: k.publishedQuizzes, hint: "actuellement" },
        { label: "Participations", value: k.submissions, hint: trend(k.submissions, k.previousSubmissions) },
        { label: "Prospects collectés", value: k.leads, hint: `${k.aiGenerations} générations IA sur la période` },
      ]} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><div><CardTitle>Croissance</CardTitle><CardDescription>Inscriptions et participations {unit}.</CardDescription></div><Legend items={[{ label: "Participations", color: "#151a2d" }, { label: "Inscriptions", color: "#f5a524" }]} /></CardHeader>
          <CardBody><TrendChart data={o.series} series={[{ key: "submissions", label: "Participations", color: "#151a2d" }, { key: "signups", label: "Inscriptions", color: "#f5a524" }]} /></CardBody>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>Répartition par offre</CardTitle><CardDescription>Nombre de comptes par offre.</CardDescription></div></CardHeader>
          <CardBody className="space-y-4">
            {o.plans.map((p) => (
              <div key={p.plan}>
                <div className="mb-1 flex justify-between text-sm"><span>{p.name}</span><span className="tabular-nums text-muted-foreground">{p.count} · {Math.round((p.count / totalAccounts) * 100)} %</span></div>
                <div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(p.count / totalAccounts) * 100}%` }} /></div>
              </div>
            ))}
            <Link href="/admin/offres" className="inline-flex items-center gap-1 pt-1 text-sm font-medium hover:underline">Configurer les offres <ArrowRight className="size-4" /></Link>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><div><CardTitle>À surveiller</CardTitle><CardDescription>Comptes suspendus, proches de leur quota ou jamais confirmés.</CardDescription></div></CardHeader>
          {o.watch.length === 0 ? <CardBody className="text-sm text-muted-foreground">Rien à signaler.</CardBody> : (
            <ul className="divide-y">
              {o.watch.map((w) => (
                <li key={w.businessId}>
                  <Link href={`/admin/comptes/${w.businessId}`} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/40">
                    {w.tone === "danger" ? <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent-soft-foreground" />}
                    <div className="min-w-0"><p className="text-sm font-medium">{w.name}</p><p className="text-sm text-muted-foreground">{w.reason}</p></div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader><div><CardTitle>Dernières actions</CardTitle><CardDescription>Journal d&apos;audit de l&apos;équipe.</CardDescription></div><Link href="/admin/journal" className="text-sm font-medium hover:underline">Tout voir</Link></CardHeader>
          {o.recent.length === 0 ? <CardBody className="text-sm text-muted-foreground">Aucune action enregistrée.</CardBody> : (
            <ul className="divide-y">
              {o.recent.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0"><p className="text-sm"><Badge tone="neutral">{AUDIT_ACTION_LABELS[l.action]}</Badge> <span className="font-medium">{l.targetLabel}</span></p>{l.details && <p className="mt-1 truncate text-sm text-muted-foreground">{l.details}</p>}</div>
                  <span className="shrink-0 text-xs text-muted-foreground">{fmtRelative(l.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
