"use client";
import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { LEAD_STATUS_LABELS, LEAD_STATUS_ORDER } from "@/lib/constants/labels";

/** Filtres du CRM : l'état vit dans l'URL (partageable, rechargeable). */
export function LeadFilters({ quizzes, profiles, tags }: { quizzes: Array<{ id: string; title: string }>; profiles: string[]; tags: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const urlQ = sp.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  const [seen, setSeen] = useState(urlQ);
  // Resynchronise le champ quand l'URL change (réinitialisation des filtres) sans effet.
  if (seen !== urlQ) { setSeen(urlQ); setQ(urlQ); }

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value); else next.delete(key);
    next.delete("page");
    router.replace(`${pathname}?${next.toString()}`);
  };
  const active = ["q", "quiz", "profile", "status", "tag", "from", "to", "multiple"].some((k) => sp.get(k));

  return (
    <div className="space-y-3">
      <form role="search" onSubmit={(e) => { e.preventDefault(); set("q", q.trim()); }} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="Rechercher par nom ou email" placeholder="Rechercher par nom ou email…" value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => q.trim() !== (sp.get("q") ?? "") && set("q", q.trim())} className="pl-9" />
      </form>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <Select aria-label="Quiz" value={sp.get("quiz") ?? ""} onChange={(e) => set("quiz", e.target.value)}><option value="">Tous les quiz</option>{quizzes.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</Select>
        <Select aria-label="Profil" value={sp.get("profile") ?? ""} onChange={(e) => set("profile", e.target.value)}><option value="">Tous les profils</option>{profiles.map((x) => <option key={x}>{x}</option>)}</Select>
        <Select aria-label="Statut" value={sp.get("status") ?? ""} onChange={(e) => set("status", e.target.value)}><option value="">Tous les statuts</option>{LEAD_STATUS_ORDER.map((x) => <option key={x} value={x}>{LEAD_STATUS_LABELS[x]}</option>)}</Select>
        <Select aria-label="Tag" value={sp.get("tag") ?? ""} onChange={(e) => set("tag", e.target.value)}><option value="">Tous les tags</option>{tags.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>
        <Input type="date" aria-label="Inscrit depuis le" value={sp.get("from") ?? ""} onChange={(e) => set("from", e.target.value)} />
        <Input type="date" aria-label="Inscrit jusqu'au" value={sp.get("to") ?? ""} onChange={(e) => set("to", e.target.value)} />
      </div>
      <label className="flex w-fit items-center gap-2 text-sm"><input type="checkbox" checked={sp.get("multiple") === "1"} onChange={(e) => set("multiple", e.target.checked ? "1" : "")} className="size-4 accent-[var(--primary)]" /> Plusieurs participations seulement</label>
      {active && <Button variant="ghost" size="sm" onClick={() => router.replace(pathname)}><X /> Réinitialiser les filtres</Button>}
    </div>
  );
}
