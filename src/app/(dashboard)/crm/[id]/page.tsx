import { ArrowLeft, Check, Mail, Phone, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LeadActions, NotesPanel, StatusSelect, TagsPanel } from "@/components/crm/lead-panels";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { guard } from "@/lib/auth/guard";
import { requireUser } from "@/lib/auth/session";
import { SOURCE_LABELS } from "@/lib/constants/labels";
import { fmtDate, fmtDateTime, fmtRelative } from "@/lib/utils/dates";
import { initials } from "@/lib/utils/text";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { getLead, type ParticipationView } from "@/services/lead.service";
import type { TrafficSource } from "@/types/domain";

export const metadata: Metadata = { title: "Fiche prospect" };
export const dynamic = "force-dynamic";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/crm/${id}`);
  const { lead, tags, notes, participations, quizSummaries } = await guard(() => read((s) => getLead(s, ctxFor(user.id), id)));
  const name = `${lead.firstName} ${lead.lastName}`.trim();

  return (
    <div>
      <Link href="/crm" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> CRM</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent text-lg font-semibold text-primary">{initials(lead.firstName, lead.lastName)}</span>
          <div>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">{name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 hover:text-foreground"><Mail className="size-4" />{lead.email}</a>
              {lead.phone && <a href={`tel:${lead.phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 hover:text-foreground"><Phone className="size-4" />{lead.phone}</a>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2"><StatusSelect leadId={lead.id} status={lead.status} /><LeadActions leadId={lead.id} firstName={lead.firstName} lastName={lead.lastName} phone={lead.phone} email={lead.email} /></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {quizSummaries.length > 0 && (
            <section aria-labelledby="synth">
              <h2 id="synth" className="mb-3 font-display text-lg font-semibold">Vue d&apos;ensemble par quiz</h2>
              <Card className="divide-y">
                {quizSummaries.map((q) => (
                  <div key={q.quizId} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4">
                    <div className="min-w-0 flex-1 basis-64">
                      <Link href={`/lead-magnets/${q.quizId}/stats`} className="font-medium hover:underline">{q.quizTitle}</Link>
                      {q.objective && <p className="mt-0.5 text-sm text-muted-foreground">Objectif : {q.objective}</p>}
                      <p className="mt-0.5 text-xs text-muted-foreground">{q.participations > 1 ? `${q.participations} participations · ` : ""}{q.completed ? `dernière le ${fmtDate(q.lastAt)}` : "non terminé"}</p>
                    </div>
                    {q.completed ? (
                      <div className="flex items-center gap-3">
                        {q.profileName && <Badge tone="info">{q.profileName}</Badge>}
                        <div className="text-right"><p className="font-display text-lg font-semibold tabular-nums">{q.totalScore}<span className="text-sm text-muted-foreground">/{q.maxScore}</span></p>
                          {q.previousPercent !== null && q.currentPercent !== null && <p className="text-xs text-muted-foreground">{q.currentPercent >= q.previousPercent ? "+" : "−"}{Math.abs(q.currentPercent - q.previousPercent)} pts vs précédente</p>}</div>
                      </div>
                    ) : <Badge>Incomplète</Badge>}
                  </div>
                ))}
              </Card>
            </section>
          )}

          <section aria-labelledby="hist">
            <h2 id="hist" className="mb-3 font-display text-lg font-semibold">Participations ({participations.length})</h2>
            <div className="space-y-4">
              {quizSummaries.map((q) => {
                const group = participations.filter((p) => p.quizId === q.quizId);
                const [latest, ...older] = group;
                return (
                  <div key={q.quizId} className="space-y-2">
                    <ParticipationCard p={latest!} />
                    {older.length > 0 && (
                      <details className="rounded-xl border bg-card">
                        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium hover:bg-muted/50">{older.length} participation{older.length > 1 ? "s" : ""} précédente{older.length > 1 ? "s" : ""} à « {q.quizTitle} »</summary>
                        <div className="space-y-3 border-t p-3">{older.map((p) => <ParticipationCard key={p.submissionId} p={p} />)}</div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Suivi commercial</CardTitle></CardHeader>
            <CardBody className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Inscrit le</span><span>{fmtDate(lead.createdAt)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Dernière interaction</span><span>{lead.lastInteractionAt ? fmtRelative(lead.lastInteractionAt) : "—"}</span></div>
            </CardBody>
          </Card>
          <Card><CardHeader><CardTitle>Tags</CardTitle></CardHeader><CardBody><TagsPanel leadId={lead.id} tags={tags} /></CardBody></Card>
          <Card><CardHeader><CardTitle>Notes</CardTitle></CardHeader><CardBody><NotesPanel leadId={lead.id} notes={notes} /></CardBody></Card>
        </aside>
      </div>
    </div>
  );
}

function ParticipationCard({ p }: { p: ParticipationView }) {
  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <Link href={`/lead-magnets/${p.quizId}/stats`} className="font-medium hover:underline">{p.quizTitle}</Link>
          {p.objective && <p className="mt-0.5 text-sm text-muted-foreground">Objectif : {p.objective}</p>}
          <p className="mt-0.5 text-xs text-muted-foreground">{p.completedAt ? fmtDateTime(p.completedAt) : `Commencé le ${fmtDateTime(p.startedAt)} — non terminé`}{p.versionNumber ? ` · version ${p.versionNumber} du quiz` : ""}</p>
        </div>
        {p.status === "completed" ? <div className="text-right"><p className="font-display text-xl font-semibold tabular-nums">{p.totalScore}<span className="text-sm text-muted-foreground">/{p.maxScore}</span></p>{p.profileName && <Badge tone="info">{p.profileName}</Badge>}</div> : <Badge>Incomplète</Badge>}
      </CardHeader>
      <CardBody className="space-y-4">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-muted-foreground">Source</dt><dd>{SOURCE_LABELS[p.source as TrafficSource] ?? p.source}</dd></div>
          <div><dt className="text-xs text-muted-foreground">UTM</dt><dd className="truncate">{[p.utmSource, p.utmMedium, p.utmCampaign].filter(Boolean).join(" / ") || "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Consentement marketing</dt><dd className="flex items-center gap-1.5">{p.marketingConsent ? <><Check className="size-4 text-success" /> Oui, le {p.consentedAt ? fmtDate(p.consentedAt) : "—"}</> : <><X className="size-4 text-muted-foreground" /> Non</>}</dd></div>
        </dl>
        {p.marketingConsent && <p className="text-xs text-muted-foreground">Politique de confidentialité acceptée : version {p.consentPolicyVersion}.</p>}
        {p.answers.length > 0 && (
          <details className="group rounded-lg border">
            <summary className="cursor-pointer select-none px-3 py-2.5 text-sm font-medium hover:bg-muted/50">Voir les {p.answers.length} réponses</summary>
            <ol className="divide-y border-t">
              {p.answers.map((a, i) => <li key={i} className="flex items-start justify-between gap-4 px-3 py-2.5 text-sm"><div><p className="text-muted-foreground">{i + 1}. {a.question}</p><p className="font-medium">{a.choices.join(" · ")}</p></div><span className="shrink-0 text-xs tabular-nums text-muted-foreground">{a.score} pt</span></li>)}
            </ol>
          </details>
        )}
      </CardBody>
    </Card>
  );
}
