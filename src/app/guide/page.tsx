import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Brand } from "@/components/layout/brand";
import { DemoBanner } from "@/components/layout/demo-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, isDemoMode } from "@/lib/demo";

export const metadata: Metadata = { title: "Guide de test", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const SCENARIOS = [
  { who: "Coach", steps: ["Connectez-vous avec le compte « Coach » : le tableau de bord est déjà rempli (quiz, prospects, statistiques).", "Créez un quiz avec l'assistance IA (simulée), ajustez-le par une demande en langage naturel, puis réglez son apparence dans l'onglet Design (aperçu en direct).", "Publiez-le, ouvrez son lien public et participez comme un visiteur : le prospect arrive dans le CRM.", "Dans le CRM : filtrez, changez un statut, ajoutez une note ou un tag, exportez en CSV."] },
  { who: "Nouveau client", steps: ["Créez un compte depuis l'accueil (ou utilisez « Nouveau client ») : onboarding, états vides, premier quiz.", "Vérifiez les quotas de l'offre Gratuit dans Paramètres, et le message « Propulsé par Leadora » sur vos quiz."] },
  { who: "Administrateur", steps: ["Vue d'ensemble : changez la période (7, 30, 90 jours, tout, dates libres).", "Comptes : ouvrez une fiche, changez l'offre, suspendez puis réactivez un compte (le client voit l'écran de suspension).", "Offres et quotas, Réglages (inscriptions, annonce affichée à tous les clients), Journal d'audit.", "Équipe : invitez un collaborateur (le lien s'affiche), comparez les rôles Support et Lecture seule."] },
];

const LIMITS = [
  "Les emails ne sont pas envoyés : les liens (mot de passe oublié, invitation) s'affichent à l'écran.",
  "L'assistance IA est simulée (elle reconnaît un ensemble limité de formulations).",
  "Le paiement n'est pas branché : l'offre d'un compte se change depuis l'administration.",
  "Les données sont fictives et peuvent être réinitialisées à tout moment : n'y saisissez rien de réel.",
];

/** Guide du mode test : réservé aux déploiements en mode démonstration (404 sinon). */
export default function GuidePage() {
  if (!isDemoMode()) notFound();
  return (
    <div className="min-h-dvh bg-background">
      <DemoBanner />
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5"><Brand /><Button asChild><Link href="/login">Se connecter <ArrowRight /></Link></Button></header>
      <main className="mx-auto max-w-4xl space-y-12 px-5 pb-20 pt-6">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Tester Leadora</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">Cette instance contient des données simulées pour vous laisser tout essayer : créer et publier un quiz, recevoir des prospects, administrer la plateforme. Voici les comptes de test et des parcours conseillés.</p>
        </div>

        <section aria-labelledby="comptes">
          <h2 id="comptes" className="font-display text-2xl font-semibold">Comptes de test</h2>
          <p className="mt-1 text-sm text-muted-foreground">Mot de passe commun : <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{DEMO_PASSWORD}</code></p>
          <ul className="mt-5 divide-y rounded-2xl border bg-card">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div><p className="font-medium">{a.label} <Badge tone={a.area === "Administration" ? "ink" : "info"} className="ml-2 align-middle">{a.area}</Badge></p><p className="text-sm text-muted-foreground">{a.detail}</p></div>
                <code className="font-mono text-sm">{a.email}</code>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="parcours" className="space-y-5">
          <h2 id="parcours" className="font-display text-2xl font-semibold">Parcours conseillés</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {SCENARIOS.map((s) => (
              <article key={s.who} className="rounded-2xl border bg-card p-5">
                <h3 className="font-display text-lg font-semibold">{s.who}</h3>
                <ol className="mt-3 list-decimal space-y-2.5 pl-5 text-sm leading-relaxed text-muted-foreground">{s.steps.map((t) => <li key={t}>{t}</li>)}</ol>
              </article>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">Quiz publics prêts à essayer : <Link href="/q/maturite-financiere" className="font-medium text-foreground underline underline-offset-4">maturité financière</Link> et <Link href="/q/type-entrepreneur" className="font-medium text-foreground underline underline-offset-4">type d&apos;entrepreneur</Link> (design personnalisé).</p>
        </section>

        <section aria-labelledby="limites">
          <h2 id="limites" className="font-display text-2xl font-semibold">À savoir</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">{LIMITS.map((l) => <li key={l}>{l}</li>)}</ul>
        </section>
      </main>
    </div>
  );
}
