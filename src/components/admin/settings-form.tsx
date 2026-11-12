"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateSettingsAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Switch, Textarea } from "@/components/ui/input";

export function SettingsForm({ registrationsOpen, announcement }: { registrationsOpen: boolean; announcement: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(registrationsOpen);
  const [text, setText] = useState(announcement);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dirty = open !== registrationsOpen || text.trim() !== announcement;
  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await updateSettingsAction({ registrationsOpen: open, announcement: text }); if (r.ok) { setError(null); toast.success("Réglages enregistrés."); router.refresh(); } else setError(r.fieldErrors?.announcement ?? r.error); }); }}>
      <div className="flex items-start justify-between gap-4">
        <div><label htmlFor="reg" className="text-sm font-medium">Inscriptions ouvertes</label><p className="mt-0.5 text-sm text-muted-foreground">Désactivez pour fermer la création de nouveaux comptes (les clients existants ne sont pas affectés).</p></div>
        <Switch id="reg" checked={open} onChange={(e) => setOpen(e.target.checked)} />
      </div>
      <Field label="Annonce affichée à tous les clients" htmlFor="ann" error={error ?? undefined} hint="Bandeau visible en haut de l'espace de chaque client (maintenance, nouveauté…). Laissez vide pour ne rien afficher. 240 caractères maximum." optional>
        <Textarea id="ann" rows={3} maxLength={240} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex. : Maintenance prévue dimanche à 22 h, l'application sera indisponible 15 minutes." />
      </Field>
      <Button type="submit" loading={pending} disabled={!dirty}>Enregistrer</Button>
    </form>
  );
}
