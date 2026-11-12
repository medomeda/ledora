/**
 * Drapeaux de fonctionnalités.
 *  - `ai` : l'IA dans le workflow de création de quiz (génération, reformulations, ajustements). Activée par défaut ;
 *    LEADORA_FEATURE_AI=0 la désactive.
 *  - `assistant` : le module « Assistant IA » du menu. Au chaud (désactivé) : LEADORA_FEATURE_ASSISTANT=1 le réactive.
 *  - `publications` : le calendrier de publications. Au chaud : LEADORA_FEATURE_PUBLICATIONS=1 le réactive.
 */
export interface Features {
  publications: boolean;
  ai: boolean;
  assistant: boolean;
}

export function getFeatures(): Features {
  return {
    publications: process.env.LEADORA_FEATURE_PUBLICATIONS === "1",
    ai: process.env.LEADORA_FEATURE_AI !== "0",
    assistant: process.env.LEADORA_FEATURE_ASSISTANT === "1",
  };
}
