"use client";
import { ImagePlus, Trash2 } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { QUIZ_CATEGORIES } from "@/lib/constants/labels";
import { resizeImage } from "@/lib/utils/image-client";
import { ImproveButton } from "@/components/quiz/improve-button";
import type { StepProps } from "@/components/quiz/quiz-builder";

export function GeneralStep({ config, update }: StepProps) {
  const file = useRef<HTMLInputElement>(null);
  const categories = QUIZ_CATEGORIES.includes(config.category) || !config.category ? QUIZ_CATEGORIES : [config.category, ...QUIZ_CATEGORIES];
  return (
    <div className="space-y-6">
      <Field label="Titre du quiz" htmlFor="g-title" hint="Une question que votre cible se pose, ou une promesse de diagnostic.">
        <Input id="g-title" value={config.title} maxLength={120} onChange={(e) => update((c) => void (c.title = e.target.value))} />
        <ImproveButton kind="title" value={config.title} onApply={(v) => update((c) => void (c.title = v.slice(0, 120)))} />
      </Field>
      <Field label="Description courte" htmlFor="g-desc" optional hint="Affichée sous le titre sur la page d'accueil du quiz.">
        <Textarea id="g-desc" rows={2} value={config.description} maxLength={500} onChange={(e) => update((c) => void (c.description = e.target.value))} />
      </Field>
      <Field label="Introduction" htmlFor="g-intro" hint="Expliquez ce que le participant va découvrir et pourquoi c'est utile pour lui.">
        <Textarea id="g-intro" rows={4} value={config.introduction} maxLength={1500} onChange={(e) => update((c) => void (c.introduction = e.target.value))} />
        <ImproveButton kind="introduction" value={config.introduction} onApply={(v) => update((c) => void (c.introduction = v.slice(0, 1500)))} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Catégorie" htmlFor="g-cat" optional>
          <Select id="g-cat" value={config.category} onChange={(e) => update((c) => void (c.category = e.target.value))}><option value="">Aucune</option>{categories.map((c) => <option key={c}>{c}</option>)}</Select>
        </Field>
        <Field label="Durée estimée (minutes)" htmlFor="g-min">
          <Input id="g-min" type="number" min={1} max={60} value={config.estimatedMinutes} onChange={(e) => update((c) => void (c.estimatedMinutes = Math.min(60, Math.max(1, Math.trunc(Number(e.target.value)) || 1))))} />
        </Field>
      </div>
      <Field label="Objectif du quiz" htmlFor="g-obj" optional hint="Pour vous seulement (jamais affiché) : ce que vous cherchez à qualifier.">
        <Input id="g-obj" value={config.objective} maxLength={300} onChange={(e) => update((c) => void (c.objective = e.target.value))} />
      </Field>
      <Field label="Texte du bouton de démarrage" htmlFor="g-start"><Input id="g-start" value={config.startLabel} maxLength={60} onChange={(e) => update((c) => void (c.startLabel = e.target.value))} /></Field>
      <Field label="Image de couverture" optional hint="Affichée en haut de la page d'introduction.">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {config.coverImage ? <img src={config.coverImage} alt="Couverture" className="size-full object-cover" /> : <ImagePlus className="size-5" />}
          </div>
          <input ref={file} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const url = await resizeImage(f, 1000, 0.8); update((c) => void (c.coverImage = url)); } catch (err) { toast.error(err instanceof Error ? err.message : "Image invalide."); } e.target.value = ""; }} />
          <Button type="button" variant="outline" size="sm" onClick={() => file.current?.click()}>{config.coverImage ? "Changer" : "Ajouter une image"}</Button>
          {config.coverImage && <Button type="button" variant="ghost" size="sm" onClick={() => update((c) => void (c.coverImage = null))}><Trash2 /> Retirer</Button>}
        </div>
      </Field>
    </div>
  );
}
