"use client";
import Link from "next/link";
import { useOptimisticPath } from "@/components/layout/use-optimistic-path";
import { NavPending } from "@/components/layout/nav-pending";
import { cn } from "@/lib/utils/cn";

/** Onglets de navigation entre sous-pages (chaque onglet a sa propre adresse). */
export function TabNav({ tabs, label }: { tabs: Array<{ href: string; label: string }>; label: string }) {
  const { current: pathname, select } = useOptimisticPath();
  return (
    <nav aria-label={label} className="mb-6 border-b">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href}>
              <Link href={t.href} onClick={() => select(t.href)} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium", active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{t.label}<NavPending /></Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
