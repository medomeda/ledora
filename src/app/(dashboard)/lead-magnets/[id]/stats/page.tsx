import { ArrowLeft, Eye, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BarList, Legend, TrendChart } from "@/components/analytics/charts";
import { KpiStrip } from "@/components/analytics/kpi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { guard } from "@/lib/auth/guard";
import { requireUser } from "@/lib/auth/session";
import { QUIZ_STATUS_LABELS, SOURCE_LABELS } from "@/lib/constants/labels";
import { fmtDateTime } from "@/lib/utils/dates";
import { fmtPct } from "@/lib/utils/percent";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { getQuizStats } from "@/services/analytics.service";
import { getQuiz } from "@/services/quiz.service";

export const metadata: Metadata = { title: "Statistiques du quiz" };
export const dynamic = "force-dynamic";

export default async function QuizStatsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ days?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const days = [7, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const user = await requireUser(`/lead-magnets/${id}/stats`);
  const ctx = ctxFor(user.id);
  const { quiz, stats, versions } = await guard(() => read({ user: user.id }, (s) => ({ quiz: getQuiz(s, ctx, id), stats: getQuizStats(s, ctx, id, days), versions: s.quizVersions.filter((v) => v.quizId === id).length })));
  const f = stats.funnel;

  return (
    <div>
      <Link href="/lead-magnets" className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Lead Magnets</Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3"><h1 className="font-display text-2xl font-semibold sm:text-3xl">{quiz.config.title}</h1><Badge tone={quiz.status === "published" ? "success" : quiz.status === "draft" ? "warning" : "neutral"}>{QUIZ_STATUS_LABELS[quiz.status]}</Badge></div>
          <p className="mt-1 text-sm text-muted-foreground">Statistiques sur {days} jours · {versions} version{versions > 1 ? "s" : ""} publiée{versions > 1 ? "s" : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-muted p-1" role="group" aria-label="Période">
            {[7, 30, 90].map((d) => <Link key={d} href={`?days=${d}`} aria-current={d === days ? "true" : undefined} className={d === days ? "rounded-md bg-card px-3 py-1 text-sm font-medium shadow-sm" : "rounded-md px-3 py-1 text-sm text-muted-foreground hover:text-foreground"}>{d} j</Link>)}
          </div>
          <Button asChild variant="outline"><Link href={`/lead-magnets/${id}/preview`}><Eye /> Aperçu</Link></Button>
          {quiz.status !== "archived" && <Button asChild><Link href={`/lead-magnets/${id}`}><Pencil /> Modifier</Link></Button>}
        </div>
      </div>

      <KpiStrip items={[
        { label: "Visites", value: f.visits, hint: "sessions uniques" },
        { label: "Démarrages", value: f.started },
        { label: "Terminés", value: f.completed },
        { label: "Leads collectés", value: f.leads },
        { label: "Taux de complétion", value: fmtPct(f.completionRate), hint: "terminés ÷ démarrés" },
        { label: "Taux de conversion", value: fmtPct(f.conversionRate), hint: "leads ÷ visites" },
      ]} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div><CardTitle>Évolution</CardTitle><CardDescription>Visites, participations terminées et leads par jour.</CardDescription></div>
            <Legend items={[{ label: "Visites", color: "#8b93a8" }, { label: "Terminés", color: "#151a2d" }, { label: "Leads", color: "#f5a524" }]} />
          </CardHeader>
          <CardBody><TrendChart data={stats.daily} series={[{ key: "visits", label: "Visites", color: "#8b93a8" }, { key: "completed", label: "Terminés", color: "#151a2d" }, { key: "leads", label: "Leads", color: "#f5a524" }]} /></CardBody>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Répartition des profils</CardTitle><CardDescription>Parmi les participations terminées.</CardDescription></div></CardHeader>
          <CardBody><BarList rows={stats.profiles.map((p) => ({ label: p.name, value: p.count, hint: fmtPct(p.percent) }))} empty="Aucune participation terminée sur la période." /></CardBody>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>Répartition des scores</CardTitle><CardDescription>En pourcentage du score maximum.</CardDescription></div></CardHeader>
          <CardBody><BarList rows={stats.scores.map((s) => ({ label: s.label, value: s.count }))} empty="Aucune participation terminée sur la période." /></CardBody>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>Sources de trafic</CardTitle><CardDescription>D&apos;après les paramètres UTM, sinon le site d&apos;origine.</CardDescription></div></CardHeader>
          <CardBody>
            <BarList rows={stats.sources.map((s) => ({ label: SOURCE_LABELS[s.source], value: s.count, hint: fmtPct(s.percent) }))} empty="Aucune visite sur la période." />
            {stats.campaigns.length > 0 && <div className="mt-5 border-t pt-4"><p className="mb-2 text-sm font-medium">Campagnes</p><ul className="space-y-1 text-sm text-muted-foreground">{stats.campaigns.map((c) => <li key={c.campaign} className="flex justify-between"><span>{c.campaign}</span><span className="tabular-nums">{c.count}</span></li>)}</ul></div>}
          </CardBody>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader><div><CardTitle>Dernières participations</CardTitle><CardDescription>Cliquez sur un nom pour ouvrir la fiche prospect.</CardDescription></div></CardHeader>
          {stats.recent.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Aucune participation terminée sur la période.</p> : (
            <Table>
              <THead><tr><TH>Participant</TH><TH>Profil</TH><TH className="text-right">Score</TH></tr></THead>
              <tbody>{stats.recent.map((r) => (
                <TR key={r.submissionId}>
                  <TD>{r.leadId ? <Link href={`/crm/${r.leadId}`} className="font-medium hover:underline">{r.name}</Link> : <span className="text-muted-foreground">{r.name}</span>}<p className="text-xs text-muted-foreground">{r.completedAt ? fmtDateTime(r.completedAt) : ""}</p></TD>
                  <TD>{r.profileName ?? "—"}</TD>
                  <TD className="text-right tabular-nums">{r.score}/{r.maxScore}</TD>
                </TR>
              ))}</tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
