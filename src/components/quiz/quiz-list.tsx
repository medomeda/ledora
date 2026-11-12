"use client";
import { Archive, BarChart3, Copy, Eye, FileText, FormInput, Link2, MoreHorizontal, Pencil, Plus, Rocket, RotateCcw, Sparkles, Target, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { archiveQuizAction, deleteQuizAction, duplicateQuizAction, restoreQuizAction, unpublishQuizAction } from "@/actions/quizzes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/feedback";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { QUIZ_STATUS_LABELS } from "@/lib/constants/labels";
import { cn } from "@/lib/utils/cn";
import { fmtDate, fmtRelative } from "@/lib/utils/dates";
import type { QuizListRow } from "@/services/quiz.service";
import type { QuizStatus } from "@/types/domain";

const TONE: Record<QuizStatus, "neutral" | "success" | "warning"> = { draft: "warning", published: "success", archived: "neutral" };
type Filter = "active" | QuizStatus;
const FILTERS: Array<{ id: Filter; label: string }> = [{ id: "active", label: "Actifs" }, { id: "draft", label: "Brouillons" }, { id: "published", label: "Publiés" }, { id: "archived", label: "Archivés" }];

export function copyQuizLink(slug: string) {
  const url = `${window.location.origin}/q/${slug}`;
  navigator.clipboard.writeText(url).then(() => toast.success("Lien copié dans le presse-papiers."), () => toast.error("Copie impossible. Lien : " + url));
}

function RowActions({ q, onDelete }: { q: QuizListRow; onDelete: () => void }) {
  const router = useRouter();
  const [, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) => start(async () => { const r = await fn(); if (r.ok) { toast.success(ok); router.refresh(); } else toast.error(r.error); });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Actions pour ${q.title}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent>
        {q.status !== "archived" && <DropdownMenuItem asChild><Link href={`/lead-magnets/${q.id}`}><Pencil /> Modifier</Link></DropdownMenuItem>}
        <DropdownMenuItem asChild><Link href={`/lead-magnets/${q.id}/preview`}><Eye /> Prévisualiser</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href={`/lead-magnets/${q.id}/stats`}><BarChart3 /> Statistiques</Link></DropdownMenuItem>
        {q.status === "published" && <DropdownMenuItem onSelect={() => copyQuizLink(q.slug)}><Link2 /> Copier le lien</DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => run(() => duplicateQuizAction({ quizId: q.id }), "Quiz dupliqué.")}><Copy /> Dupliquer</DropdownMenuItem>
        {q.status === "published" && <DropdownMenuItem onSelect={() => run(() => unpublishQuizAction({ quizId: q.id }), "Quiz dépublié. Les données sont conservées.")}><Undo2 /> Dépublier</DropdownMenuItem>}
        {q.status === "archived" ? (
          <DropdownMenuItem onSelect={() => run(() => restoreQuizAction({ quizId: q.id }), "Quiz restauré en brouillon.")}><RotateCcw /> Restaurer</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => run(() => archiveQuizAction({ quizId: q.id }), "Quiz archivé.")}><Archive /> Archiver</DropdownMenuItem>
        )}
        {q.status !== "published" && <><DropdownMenuSeparator /><DropdownMenuItem destructive onSelect={onDelete}><Trash2 /> Supprimer…</DropdownMenuItem></>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function QuizList({ rows }: { rows: QuizListRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("active");
  const [toDelete, setToDelete] = useState<QuizListRow | null>(null);
  const [pending, start] = useTransition();
  const visible = rows.filter((r) => (filter === "active" ? r.status !== "archived" : r.status === filter));
  const count = (f: Filter) => rows.filter((r) => (f === "active" ? r.status !== "archived" : r.status === f)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-muted p-1" role="tablist" aria-label="Type de lead magnet">
          <span role="tab" aria-selected className="flex items-center gap-1.5 rounded-md bg-card px-3 py-1.5 text-sm font-medium shadow-sm"><Target className="size-4" /> Quiz</span>
          <span role="tab" aria-disabled className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground" title="Disponible dans une prochaine version"><FormInput className="size-4" /> Formulaires <Badge className="ml-1">Bientôt</Badge></span>
          <span role="tab" aria-disabled className="hidden items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground sm:flex" title="Disponible dans une prochaine version"><FileText className="size-4" /> PDF <Badge className="ml-1">Bientôt</Badge></span>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par statut">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id} className={cn("rounded-full border px-3 py-1 text-sm transition-colors", filter === f.id ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>{f.label} <span className="opacity-70">{count(f.id)}</span></button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        {visible.length === 0 ? (
          rows.length === 0 ? (
            <EmptyState icon={Sparkles} title="Aucun quiz pour l'instant" description="Créez votre premier diagnostic : manuellement, ou en décrivant votre besoin à l'Assistant IA." action={<Button asChild><Link href="/lead-magnets/new"><Plus /> Créer un quiz</Link></Button>} />
          ) : (
            <EmptyState icon={Target} title="Aucun quiz dans cette catégorie" description="Changez de filtre pour retrouver vos autres quiz." />
          )
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <THead><tr><TH>Quiz</TH><TH>Statut</TH><TH className="text-right">Participants</TH><TH className="text-right">Leads</TH><TH>Créé le</TH><TH>Modifié</TH><TH className="w-10"><span className="sr-only">Actions</span></TH></tr></THead>
                <tbody>
                  {visible.map((q) => (
                    <TR key={q.id}>
                      <TD>
                        <Link href={q.status === "archived" ? `/lead-magnets/${q.id}/stats` : `/lead-magnets/${q.id}`} className="font-medium hover:underline">{q.title || "Sans titre"}</Link>
                        <p className="text-xs text-muted-foreground">{q.category || "Sans catégorie"} · {q.questionCount} question{q.questionCount > 1 ? "s" : ""}</p>
                      </TD>
                      <TD><Badge tone={TONE[q.status]}>{QUIZ_STATUS_LABELS[q.status]}</Badge>{q.status === "published" && q.hasUnpublishedChanges && <Badge tone="info" className="ml-1.5">Modifs non publiées</Badge>}</TD>
                      <TD className="text-right tabular-nums">{q.participants}</TD>
                      <TD className="text-right tabular-nums">{q.leads}</TD>
                      <TD className="whitespace-nowrap text-muted-foreground">{fmtDate(q.createdAt)}</TD>
                      <TD className="whitespace-nowrap text-muted-foreground">{fmtRelative(q.updatedAt)}</TD>
                      <TD><RowActions q={q} onDelete={() => setToDelete(q)} /></TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </div>
            <ul className="divide-y md:hidden">
              {visible.map((q) => (
                <li key={q.id} className="flex items-start justify-between gap-2 p-4">
                  <Link href={q.status === "archived" ? `/lead-magnets/${q.id}/stats` : `/lead-magnets/${q.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium">{q.title || "Sans titre"}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2"><Badge tone={TONE[q.status]}>{QUIZ_STATUS_LABELS[q.status]}</Badge><span className="text-xs text-muted-foreground">{q.participants} participants · {q.leads} leads</span></div>
                    <p className="mt-1 text-xs text-muted-foreground">Modifié {fmtRelative(q.updatedAt)}</p>
                  </Link>
                  <RowActions q={q} onDelete={() => setToDelete(q)} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        destructive
        loading={pending}
        title="Supprimer définitivement ce quiz ?"
        confirmLabel="Supprimer définitivement"
        description={toDelete && <>
          <p>« {toDelete.title} » sera supprimé avec ses versions, ses visites et ses <strong>{toDelete.participants} participation{toDelete.participants > 1 ? "s" : ""}</strong>.</p>
          <p className="mt-2">Les prospects déjà présents dans votre CRM sont conservés. Pour garder l&apos;historique tout en retirant le quiz de la liste, préférez l&apos;archivage.</p>
        </>}
        onConfirm={() => toDelete && start(async () => { const r = await deleteQuizAction({ quizId: toDelete.id }); if (r.ok) { toast.success("Quiz supprimé."); setToDelete(null); router.refresh(); } else toast.error(r.error); })}
      />
      <Rocket className="hidden" />
    </div>
  );
}
