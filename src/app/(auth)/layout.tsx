import type { ReactNode } from "react";
import { Brand } from "@/components/layout/brand";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,520px)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <Brand light />
        <div className="max-w-md">
          <p className="font-display text-4xl font-semibold leading-tight">Un quiz bien posé vaut mieux qu'un formulaire de plus.</p>
          <p className="mt-5 text-base leading-relaxed text-white/70">Vos visiteurs répondent, découvrent leur profil, et vous savez exactement à qui parler en premier.</p>
        </div>
        <ul className="grid gap-3 text-sm text-white/80">
          {["Quiz publié en moins de 10 minutes", "Prospects classés par profil et par score", "Aucun développeur nécessaire"].map((t) => (
            <li key={t} className="flex items-center gap-3"><span className="size-1.5 rounded-full bg-accent" />{t}</li>
          ))}
        </ul>
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full border border-white/10" />
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 size-48 rounded-full border border-accent/40" />
      </aside>
      <main className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Brand className="mb-10 lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
