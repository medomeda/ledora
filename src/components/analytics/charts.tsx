"use client";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DayPoint } from "@/services/analytics.service";

/** Courbe d'évolution (jours). Couleurs : encre = participations terminées, souci = prospects collectés. */
export function TrendChart({ data, series }: { data: DayPoint[]; series: Array<{ key: "visits" | "completed" | "leads"; label: string; color: string }> }) {
  const total = data.reduce((a, d) => a + d.visits + d.completed + d.leads, 0);
  if (total === 0) return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Pas encore de données sur la période.</div>;
  return (
    <div className="h-64 w-full" role="img" aria-label={`Évolution sur ${data.length} jours : ${series.map((s) => s.label).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="date" tickFormatter={(d: string) => format(parseISO(d), "d MMM", { locale: fr })} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
          <Tooltip labelFormatter={(d) => format(parseISO(String(d)), "EEEE d MMMM", { locale: fr })} contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }} />
          {series.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} fill={`url(#g-${s.key})`} dot={false} activeDot={{ r: 4 }} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Legend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: i.color }} />{i.label}</li>
      ))}
    </ul>
  );
}

/** Barres horizontales (répartitions). Sans bibliothèque : lisible, accessible, léger. */
export function BarList({ rows, empty = "Aucune donnée pour l'instant." }: { rows: Array<{ label: string; value: number; hint?: string }>; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0 || rows.every((r) => r.value === 0)) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm"><span className="truncate">{r.label}</span><span className="shrink-0 tabular-nums text-muted-foreground">{r.value}{r.hint ? ` · ${r.hint}` : ""}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
