"use client";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ImproveButton } from "@/components/quiz/improve-button";
import { ListEditor } from "@/components/quiz/list-editor";
import type { StepProps } from "@/components/quiz/quiz-builder";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Switch, Textarea } from "@/components/ui/input";
import { blankProfile } from "@/lib/quiz/factory";
import { cn } from "@/lib/utils/cn";
import { quizMaxScore } from "@/services/scoring.service";

export function ProfilesStep({ config, update, bookingUrl }: StepProps) {
  const [open, setOpen] = useState<string | null>(config.profiles[0]?.id ?? null);
  const ranges = config.scoringMode === "ranges";
  const max = quizMaxScore(config);

  const add = () => {
    const p = blankProfile("", Math.max(0, config.profiles.length ? config.profiles.length : 0));
    p.ctaUrl = bookingUrl;
    p.priority = Math.max(0, 10 - config.profiles.length);
    update((c) => void c.profiles.push(p));
    setOpen(p.id);
  };

  /** Répartit les plages de score de façon égale entre les profils (le meilleur profil prend les scores les plus hauts). */
  const spreadRanges = () => update((c) => {
    const n = c.profiles.length;
    const m = quizMaxScore(c);
    const threshold = (i: number) => Math.round((m * (n - i - 1)) / n);
    c.profiles.forEach((p, i) => {
      p.scoreRange = { min: i === n - 1 ? 0 : threshold(i) + 1, max: i === 0 ? m : threshold(i - 1) };
    });
  });

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-5">
        <h3 className="font-display text-base font-semibold">Mode de calcul du résultat</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Mode de calcul">
          {([["profiles", "Par profil", "Chaque réponse rapporte des points à un ou plusieurs profils. Le profil le plus élevé l'emporte."], ["ranges", "Par plage de score", "Les points de toutes les réponses sont additionnés. Chaque profil correspond à une plage de score."]] as const).map(([id, title, text]) => (
            <label key={id} className={cn("flex cursor-pointer gap-3 rounded-lg border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring", config.scoringMode === id ? "border-primary bg-primary/[0.04] ring-1 ring-primary" : "hover:bg-muted/50")}>
              <input type="radio" name="scoring-mode" className="sr-only" checked={config.scoringMode === id} onChange={() => update((c) => void (c.scoringMode = id))} />
              <span><span className="block text-sm font-medium">{title}</span><span className="block text-sm text-muted-foreground">{text}</span></span>
            </label>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Le score global (de 0 à {max}) est toujours calculé et peut être affiché au participant. {ranges ? "Les plages doivent couvrir tous les scores de 0 à " + max + "." : "En cas d'égalité entre profils, la priorité la plus haute l'emporte."}</p>
      </Card>

      {config.profiles.length === 0 ? (
        <Card><EmptyState icon={Plus} title="Définissez vos profils de résultat" description="Un profil est un diagnostic : « Gestionnaire maîtrisé », « Équilibriste », « Dépendant du découvert »… Prévoyez-en trois pour commencer." action={<Button onClick={add}><Plus /> Ajouter un profil</Button>} /></Card>
      ) : (
        <div className="space-y-4">
          {ranges && <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Score possible : de 0 à {max}</span><Button variant="outline" size="sm" onClick={spreadRanges}>Répartir les plages automatiquement</Button></div>}
          {config.profiles.map((p, pi) => {
            const isOpen = open === p.id;
            return (
              <Card key={p.id} className={cn("overflow-hidden", isOpen && "ring-1 ring-primary/30")}>
                <button type="button" onClick={() => setOpen(isOpen ? null : p.id)} aria-expanded={isOpen} className="flex w-full items-center gap-3 p-4 text-left">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-sm font-semibold text-accent-soft-foreground">{pi + 1}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{p.name || "Profil sans nom"}</span><span className="block truncate text-xs text-muted-foreground">{ranges ? (p.scoreRange ? `Score de ${p.scoreRange.min} à ${p.scoreRange.max}` : "Plage non définie") : `Priorité ${p.priority}`}</span></span>
                  <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="space-y-5 border-t bg-muted/20 p-4 sm:p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Nom du profil" htmlFor={`p-n-${p.id}`}><Input id={`p-n-${p.id}`} value={p.name} maxLength={80} onChange={(e) => update((c) => void (c.profiles[pi]!.name = e.target.value))} /></Field>
                      {ranges ? (
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Score minimum" htmlFor={`p-min-${p.id}`}><Input id={`p-min-${p.id}`} type="number" min={0} value={p.scoreRange?.min ?? 0} onChange={(e) => update((c) => void (c.profiles[pi]!.scoreRange = { min: Math.max(0, Math.trunc(Number(e.target.value)) || 0), max: c.profiles[pi]!.scoreRange?.max ?? max }))} /></Field>
                          <Field label="Score maximum" htmlFor={`p-max-${p.id}`}><Input id={`p-max-${p.id}`} type="number" min={0} value={p.scoreRange?.max ?? max} onChange={(e) => update((c) => void (c.profiles[pi]!.scoreRange = { min: c.profiles[pi]!.scoreRange?.min ?? 0, max: Math.max(0, Math.trunc(Number(e.target.value)) || 0) }))} /></Field>
                        </div>
                      ) : (
                        <Field label="Priorité en cas d'égalité" htmlFor={`p-pr-${p.id}`} hint="0 à 100 — la plus haute l'emporte."><Input id={`p-pr-${p.id}`} type="number" min={0} max={100} value={p.priority} onChange={(e) => update((c) => void (c.profiles[pi]!.priority = Math.min(100, Math.max(0, Math.trunc(Number(e.target.value)) || 0))))} /></Field>
                      )}
                    </div>
                    <Field label="Description courte" htmlFor={`p-d-${p.id}`} optional hint="Une phrase qui résume le profil, affichée sous le titre du résultat."><Input id={`p-d-${p.id}`} value={p.description} maxLength={400} onChange={(e) => update((c) => void (c.profiles[pi]!.description = e.target.value))} /></Field>
                    <Field label="Titre du résultat" htmlFor={`p-t-${p.id}`} optional hint="Par défaut : le nom du profil."><Input id={`p-t-${p.id}`} value={p.resultTitle} maxLength={160} onChange={(e) => update((c) => void (c.profiles[pi]!.resultTitle = e.target.value))} /></Field>
                    <Field label="Diagnostic" htmlFor={`p-c-${p.id}`} hint="Le message personnalisé que verra le participant.">
                      <Textarea id={`p-c-${p.id}`} rows={5} value={p.resultContent} maxLength={3000} onChange={(e) => update((c) => void (c.profiles[pi]!.resultContent = e.target.value))} />
                      <ImproveButton kind="result" value={p.resultContent} onApply={(v) => update((c) => void (c.profiles[pi]!.resultContent = v.slice(0, 3000)))} />
                    </Field>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="Points forts"><ListEditor label="Point fort" items={p.strengths} addLabel="Ajouter un point fort" onChange={(items) => update((c) => void (c.profiles[pi]!.strengths = items))} /></Field>
                      <Field label="Axes d'amélioration"><ListEditor label="Axe d'amélioration" items={p.improvementAreas} addLabel="Ajouter un axe" onChange={(items) => update((c) => void (c.profiles[pi]!.improvementAreas = items))} /></Field>
                    </div>
                    <Field label="Recommandations"><ListEditor label="Recommandation" items={p.recommendations} addLabel="Ajouter une recommandation" onChange={(items) => update((c) => void (c.profiles[pi]!.recommendations = items))} /></Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Bouton d'action" htmlFor={`p-cl-${p.id}`} optional>
                        <Input id={`p-cl-${p.id}`} value={p.ctaLabel} maxLength={80} placeholder="Réserver un appel découverte" onChange={(e) => update((c) => void (c.profiles[pi]!.ctaLabel = e.target.value))} />
                        <ImproveButton kind="cta" value={p.ctaLabel} label="Proposer d'autres formulations" onApply={(v) => update((c) => void (c.profiles[pi]!.ctaLabel = v.slice(0, 80)))} />
                      </Field>
                      <Field label="Lien du bouton" htmlFor={`p-cu-${p.id}`} optional hint="Page de réservation, de vente, WhatsApp…"><Input id={`p-cu-${p.id}`} value={p.ctaUrl} placeholder="https://" onChange={(e) => update((c) => void (c.profiles[pi]!.ctaUrl = e.target.value))} /></Field>
                    </div>
                    <Field label="Tags automatiques" htmlFor={`p-tg-${p.id}`} optional hint="Ajoutés au prospect dans le CRM quand ce profil est obtenu. Séparez-les par une virgule.">
                      <Input id={`p-tg-${p.id}`} defaultValue={p.autoTags.join(", ")} onBlur={(e) => update((c) => void (c.profiles[pi]!.autoTags = e.target.value.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 5)))} />
                    </Field>
                    <div className="flex justify-end border-t pt-4"><Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive-soft" onClick={() => { update((c) => { const id = c.profiles[pi]!.id; c.profiles.splice(pi, 1); c.questions.forEach((q) => q.options.forEach((o) => (o.profilePoints = o.profilePoints.filter((x) => x.profileId !== id)))); }); setOpen(null); }}><Trash2 /> Supprimer le profil</Button></div>
                  </div>
                )}
              </Card>
            );
          })}
          {config.profiles.length < 8 && <Button onClick={add} variant="outline" className="w-full border-dashed"><Plus /> Ajouter un profil</Button>}
        </div>
      )}

      <Card className="p-4 sm:p-5">
        <h3 className="font-display text-base font-semibold">Page de résultat</h3>
        <label className="mt-3 flex items-center gap-3 text-sm"><Switch checked={config.result.showScore} onChange={(e) => update((c) => void (c.result.showScore = e.target.checked))} /> Afficher le score global au participant</label>
        <div className="mt-4 grid gap-4">
          <Field label="Titre de secours" htmlFor="r-ft" hint="Affiché si aucun profil ne correspond au score obtenu."><Input id="r-ft" value={config.result.fallbackTitle} maxLength={160} onChange={(e) => update((c) => void (c.result.fallbackTitle = e.target.value))} /></Field>
          <Field label="Texte de secours" htmlFor="r-fc"><Textarea id="r-fc" rows={2} value={config.result.fallbackContent} maxLength={1500} onChange={(e) => update((c) => void (c.result.fallbackContent = e.target.value))} /></Field>
        </div>
      </Card>
      {ranges && config.profiles.length > 0 && <Alert tone="info">En mode « plage de score », les points attribués aux profils dans l&apos;étape Questions sont ignorés.</Alert>}
    </div>
  );
}
