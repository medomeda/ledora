import { notFound } from "@/server/errors";
import type { DbState } from "@/server/db/store";
import type { Business } from "@/types/domain";

/** Contexte d'exécution d'un service : qui agit, et quand (injectable pour le seed et les tests). */
export interface Ctx {
  userId: string;
  now: Date;
}

export const ctxFor = (userId: string, now = new Date()): Ctx => ({ userId, now });
export const isoNow = (ctx: Ctx) => ctx.now.toISOString();

/**
 * Cloisonnement (PRD §11) : l'espace (business) est TOUJOURS déduit de la session, jamais d'un identifiant fourni par
 * le navigateur. Toute ressource demandée est ensuite vérifiée contre ce business ; sinon elle est « introuvable ».
 */
export function requireBusiness(s: Readonly<DbState>, ctx: Ctx): Business {
  const business = s.businesses.find((b) => b.ownerId === ctx.userId);
  if (!business) throw notFound("Espace professionnel introuvable.");
  return business;
}
