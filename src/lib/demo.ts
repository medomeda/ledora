/**
 * Mode test / démonstration (comme KOTI). Actif : bandeau « Version de démonstration », comptes fictifs sur la page de
 * connexion, page /guide, jeu de données simulées chargé dans une base vide.
 *  - développement : actif sauf LEADORA_DEMO_MODE=0 ;
 *  - production : actif seulement si LEADORA_DEMO_MODE=1 (phase de test d'un déploiement ; à passer à 0 pour la production réelle).
 * LEADORA_ALLOW_DEMO_RESET=1 autorise en plus la remise à zéro de la démonstration (bouton d'administration et route protégée).
 */
export const isDemoMode = (): boolean => (process.env.NODE_ENV === "production" ? process.env.LEADORA_DEMO_MODE === "1" : process.env.LEADORA_DEMO_MODE !== "0");
export const canResetDemo = (): boolean => isDemoMode() && process.env.LEADORA_ALLOW_DEMO_RESET === "1";

/** Comptes fictifs du jeu de démonstration (mot de passe commun, public). */
export const DEMO_PASSWORD = "Leadora2026";
export const DEMO_ACCOUNTS = [
  { email: "demo@leadora.app", label: "Coach (espace complet)", detail: "4 quiz, environ 300 prospects, statistiques sur 35 jours", area: "Espace client" },
  { email: "nouveau@leadora.app", label: "Nouveau client (espace vide)", detail: "Onboarding, états vides, premier quiz à créer", area: "Espace client" },
  { email: "admin@leadora.app", label: "Administrateur", detail: "Tous les droits : comptes, offres, équipe, réglages", area: "Administration" },
  { email: "support@leadora.app", label: "Support", detail: "Aide les clients, modère les quiz ; pas d'offres ni de réglages", area: "Administration" },
  { email: "lecture@leadora.app", label: "Lecture seule", detail: "Consulte l'administration, ne modifie rien", area: "Administration" },
] as const;
