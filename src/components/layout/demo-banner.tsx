import Link from "next/link";

/** Bandeau du mode test : rappelle que les données sont fictives (rien de réel ne doit y être saisi). */
export function DemoBanner() {
  return (
    <div role="note" className="border-b border-accent/40 bg-accent-soft px-4 py-1.5 text-center text-xs text-accent-soft-foreground">
      <strong className="font-semibold">Version de démonstration</strong> : données fictives, n&apos;y saisissez aucune information réelle. <Link href="/guide" className="underline underline-offset-2">Guide de test</Link>
    </div>
  );
}
