/**
 * Contrôles d'accès centralisés (PRD §11). Le MVP n'a qu'un rôle (propriétaire de l'espace), mais toutes les
 * vérifications passent par ces fonctions pour qu'une évolution vers des équipes ne touche qu'ici.
 */
import type { Business, Lead, Publication, Quiz, Tag } from "@/types/domain";

type Owned = { businessId: string };

export const belongsTo = <T extends Owned>(business: Business, resource: T | undefined | null): resource is T => !!resource && resource.businessId === business.id;

export const canManageQuiz = (business: Business, quiz: Quiz | undefined | null): quiz is Quiz => belongsTo(business, quiz);
export const canManageLead = (business: Business, lead: Lead | undefined | null): lead is Lead => belongsTo(business, lead);
export const canManagePublication = (business: Business, p: Publication | undefined | null): p is Publication => belongsTo(business, p);
export const canManageTag = (business: Business, t: Tag | undefined | null): t is Tag => belongsTo(business, t);
