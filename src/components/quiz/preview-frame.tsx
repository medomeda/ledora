"use client";
import { Monitor, RotateCcw, Smartphone } from "lucide-react";
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
const MIN_SCALE = 0.55;

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

  const header = (zoom?: number) => (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="inline-flex rounded-lg bg-muted p-1" role="group" aria-label="Appareil">
        <button onClick={() => setDevice("desktop")} aria-pressed={device === "desktop"} className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm", device === "desktop" ? "bg-card font-medium shadow-sm" : "text-muted-foreground")}><Monitor className="size-4" /> Ordinateur</button>
        <button onClick={() => setDevice("mobile")} aria-pressed={device === "mobile"} className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm", device === "mobile" ? "bg-card font-medium shadow-sm" : "text-muted-foreground")}><Smartphone className="size-4" /> Mobile</button>
      </div>
      {screens && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Écran à afficher">
          {SCREENS.map((s) => <button key={s.id} onClick={() => setScreen(s.id)} aria-pressed={screen === s.id} className={cn("rounded-full border px-3 py-1 text-xs", screen === s.id ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>{s.label}</button>)}
        </div>
      )}
      <div className="ml-auto flex items-center gap-3">
        {!fill && <span className="text-xs text-muted-foreground">Aperçu : aucune donnée enregistrée</span>}
        {zoom !== undefined && <span className="text-xs tabular-nums text-muted-foreground" title="Échelle d'affichage de l'aperçu">{Math.round(zoom * 100)} %</span>}
        {screen === "flow" && <Button variant="outline" size="sm" onClick={() => setKey((k) => k + 1)}><RotateCcw /> Recommencer</Button>}
      </div>
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

/** Aperçu à l'échelle : l'écran simulé garde ses vraies dimensions, puis est réduit (transform) pour tenir sans défilement. */
function FitPreview({ className, device, resetKey, header, children }: { className?: string; device: "desktop" | "mobile"; resetKey: string; header: (zoom: number) => React.ReactNode; children: React.ReactNode }) {
  const [stageRef, stage] = useSize<HTMLDivElement>();
  const innerRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState({ key: resetKey, h: 0 });
  const vp = VIEWPORT[device];
  const extra = device === "mobile" ? 20 : 2; // bordure de l'appareil

  // Hauteur réelle du contenu ; elle ne fait que croître tant que l'écran affiché ne change pas (pas de « respiration » du zoom en répondant).
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
  const fit = stage.w > 0 && stage.h > 0 ? Math.min((stage.w - pad) / virtualW, (stage.h - pad) / virtualH) : 1;
  const scale = Math.min(1, Math.max(MIN_SCALE, fit));

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {header(scale)}
      <div ref={stageRef} className="flex min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl border bg-muted">
        <div className="m-auto shrink-0 p-2" style={{ width: virtualW * scale + 16, height: virtualH * scale + 16 }}>
          <div style={{ width: virtualW, height: virtualH, transform: `scale(${scale})`, transformOrigin: "top left" }} className={cn("overflow-hidden bg-background shadow-lg", device === "mobile" ? "rounded-[2.5rem] border-[10px] border-primary" : "rounded-xl border")}>
            <div ref={innerRef} className="flex flex-col" style={{ width: vp.w, minHeight: vp.h }}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
