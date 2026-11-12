import { ctxFor } from "@/server/context";
import { emptyState, type DbState } from "@/server/db/store";
import { MockAiProvider } from "@/services/ai/mock-provider";
import { register } from "@/services/auth.service";
import { createQuiz, publishQuiz } from "@/services/quiz.service";
import type { QuizConfig } from "@/types/domain";

/** Monde de test : un état vierge, un propriétaire et, au besoin, un quiz publié. */
export function makeWorld(email = "owner@test.dev") {
  const s: DbState = emptyState();
  const { user, business } = register(s, { firstName: "Test", lastName: "Owner", email, password: "Motdepasse1" });
  const ctx = ctxFor(user.id);
  return { s, user, business, ctx };
}

export function sampleConfig(count = 5): QuizConfig {
  return new MockAiProvider().buildQuiz({ brief: "Quiz de maturité financière pour des salariés", target: "salariés", tone: "chaleureux", questionCount: count, business: { name: "Coach Test", activityType: "coaching", industry: "Finance", description: "", offers: [], bookingUrl: "https://cal.example/rdv" } });
}

export function publishedQuiz(world = makeWorld(), count = 5) {
  const quiz = createQuiz(world.s, world.ctx, { title: "Mon diagnostic financier", config: sampleConfig(count) });
  publishQuiz(world.s, world.ctx, quiz.id);
  return { ...world, quiz };
}

/** Réponses « profil i » : toujours la i-ème option de chaque question. */
export function answersFor(config: QuizConfig, optionIndex: number): Record<string, string[]> {
  return Object.fromEntries(config.questions.map((q) => [q.id, [q.options[optionIndex]!.id]]));
}

export const contact = (email = "visiteur@example.com", consent = true) => ({ firstName: "Awa", lastName: "Koné", email, phone: "", marketingConsent: consent });
