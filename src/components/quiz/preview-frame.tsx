"use client";
import { Monitor, RotateCcw, Smartphone } from "lucide-react";
import { useState } from "react";
import { QuizRunner, type Brand } from "@/components/quiz/quiz-runner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { QuizConfig } from "@/types/domain";

/** Aperçu fidèle de l'expérience participant, en bureau ou en mobile. Aucune donnée n'est enregistrée. */
export function PreviewFrame({ config, brand, className }: { config: QuizConfig; brand: Brand; className?: string }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [key, setKey] = useState(0);
  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg bg-muted p-1" role="group" aria-label="Appareil">
          <button onClick={() => setDevice("desktop")} aria-pressed={device === "desktop"} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", device === "desktop" ? "bg-card font-medium shadow-sm" : "text-muted-foreground")}><Monitor className="size-4" /> Ordinateur</button>
          <button onClick={() => setDevice("mobile")} aria-pressed={device === "mobile"} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", device === "mobile" ? "bg-card font-medium shadow-sm" : "text-muted-foreground")}><Smartphone className="size-4" /> Mobile</button>
        </div>
        <div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">Aperçu : aucune donnée enregistrée</span><Button variant="outline" size="sm" onClick={() => setKey((k) => k + 1)}><RotateCcw /> Recommencer</Button></div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-xl border bg-muted p-3 sm:p-6">
        <div className={cn("mx-auto overflow-hidden bg-background shadow-lg transition-[width] duration-300", device === "mobile" ? "w-[390px] max-w-full rounded-[2rem] border-[10px] border-primary" : "w-full max-w-4xl rounded-xl border")} style={{ minHeight: device === "mobile" ? 640 : 520 }}>
          <div className={cn("overflow-y-auto", device === "mobile" ? "h-[620px]" : "max-h-[70dvh] min-h-[500px]")}>
            <QuizRunner config={config} brand={brand} mode="preview" resetKey={key} />
          </div>
        </div>
      </div>
    </div>
  );
}
