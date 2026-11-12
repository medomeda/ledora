"use server";
import { redirect } from "next/navigation";
import { authed, type ActionResult } from "@/actions/_shared";
import "@/server/bootstrap";
import { aiAdoptSchema, aiGenerateQuizSchema, aiImproveSchema } from "@/lib/validations";
import { AppError } from "@/server/errors";
import { read, tx } from "@/server/db/store";
import { getAiProvider } from "@/services/ai";
import { AiProviderError } from "@/services/ai/types";
import * as ai from "@/services/ai.service";
import type { QuizConfig } from "@/types/domain";

/** Les appels au fournisseur d'IA partent du serveur uniquement ; aucune donnée de prospect n'est transmise. */
export async function generateQuizAction(raw: unknown): Promise<ActionResult<{ generationId: string; config: QuizConfig; provider: string }>> {
  return authed(aiGenerateQuizSchema, raw, async (input, ctx) => {
    const business = read((s) => ai.assertAiQuota(s, ctx));
    const provider = getAiProvider();
    try {
      const config = await provider.generateQuiz({ brief: input.brief, target: input.target, tone: input.tone, questionCount: input.questionCount, business: ai.businessContext(business) });
      const gen = tx((s) => ai.recordGeneration(s, ctx, { type: "quiz", input: { brief: input.brief, target: input.target, tone: input.tone, questionCount: input.questionCount }, output: config, provider: provider.name, model: provider.model, status: "success" }));
      return { generationId: gen.id, config, provider: provider.name };
    } catch (err) {
      tx((s) => ai.recordGeneration(s, ctx, { type: "quiz", input: { brief: input.brief }, output: null, provider: provider.name, model: provider.model, status: "error" }));
      if (err instanceof AiProviderError) throw new AppError("INVALID_STATE", err.message);
      throw err;
    }
  });
}

/** « L'IA propose, l'utilisateur valide » : adopter une proposition crée un BROUILLON, jamais un quiz publié. */
export async function adoptGenerationAction(raw: unknown): Promise<ActionResult> {
  const res = await authed(aiAdoptSchema, raw, (input, ctx) => tx((s) => ai.adoptGeneration(s, ctx, input.generationId).id));
  if (res.ok) redirect(`/lead-magnets/${res.data}`);
  return res as ActionResult;
}

export async function improveTextAction(raw: unknown): Promise<ActionResult<{ variants: string[] }>> {
  return authed(aiImproveSchema, raw, async (input, ctx) => {
    const business = read((s) => ai.assertAiQuota(s, ctx));
    const provider = getAiProvider();
    const variants = await provider.improve({ kind: input.kind, text: input.text, instruction: input.instruction, tone: "professionnel", business: ai.businessContext(business) });
    tx((s) => ai.recordGeneration(s, ctx, { type: "improve", input: { kind: input.kind }, output: variants, provider: provider.name, model: provider.model, status: "success" }));
    return { variants };
  });
}
