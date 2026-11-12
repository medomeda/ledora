"use client";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import type { StepProps } from "@/components/quiz/quiz-builder";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { profileColor } from "@/lib/constants/profile-colors";
import { quizMaxScore, rangeCoverage } from "@/services/scoring.service";

/** Éditeur visuel des plages de score : une barre de 0 au maximum, un segment coloré par profil, trous et chevauchements signalés. */
export function RangesEditor({ config, update }: Pick<StepProps, "config" | "update">) {
  const { max, gaps, overlaps } = rangeCoverage(config);
  const total = max + 1;
  const ok = gaps.length === 0 && overlaps.length === 0 && config.profiles.every((p) => p.scoreRange);
  const fmt = (l: Array<[number, number]>) => l.map(([a, b]) => (a === b ? `${a}` : `${a} à ${b}`)).join(", ");

  /** Répartition égale : le premier profil prend les scores les plus hauts. */
  const spread = () => update((c) => {
    const n = c.profiles.length;
    const m = quizMaxScore(c);
    const threshold = (i: number) => Math.round((m * (n - i - 1)) / n);
    c.profiles.forEach((p, i) => { p.scoreRange = { min: i === n - 1 ? 0 : threshold(i) + 1, max: i === 0 ? m : threshold(i - 1) }; });
  });

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="font-display text-base font-semibold">Plages de score</h3><p className="text-sm text-muted-foreground">Les scores possibles vont de 0 à {max}.</p></div>
        <Button variant="outline" size="sm" onClick={spread} disabled={config.profiles.length === 0 || max === 0}>Répartir automatiquement</Button>
      </div>
      {max === 0 ? (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-soft-foreground">Attribuez d&apos;abord des points aux réponses (étape Questions) : le score maximum est 0 pour l&apos;instant.</p>
      ) : (
        <>
          <div>
            <div className="relative h-9 overflow-hidden rounded-lg border bg-muted" role="img" aria-label="Répartition des profils sur l'échelle des scores">
              {config.profiles.map((p, i) => p.scoreRange && p.scoreRange.min <= p.scoreRange.max && (
                <div key={p.id} className="absolute inset-y-0 flex items-center justify-center overflow-hidden px-1 text-xs font-medium text-white" title={`${p.name || "Profil"} : ${p.scoreRange.min} à ${p.scoreRange.max}`}
                  style={{ left: `${(Math.max(0, p.scoreRange.min) / total) * 100}%`, width: `${((Math.min(max, p.scoreRange.max) - Math.max(0, p.scoreRange.min) + 1) / total) * 100}%`, background: profileColor(p, i), opacity: 0.92 }}>
                  <span className="truncate">{p.name || "Profil"}</span>
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-xs tabular-nums text-muted-foreground"><span>0</span><span>{Math.round(max / 2)}</span><span>{max}</span></div>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {config.profiles.map((p, i) => (
              <li key={p.id} className="flex items-center gap-2 rounded-lg border p-2">
                <span className="size-3 shrink-0 rounded-full" style={{ background: profileColor(p, i) }} />
                <span className="min-w-0 flex-1 truncate text-sm">{p.name || "Profil sans nom"}</span>
                <label className="sr-only" htmlFor={`rmin-${p.id}`}>Score minimum de {p.name}</label>
                <Input id={`rmin-${p.id}`} type="number" min={0} max={max} className="h-8 w-16 px-2 text-center" value={p.scoreRange?.min ?? ""} placeholder="min" onChange={(e) => update((c) => void (c.profiles[i]!.scoreRange = { min: Math.max(0, Math.trunc(Number(e.target.value)) || 0), max: c.profiles[i]!.scoreRange?.max ?? max }))} />
                <span className="text-muted-foreground">à</span>
                <label className="sr-only" htmlFor={`rmax-${p.id}`}>Score maximum de {p.name}</label>
                <Input id={`rmax-${p.id}`} type="number" min={0} max={max} className="h-8 w-16 px-2 text-center" value={p.scoreRange?.max ?? ""} placeholder="max" onChange={(e) => update((c) => void (c.profiles[i]!.scoreRange = { min: c.profiles[i]!.scoreRange?.min ?? 0, max: Math.max(0, Math.trunc(Number(e.target.value)) || 0) }))} />
              </li>
            ))}
          </ul>
          {ok ? <p className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="size-4" /> Tous les scores de 0 à {max} mènent à un profil.</p> : (
            <div className="space-y-1 text-sm text-accent-soft-foreground">
              {config.profiles.some((p) => !p.scoreRange) && <p className="flex items-center gap-2"><TriangleAlert className="size-4" /> Certains profils n&apos;ont pas de plage.</p>}
              {gaps.length > 0 && <p className="flex items-center gap-2"><TriangleAlert className="size-4" /> Scores sans profil : {fmt(gaps)}.</p>}
              {overlaps.length > 0 && <p className="flex items-center gap-2"><TriangleAlert className="size-4" /> Scores couverts par plusieurs profils : {fmt(overlaps)} (la priorité les départagera).</p>}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
