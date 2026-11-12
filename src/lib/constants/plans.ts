import type { PlanId } from "@/types/domain";

/**
 * Plans et quotas (PRD §15). Valeurs configurables ici sans toucher au code métier ; `null` = illimité.
 * Aucun paiement dans le MVP : l'espace de test est sur l'offre « Gratuit ».
 */
export interface PlanDef {
  id: PlanId;
  name: string;
  /** Quiz actifs (brouillons + publiés, hors archivés). */
  maxActiveQuizzes: number | null;
  maxMonthlySubmissions: number | null;
  maxMonthlyAiGenerations: number | null;
}

export const PLANS: Record<PlanId, PlanDef> = {
  free: { id: "free", name: "Gratuit", maxActiveQuizzes: 3, maxMonthlySubmissions: 100, maxMonthlyAiGenerations: 10 },
  starter: { id: "starter", name: "Starter", maxActiveQuizzes: 10, maxMonthlySubmissions: 1000, maxMonthlyAiGenerations: 60 },
  pro: { id: "pro", name: "Pro", maxActiveQuizzes: null, maxMonthlySubmissions: 10000, maxMonthlyAiGenerations: 300 },
};
