import { format, formatDistanceToNowStrict, isToday, isYesterday, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export const fmtDate = (iso: string | Date) => format(typeof iso === "string" ? parseISO(iso) : iso, "d MMM yyyy", { locale: fr });
export const fmtDateTime = (iso: string | Date) => format(typeof iso === "string" ? parseISO(iso) : iso, "d MMM yyyy 'à' HH:mm", { locale: fr });
export const fmtShortDate = (iso: string | Date) => format(typeof iso === "string" ? parseISO(iso) : iso, "d MMM", { locale: fr });

/** « il y a 3 jours », « hier », « aujourd'hui ». */
export function fmtRelative(iso: string | Date): string {
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  if (isToday(d)) return "aujourd'hui";
  if (isYesterday(d)) return "hier";
  return `il y a ${formatDistanceToNowStrict(d, { locale: fr })}`.replace("il y a il y a", "il y a");
}

/** Valeur pour <input type="datetime-local"> (heure locale). */
export const toLocalInput = (iso: string | null) => (iso ? format(parseISO(iso), "yyyy-MM-dd'T'HH:mm") : "");
