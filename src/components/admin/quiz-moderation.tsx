"use client";
import { Gavel } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { moderateQuizAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import type { QuizStatus } from "@/types/domain";

/** Modération d'un quiz : coupe l'accès public (dépublier) ou retire le quiz (archiver), avec un motif consigné. */
export function QuizModeration({ quizId, title, status }: { quizId: string; title: string; status: QuizStatus }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"unpublish" | "archive">("unpublish");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (status === "archived") return <span className="text-xs text-muted-foreground">—</span>;
  const submit = () => start(async () => {
    const res = await moderateQuizAction({ quizId, action, reason });
    if (res.ok) { toast.success(action === "unpublish" ? "Quiz dépublié." : "Quiz archivé."); setOpen(false); router.refresh(); } else setError(res.fieldErrors?.reason ?? res.error);
  });
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => { setAction(status === "published" ? "unpublish" : "archive"); setReason(""); setError(null); setOpen(true); }}><Gavel /> Modérer</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Modérer ce quiz" description={`« ${title} » : les données du client (participations, prospects) sont conservées.`}>
          <fieldset className="mb-4 space-y-2 text-sm">
            <legend className="sr-only">Action</legend>
            {status === "published" && <label className="flex items-start gap-2"><input type="radio" name="act" checked={action === "unpublish"} onChange={() => setAction("unpublish")} className="mt-1 accent-[var(--primary)]" /><span><span className="font-medium">Dépublier</span><br /><span className="text-muted-foreground">Le lien public cesse de répondre ; le client peut corriger puis republier.</span></span></label>}
            <label className="flex items-start gap-2"><input type="radio" name="act" checked={action === "archive"} onChange={() => setAction("archive")} className="mt-1 accent-[var(--primary)]" /><span><span className="font-medium">Archiver</span><br /><span className="text-muted-foreground">Retire le quiz de ses quiz actifs ; il peut être restauré par le client.</span></span></label>
          </fieldset>
          <Field label="Motif (consigné dans le journal)" htmlFor="mod-reason" error={error ?? undefined}><Textarea id="mod-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button variant="destructive" loading={pending} onClick={submit}>Confirmer</Button></div>
        </DialogContent>
      </Dialog>
    </>
  );
}
