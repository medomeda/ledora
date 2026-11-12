import { ExternalLink, Target } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminFilters } from "@/components/admin/filters";
import { Pager } from "@/components/admin/pager";
import { QuizModeration } from "@/components/admin/quiz-moderation";
import { QuizStatusBadge } from "@/components/admin/status-badges";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { requireStaffUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/staff";
import { QUIZ_STATUS_LABELS } from "@/lib/constants/labels";
import { fmtRelative } from "@/lib/utils/dates";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { listAllQuizzes } from "@/services/admin.service";
import type { QuizStatus } from "@/types/domain";

export const metadata: Metadata = { title: "Quiz" };
type SP = Record<string, string | undefined>;

export default async function AdminQuizzesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await requireStaffUser("/admin/quiz");
  const canModerate = can(user.role, "quiz.moderate");
  const status = (["draft", "published", "archived"] as const).includes(sp.status as QuizStatus) ? (sp.status as QuizStatus) : "";
  const page = read((s) => listAllQuizzes(s, ctxFor(user.id), { q: sp.q, status, page: Number(sp.page) || 1 }));
  return (
    <div>
      <PageHeader title="Quiz" description="Tous les quiz de la plateforme. Dépubliez ou archivez un quiz en cas de contenu inapproprié ou d'abus." />
      <AdminFilters placeholder="Rechercher un quiz ou un compte…" selects={[{ key: "status", label: "Tous les statuts", options: Object.entries(QUIZ_STATUS_LABELS).map(([value, label]) => ({ value, label })) }]} />
      <p className="mb-2 text-sm text-muted-foreground" aria-live="polite">{page.total} quiz</p>
      <Card className="overflow-hidden">
        {page.rows.length === 0 ? <EmptyState icon={Target} title="Aucun quiz ne correspond" description="Modifiez ou réinitialisez les filtres." /> : (
          <Table>
            <THead><tr><TH>Quiz</TH><TH>Compte</TH><TH>Statut</TH><TH className="text-right">Participations</TH><TH className="text-right">Prospects</TH><TH>Modifié</TH><TH><span className="sr-only">Actions</span></TH></tr></THead>
            <tbody>
              {page.rows.map((q) => (
                <TR key={q.id}>
                  <TD className="max-w-72"><p className="truncate font-medium">{q.title}</p><p className="text-xs text-muted-foreground">/q/{q.slug}</p></TD>
                  <TD><Link href={`/admin/comptes/${q.businessId}`} className="hover:underline">{q.businessName}</Link>{q.accountStatus === "suspended" && <Badge tone="danger" className="ml-2">Suspendu</Badge>}</TD>
                  <TD><QuizStatusBadge status={q.status} /></TD>
                  <TD className="text-right tabular-nums">{q.participants}</TD>
                  <TD className="text-right tabular-nums">{q.leads}</TD>
                  <TD className="whitespace-nowrap text-muted-foreground">{fmtRelative(q.updatedAt)}</TD>
                  <TD><div className="flex items-center justify-end gap-2">{q.status === "published" && <a href={`/q/${q.slug}`} target="_blank" rel="noreferrer" className="rounded p-1.5 text-muted-foreground hover:bg-muted" aria-label={`Ouvrir le quiz ${q.title}`}><ExternalLink className="size-4" /></a>}{canModerate && <QuizModeration quizId={q.id} title={q.title} status={q.status} />}</div></TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Pager basePath="/admin/quiz" sp={sp} page={page.page} pages={page.pages} />
    </div>
  );
}
