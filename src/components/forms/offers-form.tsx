"use client";
import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveOffersAction } from "@/actions/business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Offres et services proposés aux prospects : enregistrés séparément des informations de l'activité. */
export function OffersForm({ initial }: { initial: string[] }) {
  const [offers, setOffers] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(offers) !== JSON.stringify(saved);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const clean = offers.map((o) => o.trim()).filter(Boolean);
        start(async () => {
          const r = await saveOffersAction({ offers: clean });
          if (r.ok) { setOffers(clean); setSaved(clean); toast.success("Offres enregistrées."); } else toast.error(r.fieldErrors?.offers ?? r.error);
        });
      }}
    >
      {offers.length === 0 && <p className="text-sm text-muted-foreground">Aucune offre pour l&apos;instant. Ajoutez par exemple un accompagnement, une formation ou un appel découverte.</p>}
      <div className="space-y-2">
        {offers.map((o, i) => (
          <div key={i} className="flex gap-2">
            <Input aria-label={`Offre ${i + 1}`} value={o} maxLength={120} placeholder="Programme « Budget serein » — 6 semaines" onChange={(e) => setOffers(offers.map((x, k) => (k === i ? e.target.value : x)))} />
            <Button type="button" variant="ghost" size="icon" aria-label={`Supprimer l'offre ${i + 1}`} onClick={() => setOffers(offers.filter((_, k) => k !== i))}><Trash2 className="size-4" /></Button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {offers.length < 10 && <Button type="button" variant="outline" size="sm" onClick={() => setOffers([...offers, ""])}><Plus /> Ajouter une offre</Button>}
        <Button type="submit" loading={pending} disabled={!dirty}>Enregistrer les offres</Button>
      </div>
    </form>
  );
}
