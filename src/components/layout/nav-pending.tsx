"use client";
import { Loader2 } from "lucide-react";
import { useLinkStatus } from "next/link";

/**
 * Indicateur de navigation en cours, à placer DANS un <Link>. Il n'apparaît qu'après un court délai : une navigation
 * rapide ne produit aucun clignotement, une navigation lente montre immédiatement que le clic a été pris en compte.
 * (Remplace les écrans de chargement par segment, qui remplaçaient la page entière pendant quelques millisecondes.)
 */
export function NavPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 aria-hidden className={`animate-spin-delayed size-3.5 ${className ?? ""}`} /> : null;
}
