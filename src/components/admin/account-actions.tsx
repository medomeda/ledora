"use client";
import { KeyRound, LogOut, MailCheck, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { changePlanAction, deleteAccountAction, issueResetLinkAction, reactivateAccountAction, revokeSessionsAction, setRoleAction, suspendAccountAction, verifyEmailAction } from "@/actions/admin";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { PLAN_LABELS } from "@/lib/constants/labels";
import type { PlanId } from "@/types/domain";

interface Props {
  businessId: string;
  ownerId: string;
  ownerEmail: string;
  plan: PlanId;
  suspended: boolean;
  emailVerified: boolean;
  ownerIsAdmin: boolean;
  isSelf: boolean;
  impact: { quizzes: number; submissions: number; leads: number };
}

/** Actions d'administration sur un compte. Chaque action sensible demande une confirmation et, selon le cas, un motif. */
export function AccountActions({ businessId, ownerId, ownerEmail, plan, suspended, emailVerified, ownerIsAdmin, isSelf, impact }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [newPlan, setNewPlan] = useState<PlanId>(plan);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string } | { ok: true } | { ok: false; error: string }>, success: string, after?: () => void) =>
    start(async () => {
      const res = (await fn()) as { ok: boolean; error?: string };
      if (res.ok) { toast.success(success); after?.(); router.refresh(); } else toast.error(res.error ?? "Action impossible.");
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Offre du compte" htmlFor="plan" className="w-48">
          <Select id="plan" value={newPlan} onChange={(e) => setNewPlan(e.target.value as PlanId)}>{Object.entries(PLAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        </Field>
        <Button disabled={newPlan === plan} loading={pending} onClick={() => run(() => changePlanAction({ businessId, plan: newPlan }), "Offre mise à jour.")}>Appliquer</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {suspended ? (
          <Button variant="outline" loading={pending} onClick={() => run(() => reactivateAccountAction({ businessId }), "Compte réactivé.")}><ShieldCheck /> Réactiver le compte</Button>
        ) : (
          <Button variant="outline" disabled={isSelf} onClick={() => { setReason(""); setReasonError(null); setSuspendOpen(true); }}><ShieldOff /> Suspendre</Button>
        )}
        {!emailVerified && <Button variant="outline" loading={pending} onClick={() => run(() => verifyEmailAction({ businessId }), "Email marqué comme confirmé.")}><MailCheck /> Confirmer l&apos;email</Button>}
        <Button variant="outline" loading={pending} onClick={() => run(async () => { const r = await issueResetLinkAction({ businessId }); if (r.ok) setLink(r.data.link); return r; }, "Lien de réinitialisation émis.")}><KeyRound /> Lien de réinitialisation</Button>
        <Button variant="outline" loading={pending} onClick={() => run(async () => { const r = await revokeSessionsAction({ businessId }); return r; }, "Sessions révoquées.")}><LogOut /> Déconnecter partout</Button>
        {!isSelf && <Button variant="outline" loading={pending} onClick={() => run(() => setRoleAction({ userId: ownerId, role: ownerIsAdmin ? "user" : "admin" }), ownerIsAdmin ? "Rôle administrateur retiré." : "Utilisateur promu administrateur.")}>{ownerIsAdmin ? "Retirer le rôle admin" : "Promouvoir administrateur"}</Button>}
      </div>

      {link && (
        <Alert tone="info" title="Lien valable 1 heure (aucun email n'est envoyé en simulation)">
          <Link href={link} className="break-all underline" target="_blank">{link}</Link>
        </Alert>
      )}

      <div className="rounded-lg border border-destructive/30 bg-destructive-soft/40 p-4">
        <p className="text-sm font-medium">Zone dangereuse</p>
        <p className="mt-1 text-sm text-muted-foreground">La suppression efface définitivement l&apos;espace, ses quiz, ses participations et ses prospects (droit à l&apos;effacement). Elle ne peut pas être annulée.</p>
        <Button variant="destructive" className="mt-3" disabled={isSelf || ownerIsAdmin} onClick={() => { setConfirm(""); setDeleteError(null); setDeleteOpen(true); }}><Trash2 /> Supprimer le compte</Button>
        {ownerIsAdmin && !isSelf && <p className="mt-2 text-xs text-muted-foreground">Retirez d&apos;abord son rôle administrateur.</p>}
      </div>

      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent title="Suspendre ce compte" description="Le client ne pourra plus utiliser son espace et ses quiz publics cesseront de répondre. Ses données sont conservées.">
          <Field label="Motif (consigné dans le journal)" htmlFor="reason" error={reasonError ?? undefined}><Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. : contenu trompeur signalé" /></Field>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSuspendOpen(false)}>Annuler</Button>
            <Button variant="destructive" loading={pending} onClick={() => start(async () => {
              const res = await suspendAccountAction({ businessId, reason });
              if (res.ok) { toast.success("Compte suspendu."); setSuspendOpen(false); router.refresh(); } else setReasonError(res.fieldErrors?.reason ?? res.error);
            })}>Suspendre</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        destructive
        loading={pending}
        title="Supprimer définitivement ce compte ?"
        confirmLabel="Supprimer définitivement"
        description={(
          <div className="space-y-3">
            <p>Seront effacés : {impact.quizzes} quiz, {impact.submissions} participation{impact.submissions > 1 ? "s" : ""} et {impact.leads} prospect{impact.leads > 1 ? "s" : ""}. Pour confirmer, saisissez <strong className="text-foreground">{ownerEmail}</strong>.</p>
            <Input aria-label="Adresse email du propriétaire" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={ownerEmail} aria-invalid={!!deleteError} />
            {deleteError && <p role="alert" className="text-xs font-medium text-destructive">{deleteError}</p>}
          </div>
        )}
        onConfirm={() => start(async () => {
          const res = await deleteAccountAction({ businessId, confirm });
          if (res.ok) { toast.success("Compte supprimé."); router.push("/admin/comptes"); router.refresh(); } else setDeleteError(res.fieldErrors?.confirm ?? res.error);
        })}
      />
    </div>
  );
}
