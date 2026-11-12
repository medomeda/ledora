import type { QuizConfig } from "@/types/domain";

/**
 * Couche d'abstraction du fournisseur d'IA (PRD §6.10) : le code métier ne connaît que cette interface. Les appels
 * partent TOUJOURS du serveur, et aucune donnée personnelle de prospect n'est transmise (seulement le contexte du business).
 */
export type Tone = "professionnel" | "chaleureux" | "dynamique" | "expert";

export interface BusinessContext {
  name: string;
  activityType: string;
  industry: string;
  description: string;
  offers: string[];
  bookingUrl: string;
}

export interface GenerateQuizInput {
  brief: string;
  target: string;
  tone: Tone;
  questionCount: number;
  business: BusinessContext;
}

export type ImproveKind = "title" | "introduction" | "question" | "answer" | "result" | "cta";

export interface ImproveInput {
  kind: ImproveKind;
  text: string;
  instruction: string;
  tone: Tone;
  business: BusinessContext;
}

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  generateQuiz(input: GenerateQuizInput): Promise<QuizConfig>;
  improve(input: ImproveInput): Promise<string[]>;
}

/** Erreur du fournisseur (indisponible, limite atteinte…) : message affichable tel quel. */
export class AiProviderError extends Error {}
