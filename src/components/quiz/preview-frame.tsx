"use client";
import { Monitor, RotateCcw, Smartphone } from "lucide-react";
import { useState } from "react";
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

/**
 * Aperçu fidèle de l'expérience participant, en ordinateur ou en mobile. Aucune donnée n'est enregistrée.
 * `screens` ajoute un sélecteur d'écran (intro, question, formulaire, résultat) pour juger chaque page sans parcourir le quiz ;
 * `fill` remplit la hauteur du conteneur (panneau latéral en direct).
 */
export function PreviewFrame({ config, brand, plan = "free", className, screens = false, fill = false, defaultScreen = "flow" }: { config: QuizConfig; brand: Brand; plan?: PlanId; className?: string; screens?: boolean; fill?: boolean; defaultScreen?: PreviewScreen | "flow" }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [key, setKey] = useState(0);
  const [screen, setScreen] = useState<PreviewScreen | "flow">(defaultScreen);
  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg bg-muted p-1" role="group" aria-label="Appareil">
          <button onClick={() => setDevice("desktop")} aria-pressed={device === "desktop"} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", device === "desktop" ? "bg-card font-medium shadow-sm" : "text-muted-foreground")}><Monitor className="size-4" /> Ordinateur</button>
          <button onClick={() => setDevice("mobile")} aria-pressed={device === "mobile"} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", device === "mobile" ? "bg-card font-medium shadow-sm" : "text-muted-foreground")}><Smartphone className="size-4" /> Mobile</button>
        </div>
        <div className="flex items-center gap-3">
          {!fill && <span className="text-xs text-muted-foreground">Aperçu : aucune donnée enregistrée</span>}
          {screen === "flow" && <Button variant="outline" size="sm" onClick={() => setKey((k) => k + 1)}><RotateCcw /> Recommencer</Button>}
        </div>
      </div>
      {screens && (
        <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Écran à afficher">
          {SCREENS.map((s) => <button key={s.id} onClick={() => setScreen(s.id)} aria-pressed={screen === s.id} className={cn("rounded-full border px-3 py-1 text-xs transition-colors", screen === s.id ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>{s.label}</button>)}
        </div>
      )}
      <div className={cn("min-h-0 overflow-auto rounded-xl border bg-muted p-3 sm:p-5", fill && "flex-1")}>
        <div className={cn("mx-auto overflow-hidden bg-background shadow-lg transition-[width] duration-300", device === "mobile" ? "w-[390px] max-w-full rounded-[2rem] border-[10px] border-primary" : "w-full rounded-xl border", !fill && device === "desktop" && "max-w-4xl")} style={{ minHeight: device === "mobile" ? 640 : 480 }}>
          <div className={cn("overflow-y-auto", device === "mobile" ? "h-[620px]" : fill ? "h-[min(70dvh,640px)] min-h-[460px]" : "max-h-[70dvh] min-h-[500px]")}>
            <QuizRunner key={key} config={config} brand={brand} mode="preview" plan={plan} previewScreen={screen === "flow" ? undefined : screen} />
          </div>
        </div>
      </div>
    </div>
  );
}
