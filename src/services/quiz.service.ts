import { canManageQuiz } from "@/lib/permissions";
import { PLANS } from "@/lib/constants/plans";
import { blankConfig, newUid } from "@/lib/quiz/factory";
import { slugify, stripHtml } from "@/lib/utils/text";
import { isoNow, requireBusiness, type Ctx } from "@/server/context";
import type { DbState } from "@/server/db/store";
import { conflict, invalidState, notFound, quotaExceeded, validation } from "@/server/errors";
import { newId } from "@/server/ids";
import { validateForPublish } from "@/services/scoring.service";
import type { Business, Quiz, QuizConfig, QuizStatus, QuizVersion } from "@/types/domain";

/** Cycle de vie et édition des quiz (PRD §6.4, §6.5, §10.1). Toutes les entrées passent par le business de la session. */

const RESERVED_SLUGS = new Set(["api", "new", "admin"]);

export function uniqueQuizSlug(s: Readonly<DbState>, base: string, exceptQuizId?: string): string {
  const root = slugify(base) || "quiz";
  let slug = root;
  let i = 2;
  while (RESERVED_SLUGS.has(slug) || s.quizzes.some((q) => q.slug === slug && q.id !== exceptQuizId)) slug = `${root}-${i++}`;
  return slug;
}

export function requireQuiz(s: Readonly<DbState>, business: Business, quizId: string): Quiz {
  const quiz = s.quizzes.find((q) => q.id === quizId);
  if (!canManageQuiz(business, quiz)) throw notFound("Quiz introuvable.");
  return quiz;
}

function assertQuota(s: Readonly<DbState>, business: Business) {
  const max = PLANS[business.plan].maxActiveQuizzes;
  if (max === null) return;
  const active = s.quizzes.filter((q) => q.businessId === business.id && q.status !== "archived").length;
  if (active >= max) throw quotaExceeded(`Votre offre « ${PLANS[business.plan].name} » est limitée à ${max} quiz actifs. Archivez un quiz pour en créer un nouveau.`);
}

// ---- Lecture ----------------------------------------------------------------------------------------------------

export interface QuizListRow {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: QuizStatus;
  hasUnpublishedChanges: boolean;
  questionCount: number;
  participants: number;
  leads: number;
  createdAt: string;
  updatedAt: string;
}

export function listQuizzes(s: Readonly<DbState>, ctx: Ctx): QuizListRow[] {
  const business = requireBusiness(s, ctx);
  return s.quizzes
    .filter((q) => q.businessId === business.id)
    .map((q) => {
      const subs = s.quizSubmissions.filter((x) => x.quizId === q.id);
      return {
        id: q.id,
        title: q.config.title,
        slug: q.slug,
        category: q.config.category,
        status: q.status,
        hasUnpublishedChanges: q.hasUnpublishedChanges,
        questionCount: q.config.questions.length,
        participants: subs.filter((x) => x.status === "completed").length,
        leads: new Set(subs.filter((x) => x.leadId).map((x) => x.leadId)).size,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getQuiz(s: Readonly<DbState>, ctx: Ctx, quizId: string): Quiz {
  return requireQuiz(s, requireBusiness(s, ctx), quizId);
}

// ---- Écriture ---------------------------------------------------------------------------------------------------

export function createQuiz(s: DbState, ctx: Ctx, input: { title: string; category?: string; description?: string; config?: QuizConfig }): Quiz {
  const business = requireBusiness(s, ctx);
  assertQuota(s, business);
  const at = isoNow(ctx);
  const config = input.config ?? blankConfig({ title: input.title, category: input.category, description: input.description });
  config.title = stripHtml(input.title || config.title);
  const quiz: Quiz = {
    id: newId(),
    businessId: business.id,
    type: "quiz",
    slug: uniqueQuizSlug(s, config.title),
    status: "draft",
    config,
    publishedVersionId: null,
    hasUnpublishedChanges: false,
    createdAt: at,
    updatedAt: at,
    publishedAt: null,
    archivedAt: null,
  };
  s.quizzes.push(quiz);
  return quiz;
}

/** Nettoie la configuration : texte sans HTML, références de profils valides. */
export function sanitizeConfig(config: QuizConfig): QuizConfig {
  const clean = structuredClone(config);
  const t = (v: string) => stripHtml(v).trim();
  clean.title = t(clean.title);
  clean.description = t(clean.description);
  clean.introduction = stripHtml(clean.introduction).trim();
  clean.objective = t(clean.objective);
  clean.category = t(clean.category);
  clean.startLabel = t(clean.startLabel) || "Commencer le diagnostic";
  clean.result.fallbackTitle = t(clean.result.fallbackTitle);
  clean.result.fallbackContent = stripHtml(clean.result.fallbackContent).trim();
  clean.capture.title = t(clean.capture.title);
  clean.capture.message = t(clean.capture.message);
  clean.capture.consentLabel = t(clean.capture.consentLabel);
  if (!clean.capture.askPhone) clean.capture.phoneRequired = false;
  const profileIds = new Set(clean.profiles.map((p) => p.id));
  for (const q of clean.questions) {
    q.title = t(q.title);
    q.description = t(q.description);
    for (const o of q.options) {
      o.label = t(o.label);
      o.description = t(o.description);
      o.profilePoints = o.profilePoints.filter((pp) => profileIds.has(pp.profileId) && pp.points !== 0);
    }
  }
  for (const p of clean.profiles) {
    p.name = t(p.name);
    p.description = t(p.description);
    p.resultTitle = t(p.resultTitle);
    p.resultContent = stripHtml(p.resultContent).trim();
    p.ctaLabel = t(p.ctaLabel);
    p.strengths = p.strengths.map(t).filter(Boolean);
    p.improvementAreas = p.improvementAreas.map(t).filter(Boolean);
    p.recommendations = p.recommendations.map(t).filter(Boolean);
    p.autoTags = p.autoTags.map(t).filter(Boolean);
  }
  return clean;
}

export function saveQuizConfig(s: DbState, ctx: Ctx, quizId: string, config: QuizConfig): Quiz {
  const business = requireBusiness(s, ctx);
  const quiz = requireQuiz(s, business, quizId);
  if (quiz.status === "archived") throw invalidState("Un quiz archivé ne peut pas être modifié. Restaurez-le d'abord.");
  const clean = sanitizeConfig(config);
  if (!clean.title) throw validation("Le titre du quiz est obligatoire.", { title: "Le titre est obligatoire." });
  quiz.config = clean;
  quiz.updatedAt = isoNow(ctx);
  if (quiz.publishedVersionId) quiz.hasUnpublishedChanges = true;
  return quiz;
}

/** L'URL publique ne peut changer qu'avant la toute première publication (les liens déjà partagés ne doivent pas casser). */
export function setQuizSlug(s: DbState, ctx: Ctx, quizId: string, slugRaw: string): Quiz {
  const business = requireBusiness(s, ctx);
  const quiz = requireQuiz(s, business, quizId);
  if (quiz.publishedAt) throw invalidState("L'adresse d'un quiz déjà publié ne peut plus être modifiée.");
  const slug = slugify(slugRaw);
  if (slug.length < 3) throw validation("L'adresse doit contenir au moins 3 caractères.", { slug: "3 caractères minimum." });
  if (RESERVED_SLUGS.has(slug) || s.quizzes.some((q) => q.slug === slug && q.id !== quiz.id)) throw conflict("Cette adresse est déjà utilisée.", { slug: "Adresse déjà utilisée." });
  quiz.slug = slug;
  quiz.updatedAt = isoNow(ctx);
  return quiz;
}

export function publishQuiz(s: DbState, ctx: Ctx, quizId: string): { quiz: Quiz; version: QuizVersion; created: boolean } {
  const business = requireBusiness(s, ctx);
  const quiz = requireQuiz(s, business, quizId);
  if (quiz.status === "archived") throw invalidState("Restaurez le quiz avant de le publier.");
  const issues = validateForPublish(quiz.config);
  if (issues.length > 0) throw validation(`Le quiz n'est pas prêt à être publié : ${issues[0]!.message}${issues.length > 1 ? ` (+ ${issues.length - 1} autre${issues.length > 2 ? "s" : ""})` : ""}`);
  const at = isoNow(ctx);
  let version = quiz.publishedVersionId ? s.quizVersions.find((v) => v.id === quiz.publishedVersionId) : undefined;
  let created = false;
  // Une nouvelle version n'est figée que si la configuration a changé : les anciennes participations restent liées à leur version.
  if (!version || quiz.hasUnpublishedChanges) {
    const number = s.quizVersions.filter((v) => v.quizId === quiz.id).length + 1;
    version = { id: newId(), quizId: quiz.id, version: number, config: structuredClone(quiz.config), createdAt: at };
    s.quizVersions.push(version);
    quiz.publishedVersionId = version.id;
    created = true;
  }
  quiz.status = "published";
  quiz.hasUnpublishedChanges = false;
  quiz.publishedAt ??= at;
  quiz.updatedAt = at;
  return { quiz, version, created };
}

/** Dépublier : le lien public cesse de répondre ; versions, participations et prospects sont conservés. */
export function unpublishQuiz(s: DbState, ctx: Ctx, quizId: string): Quiz {
  const quiz = requireQuiz(s, requireBusiness(s, ctx), quizId);
  if (quiz.status !== "published") throw invalidState("Ce quiz n'est pas publié.");
  quiz.status = "draft";
  quiz.updatedAt = isoNow(ctx);
  return quiz;
}

export function archiveQuiz(s: DbState, ctx: Ctx, quizId: string): Quiz {
  const quiz = requireQuiz(s, requireBusiness(s, ctx), quizId);
  if (quiz.status === "archived") return quiz;
  quiz.status = "archived";
  quiz.archivedAt = isoNow(ctx);
  quiz.updatedAt = quiz.archivedAt;
  return quiz;
}

export function restoreQuiz(s: DbState, ctx: Ctx, quizId: string): Quiz {
  const business = requireBusiness(s, ctx);
  const quiz = requireQuiz(s, business, quizId);
  if (quiz.status !== "archived") throw invalidState("Ce quiz n'est pas archivé.");
  assertQuota(s, business);
  quiz.status = "draft";
  quiz.archivedAt = null;
  quiz.updatedAt = isoNow(ctx);
  return quiz;
}

/** Copie la configuration avec de nouveaux identifiants (les profils référencés par les réponses sont remappés). */
export function cloneConfig(config: QuizConfig): QuizConfig {
  const copy = structuredClone(config);
  const profileMap = new Map<string, string>();
  for (const p of copy.profiles) {
    const id = newUid();
    profileMap.set(p.id, id);
    p.id = id;
  }
  for (const q of copy.questions) {
    q.id = newUid();
    for (const o of q.options) {
      o.id = newUid();
      o.profilePoints = o.profilePoints.flatMap((pp) => (profileMap.has(pp.profileId) ? [{ profileId: profileMap.get(pp.profileId)!, points: pp.points }] : []));
    }
  }
  return copy;
}

export function duplicateQuiz(s: DbState, ctx: Ctx, quizId: string): Quiz {
  const business = requireBusiness(s, ctx);
  const source = requireQuiz(s, business, quizId);
  const config = cloneConfig(source.config);
  config.title = `${source.config.title} (copie)`;
  return createQuiz(s, ctx, { title: config.title, config });
}

export interface DeletionImpact {
  submissions: number;
  leads: number;
}

export function deletionImpact(s: Readonly<DbState>, ctx: Ctx, quizId: string): DeletionImpact {
  const quiz = requireQuiz(s, requireBusiness(s, ctx), quizId);
  const subs = s.quizSubmissions.filter((x) => x.quizId === quiz.id);
  return { submissions: subs.length, leads: new Set(subs.filter((x) => x.leadId).map((x) => x.leadId)).size };
}

/**
 * Suppression définitive (PRD §6.4) : supprime le quiz, ses versions, visites et participations. Les prospects du CRM
 * sont CONSERVÉS (ils appartiennent au business, pas au quiz) ; seul leur lien avec ces participations disparaît.
 */
export function deleteQuiz(s: DbState, ctx: Ctx, quizId: string): void {
  const quiz = requireQuiz(s, requireBusiness(s, ctx), quizId);
  if (quiz.status === "published") throw invalidState("Dépubliez le quiz avant de le supprimer définitivement.");
  const subIds = new Set(s.quizSubmissions.filter((x) => x.quizId === quiz.id).map((x) => x.id));
  s.leadSubmissions = s.leadSubmissions.filter((ls) => !subIds.has(ls.submissionId));
  s.quizSubmissions = s.quizSubmissions.filter((x) => x.quizId !== quiz.id);
  s.quizVisits = s.quizVisits.filter((v) => v.quizId !== quiz.id);
  s.quizVersions = s.quizVersions.filter((v) => v.quizId !== quiz.id);
  for (const p of s.publications) if (p.quizId === quiz.id) p.quizId = null;
  s.quizzes = s.quizzes.filter((q) => q.id !== quiz.id);
}

// ---- Public -----------------------------------------------------------------------------------------------------

export interface PublicQuiz {
  quizId: string;
  businessId: string;
  versionId: string;
  slug: string;
  config: QuizConfig;
  brand: { name: string; logoUrl: string | null; website: string };
}

/** Quiz accessible au public : publié, jamais archivé. Retourne la VERSION figée, pas le brouillon. */
export function getPublicQuiz(s: Readonly<DbState>, slug: string): PublicQuiz | null {
  const quiz = s.quizzes.find((q) => q.slug === slug);
  if (!quiz || quiz.status !== "published" || !quiz.publishedVersionId) return null;
  const version = s.quizVersions.find((v) => v.id === quiz.publishedVersionId);
  const business = s.businesses.find((b) => b.id === quiz.businessId);
  if (!version || !business) return null;
  return { quizId: quiz.id, businessId: business.id, versionId: version.id, slug: quiz.slug, config: version.config, brand: { name: business.name, logoUrl: business.logoUrl, website: business.website } };
}
