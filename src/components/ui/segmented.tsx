"use client";
import { cn } from "@/lib/utils/cn";

/** Choix unique présenté en boutons accolés (accessible : groupe de boutons radio). */
export function Segmented<T extends string>({ value, onChange, options, label, className }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string; hint?: string }>; label: string; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex w-full rounded-lg bg-muted p-1", className)}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} title={o.hint} onClick={() => onChange(o.value)} className={cn("flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors", value === o.value ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}>{o.label}</button>
      ))}
    </div>
  );
}
