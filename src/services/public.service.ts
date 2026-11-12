import { planDef } from "@/lib/constants/plans";
import { classifySource } from "@/lib/utils/traffic";
import type { DbState } from "@/server/db/store";
import { invalidState, notFound, quotaExceeded, validation } from "@/server/errors";
import { newId } from "@/server/ids";
import { attachTag, ensureTag, upsertLead, type ContactInput } from "@/services/lead.service";
import { getPublicQuiz, type PublicQuiz } from "@/services/quiz.service";
import { buildResultView, computeResult, ScoringError, type AnswerInput, type ResultView } from "@/services/scoring.service";
import type { Business, CaptureConfig, QuizSubmission } from "@/types/domain";

/**
 * Parcours du participant (PRD §6.6, §10.2–10.4). Toutes les entrées viennent d'un visiteur anonyme : rien n'est
 * accepté sans validation ; le score est TOUJOURS recalculé ici à partir des identifiants de réponses.
 */
export const CONSENT_POLICY_VERSION = "2026-11";

export interface Utm {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  referrer?: string | null;
}

export interface PublicContact extends ContactInput {
  marketingConsent: boolean;
}

function requirePublic(s: Readonly<DbState>, slug: string): PublicQuiz {
  const pq = getPublicQuiz(s, slug);
  if (!pq) throw notFound("Ce quiz n'est pas disponible.");
  return pq;
}

function monthlySubmissions(s: Readonly<DbState>, businessId: string, now: Date): number {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  return s.quizSubmissions.filter((x) => x.businessId === businessId && x.startedAt >= start).length;
}

function findSubmission(s: Readonly<DbState>, quizId: string, sessionId: string): QuizSubmission | undefined {
  return s.quizSubmissions.find((x) => x.quizId === quizId && x.sessionId === sessionId);
}

const clip = (v?: string | null) => (v ? v.slice(0, 100) : null);

/** Une visite par session (rechargements ignorés). */
export function trackVisit(s: DbState, slug: string, sessionId: string, utm: Utm, now = new Date()): void {
  const pq = requirePublic(s, slug);
  if (s.quizVisits.some((v) => v.quizId === pq.quizId && v.sessionId === sessionId)) return;
  s.quizVisits.push({ id: newId(), quizId: pq.quizId, sessionId, source: classifySource(utm.source, utm.referrer), utmSource: clip(utm.source), utmMedium: clip(utm.medium), utmCampaign: clip(utm.campaign), createdAt: now.toISOString() });
}

/** Démarre une participation sur la version actuellement publiée. Idempotent par session. */
export function startQuiz(s: DbState, slug: string, sessionId: string, utm: Utm, now = new Date()): { submissionId: string } {
  const pq = requirePublic(s, slug);
  const existing = findSubmission(s, pq.quizId, sessionId);
  if (existing) return { submissionId: existing.id };
  const business = s.businesses.find((b) => b.id === pq.businessId)!;
  const max = planDef(s, business.plan).maxMonthlySubmissions;
  if (max !== null && monthlySubmissions(s, business.id, now) >= max) throw quotaExceeded("Ce quiz n'accepte plus de participations pour le moment.");
  const sub: QuizSubmission = {
    id: newId(),
    quizId: pq.quizId,
    versionId: pq.versionId,
    businessId: pq.businessId,
    sessionId,
    leadId: null,
    status: "started",
    answers: [],
    totalScore: 0,
    maxScore: 0,
    profileId: null,
    profileName: null,
    source: classifySource(utm.source, utm.referrer),
    utmSource: clip(utm.source),
    utmMedium: clip(utm.medium),
    utmCampaign: clip(utm.campaign),
    startedAt: now.toISOString(),
    completedAt: null,
  };
  s.quizSubmissions.push(sub);
  return { submissionId: sub.id };
}

function assertContactMatchesConfig(c: CaptureConfig, contact: PublicContact) {
  const errors: Record<string, string> = {};
  if (c.askPhone && c.phoneRequired && !contact.phone?.trim()) errors.phone = "Votre téléphone est obligatoire.";
  if (Object.keys(errors).length) throw validation("Certains champs sont invalides.", errors);
}

/**
 * Enregistre les coordonnées : crée ou met à jour le contact CRM (sans doublon d'email), le relie à la participation
 * et conserve la trace du consentement (date + version de la politique). Le consentement marketing est facultatif.
 */
export function saveContact(s: DbState, slug: string, sessionId: string, contact: PublicContact, now = new Date()): { leadId: string; created: boolean } {
  const pq = requirePublic(s, slug);
  const sub = findSubmission(s, pq.quizId, sessionId);
  if (!sub) throw invalidState("Participation introuvable. Rechargez la page et recommencez.");
  const version = s.quizVersions.find((v) => v.id === sub.versionId)!;
  assertContactMatchesConfig(version.config.capture, contact);
  const business = s.businesses.find((b) => b.id === sub.businessId) as Business;
  const { lead, created } = upsertLead(s, business, { firstName: contact.firstName, lastName: version.config.capture.askLastName ? contact.lastName : "", email: contact.email, phone: version.config.capture.askPhone ? contact.phone : "" }, now);
  sub.leadId = lead.id;
  const at = now.toISOString();
  const existing = s.leadSubmissions.find((ls) => ls.submissionId === sub.id);
  if (existing) {
    existing.leadId = lead.id;
    existing.marketingConsent = contact.marketingConsent;
    existing.consentedAt = contact.marketingConsent ? at : null;
  } else {
    s.leadSubmissions.push({ id: newId(), leadId: lead.id, submissionId: sub.id, marketingConsent: contact.marketingConsent, consentedAt: contact.marketingConsent ? at : null, consentPolicyVersion: CONSENT_POLICY_VERSION, createdAt: at });
  }
  return { leadId: lead.id, created };
}

export interface CompletionResult {
  result: ResultView;
}

/** Termine la participation : calcul serveur du score et du profil, tags automatiques, résultat. */
export function completeQuiz(s: DbState, slug: string, sessionId: string, answers: AnswerInput, contact: PublicContact | null | undefined, now = new Date()): CompletionResult {
  const pq = requirePublic(s, slug);
  let sub = findSubmission(s, pq.quizId, sessionId);
  if (!sub) {
    startQuiz(s, slug, sessionId, {}, now);
    sub = findSubmission(s, pq.quizId, sessionId)!;
  }
  const version = s.quizVersions.find((v) => v.id === sub!.versionId)!;
  const config = version.config;

  if (contact) saveContact(s, slug, sessionId, contact, now);
  if (config.capture.required && !sub.leadId) throw validation("Renseignez vos coordonnées pour obtenir votre résultat.");

  let scoring;
  try {
    scoring = computeResult(config, answers);
  } catch (err) {
    if (err instanceof ScoringError) throw validation(err.message);
    throw err;
  }

  if (sub.status !== "completed") {
    const profile = config.profiles.find((p) => p.id === scoring.profileId) ?? null;
    sub.status = "completed";
    sub.answers = scoring.answers;
    sub.totalScore = scoring.totalScore;
    sub.maxScore = scoring.maxScore;
    sub.profileId = scoring.profileId;
    sub.profileName = profile?.name ?? null;
    sub.completedAt = now.toISOString();
    const lead = sub.leadId ? s.leads.find((l) => l.id === sub!.leadId) : undefined;
    if (lead && profile) {
      const business = s.businesses.find((b) => b.id === sub!.businessId)!;
      for (const name of profile.autoTags) attachTag(s, lead, ensureTag(s, business, name, now));
      lead.lastInteractionAt = sub.completedAt;
    }
  }
  return { result: buildResultView(config, { profileId: sub.profileId, totalScore: sub.totalScore, maxScore: sub.maxScore }) };
}
