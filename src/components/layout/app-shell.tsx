"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Bot, CalendarDays, Gauge, LifeBuoy, LogOut, Menu, Search, Settings, ShieldCheck, Store, Target, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { confirmEmailAction, logoutAction } from "@/actions/auth";
import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { cn } from "@/lib/utils/cn";
import { useFeatures } from "@/components/layout/features-context";
import { NavPending } from "@/components/layout/nav-pending";
import { initials } from "@/lib/utils/text";
import { toast } from "sonner";

const NAV: Array<{ href: string; label: string; icon: typeof Gauge; feature?: "publications" | "assistant" }> = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/business", label: "Mon Business", icon: Store },
  { href: "/lead-magnets", label: "Lead Magnets", icon: Target },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/publications", label: "Publications", icon: CalendarDays, feature: "publications" },
  { href: "/assistant", label: "Assistant IA", icon: Bot, feature: "assistant" },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const features = useFeatures();
  return (
    <nav aria-label="Navigation principale" className="space-y-0.5">
      {NAV.filter((n) => !n.feature || features[n.feature]).map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            <Icon className="size-[18px]" />
            {label}
            <NavPending className="ml-auto" />
          </Link>
        );
      })}
    </nav>
  );
}

export interface ShellUser {
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  businessName: string;
  isAdmin?: boolean;
}

export function AppShell({ user, announcement, children }: { user: ShellUser; announcement?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [q, setQ] = useState("");

  const search = (
    <form role="search" onSubmit={(e) => { e.preventDefault(); router.push(q.trim() ? `/crm?q=${encodeURIComponent(q.trim())}` : "/crm"); }} className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un prospect" placeholder="Rechercher un prospect…" className="h-9 w-full rounded-lg border bg-card pl-9 pr-3 text-sm placeholder:text-muted-foreground/70" />
    </form>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r bg-card px-4 py-5 lg:flex">
        <Brand href="/dashboard" className="mb-8 px-2" />
        <NavLinks />
        <div className="mt-auto space-y-3">
          <a href="mailto:support@leadora.app" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><LifeBuoy className="size-[18px]" />Aide</a>
          <div className="rounded-lg bg-muted px-3 py-2.5">
            <p className="truncate text-sm font-medium">{user.businessName}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur sm:px-6">
          <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
            <DialogPrimitive.Trigger asChild>
              <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Ouvrir le menu"><Menu className="size-5" /></Button>
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-primary/40" />
              <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-72 bg-card p-4 shadow-xl">
                <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">Navigation principale</DialogPrimitive.Description>
                <div className="mb-6 flex items-center justify-between px-2"><Brand href="/dashboard" /><DialogPrimitive.Close className="rounded p-1 text-muted-foreground" aria-label="Fermer"><X className="size-5" /></DialogPrimitive.Close></div>
                <NavLinks onNavigate={() => setOpen(false)} />
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
          <div className="hidden flex-1 sm:block">{search}</div>
          <div className="flex-1 sm:hidden" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-muted" aria-label="Menu du compte">
                <span className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">{initials(user.firstName, user.lastName)}</span>
                <span className="hidden text-sm font-medium sm:block">{user.firstName}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
              <DropdownMenuItem asChild><Link href="/settings"><Settings /> Paramètres du compte</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/business"><Store /> Mon Business</Link></DropdownMenuItem>
              {user.isAdmin && <DropdownMenuItem asChild><Link href="/admin"><ShieldCheck /> Administration</Link></DropdownMenuItem>}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void logoutAction()}><LogOut /> Se déconnecter</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <div className="border-b bg-card px-4 py-2 sm:hidden">{search}</div>

        {announcement && <div role="status" className="border-b bg-info-soft px-4 py-2 text-sm text-info-soft-foreground sm:px-6">{announcement}</div>}
        {!user.emailVerified && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-accent/40 bg-accent-soft px-4 py-2 text-sm text-accent-soft-foreground sm:px-6">
            <span>Confirmez votre adresse email pour sécuriser votre compte.</span>
            <Button size="sm" variant="outline" onClick={async () => { const r = await confirmEmailAction(); if (r.ok) { toast.success("Adresse confirmée (simulation)."); router.refresh(); } else toast.error(r.error); }}>Confirmer (simulation)</Button>
          </div>
        )}
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
