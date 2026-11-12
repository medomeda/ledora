import type { QuizProfile } from "@/types/domain";

/** Couleurs de profils (texte blanc lisible dessus, contraste ≥ 4.5:1). */
export const PROFILE_COLORS = ["#3b5bdb", "#0f8a6a", "#d6372f", "#a16207", "#7c3aed", "#0e7490", "#be185d", "#475569"];

export const profileColor = (p: Pick<QuizProfile, "color">, index: number) => p.color ?? PROFILE_COLORS[index % PROFILE_COLORS.length]!;
