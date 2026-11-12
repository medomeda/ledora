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

export interface RefineInput {
  config: QuizConfig;
  /** Demande d'ajustement en langage naturel : « ajoute une question sur l'épargne », « ton plus dynamique »… */
  instruction: string;
  tone: Tone;
  business: BusinessContext;
}

export interface RefineResult {
  /** Proposition complète après ajustement : l'appelant la présente à l'utilisateur, qui accepte ou refuse. */
  config: QuizConfig;
  /** Liste lisible des changements effectués (vide si rien n'a été compris). */
  changes: string[];
  /** Aide affichée quand la demande n'a pas été comprise. */
  hint?: string;
}

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  generateQuiz(input: GenerateQuizInput): Promise<QuizConfig>;
  improve(input: ImproveInput): Promise<string[]>;
  refineQuiz(input: RefineInput): Promise<RefineResult>;
}

/** Erreur du fournisseur (indisponible, limite atteinte…) : message affichable tel quel. */
export class AiProviderError extends Error {}
