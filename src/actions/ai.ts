"use server";
import { redirect } from "next/navigation";
import { getFeatures } from "@/lib/features";
import { authed, type ActionResult } from "@/actions/_shared";
import "@/server/bootstrap";
import { aiAdoptSchema, aiCreateFromConfigSchema, aiGenerateQuizSchema, aiImproveSchema, aiRefineSchema } from "@/lib/validations";
import { AppError } from "@/server/errors";
import { getAiProvider } from "@/services/ai";
import { AiProviderError } from "@/services/ai/types";
import * as ai from "@/services/ai.service";
import { createQuiz, sanitizeConfig } from "@/services/quiz.service";
import type { QuizConfig } from "@/types/domain";

/** Les appels au fournisseur d'IA partent du serveur uniquement ; aucune donnée de prospect n'est transmise. */
export async function generateQuizAction(raw: unknown): Promise<ActionResult<{ generationId: string; config: QuizConfig; provider: string }>> {
  if (!getFeatures().ai) return { ok: false, error: "L'Assistant IA est désactivé." };
  return authed(aiGenerateQuizSchema, raw, async (input, ctx, _u, db) => {
    const business = await db.read((s) => ai.assertAiQuota(s, ctx));
    const provider = getAiProvider();
    try {
      const config = await provider.generateQuiz({ brief: input.brief, target: input.target, tone: input.tone, questionCount: input.questionCount, business: ai.businessContext(business) });
      const gen = await db.tx((s) => ai.recordGeneration(s, ctx, { type: "quiz", input: { brief: input.brief, target: input.target, tone: input.tone, questionCount: input.questionCount }, output: config, provider: provider.name, model: provider.model, status: "success" }));
      return { generationId: gen.id, config, provider: provider.name };
    } catch (err) {
      await db.tx((s) => ai.recordGeneration(s, ctx, { type: "quiz", input: { brief: input.brief }, output: null, provider: provider.name, model: provider.model, status: "error" }));
      if (err instanceof AiProviderError) throw new AppError("INVALID_STATE", err.message);
      throw err;
    }
  });
}

/** « L'IA propose, l'utilisateur valide » : adopter une proposition crée un BROUILLON, jamais un quiz publié. */
export async function adoptGenerationAction(raw: unknown): Promise<ActionResult> {
  if (!getFeatures().ai) return { ok: false, error: "L'Assistant IA est désactivé." };
  const res = await authed(aiAdoptSchema, raw, (input, ctx, _u, db) => db.tx((s) => ai.adoptGeneration(s, ctx, input.generationId).id));
  if (res.ok) redirect(`/lead-magnets/${res.data}`);
  return res as ActionResult;
}

export async function improveTextAction(raw: unknown): Promise<ActionResult<{ variants: string[] }>> {
  if (!getFeatures().ai) return { ok: false, error: "L'Assistant IA est désactivé." };
  return authed(aiImproveSchema, raw, async (input, ctx, _u, db) => {
    const business = await db.read((s) => ai.assertAiQuota(s, ctx));
    const provider = getAiProvider();
    const variants = await provider.improve({ kind: input.kind, text: input.text, instruction: input.instruction, tone: "professionnel", business: ai.businessContext(business) });
    await db.tx((s) => ai.recordGeneration(s, ctx, { type: "improve", input: { kind: input.kind }, output: variants, provider: provider.name, model: provider.model, status: "success" }));
    return { variants };
  });
}

/** Ajustement en langage naturel d'un quiz (proposition ou brouillon) : renvoie une PROPOSITION, rien n'est enregistré. */
export async function refineQuizAction(raw: unknown): Promise<ActionResult<{ config: QuizConfig; changes: string[]; hint?: string }>> {
  if (!getFeatures().ai) return { ok: false, error: "L'assistance IA est désactivée." };
  return authed(aiRefineSchema, raw, async (input, ctx, _u, db) => {
    const business = await db.read((s) => ai.assertAiQuota(s, ctx));
    const provider = getAiProvider();
    const result = await provider.refineQuiz({ config: input.config as QuizConfig, instruction: input.instruction, tone: "professionnel", business: ai.businessContext(business) });
    await db.tx((s) => ai.recordGeneration(s, ctx, { type: "refine", input: { instruction: input.instruction }, output: { changes: result.changes }, provider: provider.name, model: provider.model, status: "success" }));
    return result;
  });
}

/** Crée un BROUILLON à partir d'une proposition (éventuellement ajustée) validée par l'utilisateur. Jamais publié. */
export async function createQuizFromAiAction(raw: unknown): Promise<ActionResult> {
  if (!getFeatures().ai) return { ok: false, error: "L'assistance IA est désactivée." };
  const res = await authed(aiCreateFromConfigSchema, raw, (input, ctx, _u, db) => db.tx((s) => { const config = sanitizeConfig(input.config as QuizConfig); return createQuiz(s, ctx, { title: config.title, config }).id; }));
  if (res.ok) redirect(`/lead-magnets/${res.data}`);
  return res as ActionResult;
}
