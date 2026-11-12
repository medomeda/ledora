"use client";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { StepProps } from "@/components/quiz/quiz-builder";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { PROFILE_COLORS, profileColor } from "@/lib/constants/profile-colors";
import { blankProfile } from "@/lib/quiz/factory";
import { cn } from "@/lib/utils/cn";
import type { QuizConfig } from "@/types/domain";

/** En cas d'égalité, le profil placé le plus haut l'emporte : la priorité découle de l'ordre de la liste. */
export const normalizePriorities = (c: QuizConfig) => c.profiles.forEach((p, i) => (p.priority = c.profiles.length - i));

/** Étape 2 : quels résultats sont possibles ? Une liste simple de profils ; le détail du diagnostic se rédige à l'étape Résultats. */
export function ProfilesStep({ config, update, bookingUrl, goTo }: StepProps) {
  const ranges = config.scoringMode === "ranges";

  const add = (name = "") => {
    const p = blankProfile(name);
    p.ctaUrl = bookingUrl;
    p.color = PROFILE_COLORS.find((c) => !config.profiles.some((x, i) => profileColor(x, i) === c)) ?? PROFILE_COLORS[config.profiles.length % PROFILE_COLORS.length];
    update((c) => { c.profiles.push(p); normalizePriorities(c); });
  };
  const move = (from: number, to: number) => update((c) => { if (to < 0 || to >= c.profiles.length) return; const [p] = c.profiles.splice(from, 1); c.profiles.splice(to, 0, p!); normalizePriorities(c); });
  const remove = (i: number) => update((c) => { const id = c.profiles[i]!.id; c.profiles.splice(i, 1); c.questions.forEach((q) => q.options.forEach((o) => (o.profilePoints = o.profilePoints.filter((x) => x.profileId !== id)))); normalizePriorities(c); });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Quels résultats sont possibles ?</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Chaque participant reçoit l&apos;un de ces profils à la fin du quiz. Pour un diagnostic financier, par exemple : « Gestionnaire maîtrisé », « Équilibriste », « Dépendant du découvert ». Trois profils suffisent pour commencer.</p>
      </div>

      {config.profiles.length === 0 ? (
        <Card><EmptyState icon={Plus} title="Aucun profil pour l'instant" description="Ajoutez votre premier profil. Vous le relierez aux réponses à l'étape suivante, puis vous rédigerez son diagnostic à l'étape Résultats." action={<Button onClick={() => add()}><Plus /> Ajouter un profil</Button>} /></Card>
      ) : (
        <>
          <ol className="space-y-3">
            {config.profiles.map((p, i) => (
              <li key={p.id} className="flex items-start gap-3 rounded-xl border bg-card p-3 sm:p-4">
                <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ background: profileColor(p, i) }} aria-hidden>{i + 1}</span>
                <div className="min-w-0 flex-1 space-y-2">
                  <Input aria-label={`Nom du profil ${i + 1}`} value={p.name} maxLength={80} placeholder="Nom du profil, par exemple « Gestionnaire maîtrisé »" onChange={(e) => update((c) => void (c.profiles[i]!.name = e.target.value))} className="font-medium" />
                  <Input aria-label={`Description du profil ${i + 1}`} value={p.description} maxLength={400} placeholder="Une phrase pour le décrire (facultatif)" onChange={(e) => update((c) => void (c.profiles[i]!.description = e.target.value))} />
                </div>
                <div className="flex shrink-0 flex-col">
                  <Button variant="ghost" size="icon-sm" aria-label={`Monter le profil ${p.name || i + 1}`} disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp /></Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`Descendre le profil ${p.name || i + 1}`} disabled={i === config.profiles.length - 1} onClick={() => move(i, i + 1)}><ArrowDown /></Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`Supprimer le profil ${p.name || i + 1}`} onClick={() => remove(i)}><Trash2 /></Button>
                </div>
              </li>
            ))}
          </ol>
          {!ranges && config.profiles.length > 1 && <p className="text-xs text-muted-foreground">En cas d&apos;égalité, le profil placé le plus haut de la liste l&apos;emporte.</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {config.profiles.length < 8 ? <Button onClick={() => add()} variant="outline"><Plus /> Ajouter un profil</Button> : <span className="text-sm text-muted-foreground">8 profils maximum.</span>}
            <Button onClick={() => goTo("questions")} disabled={config.profiles.length === 0}>Continuer vers les questions</Button>
          </div>
        </>
      )}

      <details className="rounded-xl border bg-card" open={ranges}>
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium hover:bg-muted/50">Mode de calcul {ranges && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-soft-foreground">Par plage de score</span>}</summary>
        <div className="space-y-3 border-t p-4">
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Mode de calcul">
            {([
              ["profiles", "Par profil (recommandé)", "Chaque réponse indique un profil. Le profil le plus souvent indiqué par le participant l'emporte."],
              ["ranges", "Par plage de score", "Chaque réponse rapporte des points. Le total, comparé à des plages que vous définissez, détermine le profil."],
            ] as const).map(([id, title, text]) => (
              <label key={id} className={cn("flex cursor-pointer gap-3 rounded-lg border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring", config.scoringMode === id ? "border-primary bg-primary/[0.04] ring-1 ring-primary" : "hover:bg-muted/50")}>
                <input type="radio" name="scoring-mode" className="sr-only" checked={config.scoringMode === id} onChange={() => update((c) => void (c.scoringMode = id))} />
                <span><span className="block text-sm font-medium">{title}</span><span className="block text-sm text-muted-foreground">{text}</span></span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Vous pouvez changer de mode à tout moment : ce que vous avez saisi est conservé.</p>
        </div>
      </details>
    </div>
  );
}
