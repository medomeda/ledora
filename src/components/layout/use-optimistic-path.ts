"use client";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * Chemin « actif » pour les menus : dès le clic, la cible est considérée comme active, sans attendre la fin de la
 * navigation. Sans cela, la page change avant que le menu ne suive (ancien et nouvel élément s'allument brièvement
 * ensemble : c'est le scintillement). Dès que le chemin réel change, il reprend la main.
 */
export function useOptimisticPath() {
  const pathname = usePathname();
  const [nav, setNav] = useState<{ to: string; from: string } | null>(null);
  const current = nav && nav.from === pathname ? nav.to : pathname;
  return { current, select: (to: string) => setNav({ to, from: pathname }) };
}
