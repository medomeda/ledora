import { ArrowRight, Check, Circle, Sparkles, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Legend, TrendChart } from "@/components/analytics/charts";
import { KpiStrip } from "@/components/analytics/kpi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";
import { fmtPct } from "@/lib/utils/percent";
import { fmtRelative } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { getDashboard } from "@/services/analytics.service";
import { getChecklist } from "@/services/business.service";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const ctx = ctxFor(user.id);
  const { data, checklist, quizCount } = read((s) => ({ data: getDashboard(s, ctx), checklist: getChecklist(s, ctx), quizCount: s.quizzes.filter((q) => q.status !== "archived").length }));
  const k = data.kpis;
  const checklistDone = checklist.filter((c) => c.done).length;

  return (
    <div>
      <PageHeader
        title={`Bonjour ${user.firstName}`}
        description="Voici où en sont vos quiz et vos prospects sur les 30 derniers jours."
        actions={<Button asChild><Link href="/lead-magnets/new"><Sparkles /> Créer un quiz</Link></Button>}
      />

      {quizCount === 0 ? (
        <Card className="mb-6">
          <EmptyState icon={Sparkles} title="Votre premier quiz vous attend" description="Créez un diagnostic en quelques minutes, publiez-le, et chaque participant devient un prospect qualifié dans votre CRM." action={<Button asChild size="lg"><Link href="/lead-magnets/new">Créer mon premier quiz</Link></Button>} />
        </Card>
      ) : (
        <>
          <KpiStrip
            items={[
              { label: "Quiz", value: k.totalQuizzes, hint: "hors archivés" },
              { label: "Quiz publiés", value: k.publishedQuizzes },
              { label: "Participants", value: k.participants, hint: "quiz terminés" },
              { label: "Nouveaux leads", value: k.newLeads, hint: "30 derniers jours" },
              { label: "Leads qualifiés", value: k.qualifiedLeads, hint: `sur ${k.totalLeads}` },
              { label: "Complétion moyenne", value: fmtPct(k.completionRate), hint: `conversion ${fmtPct(k.conversionRate)}` },
            ]}
          />
          <p className="mt-2 text-xs text-muted-foreground">Complétion = quiz terminés ÷ quiz commencés. Conversion = coordonnées laissées ÷ visiteurs.</p>
        </>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {quizCount > 0 && (
            <Card>
              <CardHeader>
                <div><CardTitle>Évolution des participations</CardTitle><CardDescription>Par jour, tous quiz confondus.</CardDescription></div>
                <Legend items={[{ label: "Participations terminées", color: "var(--primary)" }, { label: "Leads collectés", color: "var(--accent)" }]} />
              </CardHeader>
              <CardBody>
                <TrendChart data={data.daily} series={[{ key: "completed", label: "Participations terminées", color: "#151a2d" }, { key: "leads", label: "Leads collectés", color: "#f5a524" }]} />
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div><CardTitle>Derniers leads</CardTitle><CardDescription>Les prospects les plus récents de votre CRM.</CardDescription></div>
              <Button asChild variant="ghost" size="sm"><Link href="/crm">Tout voir <ArrowRight /></Link></Button>
            </CardHeader>
            {data.recentLeads.length === 0 ? (
              <EmptyState icon={UserPlus} title="Aucun prospect pour l'instant" description="Publiez un quiz et partagez son lien : les participants apparaîtront ici dès qu'ils laisseront leurs coordonnées." className="py-10" />
            ) : (
              <ul className="divide-y">
                {data.recentLeads.map((l) => (
                  <li key={l.id}>
                    <Link href={`/crm/${l.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40">
                      <div className="min-w-0"><p className="truncate text-sm font-medium">{l.name}</p><p className="truncate text-xs text-muted-foreground">{l.quizTitle ?? l.email}</p></div>
                      <div className="flex shrink-0 items-center gap-3">{l.profileName && <Badge tone="info" className="hidden sm:inline-flex">{l.profileName}</Badge>}<span className="text-xs text-muted-foreground">{fmtRelative(l.createdAt)}</span></div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {checklistDone < checklist.length && (
            <Card>
              <CardHeader><div><CardTitle>Pour bien démarrer</CardTitle><CardDescription>{checklistDone} étape{checklistDone > 1 ? "s" : ""} sur {checklist.length}</CardDescription></div></CardHeader>
              <ul className="p-2">
                {checklist.map((c) => (
                  <li key={c.id}>
                    <Link href={c.href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted", c.done && "text-muted-foreground")}>
                      {c.done ? <span className="flex size-5 items-center justify-center rounded-full bg-success text-white"><Check className="size-3" /></span> : <Circle className="size-5 text-input" />}
                      <span className={cn(c.done && "line-through")}>{c.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {data.topQuizzes.length > 0 && (
            <Card>
              <CardHeader><div><CardTitle>Quiz les plus performants</CardTitle><CardDescription>Classés par leads collectés.</CardDescription></div></CardHeader>
              <ul className="divide-y">
                {data.topQuizzes.map((q) => (
                  <li key={q.id}>
                    <Link href={`/lead-magnets/${q.id}/stats`} className="block px-5 py-3 hover:bg-muted/40">
                      <p className="truncate text-sm font-medium">{q.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{q.participants} participants · {q.leads} leads · conversion {fmtPct(q.conversionRate)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {data.activity.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Activité récente</CardTitle></CardHeader>
              <ul className="space-y-3 p-5">
                {data.activity.map((a) => (
                  <li key={a.id} className="flex gap-3 text-sm"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" /><div><p>{a.text}</p><p className="text-xs text-muted-foreground">{fmtRelative(a.at)}</p></div></li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
