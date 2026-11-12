"use client";
import { CalendarRange } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

const PRESETS = [{ key: "7", label: "7 j" }, { key: "30", label: "30 j" }, { key: "90", label: "90 j" }, { key: "all", label: "Tout" }];

/** Filtre de période : préréglages (7, 30, 90 jours, tout) ou dates personnalisées. L'état vit dans l'URL (partageable, rechargeable). */
export function PeriodFilter({ active, from, to }: { active: string; from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const today = new Date().toISOString().slice(0, 10);
  const [custom, setCustom] = useState(active === "custom");
  const [start, setStart] = useState(active === "custom" ? from : "");
  const [end, setEnd] = useState(active === "custom" ? to : "");
  const go = (qs: string) => router.push(`${pathname}?${qs}`);
  const invalid = !start && !end ? true : !!start && !!end && start > end;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Période" className="inline-flex rounded-lg bg-muted p-1">
        {PRESETS.map((p) => (
          <button key={p.key} type="button" aria-pressed={active === p.key && !custom} onClick={() => { setCustom(false); go(`range=${p.key}`); }} className={cn("rounded-md px-3 py-1.5 text-sm transition-colors", active === p.key && !custom ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}>{p.label}</button>
        ))}
        <button type="button" aria-pressed={custom} onClick={() => setCustom(true)} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors", custom ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}><CalendarRange className="size-4" /> Période</button>
      </div>
      {custom && (
        <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (!invalid) go(`range=custom${start ? `&from=${start}` : ""}${end ? `&to=${end}` : ""}`); }}>
          <Input type="date" aria-label="Du" value={start} max={end || today} onChange={(e) => setStart(e.target.value)} className="h-9 w-40" />
          <span className="text-sm text-muted-foreground">au</span>
          <Input type="date" aria-label="Au" value={end} min={start || undefined} max={today} onChange={(e) => setEnd(e.target.value)} className="h-9 w-40" />
          <Button type="submit" size="sm" disabled={invalid}>Appliquer</Button>
        </form>
      )}
    </div>
  );
}
