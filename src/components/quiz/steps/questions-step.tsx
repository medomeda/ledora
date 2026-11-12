"use client";
import { ArrowDown, ArrowUp, ChevronDown, Copy, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ImproveButton } from "@/components/quiz/improve-button";
import type { StepProps } from "@/components/quiz/quiz-builder";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Input, Select, Switch, Textarea } from "@/components/ui/input";
import { blankOption, blankQuestion, newUid } from "@/lib/quiz/factory";
import { cn } from "@/lib/utils/cn";
import { profileColor } from "@/lib/constants/profile-colors";
import type { QuizOption } from "@/types/domain";


/**
 * Réglages avancés d'une question (description, choix multiple, réponse facultative) : conservés dans le modèle et le
 * moteur, mais masqués dans l'éditeur pour rester simple. Passer à true pour les réafficher.
 */
const SHOW_ADVANCED_QUESTION_FIELDS = false;

function move<T>(arr: T[], from: number, to: number) {
  if (to < 0 || to >= arr.length) return;
  const [item] = arr.splice(from, 1);
  arr.splice(to, 0, item!);
}

export function QuestionsStep({ config, update, goTo }: StepProps) {
  const [open, setOpen] = useState<string | null>(config.questions[0]?.id ?? null);
  const showGlobal = config.scoringMode === "ranges" || config.result.showScore;
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
      <p className="max-w-2xl text-sm text-muted-foreground">{ranges ? "Donnez des points à chaque réponse : le total du participant détermine son profil, selon les plages définies à l'étape Résultats." : "Pour chaque réponse, choisissez le profil qu'elle indique. À la fin, le participant reçoit le profil que ses réponses ont le plus souvent indiqué."}</p>
      {!ranges && profiles.length === 0 && <Alert tone="warning">Aucun profil n&apos;est défini. <button className="font-medium underline" onClick={() => goTo("profiles")}>Définissez-les à l&apos;étape Profils</button> pour pouvoir les relier aux réponses.</Alert>}
      {!ranges && profiles.length > 0 && <CoverageSummary config={config} />}

      {config.questions.map((q, qi) => {
        const isOpen = open === q.id;
        return (
          <Card key={q.id} className={cn("overflow-hidden", isOpen && "ring-1 ring-primary/30")}>
            <div className="flex items-center gap-2 p-3 sm:p-4">
              <button type="button" onClick={() => setOpen(isOpen ? null : q.id)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold">{qi + 1}</span>
                <span className="min-w-0"><span className="block truncate font-medium">{q.title || "Question sans intitulé"}</span><span className="block text-xs text-muted-foreground">{SHOW_ADVANCED_QUESTION_FIELDS ? `${q.type === "single" ? "Choix unique" : "Choix multiple"} · ` : ""}{q.options.length} réponses{SHOW_ADVANCED_QUESTION_FIELDS && !q.isRequired ? " · facultative" : ""}</span></span>
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
                {SHOW_ADVANCED_QUESTION_FIELDS && (
                  <>
                <div className="space-y-1.5">
                  <label htmlFor={`qd-${q.id}`} className="flex justify-between text-sm font-medium"><span>Description</span><span className="font-normal text-muted-foreground">facultatif</span></label>
                  <Textarea id={`qd-${q.id}`} rows={2} value={q.description} maxLength={500} onChange={(e) => update((c) => void (c.questions[qi]!.description = e.target.value))} />
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <div className="flex items-center gap-2"><label htmlFor={`qt-${q.id}`} className="text-sm font-medium">Type</label><Select id={`qt-${q.id}`} className="w-48" value={q.type} onChange={(e) => update((c) => void (c.questions[qi]!.type = e.target.value as "single" | "multiple"))}><option value="single">Choix unique</option><option value="multiple">Choix multiple</option></Select></div>
                  <label className="flex items-center gap-2 text-sm"><Switch checked={q.isRequired} onChange={(e) => update((c) => void (c.questions[qi]!.isRequired = e.target.checked))} /> Réponse obligatoire</label>
                </div>

                  </>
                )}

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Réponses proposées</h3>
                  <div className={cn("mb-1 hidden gap-x-2 px-2.5 text-xs text-muted-foreground sm:grid", gridCols(showGlobal, !ranges && profiles.length > 0))} aria-hidden>
                    <span>Réponse</span>{!ranges && profiles.length > 0 && <span>Profil indiqué</span>}{showGlobal && <span className="text-center">Points</span>}<span className="w-[6.75rem]" />
                  </div>
                  <ul className="space-y-2">
                    {q.options.map((o, oi) => (
                      <OptionRow key={o.id} option={o} index={oi} count={q.options.length} showGlobal={showGlobal} ranges={ranges}
                        profiles={profiles.map((p, i) => ({ id: p.id, name: p.name || "Profil sans nom", color: profileColor(p, i) }))}
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

/** Combien de réponses indiquent chaque profil : un profil à 0 ne pourra jamais être obtenu. */
function CoverageSummary({ config }: { config: StepProps["config"] }) {
  const counts = new Map(config.profiles.map((p) => [p.id, 0]));
  for (const q of config.questions) for (const o of q.options) for (const pp of o.profilePoints) if (pp.points > 0) counts.set(pp.profileId, (counts.get(pp.profileId) ?? 0) + 1);
  const missing = config.profiles.filter((p) => (counts.get(p.id) ?? 0) === 0);
  return (
    <div className="rounded-xl border bg-card p-4">
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Réponses par profil">
        {config.profiles.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: profileColor(p, i) }} /><span>{p.name || "Profil sans nom"}</span><span className="text-muted-foreground">{counts.get(p.id) ?? 0} réponse{(counts.get(p.id) ?? 0) > 1 ? "s" : ""}</span></li>
        ))}
      </ul>
      {missing.length > 0 && config.questions.length > 0 && <p className="mt-2 text-sm text-destructive">Aucune réponse n&apos;indique {missing.map((p) => `« ${p.name || "profil sans nom"} »`).join(", ")} : {missing.length > 1 ? "ces profils ne pourront" : "ce profil ne pourra"} jamais être obtenu{missing.length > 1 ? "s" : ""}.</p>}
    </div>
  );
}

const NO_PROFILE = "";

/** Colonnes alignées entre l'en-tête et chaque réponse : texte | profil | points | actions. */
const gridCols = (points: boolean, profile: boolean) =>
  cn("sm:grid-cols-[minmax(0,1fr)_6.75rem]", profile && !points && "sm:grid-cols-[minmax(0,1fr)_15rem_6.75rem]", profile && points && "sm:grid-cols-[minmax(0,1fr)_15rem_4.5rem_6.75rem]", !profile && points && "sm:grid-cols-[minmax(0,1fr)_4.5rem_6.75rem]");

function OptionRow({ option, index, count, showGlobal, ranges, profiles, onChange, onMove, onRemove, canRemove }: {
  option: QuizOption; index: number; count: number; showGlobal: boolean; ranges: boolean; profiles: Array<{ id: string; name: string; color: string }>;
  onChange: (fn: (o: QuizOption) => void) => void; onMove: (delta: number) => void; onRemove: () => void; canRemove: boolean;
}) {
  const main = [...option.profilePoints].sort((a, b) => b.points - a.points)[0];
  const current = main && profiles.some((p) => p.id === main.profileId) ? main.profileId : NO_PROFILE;
  const color = profiles.find((p) => p.id === current)?.color;
  const hasProfile = !ranges && profiles.length > 0;
  return (
    <li className={cn("grid items-center gap-2 rounded-lg border bg-card p-2.5", gridCols(showGlobal, hasProfile))}>
      <Input aria-label={`Réponse ${index + 1}`} value={option.label} maxLength={200} placeholder={`Réponse ${index + 1}`} className="col-span-full sm:col-span-1" onChange={(e) => onChange((o) => void (o.label = e.target.value))} />
      <div className={cn("grid items-center gap-2 max-sm:col-span-full", hasProfile && showGlobal ? "max-sm:grid-cols-[minmax(0,1fr)_4.5rem]" : "max-sm:grid-cols-1", "sm:contents")}>
        {hasProfile && (
          <div className="relative min-w-0">
            <span className="pointer-events-none absolute left-3 top-1/2 size-2.5 -translate-y-1/2 rounded-full" style={{ background: color ?? "var(--input)" }} />
            <select aria-label={`Profil indiqué par la réponse ${index + 1}`} value={current} onChange={(e) => onChange((o) => {
              const id = e.target.value;
              // Changer de profil remplace l'association ; une pondération existante est conservée si le profil ne change pas.
              o.profilePoints = id === NO_PROFILE ? [] : [{ profileId: id, points: id === main?.profileId ? main.points : 1 }];
            })} className={cn("h-10 w-full truncate rounded-lg border border-input bg-card pl-8 pr-8 text-sm focus-visible:outline-2 focus-visible:outline-ring", current === NO_PROFILE && "text-muted-foreground")}>
              <option value={NO_PROFILE}>Aucun profil</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        {showGlobal && <Input type="number" inputMode="numeric" aria-label={`Points de la réponse ${index + 1}`} title="Points au score global" className="h-10 px-2 text-center" value={option.points} onChange={(e) => onChange((o) => void (o.points = Math.max(-100, Math.min(100, Math.trunc(Number(e.target.value)) || 0))))} />}
      </div>
      <div className="flex justify-end max-sm:col-span-full">
        <Button variant="ghost" size="icon-sm" aria-label="Monter la réponse" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp /></Button>
        <Button variant="ghost" size="icon-sm" aria-label="Descendre la réponse" disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown /></Button>
        <Button variant="ghost" size="icon-sm" aria-label="Supprimer la réponse" disabled={!canRemove} onClick={onRemove}><Trash2 /></Button>
      </div>
    </li>
  );
}
