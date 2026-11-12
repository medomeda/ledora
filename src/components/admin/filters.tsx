"use client";
import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

export interface FilterSelect {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

/** Recherche et filtres du back-office : l'état vit dans l'URL (partageable, rechargeable). */
export function AdminFilters({ placeholder, selects }: { placeholder: string; selects: FilterSelect[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const urlQ = sp.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  const [seen, setSeen] = useState(urlQ);
  if (seen !== urlQ) { setSeen(urlQ); setQ(urlQ); }
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value); else next.delete(key);
    next.delete("page");
    router.replace(`${pathname}?${next.toString()}`);
  };
  const active = ["q", ...selects.map((s) => s.key)].some((k) => sp.get(k));
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <form role="search" onSubmit={(e) => { e.preventDefault(); set("q", q.trim()); }} className="relative min-w-60 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label={placeholder} placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => q.trim() !== urlQ && set("q", q.trim())} className="pl-9" />
      </form>
      {selects.map((f) => (
        <Select key={f.key} aria-label={f.label} value={sp.get(f.key) ?? ""} onChange={(e) => set(f.key, e.target.value)} className="w-auto min-w-40">
          <option value="">{f.label}</option>
          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      ))}
      {active && <Button variant="ghost" size="sm" onClick={() => router.replace(pathname)}><X /> Réinitialiser</Button>}
    </div>
  );
}
