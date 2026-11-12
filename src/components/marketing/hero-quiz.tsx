"use client";
import { ArrowRight, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

const QUESTIONS = [
  { q: "Que feriez-vous d'une dépense imprévue de 500 € demain ?", a: [["Je la règle avec mon épargne", 2], ["Je pourrais, mais cela me ferait mal", 1], ["Je devrais emprunter ou attendre", 0]] },
  { q: "À quelle fréquence suivez-vous votre budget ?", a: [["Chaque semaine, avec un outil", 2], ["Quand j'y pense", 1], ["Rarement, voire jamais", 0]] },
  { q: "Avez-vous un objectif d'épargne précis ?", a: [["Oui, chiffré et daté", 2], ["Une idée, sans plan", 1], ["Pas vraiment", 0]] },
] as const;

const PROFILES = [
  { min: 5, name: "Gestionnaire maîtrisé", text: "Vos bases sont solides. Il reste à faire travailler votre épargne.", tag: "Prêt pour un accompagnement avancé" },
  { min: 2, name: "Équilibriste financier", text: "Vous tenez le cap, mais un imprévu vous fragiliserait.", tag: "Prospect chaud : à rappeler cette semaine" },
  { min: 0, name: "Dépendant du découvert", text: "Un plan simple vous ferait gagner de la sérénité dès le mois prochain.", tag: "Besoin urgent : proposer un rendez-vous" },
];

/** Mini-quiz jouable : le visiteur vit l'expérience que ses propres prospects auront (et voit ce que le coach reçoit). */
export function HeroQuiz() {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const done = i >= QUESTIONS.length;
  const profile = PROFILES.find((p) => score >= p.min)!;

  function choose(idx: number, pts: number) {
    if (picked !== null) return;
    setPicked(idx);
    setTimeout(() => { setScore((s) => s + pts); setI((n) => n + 1); setPicked(null); }, 380);
  }
  const reset = () => { setI(0); setScore(0); setPicked(null); };

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="rounded-2xl border bg-card p-6 shadow-[0_28px_70px_-30px_rgba(21,26,45,0.4)]" aria-live="polite">
        {!done ? (
          <>
            <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground"><span>Question {i + 1} sur {QUESTIONS.length}</span><span>Essayez : c&apos;est un vrai quiz</span></div>
            <div className="mb-6 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${(i / QUESTIONS.length) * 100}%` }} /></div>
            <p key={i} className="animate-pop-in font-display text-xl font-semibold">{QUESTIONS[i]!.q}</p>
            <div className="mt-5 space-y-2.5 text-sm">
              {QUESTIONS[i]!.a.map(([label, pts], idx) => (
                <button key={label} onClick={() => choose(idx, pts)} className={cn("w-full rounded-xl border px-4 py-3 text-left transition-colors", picked === idx ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/50 hover:bg-muted")}>{label}</button>
              ))}
            </div>
          </>
        ) : (
          <div className="animate-pop-in">
            <p className="text-xs text-muted-foreground">Votre profil</p>
            <p className="mt-1 font-display text-2xl font-semibold">{profile.name}</p>
            <div className="mt-3 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${(score / 6) * 100}%` }} /></div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{profile.text}</p>
            <div className="mt-5 rounded-xl bg-accent-soft p-4 text-sm text-accent-soft-foreground"><span className="font-medium">Côté coach, vous recevez :</span><br />Fatou K. · {profile.name}<br />{profile.tag}</div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link href="/register" className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover">Créer mon quiz <ArrowRight className="size-4" /></Link>
              <button onClick={reset} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><RotateCcw className="size-3.5" /> Rejouer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
