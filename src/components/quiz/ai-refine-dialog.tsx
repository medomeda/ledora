"use client";
import { Sparkles, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useState } from "react";
import { AiRefinePanel, ChangeList, type Proposal } from "@/components/quiz/ai-refine-panel";
import { Button } from "@/components/ui/button";
import type { QuizConfig } from "@/types/domain";

/**
 * « Ajuster avec l'IA » dans le créateur : l'utilisateur décrit un changement, l'IA le PROPOSE sous forme de liste,
 * il l'applique ou l'ignore. Un changement appliqué peut être annulé depuis la notification.
 */
export function AiRefineDialog({ open, onOpenChange, config, onApply }: { open: boolean; onOpenChange: (o: boolean) => void; config: QuizConfig; onApply: (proposal: Proposal) => void }) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const close = (o: boolean) => { if (!o) setProposal(null); onOpenChange(o); };
  return (
    <DialogPrimitive.Root open={open} onOpenChange={close}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-primary/40 backdrop-blur-[1px]" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-card p-6 shadow-xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <DialogPrimitive.Title className="flex items-center gap-2 font-display text-lg font-semibold"><Sparkles className="size-5" /> Ajuster avec l&apos;IA</DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">Décrivez le changement souhaité. L&apos;IA vous le propose : rien n&apos;est modifié tant que vous n&apos;avez pas appliqué.</DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Fermer"><X className="size-4" /></DialogPrimitive.Close>
          </div>
          {proposal ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4"><p className="mb-2 text-sm font-medium">« {proposal.instruction} »</p><ChangeList changes={proposal.changes} /></div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => { onApply(proposal); setProposal(null); onOpenChange(false); }}>Appliquer ces changements</Button>
                <Button variant="outline" onClick={() => setProposal(null)}>Ignorer</Button>
              </div>
            </div>
          ) : (
            <AiRefinePanel config={config} onProposal={setProposal} />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
