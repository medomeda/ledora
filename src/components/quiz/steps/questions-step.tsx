"use client";
import { ArrowDown, ArrowUp, ChevronDown, Copy, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ImproveButton } from "@/components/quiz/improve-button";
import type { StepProps } from "@/components/quiz/quiz-builder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Input, Select, Switch, Textarea } from "@/components/ui/input";
import { blankOption, blankQuestion, newUid } from "@/lib/quiz/factory";
import { cn } from "@/lib/utils/cn";
import { questionMaxScore } from "@/services/scoring.service";
import type { QuizOption } from "@/types/domain";

const int = (v: string) => Math.max(-100, Math.min(100, Math.trunc(Number(v)) || 0));

function move<T>(arr: T[], from: number, to: number) {
  if (to < 0 || to >= arr.length) return;
  const [item] = arr.splice(from, 1);
  arr.splice(to, 0, item!);
}

export function QuestionsStep({ config, update, goTo }: StepProps) {
  const [open, setOpen] = useState<string | null>(config.questions[0]?.id ?? null);
  const profiles = config.profiles;
  const ranges = config.scoringMode === "ranges";

  const addQuestion = () => {
    const q = blankQuestion();
    update((c) => void c.questions.push(q));
    setOpen(q.id);
  };

  if (config.questions.length === 0) {
    return <Card><EmptyState icon={Plus} title="Ajoutez votre première question" description="Chaque question propose plusieurs réponses auxquelles vous attribuez des points. 5 à 10 questions suffisent pour un bon diagnostic." action={<Button onClick={addQuestion}><Plus /> Ajouter une question</Button>} /></Card>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{config.questions.length} question{config.questions.length > 1 ? "s" : ""} · score maximum {config.questions.reduce((a, q) => a + questionMaxScore(q), 0)} points</span>
        {!ranges && profiles.length === 0 && <span className="text-accent-soft-foreground">Pour associer des réponses à des profils, <button className="underline" onClick={() => goTo("profiles")}>définissez d&apos;abord vos profils</button>.</span>}
      </div>

      {config.questions.map((q, qi) => {
        const isOpen = open === q.id;
        return (
          <Card key={q.id} className={cn("overflow-hidden", isOpen && "ring-1 ring-primary/30")}>
            <div className="flex items-center gap-2 p-3 sm:p-4">
              <button type="button" onClick={() => setOpen(isOpen ? null : q.id)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold">{qi + 1}</span>
                <span className="min-w-0"><span className="block truncate font-medium">{q.title || "Question sans intitulé"}</span><span className="block text-xs text-muted-foreground">{q.type === "single" ? "Choix unique" : "Choix multiple"} · {q.options.length} réponses{q.isRequired ? "" : " · facultative"}</span></span>
                <ChevronDown className={cn("ml-auto size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
              </button>
              <div className="flex shrink-0">
                <Button variant="ghost" size="icon-sm" aria-label="Monter la question" disabled={qi === 0} onClick={() => update((c) => move(c.questions, qi, qi - 1))}><ArrowUp /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Descendre la question" disabled={qi === config.questions.length - 1} onClick={() => update((c) => move(c.questions, qi, qi + 1))}><ArrowDown /></Button>
              </div>
            </div>

            {isOpen && (
              <div className="space-y-5 border-t bg-muted/20 p-4 sm:p-5">
                <div className="space-y-1.5">
                  <label htmlFor={`q-${q.id}`} className="text-sm font-medium">Intitulé de la question</label>
                  <Input id={`q-${q.id}`} value={q.title} maxLength={300} onChange={(e) => update((c) => void (c.questions[qi]!.title = e.target.value))} placeholder="Comment gérez-vous votre argent à la fin du mois ?" />
                  <ImproveButton kind="question" value={q.title} onApply={(v) => update((c) => void (c.questions[qi]!.title = v.slice(0, 300)))} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={`qd-${q.id}`} className="flex justify-between text-sm font-medium"><span>Description</span><span className="font-normal text-muted-foreground">facultatif</span></label>
                  <Textarea id={`qd-${q.id}`} rows={2} value={q.description} maxLength={500} onChange={(e) => update((c) => void (c.questions[qi]!.description = e.target.value))} />
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <div className="flex items-center gap-2"><label htmlFor={`qt-${q.id}`} className="text-sm font-medium">Type</label><Select id={`qt-${q.id}`} className="w-48" value={q.type} onChange={(e) => update((c) => void (c.questions[qi]!.type = e.target.value as "single" | "multiple"))}><option value="single">Choix unique</option><option value="multiple">Choix multiple</option></Select></div>
                  <label className="flex items-center gap-2 text-sm"><Switch checked={q.isRequired} onChange={(e) => update((c) => void (c.questions[qi]!.isRequired = e.target.checked))} /> Réponse obligatoire</label>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Réponses et scoring</h3><span className="text-xs text-muted-foreground">Maximum de cette question : {questionMaxScore(q)} pt</span></div>
                  <ul className="space-y-3">
                    {q.options.map((o, oi) => (
                      <OptionRow key={o.id} option={o} index={oi} count={q.options.length} showProfiles={!ranges && profiles.length > 0}
                        profiles={profiles.map((p) => ({ id: p.id, name: p.name || "Profil sans nom" }))}
                        onChange={(fn) => update((c) => fn(c.questions[qi]!.options[oi]!))}
                        onMove={(d) => update((c) => move(c.questions[qi]!.options, oi, oi + d))}
                        onRemove={() => update((c) => void c.questions[qi]!.options.splice(oi, 1))} canRemove={q.options.length > 2} />
                    ))}
                  </ul>
                  {q.options.length < 12 && <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => update((c) => void c.questions[qi]!.options.push(blankOption()))}><Plus /> Ajouter une réponse</Button>}
                </div>

                <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
                  <Button variant="outline" size="sm" onClick={() => { const id = newUid(); update((c) => { const copy = structuredClone(c.questions[qi]!); copy.id = id; copy.options.forEach((o) => (o.id = newUid())); copy.title = `${copy.title} (copie)`; c.questions.splice(qi + 1, 0, copy); }); setOpen(id); }}><Copy /> Dupliquer</Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive-soft" onClick={() => { update((c) => void c.questions.splice(qi, 1)); setOpen(null); }}><Trash2 /> Supprimer la question</Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
      <Button onClick={addQuestion} variant="outline" className="w-full border-dashed"><Plus /> Ajouter une question</Button>
    </div>
  );
}

function OptionRow({ option, index, count, showProfiles, profiles, onChange, onMove, onRemove, canRemove }: {
  option: QuizOption; index: number; count: number; showProfiles: boolean; profiles: Array<{ id: string; name: string }>;
  onChange: (fn: (o: QuizOption) => void) => void; onMove: (delta: number) => void; onRemove: () => void; canRemove: boolean;
}) {
  const pointsFor = (pid: string) => option.profilePoints.find((p) => p.profileId === pid)?.points ?? 0;
  return (
    <li className="rounded-lg border bg-card p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <Input aria-label={`Réponse ${index + 1}`} value={option.label} maxLength={200} placeholder={`Réponse ${index + 1}`} onChange={(e) => onChange((o) => void (o.label = e.target.value))} />
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">Points
              <Input type="number" inputMode="numeric" aria-label={`Points de la réponse ${index + 1}`} className="h-8 w-16 px-2 text-center" value={option.points} onChange={(e) => onChange((o) => void (o.points = int(e.target.value)))} />
            </label>
            {showProfiles && profiles.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge tone={pointsFor(p.id) > 0 ? "info" : "neutral"} className="max-w-32 truncate">{p.name}</Badge>
                <Input type="number" inputMode="numeric" aria-label={`Points pour le profil ${p.name}`} className="h-8 w-14 px-2 text-center" value={pointsFor(p.id)} onChange={(e) => { const pts = int(e.target.value); onChange((o) => { o.profilePoints = o.profilePoints.filter((x) => x.profileId !== p.id); if (pts !== 0) o.profilePoints.push({ profileId: p.id, points: pts }); }); }} />
              </label>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-col">
          <Button variant="ghost" size="icon-sm" aria-label="Monter la réponse" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Descendre la réponse" disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Supprimer la réponse" disabled={!canRemove} onClick={onRemove}><Trash2 /></Button>
        </div>
      </div>
    </li>
  );
}
