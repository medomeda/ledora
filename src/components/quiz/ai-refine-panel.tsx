"use client";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { refineQuizAction } from "@/actions/ai";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { REFINE_EXAMPLES } from "@/lib/constants/ai-examples";
import type { QuizConfig } from "@/types/domain";

export interface Proposal {
  config: QuizConfig;
  changes: string[];
  instruction: string;
}

/**
 * Demande d'ajustement en langage naturel. Le résultat est une PROPOSITION (liste de changements) que l'appelant
 * applique ou non : l'IA propose, l'utilisateur valide.
 */
export function AiRefinePanel({ config, onProposal, disabled }: { config: QuizConfig; onProposal: (p: Proposal) => void; disabled?: boolean }) {
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (text = instruction) => start(async () => {
    setError(null); setHint(null);
    const r = await refineQuizAction({ config, instruction: text });
    if (!r.ok) return setError(r.fieldErrors?.instruction ?? r.error);
    if (r.data.changes.length === 0) return setHint(r.data.hint ?? "Aucun changement proposé.");
    onProposal({ config: r.data.config, changes: r.data.changes, instruction: text });
    setInstruction("");
  });

  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); if (instruction.trim()) submit(); }} className="space-y-3">
        <label htmlFor="refine-instruction" className="text-sm font-medium">Que souhaitez-vous ajuster ?</label>
        <Textarea id="refine-instruction" rows={2} value={instruction} maxLength={300} disabled={disabled} onChange={(e) => setInstruction(e.target.value)} placeholder="Ex. : Ajoute une question sur l'épargne" />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" loading={pending} disabled={disabled || !instruction.trim()}>{pending ? <Loader2 className="animate-spin" /> : <Sparkles />} Proposer cet ajustement</Button>
        </div>
      </form>
      <div className="flex flex-wrap gap-1.5" aria-label="Exemples de demandes">
        {REFINE_EXAMPLES.map((e) => <button key={e} type="button" disabled={disabled || pending} onClick={() => setInstruction(e)} className="rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50">{e}</button>)}
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {hint && <Alert tone="warning">{hint}</Alert>}
    </div>
  );
}

export function ChangeList({ changes }: { changes: string[] }) {
  return <ul className="space-y-1.5 text-sm">{changes.map((c, i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" /><span>{c}</span></li>)}</ul>;
}
