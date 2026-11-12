/** Pourcentage arrondi à une décimale ; 0 si le dénominateur est nul (jamais de NaN dans l'interface). */
export function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

export const fmtPct = (value: number) => `${String(value).replace(".", ",")} %`;
