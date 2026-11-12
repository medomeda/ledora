import { PLANS } from "@/lib/constants/plans";
import { isoNow, requireBusiness, type Ctx } from "@/server/context";
import type { DbState } from "@/server/db/store";
import { notFound, quotaExceeded } from "@/server/errors";
import { newId } from "@/server/ids";
import { createQuiz, sanitizeConfig } from "@/services/quiz.service";
import type { BusinessContext } from "@/services/ai/types";
import type { AiGeneration, AiGenerationType, Business, Quiz, QuizConfig } from "@/types/domain";

/** Orchestration IA (quotas, historique, adoption d'une proposition). Le fournisseur est appelé par l'action, hors transaction. */

export function businessContext(b: Business): BusinessContext {
  return { name: b.name, activityType: b.activityType, industry: b.industry, description: b.description, offers: b.offers, bookingUrl: b.bookingUrl };
}

export interface AiUsage {
  used: number;
  limit: number | null;
}

export function getUsage(s: Readonly<DbState>, business: Business, now: Date): AiUsage {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const used = s.aiGenerations.filter((g) => g.businessId === business.id && g.createdAt >= start && g.status === "success").length;
  return { used, limit: PLANS[business.plan].maxMonthlyAiGenerations };
}

/** À appeler AVANT de solliciter le fournisseur. */
export function assertAiQuota(s: Readonly<DbState>, ctx: Ctx): Business {
  const business = requireBusiness(s, ctx);
  const usage = getUsage(s, business, ctx.now);
  if (usage.limit !== null && usage.used >= usage.limit) throw quotaExceeded(`Vous avez atteint la limite de ${usage.limit} générations IA ce mois-ci.`);
  return business;
}

export function recordGeneration(s: DbState, ctx: Ctx, entry: { type: AiGenerationType; input: Record<string, unknown>; output: unknown; provider: string; model: string; status: "success" | "error" }): AiGeneration {
  const business = requireBusiness(s, ctx);
  const gen: AiGeneration = { id: newId(), businessId: business.id, userId: ctx.userId, createdAt: isoNow(ctx), ...entry };
  s.aiGenerations.push(gen);
  return gen;
}

export function listGenerations(s: Readonly<DbState>, ctx: Ctx, limit = 10): AiGeneration[] {
  const business = requireBusiness(s, ctx);
  return s.aiGenerations.filter((g) => g.businessId === business.id && g.type === "quiz").sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

/** « L'IA propose, l'utilisateur valide » : l'adoption crée un BROUILLON, jamais un quiz publié. */
export function adoptGeneration(s: DbState, ctx: Ctx, generationId: string): Quiz {
  const business = requireBusiness(s, ctx);
  const gen = s.aiGenerations.find((g) => g.id === generationId);
  if (!gen || gen.businessId !== business.id || gen.type !== "quiz" || gen.status !== "success") throw notFound("Génération introuvable.");
  const config = sanitizeConfig(gen.output as QuizConfig);
  return createQuiz(s, ctx, { title: config.title, config });
}
