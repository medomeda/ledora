"use client";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { adoptGenerationAction, generateQuizAction } from "@/actions/ai";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { QuizConfig } from "@/types/domain";

const EXAMPLE = "Je suis coach financier et je souhaite attirer des salariés qui rencontrent des difficultés à gérer leur argent. Je veux un quiz permettant d'identifier leur profil financier et de leur proposer un accompagnement.";

/** Formulaire de génération assistée + relecture avant adoption (l'IA propose, l'utilisateur valide). */
export function AiQuizGenerator({ usage }: { usage: { used: number; limit: number | null } }) {
  const [brief, setBrief] = useState("");
  const [target, setTarget] = useState("");
  const [tone, setTone] = useState("chaleureux");
  const [count, setCount] = useState(6);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; config: QuizConfig; provider: string } | null>(null);
  const [pending, start] = useTransition();
  const [adopting, startAdopt] = useTransition();
  const exhausted = usage.limit !== null && usage.used >= usage.limit;

  const generate = () => start(async () => {
    setError(null);
    const r = await generateQuizAction({ brief, target, tone, questionCount: count });
    if (r.ok) setResult({ id: r.data.generationId, config: r.data.config, provider: r.data.provider });
    else setError(r.fieldErrors?.brief ?? r.error);
  });

  if (result) {
    const c = result.config;
    return (
      <div className="space-y-5">
        {result.provider === "mock" && <Alert tone="info" title="Mode simulation">Cette proposition est générée localement, sans modèle de langage externe. Elle sert à tester le parcours ; vous pourrez tout modifier.</Alert>}
        <div className="rounded-xl border bg-muted/40 p-5">
          <p className="font-display text-xl font-semibold">{c.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
          <p className="mt-4 text-sm leading-relaxed">{c.introduction}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><p className="mb-2 text-sm font-semibold">{c.questions.length} questions</p><ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">{c.questions.map((q) => <li key={q.id}>{q.title}</li>)}</ol></div>
          <div><p className="mb-2 text-sm font-semibold">{c.profiles.length} profils de résultat</p><ul className="space-y-2 text-sm">{c.profiles.map((p) => <li key={p.id}><span className="font-medium">{p.name}</span><span className="block text-muted-foreground">{p.description}</span></li>)}</ul></div>
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        <p className="text-sm text-muted-foreground">Rien n&apos;est publié : vous allez créer un brouillon que vous pourrez modifier librement avant publication.</p>
        <div className="flex flex-wrap gap-2">
          <Button loading={adopting} onClick={() => startAdopt(async () => { const r = await adoptGenerationAction({ generationId: result.id }); if (r && !r.ok) setError(r.error); })}>Créer le brouillon et le modifier</Button>
          <Button variant="outline" onClick={() => setResult(null)}><RefreshCw /> Reformuler mon besoin</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); generate(); }} className="space-y-5">
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Décrivez votre besoin" htmlFor="brief" hint="Qui êtes-vous, qui voulez-vous attirer, et que doit révéler le quiz ?">
        <Textarea id="brief" rows={5} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder={EXAMPLE} />
        <button type="button" onClick={() => setBrief(EXAMPLE)} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">Utiliser un exemple</button>
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Cible" htmlFor="target" optional><Input id="target" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Salariés, indépendants…" /></Field>
        <Field label="Ton" htmlFor="tone"><Select id="tone" value={tone} onChange={(e) => setTone(e.target.value)}><option value="chaleureux">Chaleureux</option><option value="professionnel">Professionnel</option><option value="dynamique">Dynamique</option><option value="expert">Expert</option></Select></Field>
        <Field label="Nombre de questions" htmlFor="count"><Select id="count" value={count} onChange={(e) => setCount(Number(e.target.value))}>{[3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} questions</option>)}</Select></Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={exhausted || brief.trim().length < 20} loading={pending}>{pending ? <Loader2 className="animate-spin" /> : <Sparkles />} Générer une proposition</Button>
        <span className="text-xs text-muted-foreground">{usage.limit === null ? `${usage.used} génération(s) ce mois-ci` : `${usage.used} / ${usage.limit} générations ce mois-ci`}</span>
      </div>
      {exhausted && <Alert tone="warning">Vous avez atteint votre quota mensuel de générations IA.</Alert>}
    </form>
  );
}
