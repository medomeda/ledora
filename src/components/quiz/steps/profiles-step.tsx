"use client";
import { Plus, Trash2 } from "lucide-react";
import type { StepProps } from "@/components/quiz/quiz-builder";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PROFILE_COLORS, profileColor } from "@/lib/constants/profile-colors";
import { blankProfile } from "@/lib/quiz/factory";
import { cn } from "@/lib/utils/cn";

/** Étape 2 : l'IDENTITÉ des profils (nom, description, couleur, priorité). Leur contenu détaillé s'écrit à l'étape Résultats. */
export function ProfilesStep({ config, update, bookingUrl, goTo }: StepProps) {
  const ranges = config.scoringMode === "ranges";

  const add = () => {
    const p = blankProfile("", Math.max(1, 10 - config.profiles.length));
    p.ctaUrl = bookingUrl;
    p.color = PROFILE_COLORS.find((c) => !config.profiles.some((x, i) => profileColor(x, i) === c)) ?? PROFILE_COLORS[config.profiles.length % PROFILE_COLORS.length];
    update((c) => void c.profiles.push(p));
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-5">
        <h3 className="font-display text-base font-semibold">Comment le résultat est-il déterminé ?</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Mode de calcul">
          {([
            ["profiles", "Par profil", "Chaque réponse pointe vers un ou plusieurs profils. Le profil le plus souvent désigné l'emporte."],
            ["ranges", "Par plage de score", "Les points de toutes les réponses sont additionnés ; chaque profil correspond à une plage de score."],
          ] as const).map(([id, title, text]) => (
            <label key={id} className={cn("flex cursor-pointer gap-3 rounded-lg border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring", config.scoringMode === id ? "border-primary bg-primary/[0.04] ring-1 ring-primary" : "hover:bg-muted/50")}>
              <input type="radio" name="scoring-mode" className="sr-only" checked={config.scoringMode === id} onChange={() => update((c) => void (c.scoringMode = id))} />
              <span><span className="block text-sm font-medium">{title}</span><span className="block text-sm text-muted-foreground">{text}</span></span>
            </label>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Vous pourrez changer de mode plus tard. Les points saisis sont conservés.</p>
      </Card>

      {config.profiles.length === 0 ? (
        <Card><EmptyState icon={Plus} title="Définissez vos profils" description="Un profil est un diagnostic possible : « Gestionnaire maîtrisé », « Équilibriste », « Dépendant du découvert »… Prévoyez-en trois pour commencer : vous les relierez aux réponses à l'étape suivante." action={<Button onClick={add}><Plus /> Ajouter un profil</Button>} /></Card>
      ) : (
        <div className="space-y-3">
          {config.profiles.map((p, pi) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1.5 pt-1" role="group" aria-label={`Couleur du profil ${pi + 1}`}>
                  <span className="size-6 rounded-full" style={{ background: profileColor(p, pi) }} />
                  <div className="grid grid-cols-4 gap-1">
                    {PROFILE_COLORS.map((c) => <button key={c} type="button" aria-label={`Couleur ${c}`} aria-pressed={profileColor(p, pi) === c} onClick={() => update((x) => void (x.profiles[pi]!.color = c))} className={cn("size-3.5 rounded-full ring-offset-1", profileColor(p, pi) === c && "ring-2 ring-foreground")} style={{ background: c }} />)}
                  </div>
                </div>
                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[1fr_auto]">
                  <Field label={`Profil ${pi + 1}`} htmlFor={`p-n-${p.id}`}>
                    <Input id={`p-n-${p.id}`} value={p.name} maxLength={80} placeholder="Gestionnaire maîtrisé" onChange={(e) => update((c) => void (c.profiles[pi]!.name = e.target.value))} />
                  </Field>
                  {!ranges && (
                    <Field label="Priorité" htmlFor={`p-pr-${p.id}`} hint="Départage les égalités" className="sm:w-28">
                      <Input id={`p-pr-${p.id}`} type="number" min={0} max={100} value={p.priority} onChange={(e) => update((c) => void (c.profiles[pi]!.priority = Math.min(100, Math.max(0, Math.trunc(Number(e.target.value)) || 0))))} />
                    </Field>
                  )}
                  <Field label="Description courte" htmlFor={`p-d-${p.id}`} optional className="sm:col-span-2" hint="Une phrase qui résume le profil, affichée sous le titre du résultat.">
                    <Input id={`p-d-${p.id}`} value={p.description} maxLength={400} onChange={(e) => update((c) => void (c.profiles[pi]!.description = e.target.value))} />
                  </Field>
                </div>
                <Button variant="ghost" size="icon" aria-label={`Supprimer le profil ${p.name || pi + 1}`} onClick={() => update((c) => { const id = c.profiles[pi]!.id; c.profiles.splice(pi, 1); c.questions.forEach((q) => q.options.forEach((o) => (o.profilePoints = o.profilePoints.filter((x) => x.profileId !== id)))); })}><Trash2 className="size-4" /></Button>
              </div>
            </Card>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {config.profiles.length < 8 ? <Button onClick={add} variant="outline"><Plus /> Ajouter un profil</Button> : <span className="text-sm text-muted-foreground">8 profils maximum.</span>}
            <Button variant="ghost" onClick={() => goTo("questions")}>Passer aux questions</Button>
          </div>
        </div>
      )}
    </div>
  );
}
