"use client";
import type { StepProps } from "@/components/quiz/quiz-builder";
import { Alert } from "@/components/ui/feedback";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Switch, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

export function CaptureStep({ config, update }: StepProps) {
  const c = config.capture;
  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-5">
        <h3 className="font-display text-base font-semibold">Quand demander les coordonnées ?</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Moment de la collecte">
          {([["after", "Après les questions", "Recommandé : le participant est investi et veut son résultat."], ["before", "Avant le quiz", "Vous captez tous les contacts, mais certains visiteurs renonceront."]] as const).map(([id, title, text]) => (
            <label key={id} className={cn("flex cursor-pointer gap-3 rounded-lg border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring", c.position === id ? "border-primary bg-primary/[0.04] ring-1 ring-primary" : "hover:bg-muted/50")}>
              <input type="radio" name="capture-pos" className="sr-only" checked={c.position === id} onChange={() => update((x) => void (x.capture.position = id))} />
              <span><span className="block text-sm font-medium">{title}</span><span className="block text-sm text-muted-foreground">{text}</span></span>
            </label>
          ))}
        </div>
        <label className="mt-4 flex items-start gap-3 text-sm"><Switch className="mt-0.5" checked={c.required} onChange={(e) => update((x) => void (x.capture.required = e.target.checked))} /><span><span className="block font-medium">Coordonnées obligatoires</span><span className="text-muted-foreground">Si désactivé, le participant peut voir son résultat sans laisser ses coordonnées.</span></span></label>
      </Card>

      <Card className="space-y-5 p-4 sm:p-5">
        <h3 className="font-display text-base font-semibold">Contenu du formulaire</h3>
        <Field label="Titre du formulaire" htmlFor="c-title"><Input id="c-title" value={c.title} maxLength={120} onChange={(e) => update((x) => void (x.capture.title = e.target.value))} /></Field>
        <Field label="Message explicatif" htmlFor="c-msg" optional><Textarea id="c-msg" rows={2} value={c.message} maxLength={400} onChange={(e) => update((x) => void (x.capture.message = e.target.value))} /></Field>
        <div>
          <p className="mb-2 text-sm font-medium">Champs demandés</p>
          <ul className="divide-y rounded-lg border text-sm">
            <li className="flex items-center justify-between px-3 py-2.5"><span>Prénom</span><span className="text-muted-foreground">Obligatoire</span></li>
            <li className="flex items-center justify-between px-3 py-2.5"><span>Email</span><span className="text-muted-foreground">Obligatoire</span></li>
            <li className="flex items-center justify-between px-3 py-2.5"><label htmlFor="c-ln">Nom</label><Switch id="c-ln" checked={c.askLastName} onChange={(e) => update((x) => void (x.capture.askLastName = e.target.checked))} /></li>
            <li className="flex items-center justify-between px-3 py-2.5"><label htmlFor="c-ph">Téléphone</label><Switch id="c-ph" checked={c.askPhone} onChange={(e) => update((x) => void (x.capture.askPhone = e.target.checked))} /></li>
            {c.askPhone && <li className="flex items-center justify-between px-3 py-2.5 pl-8 text-muted-foreground"><label htmlFor="c-phr">Téléphone obligatoire</label><Switch id="c-phr" checked={c.phoneRequired} onChange={(e) => update((x) => void (x.capture.phoneRequired = e.target.checked))} /></li>}
          </ul>
        </div>
      </Card>

      <Card className="space-y-5 p-4 sm:p-5">
        <h3 className="font-display text-base font-semibold">Consentement et confidentialité</h3>
        <Field label="Texte de la case de consentement marketing" htmlFor="c-consent" hint="La case n'est jamais cochée par défaut et reste facultative : voir son résultat ne dépend pas de ce consentement.">
          <Textarea id="c-consent" rows={2} value={c.consentLabel} maxLength={400} onChange={(e) => update((x) => void (x.capture.consentLabel = e.target.value))} />
        </Field>
        <Field label="Lien vers votre politique de confidentialité" htmlFor="c-priv" optional><Input id="c-priv" value={c.privacyUrl} placeholder="https://" onChange={(e) => update((x) => void (x.capture.privacyUrl = e.target.value))} /></Field>
        <Alert tone="info">Pour chaque participant, Leadora conserve la date et la version de la politique au moment du consentement.</Alert>
      </Card>
    </div>
  );
}
