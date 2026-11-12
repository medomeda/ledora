"use client";
import { ChevronDown, ImageIcon, LayoutTemplate, Palette, PanelBottom, RotateCcw, Shapes, Type } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import type { StepProps } from "@/components/quiz/quiz-builder";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Select, Switch, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { FONTS, isHex, palette, resolveDesign, THEMES } from "@/lib/quiz/design";
import { cn } from "@/lib/utils/cn";
import type { QuizDesign } from "@/types/domain";

function ColorField({ label, value, effective, onChange }: { label: string; value: string | null; effective: string; onChange: (v: string | null) => void }) {
  const shown = isHex(effective) ? effective : "#000000";
  return (
    <div className="grid grid-cols-[5.5rem_auto_minmax(0,1fr)] items-center gap-2">
      <span className="text-sm font-medium">{label}</span>
      <input type="color" aria-label={label} value={shown} onChange={(e) => onChange(e.target.value)} className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-input bg-card p-1" />
      <div className="flex items-center gap-1">
        <Input aria-label={`${label} (code hexadécimal)`} value={value ?? ""} placeholder={`Thème · ${effective}`} maxLength={7} onChange={(e) => { const v = e.target.value.trim(); if (v === "") onChange(null); else if (/^#[0-9a-fA-F]{0,6}$/.test(v)) { if (v.length === 7) onChange(v); } }} className="h-9 font-mono text-sm" />
        {value && <Button type="button" variant="ghost" size="icon-sm" aria-label={`Réinitialiser : ${label}`} onClick={() => onChange(null)}><RotateCcw /></Button>}
      </div>
    </div>
  );
}

type GroupId = "theme" | "type" | "header" | "layout" | "style" | "footer";
const GROUPS: Array<{ id: GroupId; label: string; icon: typeof Palette; hint: string }> = [
  { id: "theme", label: "Thème", icon: Palette, hint: "Une palette complète, puis vos propres couleurs." },
  { id: "type", label: "Typographie", icon: Type, hint: "Les polices et la taille des titres." },
  { id: "header", label: "En-tête", icon: ImageIcon, hint: "Position et taille du logo, nom de l'activité." },
  { id: "layout", label: "Disposition", icon: LayoutTemplate, hint: "Alignement et page d'introduction." },
  { id: "style", label: "Style", icon: Shapes, hint: "Arrondis, cartes de réponses et progression." },
  { id: "footer", label: "Pied de page", icon: PanelBottom, hint: "Texte libre et mention Leadora." },
];

/** Carte repliable : un clic sur l'en-tête ouvre ou ferme le groupe de réglages. */
function Section({ id, title, hint, icon: Icon, open, onToggle, children }: { id: string; title: string; hint: string; icon: typeof Palette; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <button type="button" id={`dh-${id}`} aria-expanded={open} aria-controls={`dp-${id}`} onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/40 sm:px-5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon className="size-4" aria-hidden /></span>
        <span className="min-w-0 flex-1"><span className="block font-display text-base font-semibold">{title}</span><span className="block truncate text-xs text-muted-foreground">{hint}</span></span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && <div id={`dp-${id}`} role="region" aria-labelledby={`dh-${id}`} className="space-y-4 border-t px-4 py-4 sm:px-5">{children}</div>}
    </Card>
  );
}

/** Onglet Design : des cartes repliables (Thème ouvert au départ) ; l'aperçu à droite suit chaque modification. */
export function DesignStep({ config, update, plan, hasLogo }: StepProps) {
  const [open, setOpen] = useState<Record<GroupId, boolean>>({ theme: true, type: false, header: false, layout: false, style: false, footer: false });
  const toggle = (id: GroupId) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const allOpen = GROUPS.every((g) => open[g.id]);
  const d = resolveDesign(config.design);
  const set = (patch: Partial<QuizDesign>) => update((c) => void (c.design = { ...(c.design ?? {}), ...patch }));
  const pal = palette(d);
  const free = plan === "free";
  const customized = !!config.design && Object.keys(config.design).length > 0;
  const body = (group: GroupId) => (
    <>
          {group === "theme" && (
            <>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Thème">
                {THEMES.map((t) => (
                  <button key={t.id} type="button" role="radio" aria-checked={d.themeId === t.id} onClick={() => set({ themeId: t.id, primaryColor: null, accentColor: null, backgroundColor: null })} className={cn("rounded-xl border p-1.5 text-left", d.themeId === t.id ? "border-primary ring-2 ring-primary" : "hover:border-primary/40")}>
                    <span className="block rounded-lg p-1.5" style={{ background: t.bg }}>
                      <span className="block rounded-md p-1.5" style={{ background: t.surface }}>
                        <span className="block h-1 w-2/3 rounded-full" style={{ background: t.text, opacity: 0.8 }} />
                        <span className="mt-1 flex gap-1"><span className="h-2.5 w-7 rounded-full" style={{ background: t.primary }} /><span className="h-2.5 w-2.5 rounded-full" style={{ background: t.accent }} /></span>
                      </span>
                    </span>
                    <span className="mt-1 block px-0.5 text-xs font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <ColorField label="Principale" value={d.primaryColor} effective={pal.primary} onChange={(v) => set({ primaryColor: v })} />
                <ColorField label="Accent" value={d.accentColor} effective={pal.accent} onChange={(v) => set({ accentColor: v })} />
                <ColorField label="Fond" value={d.backgroundColor} effective={pal.bg} onChange={(v) => set({ backgroundColor: v })} />
              </div>
              <p className="text-xs text-muted-foreground">Principale : boutons et réponses choisies. Accent : progression et bouton d&apos;action du résultat. Le texte s&apos;adapte pour rester lisible.</p>
              <Field label="Style du fond">
                <Segmented label="Style de fond" value={d.background} onChange={(v) => set({ background: v })} options={[{ value: "plain", label: "Uni" }, { value: "gradient", label: "Dégradé léger" }, { value: "dots", label: "Points" }]} />
              </Field>
            </>
          )}

          {group === "type" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Police des titres" htmlFor="d-hf">
                  <Select id="d-hf" value={d.headingFont} onChange={(e) => set({ headingFont: e.target.value as QuizDesign["headingFont"] })}>{FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</Select>
                </Field>
                <Field label="Police du texte" htmlFor="d-bf">
                  <Select id="d-bf" value={d.bodyFont} onChange={(e) => set({ bodyFont: e.target.value as QuizDesign["bodyFont"] })}>{FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</Select>
                </Field>
              </div>
              <Field label="Taille des titres"><Segmented label="Taille des titres" value={d.titleSize} onChange={(v) => set({ titleSize: v })} options={[{ value: "m", label: "Moyenne" }, { value: "l", label: "Grande" }, { value: "xl", label: "Très grande" }]} /></Field>
            </>
          )}

          {group === "header" && (
            <>
              <Field label="Position du logo"><Segmented label="Position du logo" value={d.logoPosition} onChange={(v) => set({ logoPosition: v })} options={[{ value: "left", label: "À gauche" }, { value: "center", label: "Centré" }, { value: "hidden", label: "Masqué" }]} /></Field>
              {d.logoPosition !== "hidden" && (
                <>
                  <Field label="Taille du logo"><Segmented label="Taille du logo" value={d.logoSize} onChange={(v) => set({ logoSize: v })} options={[{ value: "s", label: "Petit" }, { value: "m", label: "Moyen" }, { value: "l", label: "Grand" }]} /></Field>
                  <label className="flex items-center gap-3 text-sm"><Switch checked={d.showBrandName} onChange={(e) => set({ showBrandName: e.target.checked })} /> Afficher le nom de votre activité à côté du logo</label>
                  {!hasLogo && <p className="text-xs text-muted-foreground">Pas encore de logo : ajoutez-le dans <Link href="/business" className="underline">Mon Business</Link>. En attendant, le symbole Leadora est affiché.</p>}
                </>
              )}
            </>
          )}

          {group === "layout" && (
            <>
              <Field label="Alignement des textes"><Segmented label="Alignement" value={d.align} onChange={(v) => set({ align: v })} options={[{ value: "left", label: "À gauche" }, { value: "center", label: "Centré" }]} /></Field>
              <Field label="Page d'introduction" hint={config.coverImage ? undefined : "Ajoutez une image de couverture (étape Informations) pour utiliser ces dispositions."}>
                <Segmented label="Disposition de l'introduction" value={d.introLayout} onChange={(v) => set({ introLayout: v })} options={[{ value: "stack", label: "Image au-dessus" }, { value: "split", label: "Image à côté" }, { value: "hero", label: "Image en fond" }]} />
              </Field>
              <label className="flex items-center gap-3 text-sm"><Switch checked={d.showMeta} onChange={(e) => set({ showMeta: e.target.checked })} /> Afficher la durée et le nombre de questions</label>
            </>
          )}

          {group === "style" && (
            <>
              <Field label="Arrondis"><Segmented label="Arrondis" value={d.corners} onChange={(v) => set({ corners: v })} options={[{ value: "sharp", label: "Angles vifs" }, { value: "rounded", label: "Arrondis" }, { value: "soft", label: "Très arrondis" }]} /></Field>
              <Field label="Cartes de réponses"><Segmented label="Cartes de réponses" value={d.optionStyle} onChange={(v) => set({ optionStyle: v })} options={[{ value: "outline", label: "Avec contour" }, { value: "filled", label: "Remplies" }]} /></Field>
              <Field label="Indicateur de progression"><Segmented label="Progression" value={d.progress} onChange={(v) => set({ progress: v })} options={[{ value: "bar", label: "Barre" }, { value: "steps", label: "Étapes" }, { value: "none", label: "Masqué" }]} /></Field>
            </>
          )}

          {group === "footer" && (
            <>
              <Field label="Texte libre" htmlFor="d-footer" optional hint="Mentions, adresse, rappel de confidentialité…"><Textarea id="d-footer" rows={3} maxLength={200} value={d.footerText} onChange={(e) => set({ footerText: e.target.value })} /></Field>
              <label className="flex items-start gap-3 text-sm"><Switch className="mt-0.5" checked={free ? true : d.showPoweredBy} disabled={free} onChange={(e) => set({ showPoweredBy: e.target.checked })} /><span><span className="block font-medium">Afficher « Propulsé par Leadora »</span><span className="text-muted-foreground">{free ? "Obligatoire avec l'offre Gratuit. Vous pourrez la retirer avec une offre supérieure." : "Vous pouvez retirer cette mention."}</span></span></label>
            </>
          )}
    </>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setOpen(Object.fromEntries(GROUPS.map((g) => [g.id, !allOpen])) as Record<GroupId, boolean>)} className="text-sm font-medium text-muted-foreground hover:text-foreground">{allOpen ? "Tout replier" : "Tout déplier"}</button>
        {customized && <Button variant="ghost" size="sm" onClick={() => update((c) => void (c.design = undefined))}><RotateCcw /> Réinitialiser le design</Button>}
      </div>
      {GROUPS.map((g) => <Section key={g.id} id={g.id} title={g.label} hint={g.hint} icon={g.icon} open={open[g.id]} onToggle={() => toggle(g.id)}>{body(g.id)}</Section>)}
    </div>
  );
}
