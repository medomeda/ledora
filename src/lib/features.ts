/**
 * Modules « au chaud » : leur code reste dans le dépôt (services, actions, pages, tests) mais ils sont désactivés,
 * car hors du cœur de la plateforme (quiz → prospects → CRM → statistiques). Pour les réactiver, mettre la
 * variable d'environnement correspondante à 1 (voir .env.example) et redémarrer.
 */
export interface Features {
  publications: boolean;
  ai: boolean;
}

export function getFeatures(): Features {
  return {
    publications: process.env.LEADORA_FEATURE_PUBLICATIONS === "1",
    ai: process.env.LEADORA_FEATURE_AI === "1",
  };
}
