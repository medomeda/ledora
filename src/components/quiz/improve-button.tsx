"use client";
import { Check, Sparkles, X } from "lucide-react";
import { useState, useTransition } from "react";
import { improveTextAction } from "@/actions/ai";
import { useFeatures } from "@/components/layout/features-context";
import { Button } from "@/components/ui/button";
import type { ImproveKind } from "@/services/ai/types";

/** « Améliorer avec l'IA » : propose 3 reformulations ; l'utilisateur choisit (ou ignore). Rien n'est appliqué automatiquement. */
export function ImproveButton({ kind, value, onApply, label = "Améliorer avec l'IA" }: { kind: ImproveKind; value: string; onApply: (text: string) => void; label?: string }) {
  const [variants, setVariants] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!useFeatures().ai) return null;
  return (
    <div className="space-y-2">
      <Button type="button" variant="ghost" size="sm" className="-ml-2 h-8 text-muted-foreground" disabled={!value.trim()} loading={pending} onClick={() => start(async () => {
        setError(null);
        const r = await improveTextAction({ kind, text: value });
        if (r.ok) setVariants(r.data.variants); else setError(r.error);
      })}>
        <Sparkles /> {label}
      </Button>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      {variants && (
        <div className="rounded-lg border bg-muted/40 p-2">
          <div className="mb-1 flex items-center justify-between px-1 text-xs text-muted-foreground"><span>Choisissez une reformulation</span><button type="button" onClick={() => setVariants(null)} aria-label="Fermer les suggestions"><X className="size-3.5" /></button></div>
          <ul className="space-y-1">
            {variants.map((v, i) => (
              <li key={i}><button type="button" onClick={() => { onApply(v); setVariants(null); }} className="flex w-full items-start gap-2 rounded-md bg-card px-3 py-2 text-left text-sm hover:bg-accent-soft"><Check className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />{v}</button></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
