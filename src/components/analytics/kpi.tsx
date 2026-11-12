import { cn } from "@/lib/utils/cn";

export interface Kpi {
  label: string;
  value: string | number;
  hint?: string;
}

/** Bandeau de chiffres clés : une seule surface, séparée par des filets (pas une rangée de cartes identiques). */
export function KpiStrip({ items, className }: { items: Kpi[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 overflow-hidden rounded-xl border bg-card sm:grid-cols-3 lg:grid-cols-6", className)}>
      {items.map((k, i) => (
        <div key={k.label} className={cn("border-b border-r px-4 py-4 last:border-r-0 sm:px-5", i % 2 === 1 && "border-r-0 sm:border-r", "lg:border-b-0")}>
          <dt className="text-xs text-muted-foreground">{k.label}</dt>
          <dd className="mt-1 font-display text-3xl font-semibold tabular-nums">{k.value}</dd>
          {k.hint && <p className="mt-0.5 text-xs text-muted-foreground">{k.hint}</p>}
        </div>
      ))}
    </dl>
  );
}
