import type { DbState } from "@/server/db/store";
import type { PlanId } from "@/types/domain";

/**
 * Plans et quotas (PRD §15). Valeurs PAR DÉFAUT : l'administration peut les surcharger (`settings.planOverrides`)
 * sans toucher au code ni redéployer ; `null` = illimité. Aucun paiement dans le MVP.
 */
export interface PlanDef {
  id: PlanId;
  name: string;
  /** Texte de prix affiché sur la landing page (ex. « 0 € », « 19 € / mois », « Bientôt »). */
  priceLabel: string;
  /** Quiz actifs (brouillons + publiés, hors archivés). */
  maxActiveQuizzes: number | null;
  maxMonthlySubmissions: number | null;
  maxMonthlyAiGenerations: number | null;
}

export const PLANS: Record<PlanId, PlanDef> = {
  free: { id: "free", name: "Gratuit", priceLabel: "0 €", maxActiveQuizzes: 3, maxMonthlySubmissions: 100, maxMonthlyAiGenerations: 10 },
  starter: { id: "starter", name: "Starter", priceLabel: "Bientôt", maxActiveQuizzes: 10, maxMonthlySubmissions: 1000, maxMonthlyAiGenerations: 60 },
  pro: { id: "pro", name: "Pro", priceLabel: "Bientôt", maxActiveQuizzes: null, maxMonthlySubmissions: 10000, maxMonthlyAiGenerations: 300 },
};

export const PLAN_IDS: PlanId[] = ["free", "starter", "pro"];

/** Plan effectif = valeurs par défaut + surcharges de l'administration. À utiliser partout à la place de `PLANS`. */
export function planDef(s: Pick<Readonly<DbState>, "settings">, id: PlanId): PlanDef {
  return { ...PLANS[id], ...(s.settings.planOverrides[id] ?? {}) };
}

export function allPlans(s: Pick<Readonly<DbState>, "settings">): PlanDef[] {
  return PLAN_IDS.map((id) => planDef(s, id));
}
