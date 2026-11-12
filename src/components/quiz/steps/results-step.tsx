"use client";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { ImproveButton } from "@/components/quiz/improve-button";
import { ListEditor } from "@/components/quiz/list-editor";
import type { StepProps } from "@/components/quiz/quiz-builder";
import { RangesEditor } from "@/components/quiz/steps/ranges-editor";
import { EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Switch, Textarea } from "@/components/ui/input";
import { profileColor } from "@/lib/constants/profile-colors";
import { cn } from "@/lib/utils/cn";

/** Étape 4 : le CONTENU du résultat de chaque profil (diagnostic, recommandations, bouton d'action) et la page de résultat. */
export function ResultsStep({ config, update, goTo }: StepProps) {
  const [open, setOpen] = useState<string | null>(config.profiles[0]?.id ?? null);
  const ranges = config.scoringMode === "ranges";

  if (config.profiles.length === 0) {
    return <Card><EmptyState icon={ChevronDown} title="Aucun profil à décrire" description="Définissez d'abord vos profils (étape 2) : vous rédigerez ici le diagnostic de chacun." action={<Button onClick={() => goTo("profiles")}>Définir mes profils</Button>} /></Card>;
  }

  return (
    <div className="space-y-6">
      {ranges && <RangesEditor config={config} update={update} />}
      <div className="space-y-4">
          {config.profiles.map((p, pi) => {
            const isOpen = open === p.id;
            return (
              <Card key={p.id} className={cn("overflow-hidden", isOpen && "ring-1 ring-primary/30")}>
                <button type="button" onClick={() => setOpen(isOpen ? null : p.id)} aria-expanded={isOpen} className="flex w-full items-center gap-3 p-4 text-left">
                  <span className="size-4 shrink-0 rounded-full" style={{ background: profileColor(p, pi) }} />
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{p.name || "Profil sans nom"}</span><span className="block truncate text-xs text-muted-foreground">{p.resultContent.trim() ? "Diagnostic rédigé" : "Diagnostic à rédiger"}{ranges && p.scoreRange ? ` · score de ${p.scoreRange.min} à ${p.scoreRange.max}` : ""}</span></span>
                  <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="space-y-5 border-t bg-muted/20 p-4 sm:p-5">
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
                  </div>
                )}
              </Card>
            );
          })}
      </div>
      <Card className="p-4 sm:p-5">
        <h3 className="font-display text-base font-semibold">Page de résultat</h3>
        <label className="mt-3 flex items-center gap-3 text-sm"><Switch checked={config.result.showScore} onChange={(e) => update((c) => void (c.result.showScore = e.target.checked))} /> Afficher le score au participant</label>
        {config.result.showScore && <p className="mt-2 text-xs text-muted-foreground">Les points de chaque réponse se règlent à l'étape Questions (champ « Points au score global »).</p>}
        <div className="mt-4 grid gap-4">
          <Field label="Titre de secours" htmlFor="r-ft" hint="Affiché si aucun profil ne correspond au score obtenu."><Input id="r-ft" value={config.result.fallbackTitle} maxLength={160} onChange={(e) => update((c) => void (c.result.fallbackTitle = e.target.value))} /></Field>
          <Field label="Texte de secours" htmlFor="r-fc"><Textarea id="r-fc" rows={2} value={config.result.fallbackContent} maxLength={1500} onChange={(e) => update((c) => void (c.result.fallbackContent = e.target.value))} /></Field>
        </div>
      </Card>
    </div>
  );
}
