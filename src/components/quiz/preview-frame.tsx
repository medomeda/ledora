"use client";
import { Maximize2, Minus, Monitor, Plus, RotateCcw, Smartphone } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { QuizRunner, type Brand, type PreviewScreen } from "@/components/quiz/quiz-runner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { PlanId, QuizConfig } from "@/types/domain";

const SCREENS: Array<{ id: PreviewScreen | "flow"; label: string }> = [
  { id: "flow", label: "Parcours" },
  { id: "intro", label: "Introduction" },
  { id: "question", label: "Question" },
  { id: "capture", label: "Formulaire" },
  { id: "result", label: "Résultat" },
];

/** Taille « virtuelle » de l'appareil simulé : le quiz y est rendu tel qu'il le serait, puis réduit pour tenir dans le panneau. */
const VIEWPORT = { desktop: { w: 900, h: 620 }, mobile: { w: 390, h: 740 } } as const;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 1.5;

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/**
 * Aperçu fidèle de l'expérience participant, en ordinateur ou en mobile. Aucune donnée n'est enregistrée.
 * `screens` ajoute un sélecteur d'écran (intro, question, formulaire, résultat) pour juger chaque page sans parcourir le quiz ;
 * `fill` remplit la hauteur du conteneur ET ajuste l'échelle pour que l'écran entier soit visible sans défilement
 * (le défilement n'apparaît que si l'écran est si long qu'il deviendrait illisible : échelle minimale 55 %).
 */
export function PreviewFrame({ config, brand, plan = "free", className, screens = false, fill = false, defaultScreen = "flow" }: { config: QuizConfig; brand: Brand; plan?: PlanId; className?: string; screens?: boolean; fill?: boolean; defaultScreen?: PreviewScreen | "flow" }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [key, setKey] = useState(0);
  const [screen, setScreen] = useState<PreviewScreen | "flow">(defaultScreen);
  const runner = <QuizRunner key={key} config={config} brand={brand} mode="preview" plan={plan} previewScreen={screen === "flow" ? undefined : screen} />;

  /** En-tête de hauteur constante : appareil à gauche, zoom et « Recommencer » à droite (emplacements fixes), écrans en dessous sur une ligne défilante. */
  const header = (zoomControls?: React.ReactNode) => (
    <div className="@container mb-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="inline-flex shrink-0 rounded-lg bg-muted p-1" role="group" aria-label="Appareil">
          <button onClick={() => setDevice("desktop")} aria-pressed={device === "desktop"} aria-label="Ordinateur" className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm", device === "desktop" ? "bg-card font-medium shadow-sm" : "text-muted-foreground")}><Monitor className="size-4" /><span className="hidden @sm:inline">Ordinateur</span></button>
          <button onClick={() => setDevice("mobile")} aria-pressed={device === "mobile"} aria-label="Mobile" className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm", device === "mobile" ? "bg-card font-medium shadow-sm" : "text-muted-foreground")}><Smartphone className="size-4" /><span className="hidden @sm:inline">Mobile</span></button>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {!fill && <span className="hidden text-xs text-muted-foreground @xl:inline">Aperçu : aucune donnée enregistrée</span>}
          {zoomControls}
          <Button variant="outline" size="sm" onClick={() => setKey((k) => k + 1)} aria-label="Recommencer le parcours" disabled={screen !== "flow"} className={cn(screen !== "flow" && "pointer-events-none invisible")} tabIndex={screen === "flow" ? 0 : -1}><RotateCcw /><span className="hidden @md:inline">Recommencer</span></Button>
        </div>
      </div>
      {screens && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]" role="group" aria-label="Écran à afficher">
          {SCREENS.map((s) => <button key={s.id} onClick={() => setScreen(s.id)} aria-pressed={screen === s.id} className={cn("shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs", screen === s.id ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>{s.label}</button>)}
        </div>
      )}
    </div>
  );

  if (fill) return <FitPreview className={className} device={device} resetKey={`${device}-${screen}-${key}`} header={header}>{runner}</FitPreview>;

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {header()}
      <div className="min-h-0 rounded-xl border bg-muted p-3 sm:p-4">
        <div className={cn("mx-auto overflow-hidden bg-background shadow-lg transition-[width] duration-300", device === "mobile" ? "w-[390px] max-w-full rounded-[2rem] border-[10px] border-primary" : "w-full max-w-4xl rounded-xl border")}>
          <div className={cn("overflow-y-auto overscroll-contain", device === "mobile" ? "h-[620px]" : "h-[min(70dvh,640px)] min-h-[420px]")}>{runner}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Aperçu à taille fixe : le cadre ne change jamais de hauteur. L'écran simulé garde ses vraies dimensions et est mis à l'échelle ;
 * l'échelle de départ ne dépend que de la taille de l'appareil et du cadre (pas du contenu), puis l'utilisateur zoome avec − / + ou « Ajuster ».
 * Quand l'écran dépasse le cadre (zoom élevé, résultat long), on fait défiler dans le cadre.
 */
function FitPreview({ className, device, resetKey, header, children }: { className?: string; device: "desktop" | "mobile"; resetKey: string; header: (zoomControls: React.ReactNode) => React.ReactNode; children: React.ReactNode }) {
  const [stageRef, stage] = useSize<HTMLDivElement>();
  const innerRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState({ key: resetKey, h: 0 });
  const [manual, setManual] = useState<{ device: string; value: number } | null>(null);
  const vp = VIEWPORT[device];
  const extra = device === "mobile" ? 20 : 2; // bordure de l'appareil

  // Hauteur réelle du contenu (sert à la zone défilante, jamais à l'échelle).
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContent((c) => ({ key: resetKey, h: Math.max(c.key === resetKey ? c.h : 0, el.offsetHeight) })));
    ro.observe(el);
    return () => ro.disconnect();
  }, [resetKey]);

  const contentH = content.key === resetKey ? content.h : 0;
  const virtualH = Math.max(vp.h, contentH) + extra;
  const virtualW = vp.w + extra;
  const pad = 16;
  const auto = stage.w > 0 && stage.h > 0 ? Math.min(1, (stage.w - pad) / virtualW, (stage.h - pad) / (vp.h + extra)) : 1;
  const scale = manual && manual.device === device ? manual.value : auto;
  const zoomTo = (v: number) => setManual({ device, value: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(v * 20) / 20)) });

  const zoomControls = (
    <div className="inline-flex items-center rounded-lg border bg-card" role="group" aria-label="Zoom de l'aperçu">
      <button type="button" onClick={() => zoomTo(scale - 0.1)} disabled={scale <= ZOOM_MIN} aria-label="Réduire l'aperçu" className="flex size-8 items-center justify-center rounded-l-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"><Minus className="size-4" /></button>
      <span className="w-11 text-center text-xs tabular-nums" aria-live="polite">{Math.round(scale * 100)} %</span>
      <button type="button" onClick={() => zoomTo(scale + 0.1)} disabled={scale >= ZOOM_MAX} aria-label="Agrandir l'aperçu" className="flex size-8 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"><Plus className="size-4" /></button>
      <button type="button" onClick={() => setManual(null)} disabled={!manual} aria-label="Ajuster l'aperçu au cadre" title="Ajuster au cadre" className="flex size-8 items-center justify-center rounded-r-lg border-l text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"><Maximize2 className="size-4" /></button>
    </div>
  );

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {header(zoomControls)}
      {/* Pas de cadre ni de fond : l'écran simulé est posé seul, aligné en haut et centré horizontalement. */}
      <div ref={stageRef} className="flex min-h-0 flex-1 overflow-auto">
        <div className="mx-auto shrink-0 p-2" style={{ width: virtualW * scale + 16, height: virtualH * scale + 16 }}>
          <div style={{ width: virtualW, height: virtualH, transform: `scale(${scale})`, transformOrigin: "top left" }} className={cn("overflow-hidden bg-background shadow-lg", device === "mobile" ? "rounded-[2.5rem] border-[10px] border-primary" : "rounded-xl border")}>
            <div ref={innerRef} className="flex flex-col" style={{ width: vp.w, minHeight: vp.h }}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
