import { ChevronLeft, ChevronRight, Download, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LeadFilters } from "@/components/crm/lead-filters";
import { LeadStatusBadge } from "@/components/crm/lead-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/session";
import { LEAD_STATUS_ORDER } from "@/lib/constants/labels";
import { fmtDate } from "@/lib/utils/dates";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { listLeads, listProfileNames, listTags } from "@/services/lead.service";
import { listQuizzes } from "@/services/quiz.service";
import type { LeadStatus } from "@/types/domain";

export const metadata: Metadata = { title: "CRM" };
export const dynamic = "force-dynamic";
type SP = Record<string, string | undefined>;

export default async function CrmPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await requireUser("/crm");
  const ctx = ctxFor(user.id);
  const status = LEAD_STATUS_ORDER.includes(sp.status as LeadStatus) ? (sp.status as LeadStatus) : undefined;
  const filters = { q: sp.q, quizId: sp.quiz, profile: sp.profile, status, tagId: sp.tag, from: sp.from, to: sp.to, page: Number(sp.page) || 1 };
  const { page, quizzes, profiles, tags, totalLeads } = read((s) => ({ page: listLeads(s, ctx, filters), quizzes: listQuizzes(s, ctx).map((q) => ({ id: q.id, title: q.title })), profiles: listProfileNames(s, ctx), tags: listTags(s, ctx), totalLeads: listLeads(s, ctx, { pageSize: 1 }).total }));
  const filtered = !!(sp.q || sp.quiz || sp.profile || sp.status || sp.tag || sp.from || sp.to);
  const pageHref = (p: number) => { const n = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]); n.set("page", String(p)); return `/crm?${n.toString()}`; };
  const exportHref = `/crm/export?${new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]).toString()}`;

  return (
    <div>
      <PageHeader title="CRM" description="Les participants de vos quiz, devenus des contacts exploitables." actions={totalLeads > 0 ? <Button asChild variant="outline"><a href={exportHref}><Download /> Exporter en CSV</a></Button> : undefined} />
      {totalLeads === 0 ? (
        <Card><EmptyState icon={Users} title="Votre CRM est vide" description="Dès qu'un visiteur terminera l'un de vos quiz en laissant ses coordonnées, il apparaîtra ici avec ses réponses, son profil et son score." action={<Button asChild><Link href="/lead-magnets">Voir mes quiz</Link></Button>} /></Card>
      ) : (
        <>
          <LeadFilters quizzes={quizzes} profiles={profiles} tags={tags} />
          <p className="mb-2 mt-4 text-sm text-muted-foreground" aria-live="polite">{page.total} prospect{page.total > 1 ? "s" : ""}{filtered ? " correspondant aux filtres" : ""}</p>
          <Card className="overflow-hidden">
            {page.rows.length === 0 ? (
              <EmptyState icon={Users} title="Aucun prospect ne correspond" description="Modifiez ou réinitialisez les filtres pour élargir la recherche." />
            ) : (
              <>
                <div className="hidden md:block">
                  <Table>
                    <THead><tr><TH>Prospect</TH><TH>Téléphone</TH><TH>Profil</TH><TH className="text-right">Score</TH><TH>Quiz d&apos;origine</TH><TH>Inscrit le</TH><TH>Statut</TH></tr></THead>
                    <tbody>
                      {page.rows.map((l) => (
                        <TR key={l.id}>
                          <TD><Link href={`/crm/${l.id}`} className="font-medium hover:underline">{l.firstName} {l.lastName}</Link><p className="text-xs text-muted-foreground">{l.email}</p>{l.tags.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{l.tags.slice(0, 3).map((t) => <span key={t.id} className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: `${t.color}1f`, color: t.color }}>{t.name}</span>)}</div>}</TD>
                          <TD className="whitespace-nowrap text-muted-foreground">{l.phone || "—"}</TD>
                          <TD>{l.profileName ? <Badge tone="info">{l.profileName}</Badge> : "—"}</TD>
                          <TD className="text-right tabular-nums">{l.score !== null ? `${l.score}/${l.maxScore}` : "—"}</TD>
                          <TD className="max-w-48 truncate text-muted-foreground">{l.originQuizTitle ?? "—"}{l.participations > 1 && <span className="ml-1 text-xs">(+{l.participations - 1})</span>}</TD>
                          <TD className="whitespace-nowrap text-muted-foreground">{fmtDate(l.createdAt)}</TD>
                          <TD><LeadStatusBadge status={l.status} /></TD>
                        </TR>
                      ))}
                    </tbody>
                  </Table>
                </div>
                <ul className="divide-y md:hidden">
                  {page.rows.map((l) => (
                    <li key={l.id}><Link href={`/crm/${l.id}`} className="block p-4 hover:bg-muted/40">
                      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-medium">{l.firstName} {l.lastName}</p><p className="truncate text-xs text-muted-foreground">{l.email}</p></div><LeadStatusBadge status={l.status} /></div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{l.profileName && <Badge tone="info">{l.profileName}</Badge>}{l.score !== null && <span>Score {l.score}/{l.maxScore}</span>}<span>{fmtDate(l.createdAt)}</span></div>
                    </Link></li>
                  ))}
                </ul>
              </>
            )}
          </Card>
          {page.pages > 1 && (
            <nav aria-label="Pagination" className="mt-4 flex items-center justify-between">
              <Button asChild variant="outline" size="sm" className={page.page <= 1 ? "pointer-events-none opacity-50" : ""}><Link href={pageHref(page.page - 1)} aria-disabled={page.page <= 1}><ChevronLeft /> Précédent</Link></Button>
              <span className="text-sm text-muted-foreground">Page {page.page} sur {page.pages}</span>
              <Button asChild variant="outline" size="sm" className={page.page >= page.pages ? "pointer-events-none opacity-50" : ""}><Link href={pageHref(page.page + 1)} aria-disabled={page.page >= page.pages}>Suivant <ChevronRight /></Link></Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
