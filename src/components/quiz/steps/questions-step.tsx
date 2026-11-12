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
import { profilePotential, questionMaxScore } from "@/services/scoring.service";
import type { QuizOption } from "@/types/domain";

const int = (v: string) => Math.max(-100, Math.min(100, Math.trunc(Number(v)) || 0));

function move<T>(arr: T[], from: number, to: number) {
  if (to < 0 || to >= arr.length) return;
  const [item] = arr.splice(from, 1);
  arr.splice(to, 0, item!);
}

export function QuestionsStep({ config, update, goTo }: StepProps) {
  const [open, setOpen] = useState<string | null>(config.questions[0]?.id ?? null);
  const [weighted, setWeighted] = useState<Set<string>>(new Set());
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
      {!ranges && profiles.length === 0 && <Alert tone="warning">Pour relier les réponses à des profils, <button className="font-medium underline" onClick={() => goTo("profiles")}>définissez d&apos;abord vos profils</button> (étape 2).</Alert>}
      {!ranges && profiles.length > 0 && <BalanceBar config={config} />}
      <p className="text-sm text-muted-foreground">{config.questions.length} question{config.questions.length > 1 ? "s" : ""}{ranges || config.result.showScore ? ` · score maximum ${config.questions.reduce((a, q) => a + questionMaxScore(q), 0)} points` : ""}</p>

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
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">Réponses{ranges ? " et points" : " et profils associés"}</h3>
                    {!ranges && profiles.length > 0 && <button type="button" onClick={() => setWeighted((w) => { const n = new Set(w); if (n.has(q.id)) n.delete(q.id); else n.add(q.id); return n; })} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">{weighted.has(q.id) ? "Revenir aux pastilles" : "Pondérer finement"}</button>}
                  </div>
                  {!ranges && profiles.length > 0 && !weighted.has(q.id) && <p className="mb-2 text-xs text-muted-foreground">Cliquez sur le ou les profils vers lesquels chaque réponse pointe.</p>}
                  <ul className="space-y-3">
                    {q.options.map((o, oi) => (
                      <OptionRow key={o.id} option={o} index={oi} count={q.options.length} showGlobal={showGlobal} globalLabel={ranges ? "Points" : "Points au score global"}
                        profiles={ranges ? [] : profiles.map((p, i) => ({ id: p.id, name: p.name || "Profil sans nom", color: profileColor(p, i) }))} weighted={weighted.has(q.id)}
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

function BalanceBar({ config }: { config: StepProps["config"] }) {
  const potential = profilePotential(config);
  const max = Math.max(1, ...Object.values(potential));
  return (
    <div className="rounded-xl border bg-card p-4" aria-label="Équilibre des profils">
      <p className="mb-3 text-sm font-medium">Points possibles par profil</p>
      <ul className="space-y-2">
        {config.profiles.map((p, i) => {
          const v = potential[p.id] ?? 0;
          return (
            <li key={p.id} className="flex items-center gap-3 text-sm">
              <span className="w-40 shrink-0 truncate" title={p.name}>{p.name || "Profil sans nom"}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(v / max) * 100}%`, background: profileColor(p, i) }} /></div>
              <span className={cn("w-24 shrink-0 text-right tabular-nums", v === 0 ? "font-medium text-destructive" : "text-muted-foreground")}>{v === 0 ? "Inatteignable" : `${v} pt${v > 1 ? "s" : ""}`}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">Un profil sans points possibles ne pourra jamais être obtenu. Des totaux proches donnent un diagnostic équilibré.</p>
    </div>
  );
}

function OptionRow({ option, index, count, showGlobal, globalLabel, profiles, weighted, onChange, onMove, onRemove, canRemove }: {
  option: QuizOption; index: number; count: number; showGlobal: boolean; globalLabel: string; profiles: Array<{ id: string; name: string; color: string }>; weighted: boolean;
  onChange: (fn: (o: QuizOption) => void) => void; onMove: (delta: number) => void; onRemove: () => void; canRemove: boolean;
}) {
  const pointsFor = (pid: string) => option.profilePoints.find((p) => p.profileId === pid)?.points ?? 0;
  const setPoints = (pid: string, pts: number) => onChange((o) => { o.profilePoints = o.profilePoints.filter((x) => x.profileId !== pid); if (pts !== 0) o.profilePoints.push({ profileId: pid, points: pts }); });
  return (
    <li className="rounded-lg border bg-card p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-2.5">
          <Input aria-label={`Réponse ${index + 1}`} value={option.label} maxLength={200} placeholder={`Réponse ${index + 1}`} onChange={(e) => onChange((o) => void (o.label = e.target.value))} />
          {profiles.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Profils associés à cette réponse">
              {profiles.map((p) => {
                const pts = pointsFor(p.id);
                if (weighted) {
                  return (
                    <label key={p.id} className="flex items-center gap-1.5 rounded-full border py-0.5 pl-2 pr-0.5 text-xs">
                      <span className="size-2.5 rounded-full" style={{ background: p.color }} /><span className="max-w-28 truncate" title={p.name}>{p.name}</span>
                      <Input type="number" inputMode="numeric" min={0} max={9} aria-label={`Points pour ${p.name}`} className="h-6 w-12 rounded-full px-1.5 text-center text-xs" value={pts} onChange={(e) => setPoints(p.id, Math.max(0, Math.min(9, Math.trunc(Number(e.target.value)) || 0)))} />
                    </label>
                  );
                }
                return (
                  <button key={p.id} type="button" aria-pressed={pts > 0} title={p.name} onClick={() => setPoints(p.id, pts > 0 ? 0 : 1)}
                    className={cn("flex max-w-40 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors", pts > 0 ? "border-transparent text-white" : "bg-card text-muted-foreground hover:bg-muted")} style={pts > 0 ? { background: p.color } : undefined}>
                    {pts === 0 && <span className="size-2.5 shrink-0 rounded-full" style={{ background: p.color }} />}
                    <span className="truncate">{p.name}</span>{pts > 1 && <span className="shrink-0">×{pts}</span>}
                  </button>
                );
              })}
            </div>
          )}
          {showGlobal && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">{globalLabel}
              <Input type="number" inputMode="numeric" aria-label={`${globalLabel} de la réponse ${index + 1}`} className="h-8 w-16 px-2 text-center" value={option.points} onChange={(e) => onChange((o) => void (o.points = int(e.target.value)))} />
            </label>
          )}
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
