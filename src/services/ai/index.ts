import { MockAiProvider } from "@/services/ai/mock-provider";
import type { AiProvider } from "@/services/ai/types";

/**
 * Fabrique du fournisseur d'IA, pilotée par l'environnement (AI_PROVIDER). Seul le fournisseur simulé existe pour
 * l'instant ; brancher un modèle réel = ajouter une classe qui implémente `AiProvider` et l'enregistrer ici.
 */
export function getAiProvider(): AiProvider {
  const name = process.env.AI_PROVIDER ?? "mock";
  switch (name) {
    case "mock":
      return new MockAiProvider();
    default:
      throw new Error(`Fournisseur d'IA inconnu : « ${name} ». Valeurs possibles : mock.`);
  }
}
