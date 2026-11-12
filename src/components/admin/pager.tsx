import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Pagination par liens (l'état reste dans l'URL). */
export function Pager({ basePath, sp, page, pages }: { basePath: string; sp: Record<string, string | undefined>; page: number; pages: number }) {
  if (pages <= 1) return null;
  const href = (p: number) => { const n = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]); n.set("page", String(p)); return `${basePath}?${n.toString()}`; };
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between">
      <Button asChild variant="outline" size="sm" className={page <= 1 ? "pointer-events-none opacity-50" : ""}><Link href={href(page - 1)} aria-disabled={page <= 1}><ChevronLeft /> Précédent</Link></Button>
      <span className="text-sm text-muted-foreground">Page {page} sur {pages}</span>
      <Button asChild variant="outline" size="sm" className={page >= pages ? "pointer-events-none opacity-50" : ""}><Link href={href(page + 1)} aria-disabled={page >= pages}>Suivant <ChevronRight /></Link></Button>
    </nav>
  );
}
