import { ArrowRight, BarChart3, Link2, MousePointerClick, PenLine, Users2, Wand2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";

const STEPS = [
  { icon: PenLine, title: "Créez", text: "Posez vos questions, attribuez des points, décrivez vos profils. L'IA peut proposer un premier jet." },
  { icon: Link2, title: "Publiez", text: "Un lien public prêt à partager sur Instagram, LinkedIn, WhatsApp ou par email." },
  { icon: MousePointerClick, title: "Capturez", text: "Le visiteur répond, laisse ses coordonnées, et reçoit son diagnostic sur-le-champ." },
  { icon: Wand2, title: "Qualifiez", text: "Score et profil sont calculés pour vous : vous savez qui est prêt à acheter." },
  { icon: Users2, title: "Convertissez", text: "Chaque participant arrive dans votre CRM avec ses réponses, ses tags et son statut." },
  { icon: BarChart3, title: "Analysez", text: "Complétion, conversion, sources de trafic : voyez quel quiz travaille vraiment pour vous." },
];

export default async function Home() {
  if (await getSession()) redirect("/dashboard");
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Brand />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost"><Link href="/login">Se connecter</Link></Button>
          <Button asChild><Link href="/register">Essayer gratuitement</Link></Button>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
        <div>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] sm:text-6xl">Vos prospects répondent d&apos;abord. Vous leur parlez ensuite.</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">Leadora transforme un quiz en outil de prospection : chaque participant reçoit un diagnostic personnalisé, et vous recevez un contact déjà qualifié.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/register">Créer mon premier quiz <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/login">Voir la démonstration</Link></Button>
          </div>
        </div>

        <div aria-hidden className="relative mx-auto w-full max-w-md">
          <div className="rounded-2xl border bg-card p-6 shadow-[0_24px_60px_-30px_rgba(21,26,45,0.35)]">
            <div className="mb-5 flex items-center justify-between text-xs text-muted-foreground"><span>Question 3 sur 6</span><span>Maturité financière</span></div>
            <div className="mb-6 h-1.5 rounded-full bg-muted"><div className="h-full w-1/2 rounded-full bg-accent" /></div>
            <p className="font-display text-xl font-semibold">Que feriez-vous d&apos;une dépense imprévue de 500 € demain ?</p>
            <div className="mt-5 space-y-2.5 text-sm">
              {["Je la règle avec mon épargne", "Je pourrais, mais cela me ferait mal", "Je devrais emprunter ou attendre"].map((a, i) => (
                <div key={a} className={`rounded-xl border px-4 py-3 ${i === 1 ? "border-primary bg-primary text-primary-foreground" : ""}`}>{a}</div>
              ))}
            </div>
          </div>
          <div className="absolute -bottom-6 -left-4 rounded-xl border bg-card px-4 py-3 shadow-lg sm:-left-10">
            <p className="text-xs text-muted-foreground">Nouveau prospect</p>
            <p className="text-sm font-medium">Fatou K. · Équilibriste financier</p>
          </div>
        </div>
      </section>

      <section className="border-t bg-card">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="max-w-2xl font-display text-3xl font-semibold sm:text-4xl">Du premier quiz au premier client, en six gestes.</h2>
          <ol className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Icon className="size-5" /></span>
                <div><h3 className="font-display text-lg font-semibold">{i + 1}. {title}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-10 text-sm text-muted-foreground">
        <Brand className="[&_span]:text-base" />
        <p>Version de démonstration — données simulées.</p>
      </footer>
    </div>
  );
}
