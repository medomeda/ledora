"use client";
import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus, Rows3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { deletePublicationAction, savePublicationAction } from "@/actions/publications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/feedback";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { CONTENT_PILLARS, PLATFORM_LABELS, PUBLICATION_OBJECTIVES, PUBLICATION_STATUS_LABELS, PUBLICATION_STATUS_ORDER } from "@/lib/constants/labels";
import { cn } from "@/lib/utils/cn";
import { toLocalInput } from "@/lib/utils/dates";
import type { Publication, PublicationPlatform, PublicationStatus } from "@/types/domain";

type View = "month" | "week" | "list";
const STATUS_TONE: Record<PublicationStatus, "neutral" | "info" | "warning" | "ink" | "success"> = { idea: "neutral", draft: "warning", to_validate: "info", scheduled: "ink", published: "success" };
const STATUS_DOT: Record<PublicationStatus, string> = { idea: "bg-input", draft: "bg-accent", to_validate: "bg-[#3b5bdb]", scheduled: "bg-primary", published: "bg-success" };

interface FormState {
  id?: string;
  title: string;
  content: string;
  platform: PublicationPlatform;
  contentPillar: string;
  objective: string;
  quizId: string;
  status: PublicationStatus;
  scheduledAt: string;
}

const blank = (date?: Date): FormState => ({ title: "", content: "", platform: "instagram", contentPillar: "", objective: "", quizId: "", status: "idea", scheduledAt: date ? toLocalInput(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9).toISOString()) : "" });

export function PublicationsView({ publications, quizzes }: { publications: Publication[]; quizzes: Array<{ id: string; title: string }> }) {
  const router = useRouter();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [form, setForm] = useState<FormState | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const byDay = useMemo(() => {
    const m = new Map<string, Publication[]>();
    for (const p of publications) if (p.scheduledAt) { const k = format(parseISO(p.scheduledAt), "yyyy-MM-dd"); m.set(k, [...(m.get(k) ?? []), p]); }
    return m;
  }, [publications]);
  const quizTitle = (id: string | null) => quizzes.find((q) => q.id === id)?.title;

  const openEdit = (p: Publication) => { setFormErrors({}); setForm({ id: p.id, title: p.title, content: p.content, platform: p.platform, contentPillar: p.contentPillar, objective: p.objective, quizId: p.quizId ?? "", status: p.status, scheduledAt: toLocalInput(p.scheduledAt) }); };
  const openNew = (d?: Date) => { setFormErrors({}); setForm(blank(d)); };

  const submit = () => form && start(async () => {
    setFormErrors({});
    const r = await savePublicationAction({ ...form, quizId: form.quizId || null, scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null });
    if (r.ok) { toast.success(form.id ? "Publication mise à jour." : "Publication créée."); setForm(null); router.refresh(); }
    else { setFormErrors(r.fieldErrors ?? {}); toast.error(r.error); }
  });

  const Chip = ({ p }: { p: Publication }) => (
    <button onClick={() => openEdit(p)} className="flex w-full items-center gap-1.5 truncate rounded-md bg-muted px-1.5 py-1 text-left text-xs hover:bg-accent-soft" title={`${p.title} — ${PUBLICATION_STATUS_LABELS[p.status]}`}>
      <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[p.status])} />
      <span className="shrink-0 text-muted-foreground">{format(parseISO(p.scheduledAt!), "HH:mm")}</span>
      <span className="truncate">{p.title}</span>
    </button>
  );

  const days = view === "month"
    ? eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }) })
    : eachDayOfInterval({ start: startOfWeek(cursor, { weekStartsOn: 1 }), end: endOfWeek(cursor, { weekStartsOn: 1 }) });
  const title = view === "month" ? format(cursor, "MMMM yyyy", { locale: fr }) : `${format(days[0]!, "d MMM", { locale: fr })} – ${format(days[6]!, "d MMM yyyy", { locale: fr })}`;
  const step = (dir: 1 | -1) => setCursor((c) => (view === "month" ? addMonths(c, dir) : addWeeks(c, dir)));
  const today = new Date();

  const unscheduled = publications.filter((p) => !p.scheduledAt);
  const scheduled = [...publications].filter((p) => p.scheduledAt).sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-muted p-1" role="group" aria-label="Vue">
          {([["month", "Mois", CalendarDays], ["week", "Semaine", Rows3], ["list", "Liste", List]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setView(id)} aria-pressed={view === id} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", view === id ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}><Icon className="size-4" />{label}</button>
          ))}
        </div>
        {view !== "list" && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" aria-label="Période précédente" onClick={() => step(-1)}><ChevronLeft /></Button>
            <span className="min-w-44 text-center text-sm font-medium capitalize">{title}</span>
            <Button variant="outline" size="icon-sm" aria-label="Période suivante" onClick={() => step(1)}><ChevronRight /></Button>
            <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>Aujourd&apos;hui</Button>
          </div>
        )}
        <Button onClick={() => openNew()}><Plus /> Nouvelle publication</Button>
      </div>

      {publications.length === 0 && (
        <Card><EmptyState icon={CalendarDays} title="Planifiez votre première publication" description="Organisez vos contenus, associez-les à un quiz et gardez une vue claire de votre calendrier éditorial." action={<Button onClick={() => openNew()}><Plus /> Créer une publication</Button>} /></Card>
      )}

      {publications.length > 0 && view !== "list" && (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs text-muted-foreground">{days.slice(0, 7).map((d) => <div key={d.toISOString()} className="py-2">{format(d, "EEE", { locale: fr })}</div>)}</div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const items = byDay.get(format(d, "yyyy-MM-dd")) ?? [];
              const muted = view === "month" && !isSameMonth(d, cursor);
              return (
                <div key={d.toISOString()} className={cn("min-h-24 border-b border-r p-1 last:border-r-0 sm:min-h-28 sm:p-1.5", view === "week" && "min-h-64", muted && "bg-muted/30")}>
                  <button onClick={() => openNew(d)} aria-label={`Ajouter une publication le ${format(d, "d MMMM", { locale: fr })}`} className={cn("mb-1 flex size-6 items-center justify-center rounded-full text-xs hover:bg-muted", isSameDay(d, today) && "bg-primary font-semibold text-primary-foreground hover:bg-primary", muted && "text-muted-foreground")}>{format(d, "d")}</button>
                  <div className="space-y-1">{items.map((p) => <Chip key={p.id} p={p} />)}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      {publications.length > 0 && view !== "list" && unscheduled.length > 0 && (
        <Card className="p-4"><h2 className="mb-2 text-sm font-semibold">Sans date ({unscheduled.length})</h2><div className="flex flex-wrap gap-2">{unscheduled.map((p) => <button key={p.id} onClick={() => openEdit(p)} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm hover:bg-muted"><span className={cn("size-2 rounded-full", STATUS_DOT[p.status])} />{p.title}</button>)}</div></Card>
      )}

      {publications.length > 0 && view === "list" && (
        <Card className="divide-y overflow-hidden">
          {[...scheduled, ...unscheduled].map((p) => (
            <button key={p.id} onClick={() => openEdit(p)} className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40">
              <div className="min-w-0"><p className="truncate font-medium">{p.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{p.scheduledAt ? format(parseISO(p.scheduledAt), "EEEE d MMMM 'à' HH:mm", { locale: fr }) : "Sans date"} · {PLATFORM_LABELS[p.platform]}{p.contentPillar ? ` · ${p.contentPillar}` : ""}{quizTitle(p.quizId) ? ` · Quiz : ${quizTitle(p.quizId)}` : ""}</p></div>
              <Badge tone={STATUS_TONE[p.status]}>{PUBLICATION_STATUS_LABELS[p.status]}</Badge>
            </button>
          ))}
        </Card>
      )}
      <p className="text-xs text-muted-foreground">Cet espace sert à organiser vos contenus. Les publications ne sont pas envoyées automatiquement sur les réseaux sociaux.</p>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        {form && (
          <DialogContent title={form.id ? "Modifier la publication" : "Nouvelle publication"} className="max-w-xl">
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
              <Field label="Titre" htmlFor="pb-title" error={formErrors.title}><Input id="pb-title" value={form.title} maxLength={160} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></Field>
              <Field label="Contenu" htmlFor="pb-content" optional><Textarea id="pb-content" rows={4} value={form.content} maxLength={3000} onChange={(e) => setForm({ ...form, content: e.target.value })} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Plateforme" htmlFor="pb-pf"><Select id="pb-pf" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as PublicationPlatform })}>{Object.entries(PLATFORM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
                <Field label="Statut" htmlFor="pb-st"><Select id="pb-st" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PublicationStatus })}>{PUBLICATION_STATUS_ORDER.map((s) => <option key={s} value={s}>{PUBLICATION_STATUS_LABELS[s]}</option>)}</Select></Field>
                <Field label="Date et heure" htmlFor="pb-dt" error={formErrors.scheduledAt} optional={form.status !== "scheduled"}><Input id="pb-dt" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></Field>
                <Field label="Quiz associé" htmlFor="pb-quiz" optional><Select id="pb-quiz" value={form.quizId} onChange={(e) => setForm({ ...form, quizId: e.target.value })}><option value="">Aucun</option>{quizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}</Select></Field>
                <Field label="Pilier de contenu" htmlFor="pb-pil" optional><Select id="pb-pil" value={form.contentPillar} onChange={(e) => setForm({ ...form, contentPillar: e.target.value })}><option value="">Aucun</option>{CONTENT_PILLARS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
                <Field label="Objectif" htmlFor="pb-obj" optional><Select id="pb-obj" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })}><option value="">Aucun</option>{PUBLICATION_OBJECTIVES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
              </div>
              <div className="flex items-center justify-between gap-2 pt-2">
                {form.id ? <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive-soft" onClick={() => setToDelete(form.id!)}>Supprimer</Button> : <span />}
                <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setForm(null)}>Annuler</Button><Button type="submit" loading={pending}>Enregistrer</Button></div>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>
      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} destructive loading={pending} title="Supprimer cette publication ?" description="Cette action est définitive. Le quiz associé n'est pas affecté." confirmLabel="Supprimer"
        onConfirm={() => toDelete && start(async () => { const r = await deletePublicationAction({ id: toDelete }); if (r.ok) { toast.success("Publication supprimée."); setToDelete(null); setForm(null); router.refresh(); } else toast.error(r.error); })} />
      <span className="hidden">{addDays(today, 0).getDate()}</span>
    </div>
  );
}
