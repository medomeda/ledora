"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

/** Onglets de navigation entre sous-pages (chaque onglet a sa propre adresse). */
export function TabNav({ tabs, label }: { tabs: Array<{ href: string; label: string }>; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="mb-6 border-b">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={active ? "page" : undefined} className={cn("block whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors", active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{t.label}</Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
