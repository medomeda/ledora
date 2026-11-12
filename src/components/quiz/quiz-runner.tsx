"use client";
import { ArrowLeft, ArrowRight, Check, Clock, ExternalLink, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LogoMark } from "@/components/layout/brand";
import { Alert } from "@/components/ui/feedback";
import { cn } from "@/lib/utils/cn";
import { buildResultView, computeResult, ScoringError, type ResultView } from "@/services/scoring.service";
import type { QuizConfig } from "@/types/domain";

/**
 * Expérience du participant (PRD §6.6). Un composant, deux modes :
 *  - « public » : parle à /api/public/q/[slug] (le serveur recalcule le score) et conserve la progression en session ;
 *  - « preview » : tout se passe dans le navigateur, rien n'est enregistré.
 */
export interface Brand {
  name: string;
  logoUrl: string | null;
}

type Step = "intro" | "capture-before" | "question" | "capture-after" | "loading" | "result";
interface Contact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  marketingConsent: boolean;
}
const EMPTY_CONTACT: Contact = { firstName: "", lastName: "", email: "", phone: "", marketingConsent: false };
interface Saved {
  step: Step;
  index: number;
  answers: Record<string, string[]>;
  contact: Contact | null;
  contactSaved: boolean;
  result: ResultView | null;
}

function newSessionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function api<T>(slug: string, body: Record<string, unknown>): Promise<{ ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> }> {
  try {
    const res = await fetch(`/api/public/q/${slug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => null);
    if (res.ok && json) return { ok: true, data: json as T };
    return { ok: false, error: json?.error ?? "Une erreur est survenue. Réessayez.", fieldErrors: json?.fieldErrors };
  } catch {
    return { ok: false, error: "Connexion impossible. Vérifiez votre réseau puis réessayez." };
  }
}

export function QuizRunner({ config, brand, slug, mode }: { config: QuizConfig; brand: Brand; slug?: string; mode: "public" | "preview" }) {
  const storageKey = mode === "public" && slug ? `leadora:${slug}` : null;
  const [step, setStep] = useState<Step>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT);
  const [contactSaved, setContactSaved] = useState(false);
  const [result, setResult] = useState<ResultView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const sessionRef = useRef<string>("");
  const topRef = useRef<HTMLDivElement>(null);

  const questions = config.questions;
  const q = questions[index];
  const cap = config.capture;

  // Initialisation : identifiant de session, reprise de la progression (sessionStorage, indisponible au rendu serveur), visite.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (mode === "preview") return;
    let sid = "";
    try {
      sid = sessionStorage.getItem(`${storageKey}:sid`) ?? "";
      if (!sid) { sid = newSessionId(); sessionStorage.setItem(`${storageKey}:sid`, sid); }
      const raw = sessionStorage.getItem(`${storageKey}:state`);
      if (raw) {
        const s = JSON.parse(raw) as Saved;
        setStep(s.step === "loading" ? "capture-after" : s.step); setIndex(s.index); setAnswers(s.answers); setContact(s.contact ?? EMPTY_CONTACT); setContactSaved(s.contactSaved); setResult(s.result);
      }
    } catch { sid ||= newSessionId(); }
    sessionRef.current = sid;
    const p = new URLSearchParams(window.location.search);
    void api(slug!, { type: "visit", sessionId: sid, utm: { source: p.get("utm_source"), medium: p.get("utm_medium"), campaign: p.get("utm_campaign"), referrer: document.referrer || null } });
  }, [mode, slug, storageKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Sauvegarde de la progression pendant la session (PRD §6.6).
  useEffect(() => {
    if (!storageKey || step === "loading") return;
    try { sessionStorage.setItem(`${storageKey}:state`, JSON.stringify({ step, index, answers, contact: contactSaved ? contact : null, contactSaved, result } satisfies Saved)); } catch { /* stockage indisponible : sans conséquence */ }
  }, [storageKey, step, index, answers, contact, contactSaved, result]);

  useEffect(() => { topRef.current?.scrollIntoView({ block: "start" }); }, [step, index]);

  const utm = useCallback(() => {
    const p = new URLSearchParams(window.location.search);
    return { source: p.get("utm_source"), medium: p.get("utm_medium"), campaign: p.get("utm_campaign"), referrer: document.referrer || null };
  }, []);

  const begin = async () => {
    setError(null);
    if (mode === "public") {
      setBusy(true);
      const r = await api(slug!, { type: "start", sessionId: sessionRef.current, utm: utm() });
      setBusy(false);
      if (!r.ok) return setError(r.error);
    }
    setStep(cap.position === "before" ? "capture-before" : "question");
  };

  const contactValid = () => {
    const errs: Record<string, string> = {};
    if (!contact.firstName.trim()) errs.firstName = "Votre prénom est obligatoire.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email.trim())) errs.email = "Adresse email invalide.";
    if (cap.askPhone && cap.phoneRequired && !contact.phone.trim()) errs.phone = "Votre téléphone est obligatoire.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const finish = async (withContact: boolean) => {
    setError(null);
    if (mode === "preview") {
      try {
        const scoring = computeResult(config, answers);
        setResult(buildResultView(config, scoring));
        setStep("result");
      } catch (e) { setError(e instanceof ScoringError ? e.message : "Résultat indisponible."); }
      return;
    }
    setStep("loading");
    const r = await api<{ result: ResultView }>(slug!, { type: "complete", sessionId: sessionRef.current, answers, contact: withContact ? contact : null });
    if (r.ok) { setResult(r.data.result); setStep("result"); return; }
    setError(r.error);
    setFieldErrors(r.fieldErrors ?? {});
    setStep(cap.position === "after" ? "capture-after" : "question");
  };

  const submitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactValid()) return;
    if (cap.position === "before") {
      if (mode === "public") {
        setBusy(true);
        const r = await api(slug!, { type: "contact", sessionId: sessionRef.current, contact });
        setBusy(false);
        if (!r.ok) { setError(r.error); setFieldErrors(r.fieldErrors ?? {}); return; }
      }
      setContactSaved(true);
      setStep("question");
    } else {
      setBusy(true);
      setContactSaved(true);
      await finish(true);
      setBusy(false);
    }
  };

  const select = (optionId: string) => {
    if (!q) return;
    setError(null);
    setAnswers((a) => {
      if (q.type === "single") return { ...a, [q.id]: [optionId] };
      const cur = a[q.id] ?? [];
      return { ...a, [q.id]: cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId] };
    });
  };

  const next = () => {
    if (!q) return;
    if (q.isRequired && (answers[q.id] ?? []).length === 0) return setError("Choisissez une réponse pour continuer.");
    setError(null);
    if (index < questions.length - 1) return setIndex(index + 1);
    if (cap.position === "after") return setStep("capture-after");
    void finish(false);
  };
  const back = () => {
    setError(null);
    if (index > 0) setIndex(index - 1);
    else setStep(cap.position === "before" ? "capture-before" : "intro");
  };

  const progress = step === "intro" ? 0 : step === "question" ? (index + (answers[q?.id ?? ""]?.length ? 1 : 0.4)) / (questions.length + (cap.position === "after" ? 1 : 0)) : 1;
  const total = useMemo(() => questions.length, [questions.length]);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-xl flex-col px-5 pb-10 pt-6 sm:pt-10">
      <div ref={topRef} />
      <header className="mb-8 flex items-center gap-3">
        {brand.logoUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={brand.logoUrl} alt="" className="size-9 rounded-lg object-contain" /> : <LogoMark className="size-9" />}
        <span className="font-display text-lg font-semibold">{brand.name}</span>
      </header>

      {step !== "intro" && step !== "result" && step !== "loading" && (
        <div className="mb-8" aria-live="polite">
          <div className="mb-2 flex justify-between text-xs text-muted-foreground">
            <span>{step === "question" ? `Question ${index + 1} sur ${total}` : "Dernière étape"}</span>
            <span>{Math.round(progress * 100)} %</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress * 100}%` }} /></div>
        </div>
      )}

      {error && step !== "loading" && <Alert tone="error" className="mb-5">{error}</Alert>}

      {step === "intro" && (
        <section className="animate-pop-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {config.coverImage && <img src={config.coverImage} alt="" className="mb-6 max-h-52 w-full rounded-2xl object-cover" />}
          <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{config.title}</h1>
          {config.description && <p className="mt-3 text-lg text-muted-foreground">{config.description}</p>}
          {config.introduction && <p className="mt-5 whitespace-pre-line leading-relaxed">{config.introduction}</p>}
          <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Clock className="size-4" /> Environ {config.estimatedMinutes} minute{config.estimatedMinutes > 1 ? "s" : ""} · {total} question{total > 1 ? "s" : ""}</p>
          <button onClick={begin} disabled={busy || total === 0} className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60 sm:w-auto">
            {busy && <Loader2 className="size-4 animate-spin" />}{config.startLabel || "Commencer le diagnostic"} <ArrowRight className="size-4" />
          </button>
        </section>
      )}

      {step === "question" && q && (
        <section key={q.id} className="animate-pop-in">
          <fieldset>
            <legend className="font-display text-2xl font-semibold leading-snug sm:text-3xl">{q.title}</legend>
            {q.description && <p className="mt-2 text-muted-foreground">{q.description}</p>}
            {q.type === "multiple" && <p className="mt-2 text-sm text-muted-foreground">Plusieurs réponses possibles.</p>}
            <div className="mt-6 space-y-3">
              {q.options.map((o) => {
                const checked = (answers[q.id] ?? []).includes(o.id);
                return (
                  <label key={o.id} className={cn("flex cursor-pointer items-center gap-4 rounded-xl border bg-card px-4 py-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring", checked ? "border-primary bg-primary/[0.04] ring-1 ring-primary" : "hover:border-primary/40")}>
                    <input type={q.type === "single" ? "radio" : "checkbox"} name={q.id} checked={checked} onChange={() => select(o.id)} className="sr-only" />
                    <span className={cn("flex size-6 shrink-0 items-center justify-center border-2", q.type === "single" ? "rounded-full" : "rounded-md", checked ? "border-primary bg-primary text-primary-foreground" : "border-input")}>{checked && <Check className="size-3.5" />}</span>
                    <span><span className="block leading-snug">{o.label}</span>{o.description && <span className="mt-0.5 block text-sm text-muted-foreground">{o.description}</span>}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="mt-8 flex items-center justify-between gap-3">
            <button onClick={back} className="inline-flex h-12 items-center gap-2 rounded-xl px-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><ArrowLeft className="size-4" /> Précédent</button>
            <button onClick={next} className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary-hover">{index === questions.length - 1 && cap.position !== "after" ? "Voir mon résultat" : "Suivant"} <ArrowRight className="size-4" /></button>
          </div>
        </section>
      )}

      {(step === "capture-before" || step === "capture-after") && (
        <form onSubmit={submitContact} className="animate-pop-in space-y-4" noValidate>
          <h2 className="font-display text-2xl font-semibold leading-snug sm:text-3xl">{cap.title || "Vos coordonnées"}</h2>
          {cap.message && <p className="text-muted-foreground">{cap.message}</p>}
          <div className={cn("grid gap-4", cap.askLastName && "sm:grid-cols-2")}>
            <PublicField label="Prénom" error={fieldErrors.firstName}><input autoComplete="given-name" value={contact.firstName} onChange={(e) => setContact({ ...contact, firstName: e.target.value })} className={inputCls(!!fieldErrors.firstName)} /></PublicField>
            {cap.askLastName && <PublicField label="Nom" optional><input autoComplete="family-name" value={contact.lastName} onChange={(e) => setContact({ ...contact, lastName: e.target.value })} className={inputCls(false)} /></PublicField>}
          </div>
          <PublicField label="Email" error={fieldErrors.email}><input type="email" inputMode="email" autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={inputCls(!!fieldErrors.email)} /></PublicField>
          {cap.askPhone && <PublicField label="Téléphone" optional={!cap.phoneRequired} error={fieldErrors.phone}><input type="tel" inputMode="tel" autoComplete="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className={inputCls(!!fieldErrors.phone)} /></PublicField>}
          {cap.consentLabel && (
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
              <input type="checkbox" checked={contact.marketingConsent} onChange={(e) => setContact({ ...contact, marketingConsent: e.target.checked })} className="mt-1 size-4 shrink-0 accent-[var(--primary)]" />
              <span>{cap.consentLabel}</span>
            </label>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">Vos coordonnées servent à vous transmettre votre résultat. Le consentement ci-dessus est facultatif et distinct.{cap.privacyUrl && <> <a href={cap.privacyUrl} target="_blank" rel="noopener noreferrer" className="underline">Politique de confidentialité</a>.</>}</p>
          <div className="flex items-center justify-between gap-3 pt-2">
            <button type="button" onClick={() => { setError(null); if (cap.position === "after") { setIndex(questions.length - 1); setStep("question"); } else setStep("intro"); }} className="inline-flex h-12 items-center gap-2 rounded-xl px-4 text-sm font-medium text-muted-foreground hover:bg-muted"><ArrowLeft className="size-4" /> Précédent</button>
            <button type="submit" disabled={busy} className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">{busy && <Loader2 className="size-4 animate-spin" />}{cap.position === "after" ? "Voir mon résultat" : "Commencer le quiz"}</button>
          </div>
          {!cap.required && cap.position === "before" && <button type="button" onClick={() => setStep("question")} className="w-full text-center text-sm text-muted-foreground underline underline-offset-4">Continuer sans laisser mes coordonnées</button>}
          {!cap.required && cap.position === "after" && <button type="button" onClick={() => void finish(false)} className="w-full text-center text-sm text-muted-foreground underline underline-offset-4">Voir mon résultat sans laisser mes coordonnées</button>}
        </form>
      )}

      {step === "loading" && (
        <div className="flex flex-1 flex-col items-center justify-center py-24 text-center" role="status">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="mt-4 font-display text-xl font-semibold">Analyse de vos réponses…</p>
        </div>
      )}

      {step === "result" && result && <ResultPage result={result} />}
    </div>
  );
}

const inputCls = (invalid: boolean) => cn("h-12 w-full rounded-xl border bg-card px-4 text-base focus-visible:outline-2 focus-visible:outline-ring", invalid ? "border-destructive" : "border-input");

function PublicField({ label, error, optional, children }: { label: string; error?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex justify-between text-sm font-medium"><span>{label}</span>{optional && <span className="font-normal text-muted-foreground">facultatif</span>}</span>
      {children}
      {error && <span role="alert" className="block text-sm text-destructive">{error}</span>}
    </label>
  );
}

function ResultPage({ result }: { result: ResultView }) {
  const p = result.profile;
  const percent = result.maxScore > 0 ? Math.round((result.totalScore / result.maxScore) * 100) : 0;
  return (
    <section className="animate-pop-in space-y-8">
      <div>
        {p && <p className="mb-3 inline-flex rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent-soft-foreground">Votre profil</p>}
        <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{result.title}</h1>
        {p?.description && <p className="mt-2 text-lg text-muted-foreground">{p.description}</p>}
      </div>
      {result.showScore && (
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-end justify-between"><span className="text-sm text-muted-foreground">Votre score</span><span className="font-display text-3xl font-semibold tabular-nums">{result.totalScore}<span className="text-lg text-muted-foreground"> / {result.maxScore}</span></span></div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Score"><div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} /></div>
        </div>
      )}
      {result.content && <p className="whitespace-pre-line text-lg leading-relaxed">{result.content}</p>}
      {p && (p.strengths.length > 0 || p.improvementAreas.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {p.strengths.length > 0 && <ListBlock title="Vos points forts" items={p.strengths} tone="success" />}
          {p.improvementAreas.length > 0 && <ListBlock title="Vos axes d'amélioration" items={p.improvementAreas} tone="warning" />}
        </div>
      )}
      {p && p.recommendations.length > 0 && (
        <div><h2 className="font-display text-xl font-semibold">Nos recommandations</h2><ol className="mt-3 space-y-3">{p.recommendations.map((r, i) => <li key={i} className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span><span className="leading-relaxed">{r}</span></li>)}</ol></div>
      )}
      {p?.ctaUrl && p.ctaLabel && (
        <a href={p.ctaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 text-base font-semibold text-primary hover:brightness-95 sm:w-auto">{p.ctaLabel} <ExternalLink className="size-4" /></a>
      )}
    </section>
  );
}

function ListBlock({ title, items, tone }: { title: string; items: string[]; tone: "success" | "warning" }) {
  return (
    <div className={cn("rounded-2xl p-5", tone === "success" ? "bg-success-soft text-success-soft-foreground" : "bg-accent-soft text-accent-soft-foreground")}>
      <h2 className="font-display text-base font-semibold">{title}</h2>
      <ul className="mt-2 space-y-1.5 text-sm">{items.map((i, k) => <li key={k} className="flex gap-2"><span aria-hidden>•</span><span>{i}</span></li>)}</ul>
    </div>
  );
}
