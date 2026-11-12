"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authed, type ActionResult } from "@/actions/_shared";
import "@/server/bootstrap";
import { createQuizSchema, quizIdSchema, saveQuizSchema } from "@/lib/validations";
import { tx } from "@/server/db/store";
import * as quizzes from "@/services/quiz.service";
import { validateForPublish, type PublishIssue } from "@/services/scoring.service";

const touch = () => {
  revalidatePath("/lead-magnets");
  revalidatePath("/dashboard");
};

export async function createQuizAction(raw: unknown): Promise<ActionResult> {
  const res = await authed(createQuizSchema, raw, (input, ctx) => tx((s) => quizzes.createQuiz(s, ctx, input).id));
  if (res.ok) {
    touch();
    redirect(`/lead-magnets/${res.data}`);
  }
  return res as ActionResult;
}

export async function saveQuizAction(raw: unknown): Promise<ActionResult<{ updatedAt: string }>> {
  const res = await authed(saveQuizSchema, raw, (input, ctx) => tx((s) => ({ updatedAt: quizzes.saveQuizConfig(s, ctx, input.quizId, input.config).updatedAt })));
  if (res.ok) touch();
  return res;
}

const slugSchema = z.object({ quizId: z.string().min(1), slug: z.string().trim().min(1, "L'adresse est obligatoire.").max(60) });
export async function setSlugAction(raw: unknown): Promise<ActionResult<{ slug: string }>> {
  return authed(slugSchema, raw, (input, ctx) => tx((s) => ({ slug: quizzes.setQuizSlug(s, ctx, input.quizId, input.slug).slug })));
}

/** Enregistre le brouillon PUIS publie : le brouillon affiché dans le créateur est exactement ce qui est publié. */
export async function publishQuizAction(raw: unknown): Promise<ActionResult<{ slug: string; versionCreated: boolean }>> {
  const res = await authed(saveQuizSchema, raw, (input, ctx) =>
    tx((s) => {
      quizzes.saveQuizConfig(s, ctx, input.quizId, input.config);
      const r = quizzes.publishQuiz(s, ctx, input.quizId);
      return { slug: r.quiz.slug, versionCreated: r.created };
    }),
  );
  if (res.ok) touch();
  return res;
}

/** Contrôles de publication sans rien modifier (affichage de la checklist dans le créateur). */
export async function checkPublishAction(raw: unknown): Promise<ActionResult<{ issues: PublishIssue[] }>> {
  return authed(saveQuizSchema, raw, (input) => ({ issues: validateForPublish(quizzes.sanitizeConfig(input.config)) }));
}

function simple(fn: (s: Parameters<Parameters<typeof tx>[0]>[0], ctx: Parameters<Parameters<typeof authed>[2]>[1], id: string) => unknown) {
  return async (raw: unknown): Promise<ActionResult> => {
    const res = await authed(quizIdSchema, raw, (input, ctx) => void tx((s) => void fn(s, ctx, input.quizId)));
    if (res.ok) touch();
    return res;
  };
}

export const unpublishQuizAction = simple((s, ctx, id) => quizzes.unpublishQuiz(s, ctx, id));
export const archiveQuizAction = simple((s, ctx, id) => quizzes.archiveQuiz(s, ctx, id));
export const restoreQuizAction = simple((s, ctx, id) => quizzes.restoreQuiz(s, ctx, id));
export const deleteQuizAction = simple((s, ctx, id) => quizzes.deleteQuiz(s, ctx, id));

export async function duplicateQuizAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const res = await authed(quizIdSchema, raw, (input, ctx) => tx((s) => ({ id: quizzes.duplicateQuiz(s, ctx, input.quizId).id })));
  if (res.ok) touch();
  return res;
}
