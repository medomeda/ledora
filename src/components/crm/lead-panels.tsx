"use client";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addNoteAction, addTagAction, deleteLeadAction, deleteNoteAction, removeTagAction, updateLeadAction, updateLeadStatusAction } from "@/actions/leads";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { LEAD_STATUS_LABELS, LEAD_STATUS_ORDER } from "@/lib/constants/labels";
import { fmtDateTime } from "@/lib/utils/dates";
import type { LeadStatus } from "@/types/domain";

type Res = { ok: boolean; error?: string };

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Res>, success?: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) { if (success) toast.success(success); after?.(); router.refresh(); } else toast.error(r.error);
    });
  return { run, pending };
}

export function StatusSelect({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const { run, pending } = useRun();
  return (
    <Select aria-label="Statut commercial" value={status} disabled={pending} className="w-44" onChange={(e) => run(() => updateLeadStatusAction({ leadId, status: e.target.value }), "Statut mis à jour.")}>
      {LEAD_STATUS_ORDER.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
    </Select>
  );
}

export function TagsPanel({ leadId, tags }: { leadId: string; tags: Array<{ id: string; name: string; color: string }> }) {
  const { run, pending } = useRun();
  const [name, setName] = useState("");
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 && <p className="text-sm text-muted-foreground">Aucun tag.</p>}
        {tags.map((t) => (
          <span key={t.id} className="inline-flex items-center gap-1 rounded-full py-0.5 pl-2.5 pr-1 text-xs font-medium" style={{ background: `${t.color}1f`, color: t.color }}>
            {t.name}
            <button aria-label={`Retirer le tag ${t.name}`} className="rounded-full p-0.5 hover:bg-black/10" onClick={() => run(() => removeTagAction({ leadId, tagId: t.id }))}><X className="size-3" /></button>
          </span>
        ))}
      </div>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) run(() => addTagAction({ leadId, name }), undefined, () => setName("")); }}>
        <Input aria-label="Nouveau tag" placeholder="Ajouter un tag…" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className="h-9" />
        <Button type="submit" size="sm" variant="outline" loading={pending} disabled={!name.trim()}><Plus /> Ajouter</Button>
      </form>
    </div>
  );
}

export function NotesPanel({ leadId, notes }: { leadId: string; notes: Array<{ id: string; content: string; createdAt: string }> }) {
  const { run, pending } = useRun();
  const [content, setContent] = useState("");
  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); if (content.trim()) run(() => addNoteAction({ leadId, content }), "Note ajoutée.", () => setContent("")); }} className="space-y-2">
        <Textarea aria-label="Nouvelle note" rows={3} placeholder="Ajouter une note de suivi…" value={content} maxLength={2000} onChange={(e) => setContent(e.target.value)} />
        <Button type="submit" size="sm" loading={pending} disabled={!content.trim()}>Enregistrer la note</Button>
      </form>
      {notes.length === 0 ? <p className="text-sm text-muted-foreground">Aucune note pour l&apos;instant.</p> : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="group rounded-lg bg-muted/60 p-3">
              <p className="whitespace-pre-line text-sm">{n.content}</p>
              <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground"><span>{fmtDateTime(n.createdAt)}</span><button aria-label="Supprimer la note" className="rounded p-1 hover:bg-card hover:text-destructive" onClick={() => run(() => deleteNoteAction({ noteId: n.id }), "Note supprimée.")}><Trash2 className="size-3.5" /></button></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LeadActions({ leadId, firstName, lastName, phone, email }: { leadId: string; firstName: string; lastName: string; phone: string; email: string }) {
  const router = useRouter();
  const { run, pending } = useRun();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [form, setForm] = useState({ firstName, lastName, phone });
  return (
    <>
      <Button variant="outline" onClick={() => setEditing(true)}><Pencil /> Modifier</Button>
      <Button variant="ghost" className="text-destructive hover:bg-destructive-soft" onClick={() => setConfirm(true)}><Trash2 /> Supprimer</Button>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent title="Modifier le prospect" description={email}>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); run(() => updateLeadAction({ leadId, ...form }), "Prospect mis à jour.", () => setEditing(false)); }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénom" htmlFor="e-fn"><Input id="e-fn" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
              <Field label="Nom" htmlFor="e-ln" optional><Input id="e-ln" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
            </div>
            <Field label="Téléphone" htmlFor="e-ph" optional><Input id="e-ph" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditing(false)}>Annuler</Button><Button type="submit" loading={pending} disabled={!form.firstName.trim()}>Enregistrer</Button></div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} destructive loading={pending} title="Supprimer ce prospect ?" confirmLabel="Supprimer le prospect"
        description={<><p>La fiche, les notes, les tags et les consentements de {firstName} seront supprimés définitivement (droit à l&apos;effacement).</p><p className="mt-2">Ses participations restent dans les statistiques des quiz, mais sont anonymisées.</p></>}
        onConfirm={() => run(() => deleteLeadAction({ leadId }), "Prospect supprimé.", () => router.push("/crm"))} />
    </>
  );
}
