"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { resetPlanAction, updatePlanAction } from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PlanId } from "@/types/domain";

export interface PlanFormValues {
  maxActiveQuizzes: number | null;
  maxMonthlySubmissions: number | null;
  maxMonthlyAiGenerations: number | null;
  priceLabel: string;
}

const toStr = (v: number | null) => (v === null ? "" : String(v));
const toNum = (v: string): number | null | "invalid" => {
  const t = v.trim();
  if (t === "") return null;
  return /^\d+$/.test(t) ? Number(t) : "invalid";
};

/** Édition des quotas et du prix affiché d'une offre. Un champ vide signifie « illimité ». Effet immédiat, sans redéploiement. */
export function PlanEditor({ plan, name, accounts, values, customized }: { plan: PlanId; name: string; accounts: number; values: PlanFormValues; customized: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({ maxActiveQuizzes: toStr(values.maxActiveQuizzes), maxMonthlySubmissions: toStr(values.maxMonthlySubmissions), maxMonthlyAiGenerations: toStr(values.maxMonthlyAiGenerations), priceLabel: values.priceLabel });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = f.maxActiveQuizzes !== toStr(values.maxActiveQuizzes) || f.maxMonthlySubmissions !== toStr(values.maxMonthlySubmissions) || f.maxMonthlyAiGenerations !== toStr(values.maxMonthlyAiGenerations) || f.priceLabel !== values.priceLabel;

  const save = () => {
    const a = toNum(f.maxActiveQuizzes), b = toNum(f.maxMonthlySubmissions), c = toNum(f.maxMonthlyAiGenerations);
    const local: Record<string, string> = {};
    if (a === "invalid") local.maxActiveQuizzes = "Entier positif ou vide.";
    if (b === "invalid") local.maxMonthlySubmissions = "Entier positif ou vide.";
    if (c === "invalid") local.maxMonthlyAiGenerations = "Entier positif ou vide.";
    if (Object.keys(local).length) return setErrors(local);
    setErrors({});
    start(async () => {
      const res = await updatePlanAction({ plan, maxActiveQuizzes: a, maxMonthlySubmissions: b, maxMonthlyAiGenerations: c, priceLabel: f.priceLabel });
      if (res.ok) { toast.success(`Offre « ${name} » mise à jour.`); router.refresh(); } else setErrors(res.fieldErrors ?? { _: res.error });
    });
  };
  const reset = () => start(async () => {
    const res = await resetPlanAction({ plan });
    if (res.ok) { toast.success("Valeurs par défaut rétablies."); router.refresh(); } else toast.error(res.error);
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  return (
    <Card>
      <CardHeader>
        <div><CardTitle>{name}</CardTitle><CardDescription>{accounts} compte{accounts > 1 ? "s" : ""} sur cette offre</CardDescription></div>
        {customized && <Badge tone="warning">Personnalisée</Badge>}
      </CardHeader>
      <CardBody className="space-y-4">
        <Field label="Prix affiché" htmlFor={`${plan}-price`} error={errors.priceLabel} hint="Texte libre affiché sur la page d'accueil (ex. « 19 € / mois », « Bientôt »)."><Input id={`${plan}-price`} value={f.priceLabel} onChange={set("priceLabel")} /></Field>
        <Field label="Quiz actifs" htmlFor={`${plan}-quizzes`} error={errors.maxActiveQuizzes} hint="Vide = illimité."><Input id={`${plan}-quizzes`} inputMode="numeric" placeholder="Illimité" value={f.maxActiveQuizzes} onChange={set("maxActiveQuizzes")} /></Field>
        <Field label="Participations par mois" htmlFor={`${plan}-subs`} error={errors.maxMonthlySubmissions}><Input id={`${plan}-subs`} inputMode="numeric" placeholder="Illimité" value={f.maxMonthlySubmissions} onChange={set("maxMonthlySubmissions")} /></Field>
        <Field label="Générations IA par mois" htmlFor={`${plan}-ai`} error={errors.maxMonthlyAiGenerations}><Input id={`${plan}-ai`} inputMode="numeric" placeholder="Illimité" value={f.maxMonthlyAiGenerations} onChange={set("maxMonthlyAiGenerations")} /></Field>
        {errors._ && <p role="alert" className="text-sm font-medium text-destructive">{errors._}</p>}
        <div className="flex gap-2 pt-1">
          <Button onClick={save} loading={pending} disabled={!dirty}>Enregistrer</Button>
          {customized && <Button variant="ghost" onClick={reset} disabled={pending}>Valeurs par défaut</Button>}
        </div>
      </CardBody>
    </Card>
  );
}
