import { canManagePublication } from "@/lib/permissions";
import { stripHtml } from "@/lib/utils/text";
import { isoNow, requireBusiness, type Ctx } from "@/server/context";
import type { DbState } from "@/server/db/store";
import { notFound, validation } from "@/server/errors";
import { newId } from "@/server/ids";
import type { Publication, PublicationPlatform, PublicationStatus } from "@/types/domain";

/** Planification éditoriale simplifiée (PRD §6.11) : aucune publication automatique vers les réseaux. */
export interface PublicationInput {
  id?: string;
  title: string;
  content: string;
  platform: PublicationPlatform;
  visualUrl?: string | null;
  contentPillar: string;
  objective: string;
  quizId?: string | null;
  status: PublicationStatus;
  scheduledAt?: string | null;
}

export function listPublications(s: Readonly<DbState>, ctx: Ctx): Publication[] {
  const business = requireBusiness(s, ctx);
  return s.publications.filter((p) => p.businessId === business.id).sort((a, b) => (a.scheduledAt ?? a.createdAt).localeCompare(b.scheduledAt ?? b.createdAt));
}

export function savePublication(s: DbState, ctx: Ctx, input: PublicationInput): Publication {
  const business = requireBusiness(s, ctx);
  const at = isoNow(ctx);
  let scheduledAt: string | null = null;
  if (input.scheduledAt) {
    const d = new Date(input.scheduledAt);
    if (Number.isNaN(d.getTime())) throw validation("Date invalide.", { scheduledAt: "Date invalide." });
    scheduledAt = d.toISOString();
  }
  if (input.status === "scheduled" && !scheduledAt) throw validation("Choisissez une date pour planifier la publication.", { scheduledAt: "Date requise pour une publication planifiée." });
  // Le quiz associé doit appartenir au même business.
  const quizId = input.quizId && s.quizzes.some((q) => q.id === input.quizId && q.businessId === business.id) ? input.quizId : null;

  const fields = {
    title: stripHtml(input.title).trim(),
    content: stripHtml(input.content).trim(),
    platform: input.platform,
    visualUrl: input.visualUrl ?? null,
    contentPillar: stripHtml(input.contentPillar).trim(),
    objective: stripHtml(input.objective).trim(),
    quizId,
    status: input.status,
    scheduledAt,
  };
  if (input.id) {
    const pub = s.publications.find((p) => p.id === input.id);
    if (!canManagePublication(business, pub)) throw notFound("Publication introuvable.");
    Object.assign(pub, fields, { updatedAt: at });
    pub.publishedAt = pub.status === "published" ? (pub.publishedAt ?? at) : null;
    return pub;
  }
  const pub: Publication = { id: newId(), businessId: business.id, ...fields, publishedAt: fields.status === "published" ? at : null, createdAt: at, updatedAt: at };
  s.publications.push(pub);
  return pub;
}

export function deletePublication(s: DbState, ctx: Ctx, id: string): void {
  const business = requireBusiness(s, ctx);
  const pub = s.publications.find((p) => p.id === id);
  if (!canManagePublication(business, pub)) throw notFound("Publication introuvable.");
  s.publications = s.publications.filter((p) => p.id !== id);
}
