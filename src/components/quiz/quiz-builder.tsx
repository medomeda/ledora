"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowLeft, BarChart3, Check, CircleAlert, Eye, Loader2, Rocket, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { publishQuizAction, saveQuizAction, setSlugAction, unpublishQuizAction } from "@/actions/quizzes";
import { AiRefineDialog } from "@/components/quiz/ai-refine-dialog";
import { useFeatures } from "@/components/layout/features-context";
import { PreviewFrame } from "@/components/quiz/preview-frame";
import { DesignStep } from "@/components/quiz/steps/design-step";
import { CaptureStep } from "@/components/quiz/steps/capture-step";
import { GeneralStep } from "@/components/quiz/steps/general-step";
import { ProfilesStep } from "@/components/quiz/steps/profiles-step";
import { ResultsStep } from "@/components/quiz/steps/results-step";
import { PublishStep } from "@/components/quiz/steps/publish-step";
import { QuestionsStep } from "@/components/quiz/steps/questions-step";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QUIZ_STATUS_LABELS } from "@/lib/constants/labels";
import { cn } from "@/lib/utils/cn";
import { validateForPublish } from "@/services/scoring.service";
import type { PlanId, QuizConfig, QuizStatus } from "@/types/domain";

export type StepId = "general" | "profiles" | "questions" | "results" | "capture" | "design" | "publish";

export interface QuizMeta {
  id: string;
  slug: string;
  status: QuizStatus;
  hasUnpublishedChanges: boolean;
  publishedAt: string | null;
  participants: number;
}

export interface StepProps {
  config: QuizConfig;
  update: (fn: (c: QuizConfig) => void) => void;
  goTo: (s: StepId) => void;
  quiz: QuizMeta;
  bookingUrl: string;
  plan: PlanId;
  hasLogo: boolean;
}

const STEPS: Array<{ id: StepId; label: string; issueStep?: string[] }> = [
  { id: "general", label: "Informations", issueStep: ["general"] },
  { id: "profiles", label: "Profils", issueStep: ["profiles"] },
  { id: "questions", label: "Questions", issueStep: ["questions"] },
  { id: "results", label: "Résultats", issueStep: ["result"] },
  { id: "capture", label: "Capture", issueStep: ["capture"] },
  { id: "design", label: "Design" },
  { id: "publish", label: "Publication" },
];

type SaveState = "saved" | "dirty" | "saving" | "error";

export function QuizBuilder({ initialConfig, initialMeta, brand, bookingUrl, plan }: { initialConfig: QuizConfig; initialMeta: QuizMeta; brand: { name: string; logoUrl: string | null }; bookingUrl: string; plan: PlanId }) {
  const router = useRouter();
  const [config, setConfig] = useState(initialConfig);
  const [meta, setMeta] = useState(initialMeta);
  const [step, setStep] = useState<StepId>("general");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [slug, setSlug] = useState(initialMeta.slug);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const features = useFeatures();
  const configRef = useRef(config);
  const versionRef = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback((fn: (c: QuizConfig) => void) => {
    setConfig((c) => {
      const next = structuredClone(c);
      fn(next);
      configRef.current = next;
      return next;
    });
    versionRef.current += 1;
    setSaveState("dirty");
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    const version = versionRef.current;
    setSaveState("saving");
    const res = await saveQuizAction({ quizId: initialMeta.id, config: configRef.current });
    if (!res.ok) { setSaveState("error"); setSaveError(res.fieldErrors ? "Un champ dépasse la longueur ou la valeur autorisée." : res.error); return false; }
    setSaveError(null);
    setSavedAt(new Date());
    setMeta((m) => ({ ...m, hasUnpublishedChanges: m.status === "published" || m.hasUnpublishedChanges ? true : m.hasUnpublishedChanges }));
    // Si l'utilisateur a modifié le brouillon pendant l'enregistrement, on reste « modifié ».
    setSaveState(versionRef.current === version ? "saved" : "dirty");
    return true;
  }, [initialMeta.id]);

  // Enregistrement automatique 1,2 s après la dernière modification.
  useEffect(() => {
    if (saveState !== "dirty") return;
    timer.current = setTimeout(() => void save(), 1200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [saveState, config, save]);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (saveState === "dirty" || saveState === "saving" || saveState === "error") e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [saveState]);

  /** Remplace tout le brouillon (proposition IA appliquée, ou retour arrière) ; l'enregistrement automatique prend le relais. */
  const replaceConfig = useCallback((next: QuizConfig) => update((c) => void Object.assign(c, structuredClone(next))), [update]);
  const applyAi = (proposal: { config: QuizConfig; changes: string[] }) => {
    const before = structuredClone(configRef.current);
    replaceConfig(proposal.config);
    toast.success(`${proposal.changes.length} changement${proposal.changes.length > 1 ? "s" : ""} appliqué${proposal.changes.length > 1 ? "s" : ""}.`, { duration: 10000, action: { label: "Annuler", onClick: () => { replaceConfig(before); toast.info("Changements annulés."); } } });
  };

  const issues = useMemo(() => validateForPublish(config), [config]);
  const published = meta.status === "published";

  const publish = async () => {
    setPublishing(true);
    setSlugError(null);
    try {
      if (!meta.publishedAt && slug !== meta.slug) {
        const r = await setSlugAction({ quizId: meta.id, slug });
        if (!r.ok) { setSlugError(r.fieldErrors?.slug ?? r.error); return; }
        setSlug(r.data.slug);
        setMeta((m) => ({ ...m, slug: r.data.slug }));
      }
      const res = await publishQuizAction({ quizId: meta.id, config: configRef.current });
      if (!res.ok) { toast.error(res.error); return; }
      setMeta((m) => ({ ...m, status: "published", slug: res.data.slug, publishedAt: m.publishedAt ?? new Date().toISOString(), hasUnpublishedChanges: false }));
      setSaveState("saved");
      setSavedAt(new Date());
      toast.success(res.data.versionCreated ? "Quiz publié." : "Quiz déjà à jour.");
      router.refresh();
    } finally {
      setPublishing(false);
    }
  };

  const unpublish = async () => {
    setPublishing(true);
    const res = await unpublishQuizAction({ quizId: meta.id });
    setPublishing(false);
    if (!res.ok) return void toast.error(res.error);
    setMeta((m) => ({ ...m, status: "draft" }));
    toast.success("Quiz dépublié. Vos données sont conservées.");
    router.refresh();
  };

  const props: StepProps = { config, update, goTo: setStep, quiz: meta, bookingUrl, plan, hasLogo: !!brand.logoUrl };
  const issueCount = (ids?: string[]) => (ids ? issues.filter((i) => ids.includes(i.step)).length : 0);

  const status =
    saveState === "saving" ? <span className="flex items-center gap-1.5 text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Enregistrement…</span>
    : saveState === "dirty" ? <span className="text-muted-foreground">Modifications non enregistrées</span>
    : saveState === "error" ? <button onClick={() => void save()} className="flex items-center gap-1.5 text-destructive"><CircleAlert className="size-3.5" /> {saveError ?? "Échec"} — réessayer</button>
    : <span className="flex items-center gap-1.5 text-muted-foreground"><Check className="size-3.5 text-success" /> {savedAt ? `Enregistré à ${savedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "Brouillon à jour"}</span>;

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 md:flex-1">
          <Link href="/lead-magnets" className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Lead Magnets</Link>
          <h1 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">{config.title || "Quiz sans titre"}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Badge tone={published ? "success" : "warning"}>{QUIZ_STATUS_LABELS[meta.status]}</Badge>
            {published && meta.hasUnpublishedChanges && <Badge tone="info">Modifications non publiées</Badge>}
            <span className="text-sm" aria-live="polite">{status}</span>
          </div>
        </div>
        {/* Actions : toujours en haut à droite, sur une seule ligne, quelle que soit la longueur du titre. */}
        <div className="flex shrink-0 items-center gap-2 md:pt-7">
          {meta.participants > 0 && <Button asChild variant="ghost" className="whitespace-nowrap"><Link href={`/lead-magnets/${meta.id}/stats`}><BarChart3 /> Statistiques</Link></Button>}
          {features.ai && <Button variant="outline" className="whitespace-nowrap" onClick={() => setAiOpen(true)} aria-label="Ajuster avec l'IA"><Sparkles /> <span className="hidden xl:inline">Ajuster avec l&apos;IA</span><span className="xl:hidden">IA</span></Button>}
          <Button variant="outline" className="whitespace-nowrap" onClick={() => setPreviewOpen(true)}><Eye /> Aperçu</Button>
          <Button className="whitespace-nowrap" onClick={() => setStep("publish")}><Rocket /> {published ? "Publication" : "Publier"}</Button>
        </div>
      </div>

      <nav aria-label="Étapes du créateur" className="sticky top-14 z-20 -mx-4 mb-6 overflow-x-auto border-b bg-background/95 px-4 backdrop-blur sm:-mx-6 sm:px-6">
        <ol className="flex min-w-max gap-1">
          {STEPS.map((s, i) => {
            const n = issueCount(s.issueStep);
            return (
              <li key={s.id}>
                <button onClick={() => setStep(s.id)} aria-current={step === s.id ? "step" : undefined} className={cn("flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors", step === s.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                  <span className={cn("flex size-5 items-center justify-center rounded-full text-xs", step === s.id ? "bg-primary text-primary-foreground" : "bg-muted")}>{i + 1}</span>
                  {s.label}
                  {n > 0 && <span className="flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-primary" aria-label={`${n} point(s) à corriger`}>{n}</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {step === "design" ? (
        /* Onglet Design : réglages à gauche, aperçu en direct à droite (il suit chaque modification). */
        <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <DesignStep {...props} />
          <div className="h-[78dvh] min-h-[480px] min-w-0 lg:sticky lg:top-28 lg:h-[clamp(36rem,calc(100dvh-8rem),62rem)] lg:self-start">
            <PreviewFrame config={config} brand={brand} plan={plan} screens fill bare defaultScreen="intro" className="h-full" />
          </div>
        </div>
      ) : (
      <div className="max-w-3xl">
        {step === "general" && <GeneralStep {...props} />}
        {step === "profiles" && <ProfilesStep {...props} />}
        {step === "questions" && <QuestionsStep {...props} />}
        {step === "results" && <ResultsStep {...props} />}
        {step === "capture" && <CaptureStep {...props} />}
        {step === "publish" && <PublishStep {...props} issues={issues} slug={slug} onSlugChange={(v) => { setSlug(v); setSlugError(null); }} slugError={slugError} onPublish={publish} onUnpublish={unpublish} busy={publishing || saveState === "saving"} dirty={saveState !== "saved"} />}
      </div>
      )}

      <div className={cn("flex justify-between border-t", step === "design" ? "mt-4 pt-3" : "mt-8 max-w-3xl pt-5")}>
        <Button variant="ghost" disabled={step === "general"} onClick={() => setStep(STEPS[Math.max(0, STEPS.findIndex((s) => s.id === step) - 1)]!.id)}><ArrowLeft /> Précédent</Button>
        {step !== "publish" && <Button variant="outline" onClick={() => setStep(STEPS[STEPS.findIndex((s) => s.id === step) + 1]!.id)}>Étape suivante</Button>}
      </div>

      {features.ai && <AiRefineDialog open={aiOpen} onOpenChange={setAiOpen} config={config} onApply={applyAi} />}

      <DialogPrimitive.Root open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-primary/50" />
          <DialogPrimitive.Content className="fixed inset-2 z-50 flex flex-col rounded-xl border bg-card p-4 shadow-xl sm:inset-6">
            <div className="mb-3 flex items-center justify-between"><DialogPrimitive.Title className="font-display text-lg font-semibold">Aperçu du quiz</DialogPrimitive.Title><DialogPrimitive.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Fermer l'aperçu"><X className="size-5" /></DialogPrimitive.Close></div>
            <DialogPrimitive.Description className="sr-only">Aperçu fidèle de l&apos;expérience participant avec vos modifications actuelles.</DialogPrimitive.Description>
            <PreviewFrame config={config} brand={brand} plan={plan} screens fill className="min-h-0 flex-1" />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
