import { Skeleton } from "@/components/ui/feedback";

/** Chargement d'un onglet de Mon Business : l'en-tête et les onglets (layout) restent en place, seule la carte est remplacée. */
export default function Loading() {
  return (
    <div className="rounded-xl border bg-card p-5 sm:p-7" aria-busy>
      <Skeleton className="mb-6 h-5 w-56" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Skeleton className="h-10 sm:col-span-2" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-20 sm:col-span-2" />
      </div>
    </div>
  );
}
