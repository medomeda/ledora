"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowLeft, Building2, Gauge, LogOut, Menu, ScrollText, SlidersHorizontal, Target, Tags, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { logoutAction } from "@/actions/auth";
import { Brand } from "@/components/layout/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Permission } from "@/lib/permissions/staff";
import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/text";

const NAV: Array<{ href: string; label: string; icon: typeof Gauge; exact?: boolean; permission?: Permission }> = [
  { href: "/admin", label: "Vue d'ensemble", icon: Gauge, exact: true },
  { href: "/admin/comptes", label: "Comptes", icon: Building2 },
  { href: "/admin/quiz", label: "Quiz", icon: Target },
  { href: "/admin/offres", label: "Offres et quotas", icon: Tags, permission: "plans.configure" },
  { href: "/admin/journal", label: "Journal d'audit", icon: ScrollText },
  { href: "/admin/equipe", label: "Équipe", icon: UsersRound, permission: "team.manage" },
  { href: "/admin/reglages", label: "Réglages", icon: SlidersHorizontal, permission: "settings.manage" },
];

function Links({ onNavigate, permissions }: { onNavigate?: () => void; permissions: Permission[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation de l'administration" className="space-y-0.5">
      {NAV.filter((n) => !n.permission || permissions.includes(n.permission)).map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", active ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/8 hover:text-white")}>
            <Icon className="size-[18px]" />{label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Coque du back-office : barre latérale sombre pour qu'on ne confonde jamais l'administration avec l'espace d'un client. */
export function AdminShell({ user, roleLabel, permissions, hasWorkspace, children }: { user: { firstName: string; lastName: string; email: string }; roleLabel: string; permissions: Permission[]; hasWorkspace: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const footer = (
    <div className="mt-auto space-y-2">
      {hasWorkspace && <Link href="/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/65 hover:bg-white/8 hover:text-white"><ArrowLeft className="size-[18px]" />Mon espace client</Link>}
      <Link href="/admin/profil" onClick={() => setOpen(false)} aria-label="Mon profil" aria-current={pathname === "/admin/profil" ? "page" : undefined} className={cn("block rounded-lg px-3 py-2.5 transition-colors", pathname === "/admin/profil" ? "bg-white/16" : "bg-white/8 hover:bg-white/12")}>
        <p className="truncate text-sm font-medium text-white">{user.firstName} {user.lastName}</p>
        <p className="truncate text-xs text-white/60">Mon profil · {user.email}</p>
      </Link>
      <form action={logoutAction}><button type="submit" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/65 hover:bg-white/8 hover:text-white"><LogOut className="size-[18px]" />Se déconnecter</button></form>
    </div>
  );
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col bg-primary px-4 py-5 lg:flex">
        <div className="mb-8 px-2"><Brand href="/admin" light /><Badge tone="warning" className="ml-[2.625rem] mt-1">{roleLabel}</Badge></div>
        <Links permissions={permissions} />
        {footer}
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur sm:px-6 lg:hidden">
          <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
            <DialogPrimitive.Trigger asChild><Button variant="ghost" size="icon-sm" aria-label="Ouvrir le menu"><Menu className="size-5" /></Button></DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-primary/40" />
              <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-primary p-4 shadow-xl">
                <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">Navigation de l&apos;administration</DialogPrimitive.Description>
                <div className="mb-6 flex items-center justify-between px-2"><Brand href="/admin" light /><DialogPrimitive.Close className="rounded p-1 text-white/70" aria-label="Fermer"><X className="size-5" /></DialogPrimitive.Close></div>
                <Links permissions={permissions} onNavigate={() => setOpen(false)} />
                {footer}
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
          <span className="font-display font-semibold">Administration</span>
          <Link href="/admin/profil" aria-label="Mon profil" className="ml-auto flex size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">{initials(user.firstName, user.lastName)}</Link>
        </header>
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
