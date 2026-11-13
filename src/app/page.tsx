import { ArrowRight, BarChart3, Check, Gauge, GraduationCap, Handshake, LineChart, Palette, Rocket, ShieldCheck, Sparkles, UserRound, Users2, Wand2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/layout/brand";
import { DemoBanner } from "@/components/layout/demo-banner";
import { isDemoMode } from "@/lib/demo";
import { HeroQuiz } from "@/components/marketing/hero-quiz";
import { Button } from "@/components/ui/button";
import { isStaff } from "@/lib/permissions/staff";
import { getSession } from "@/lib/auth/session";
import "@/server/bootstrap";
import { allPlans } from "@/lib/constants/plans";
import { read } from "@/server/db/store";
import { getPublicQuiz } from "@/services/quiz.service";
import { SITE_NAME, siteUrl } from "@/lib/site";

const TITLE = "Leadora : créez un quiz marketing qui qualifie vos prospects";
const DESCRIPTION = "Créez un quiz interactif, capturez des prospects déjà qualifiés grâce au scoring par profils, et suivez-les dans un CRM intégré. Pour coachs, formateurs et consultants. Gratuit pour démarrer.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ["quiz marketing", "générateur de quiz", "lead magnet", "qualification de prospects", "capture de leads", "quiz coach", "CRM prospects"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: siteUrl(), siteName: SITE_NAME, title: TITLE, description: DESCRIPTION, locale: "fr_FR" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FAQ = [
  { q: "Qu'est-ce qu'un quiz marketing (ou lead magnet interactif) ?", a: "C'est un questionnaire court que votre prospect remplit en quelques minutes. En échange, il reçoit un diagnostic personnalisé et vous recevez ses coordonnées, ses réponses et son profil : vous savez immédiatement à qui parler et quoi lui proposer." },
  { q: "Faut-il savoir coder ou être designer ?", a: "Non. Vous écrivez vos questions (ou vous laissez l'IA proposer un premier jet), vous associez chaque réponse à un profil, et c'est publié. Thème, couleurs, polices et logo se règlent en quelques clics avec un aperçu en direct." },
  { q: "Comment le scoring fonctionne-t-il ?", a: "Chaque réponse contribue à un profil (par exemple « Équilibriste financier »), ou ajoute des points à un score global classé par plages. Le calcul est fait côté serveur : le participant ne peut pas le falsifier, et son résultat reste identique même si vous modifiez ensuite votre quiz." },
  { q: "Mes prospects sont-ils protégés (RGPD) ?", a: "Le formulaire de capture inclut un consentement explicite, horodaté et rattaché à la version de la politique en vigueur. Vous contrôlez les champs demandés et le lien vers votre politique de confidentialité." },
  { q: "Puis-je intégrer le quiz sur mes réseaux sociaux ?", a: "Chaque quiz publié a son lien public, prêt à partager sur Instagram, LinkedIn, WhatsApp, Facebook ou par email. Les sources de trafic sont suivies pour savoir quel canal vous rapporte le plus de prospects." },
  { q: "Que se passe-t-il quand je modifie un quiz publié ?", a: "Vos modifications restent en brouillon jusqu'à la republication. Chaque publication est figée dans une version : les participations passées restent toujours lisibles et cohérentes." },
  { q: "Combien ça coûte ?", a: "L'offre Gratuit permet de lancer votre premier quiz sans carte bancaire. Les offres Starter et Pro, pour plus de quiz et de participations, arrivent prochainement." },
];

const USE_CASES = [
  { icon: Handshake, who: "Coachs", quiz: "« Quel est votre niveau de maturité financière ? »", text: "Repérez les clients prêts à s'engager avant le premier appel." },
  { icon: GraduationCap, who: "Formateurs", quiz: "« Quel est votre niveau en gestion de projet ? »", text: "Orientez chacun vers la bonne formation, et relancez ceux qui hésitent." },
  { icon: UserRound, who: "Consultants", quiz: "« Votre entreprise est-elle prête à se digitaliser ? »", text: "Transformez un audit gratuit en rendez-vous qualifié." },
  { icon: Rocket, who: "Entrepreneurs", quiz: "« Quel type d'entrepreneur êtes-vous ? »", text: "Faites connaître votre offre avec un contenu que l'on a envie de partager." },
];

const PLAN_NOTES: Record<string, string> = { free: "Pour lancer votre premier quiz", starter: "Pour animer plusieurs campagnes", pro: "Pour une activité à fort volume" };
const num = (n: number | null, unit: string) => (n === null ? `${unit} illimités` : `${n.toLocaleString("fr-FR")} ${unit}`);

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", name: SITE_NAME, url: siteUrl() },
    { "@type": "WebSite", name: SITE_NAME, url: siteUrl(), inLanguage: "fr-FR" },
    { "@type": "SoftwareApplication", name: SITE_NAME, applicationCategory: "BusinessApplication", operatingSystem: "Web", description: DESCRIPTION, inLanguage: "fr-FR", offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" } },
    { "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ],
};

export default async function Home() {
  const session = await getSession();
  if (session) redirect(isStaff(session.role) ? "/admin" : "/dashboard");
  const plans = await read("settings", (s) => allPlans(s));
  // Quiz de vitrine : seulement en mode test (jeu de démonstration) ou si LEADORA_SHOWCASE_QUIZ désigne un quiz publié ; jamais un quiz de client pris au hasard.
  const showcaseSlug = process.env.LEADORA_SHOWCASE_QUIZ || (isDemoMode() ? "type-entrepreneur" : null);
  const showcase = showcaseSlug && (await read({ slug: showcaseSlug }, (s) => !!getPublicQuiz(s, showcaseSlug))) ? showcaseSlug : null;
  return (
    <div className="min-h-dvh bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {isDemoMode() && <DemoBanner />}
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Brand />
          <nav aria-label="Navigation principale" className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#fonctionnalites" className="hover:text-foreground">Fonctionnalités</a>
            <a href="#comment-ca-marche" className="hover:text-foreground">Comment ça marche</a>
            <a href="#tarifs" className="hover:text-foreground">Tarifs</a>
            <a href="#faq" className="hover:text-foreground">Questions</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link href="/login">Se connecter</Link></Button>
            <Button asChild><Link href="/register">Essayer gratuitement</Link></Button>
          </div>
        </div>
      </header>

      <main>
        {/* Héros : promesse + démonstration jouable */}
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-12 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            <h1 className="font-display text-4xl font-semibold leading-[1.04] sm:text-6xl">Un quiz qui qualifie vos prospects pendant qu&apos;ils répondent.</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">Chaque participant reçoit un diagnostic personnalisé. Vous recevez un contact avec son score, son profil et ses réponses : vous savez qui appeler en premier, et quoi lui dire.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="accent"><Link href="/register">Créer mon premier quiz <ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="outline">{showcase ? <Link href={`/q/${showcase}`}>Voir un quiz en vrai</Link> : <a href="#comment-ca-marche">Voir comment ça marche</a>}</Button>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["Gratuit pour démarrer", "Sans carte bancaire", "Génération IA incluse"].map((t) => <li key={t} className="flex items-center gap-1.5"><Check className="size-4 text-success" aria-hidden />{t}</li>)}
            </ul>
          </div>
          <HeroQuiz />
        </section>

        {/* Pour qui */}
        <section className="border-t bg-card">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2 className="max-w-2xl font-display text-3xl font-semibold sm:text-4xl">Fait pour ceux qui vendent leur expertise.</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">Un bon quiz pose le problème à votre place : le prospect prend conscience de son besoin avant même de vous parler.</p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {USE_CASES.map(({ icon: Icon, who, quiz, text }) => (
                <article key={who} className="rounded-2xl border bg-background p-5">
                  <Icon className="size-6 text-primary" aria-hidden />
                  <h3 className="mt-4 font-display text-lg font-semibold">{who}</h3>
                  <p className="mt-1 text-sm font-medium italic">{quiz}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Comment ça marche */}
        <section id="comment-ca-marche" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
          <h2 className="max-w-2xl font-display text-3xl font-semibold sm:text-4xl">Du premier quiz au premier client, en quatre étapes.</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-2">
            {[
              { t: "Créez", d: "Écrivez vos questions à la main ou décrivez votre objectif : l'IA propose questions, profils et résultats. Vous ajustez ensuite par simple demande (« rends-le plus court », « ajoute un profil »)." },
              { t: "Personnalisez", d: "Thème, couleurs, polices, logo, disposition : le quiz ressemble à votre marque. L'aperçu à droite se met à jour en direct, en version ordinateur et mobile." },
              { t: "Partagez", d: "Un lien public propre, prêt pour vos réseaux sociaux, vos emails et votre bio. Un participant répond en moins de trois minutes, sur mobile comme sur ordinateur." },
              { t: "Convertissez", d: "Chaque prospect arrive dans votre CRM avec son profil, ses réponses et des tags automatiques. Vous relancez les plus chauds, avec le bon message." },
            ].map((s, i) => (
              <li key={s.t} className="flex gap-5">
                <span className="font-display text-5xl font-semibold leading-none text-accent" aria-hidden>{i + 1}</span>
                <div><h3 className="font-display text-xl font-semibold">{s.t}</h3><p className="mt-2 leading-relaxed text-muted-foreground">{s.d}</p></div>
              </li>
            ))}
          </ol>
        </section>

        {/* Fonctionnalités */}
        <section id="fonctionnalites" className="scroll-mt-20 border-t bg-card">
          <div className="mx-auto max-w-6xl px-5 py-24">
            <h2 className="max-w-2xl font-display text-3xl font-semibold sm:text-4xl">Tout ce qu&apos;il faut pour transformer des réponses en clients.</h2>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              <article className="rounded-2xl border bg-background p-6 md:col-span-2">
                <Gauge className="size-6 text-primary" aria-hidden />
                <h3 className="mt-4 font-display text-xl font-semibold">Scoring par profils, sans tableur</h3>
                <p className="mt-2 max-w-xl text-muted-foreground">Associez chaque réponse à un profil depuis une liste déroulante, vérifiez en un coup d&apos;œil que chaque profil peut être obtenu, ou classez par plages de score. Le résultat est calculé côté serveur : fiable et infalsifiable.</p>
                <div className="mt-5 flex flex-wrap gap-2 text-sm">
                  {["Gestionnaire maîtrisé", "Équilibriste financier", "Dépendant du découvert"].map((p, i) => <span key={p} className="rounded-full border bg-card px-3 py-1" style={{ borderColor: ["#0f8a6a", "#f5a524", "#d6372f"][i] }}>{p}</span>)}
                </div>
              </article>
              <article className="rounded-2xl border bg-primary p-6 text-primary-foreground">
                <Sparkles className="size-6 text-accent" aria-hidden />
                <h3 className="mt-4 font-display text-xl font-semibold">Assistant IA de création</h3>
                <p className="mt-2 text-sm leading-relaxed text-primary-foreground/80">Générez un quiz complet depuis votre activité, puis affinez-le par conversation. Tout reste modifiable à la main.</p>
              </article>
              <article className="rounded-2xl border bg-background p-6">
                <Palette className="size-6 text-primary" aria-hidden />
                <h3 className="mt-4 font-display text-lg font-semibold">Design à votre image</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">6 thèmes, vos couleurs, 9 polices, logo et mise en page, avec aperçu en direct.</p>
              </article>
              <article className="rounded-2xl border bg-background p-6">
                <Users2 className="size-6 text-primary" aria-hidden />
                <h3 className="mt-4 font-display text-lg font-semibold">CRM intégré</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Statuts, tags, notes, historique de toutes les participations d&apos;un même prospect, export CSV.</p>
              </article>
              <article className="rounded-2xl border bg-background p-6">
                <BarChart3 className="size-6 text-primary" aria-hidden />
                <h3 className="mt-4 font-display text-lg font-semibold">Statistiques claires</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Visites, complétion, conversion et sources de trafic, quiz par quiz.</p>
              </article>
              <article className="rounded-2xl border bg-background p-6 md:col-span-3">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <ShieldCheck className="size-6 shrink-0 text-success" aria-hidden />
                  <p className="text-sm leading-relaxed text-muted-foreground"><span className="font-display text-base font-semibold text-foreground">Conforme dès la conception. </span>Consentement explicite et horodaté, données isolées par compte, versions de quiz figées pour des résultats toujours cohérents.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* CRM : ce que vous recevez */}
        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-24 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-semibold sm:text-4xl">Vous ne recevez pas une adresse email. Vous recevez un prospect qui s&apos;est déjà expliqué.</h2>
              <p className="mt-5 max-w-lg leading-relaxed text-primary-foreground/80">Au lieu de « Bonjour, ça vous intéresse ? », vous ouvrez la conversation avec « J&apos;ai vu que votre budget souffre en fin de mois ». C&apos;est ce qui fait passer un lead de froid à chaud.</p>
              <Button asChild size="lg" variant="accent" className="mt-8"><Link href="/register">Recevoir mes premiers prospects <ArrowRight /></Link></Button>
            </div>
            <div className="rounded-2xl bg-card p-4 text-foreground shadow-xl" aria-hidden>
              {[
                { n: "Fatou K.", p: "Équilibriste financier", s: "Qualifié", c: "bg-success-soft text-success-soft-foreground" },
                { n: "Marc D.", p: "Dépendant du découvert", s: "À contacter", c: "bg-accent-soft text-accent-soft-foreground" },
                { n: "Aïcha S.", p: "Gestionnaire maîtrisé", s: "Nouveau", c: "bg-info-soft text-info-soft-foreground" },
              ].map((l) => (
                <div key={l.n} className="flex items-center justify-between gap-3 border-b px-3 py-3.5 last:border-0">
                  <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-medium">{l.n[0]}</span><div><p className="text-sm font-medium">{l.n}</p><p className="text-xs text-muted-foreground">{l.p}</p></div></div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${l.c}`}>{l.s}</span>
                </div>
              ))}
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-xs text-muted-foreground"><LineChart className="size-4" /> 3 participations, 1 conversion cette semaine</div>
            </div>
          </div>
        </section>

        {/* Tarifs */}
        <section id="tarifs" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
          <h2 className="max-w-2xl font-display text-3xl font-semibold sm:text-4xl">Démarrez gratuitement, grandissez quand vos quiz fonctionnent.</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {plans.map((p) => (
              <article key={p.id} className={`flex flex-col rounded-2xl border p-6 ${p.id === "free" ? "border-primary bg-card ring-1 ring-primary" : "bg-card"}`}>
                <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{PLAN_NOTES[p.id]}</p>
                <p className="mt-5 font-display text-4xl font-semibold">{p.priceLabel}{p.id === "free" && <span className="text-base font-normal text-muted-foreground"> / mois</span>}</p>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {[num(p.maxActiveQuizzes, "quiz actifs"), num(p.maxMonthlySubmissions, "participations par mois"), `${p.maxMonthlyAiGenerations ?? "∞"} générations IA par mois`, "CRM, statistiques et export CSV"].map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{f}</li>)}
                  <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{p.id === "free" ? "Mention « Propulsé par Leadora »" : "Mention « Propulsé par Leadora » retirable"}</li>
                </ul>
                <div className="mt-auto pt-8">
                  {p.id === "free" ? <Button asChild className="w-full"><Link href="/register">Commencer gratuitement</Link></Button> : <Button variant="outline" className="w-full" disabled>Disponible prochainement</Button>}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t bg-card">
          <div className="mx-auto max-w-3xl px-5 py-24">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">Questions fréquentes</h2>
            <div className="mt-10 divide-y rounded-2xl border bg-background">
              {FAQ.map((f) => (
                <details key={f.q} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">{f.q}<span className="text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>+</span></summary>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Appel final */}
        <section className="mx-auto max-w-6xl px-5 py-24 text-center">
          <Wand2 className="mx-auto size-8 text-accent" aria-hidden />
          <h2 className="mx-auto mt-5 max-w-2xl font-display text-3xl font-semibold sm:text-5xl">Votre prochain client est peut-être à trois questions de vous.</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Créez votre premier quiz en quelques minutes. Gratuit, sans carte bancaire.</p>
          <Button asChild size="lg" variant="accent" className="mt-8"><Link href="/register">Créer mon premier quiz <ArrowRight /></Link></Button>
        </section>
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-10 text-sm text-muted-foreground">
          <div className="flex items-center gap-4"><Brand className="[&_span]:text-base" /><span>Quiz marketing pour coachs, formateurs et consultants.</span></div>
          <nav aria-label="Pied de page" className="flex gap-5"><Link href="/login" className="hover:text-foreground">Se connecter</Link><Link href="/register" className="hover:text-foreground">Créer un compte</Link><a href="#faq" className="hover:text-foreground">FAQ</a></nav>
        </div>
      </footer>
    </div>
  );
}
