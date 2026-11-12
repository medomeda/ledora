import { canManageLead, canManageTag } from "@/lib/permissions";
import { TAG_COLORS } from "@/lib/constants/labels";
import { normalizeEmail, stripHtml } from "@/lib/utils/text";
import { isoNow, requireBusiness, type Ctx } from "@/server/context";
import type { DbState } from "@/server/db/store";
import { notFound, validation } from "@/server/errors";
import { newId } from "@/server/ids";
import type { Business, Lead, LeadNote, LeadStatus, QuizConfig, Tag } from "@/types/domain";

/** CRM de prospection (PRD §6.7) : un contact par email et par business, plusieurs participations. */

export interface ContactInput {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
}

/** Création ou mise à jour d'un contact : l'email normalisé est la clé (aucun doublon), les anciennes données ne sont pas effacées par du vide. */
export function upsertLead(s: DbState, business: Business, input: ContactInput, now: Date): { lead: Lead; created: boolean } {
  const email = normalizeEmail(input.email);
  const at = now.toISOString();
  const existing = s.leads.find((l) => l.businessId === business.id && l.email === email);
  if (existing) {
    existing.firstName = stripHtml(input.firstName).trim() || existing.firstName;
    if (input.lastName?.trim()) existing.lastName = stripHtml(input.lastName).trim();
    if (input.phone?.trim()) existing.phone = stripHtml(input.phone).trim();
    existing.lastInteractionAt = at;
    existing.updatedAt = at;
    return { lead: existing, created: false };
  }
  const lead: Lead = {
    id: newId(),
    businessId: business.id,
    firstName: stripHtml(input.firstName).trim(),
    lastName: stripHtml(input.lastName ?? "").trim(),
    email,
    phone: stripHtml(input.phone ?? "").trim(),
    status: "new",
    lastInteractionAt: at,
    createdAt: at,
    updatedAt: at,
  };
  s.leads.push(lead);
  return { lead, created: true };
}

export function ensureTag(s: DbState, business: Business, nameRaw: string, now: Date): Tag {
  const name = stripHtml(nameRaw).trim().slice(0, 40);
  if (!name) throw validation("Le tag est vide.");
  const existing = s.tags.find((t) => t.businessId === business.id && t.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  const used = s.tags.filter((t) => t.businessId === business.id).length;
  const tag: Tag = { id: newId(), businessId: business.id, name, color: TAG_COLORS[used % TAG_COLORS.length]!, createdAt: now.toISOString() };
  s.tags.push(tag);
  return tag;
}

export function attachTag(s: DbState, lead: Lead, tag: Tag) {
  if (!s.leadTags.some((lt) => lt.leadId === lead.id && lt.tagId === tag.id)) s.leadTags.push({ leadId: lead.id, tagId: tag.id });
}

// ---- Lecture ----------------------------------------------------------------------------------------------------

export interface LeadFilters {
  q?: string;
  quizId?: string;
  profile?: string;
  status?: LeadStatus;
  tagId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface LeadRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: LeadStatus;
  createdAt: string;
  lastInteractionAt: string | null;
  profileName: string | null;
  score: number | null;
  maxScore: number | null;
  originQuizTitle: string | null;
  participations: number;
  tags: Array<{ id: string; name: string; color: string }>;
}

export interface LeadPage {
  rows: LeadRow[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
}

function quizTitle(s: Readonly<DbState>, quizId: string): string | null {
  return s.quizzes.find((q) => q.id === quizId)?.config.title ?? null;
}

function toRow(s: Readonly<DbState>, lead: Lead): LeadRow {
  const subs = s.quizSubmissions.filter((x) => x.leadId === lead.id).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const completed = subs.filter((x) => x.status === "completed");
  const latest = completed[completed.length - 1];
  const first = subs[0];
  const tagIds = s.leadTags.filter((lt) => lt.leadId === lead.id).map((lt) => lt.tagId);
  return {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    status: lead.status,
    createdAt: lead.createdAt,
    lastInteractionAt: lead.lastInteractionAt,
    profileName: latest?.profileName ?? null,
    score: latest ? latest.totalScore : null,
    maxScore: latest ? latest.maxScore : null,
    originQuizTitle: first ? quizTitle(s, first.quizId) : null,
    participations: subs.length,
    tags: s.tags.filter((t) => tagIds.includes(t.id)).map((t) => ({ id: t.id, name: t.name, color: t.color })),
  };
}

export function listLeads(s: Readonly<DbState>, ctx: Ctx, f: LeadFilters = {}): LeadPage {
  const business = requireBusiness(s, ctx);
  const q = f.q?.trim().toLowerCase();
  let rows = s.leads.filter((l) => l.businessId === business.id);
  if (q) rows = rows.filter((l) => `${l.firstName} ${l.lastName} ${l.email}`.toLowerCase().includes(q));
  if (f.status) rows = rows.filter((l) => l.status === f.status);
  if (f.tagId) rows = rows.filter((l) => s.leadTags.some((lt) => lt.leadId === l.id && lt.tagId === f.tagId));
  if (f.from) rows = rows.filter((l) => l.createdAt >= `${f.from}T00:00:00`);
  if (f.to) rows = rows.filter((l) => l.createdAt <= `${f.to}T23:59:59.999`);
  if (f.quizId || f.profile) {
    rows = rows.filter((l) => {
      const subs = s.quizSubmissions.filter((x) => x.leadId === l.id && x.status === "completed");
      return subs.some((x) => (!f.quizId || x.quizId === f.quizId) && (!f.profile || x.profileName === f.profile));
    });
  }
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pageSize = f.pageSize ?? 20;
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, f.page ?? 1), pages);
  return { rows: rows.slice((page - 1) * pageSize, page * pageSize).map((l) => toRow(s, l)), total, page, pages, pageSize };
}

/** Noms de profils connus (toutes versions confondues) — alimente le filtre « Profil ». */
export function listProfileNames(s: Readonly<DbState>, ctx: Ctx): string[] {
  const business = requireBusiness(s, ctx);
  return [...new Set(s.quizSubmissions.filter((x) => x.businessId === business.id && x.profileName).map((x) => x.profileName!))].sort((a, b) => a.localeCompare(b, "fr"));
}

export function listTags(s: Readonly<DbState>, ctx: Ctx): Array<Tag & { count: number }> {
  const business = requireBusiness(s, ctx);
  return s.tags
    .filter((t) => t.businessId === business.id)
    .map((t) => ({ ...t, count: s.leadTags.filter((lt) => lt.tagId === t.id).length }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export interface ParticipationView {
  submissionId: string;
  quizId: string;
  quizTitle: string;
  versionNumber: number | null;
  status: string;
  totalScore: number;
  maxScore: number;
  profileName: string | null;
  source: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  startedAt: string;
  completedAt: string | null;
  marketingConsent: boolean;
  consentedAt: string | null;
  consentPolicyVersion: string;
  /** Réponses lues avec la configuration figée de la version à laquelle le participant a répondu. */
  answers: Array<{ question: string; choices: string[]; score: number }>;
}

export interface LeadDetail {
  lead: Lead;
  tags: Array<{ id: string; name: string; color: string }>;
  notes: LeadNote[];
  participations: ParticipationView[];
}

export function getLead(s: Readonly<DbState>, ctx: Ctx, leadId: string): LeadDetail {
  const business = requireBusiness(s, ctx);
  const lead = s.leads.find((l) => l.id === leadId);
  if (!canManageLead(business, lead)) throw notFound("Prospect introuvable.");
  const participations: ParticipationView[] = s.quizSubmissions
    .filter((x) => x.leadId === lead.id)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map((x) => {
      const version = s.quizVersions.find((v) => v.id === x.versionId);
      const config: QuizConfig | undefined = version?.config;
      const consent = s.leadSubmissions.find((ls) => ls.submissionId === x.id && ls.leadId === lead.id);
      return {
        submissionId: x.id,
        quizId: x.quizId,
        quizTitle: config?.title ?? quizTitle(s, x.quizId) ?? "Quiz supprimé",
        versionNumber: version?.version ?? null,
        status: x.status,
        totalScore: x.totalScore,
        maxScore: x.maxScore,
        profileName: x.profileName,
        source: x.source,
        utmSource: x.utmSource,
        utmMedium: x.utmMedium,
        utmCampaign: x.utmCampaign,
        startedAt: x.startedAt,
        completedAt: x.completedAt,
        marketingConsent: consent?.marketingConsent ?? false,
        consentedAt: consent?.consentedAt ?? null,
        consentPolicyVersion: consent?.consentPolicyVersion ?? "",
        answers: x.answers.map((a) => {
          const question = config?.questions.find((q) => q.id === a.questionId);
          return { question: question?.title ?? "Question supprimée", choices: a.optionIds.map((oid) => question?.options.find((o) => o.id === oid)?.label ?? "—"), score: a.scoreAwarded };
        }),
      };
    });
  const tagIds = s.leadTags.filter((lt) => lt.leadId === lead.id).map((lt) => lt.tagId);
  return {
    lead,
    tags: s.tags.filter((t) => tagIds.includes(t.id)).map((t) => ({ id: t.id, name: t.name, color: t.color })),
    notes: s.leadNotes.filter((n) => n.leadId === lead.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    participations,
  };
}

// ---- Écriture ---------------------------------------------------------------------------------------------------

function requireLead(s: Readonly<DbState>, ctx: Ctx, leadId: string): { business: Business; lead: Lead } {
  const business = requireBusiness(s, ctx);
  const lead = s.leads.find((l) => l.id === leadId);
  if (!canManageLead(business, lead)) throw notFound("Prospect introuvable.");
  return { business, lead };
}

export function updateLeadStatus(s: DbState, ctx: Ctx, leadId: string, status: LeadStatus): Lead {
  const { lead } = requireLead(s, ctx, leadId);
  lead.status = status;
  lead.lastInteractionAt = isoNow(ctx);
  lead.updatedAt = lead.lastInteractionAt;
  return lead;
}

export function updateLeadInfo(s: DbState, ctx: Ctx, leadId: string, input: { firstName: string; lastName: string; phone: string }): Lead {
  const { lead } = requireLead(s, ctx, leadId);
  lead.firstName = stripHtml(input.firstName).trim();
  lead.lastName = stripHtml(input.lastName).trim();
  lead.phone = stripHtml(input.phone).trim();
  lead.updatedAt = isoNow(ctx);
  return lead;
}

export function addNote(s: DbState, ctx: Ctx, leadId: string, content: string): LeadNote {
  const { lead } = requireLead(s, ctx, leadId);
  const at = isoNow(ctx);
  const note: LeadNote = { id: newId(), leadId: lead.id, content: stripHtml(content).trim(), createdAt: at, updatedAt: at };
  s.leadNotes.push(note);
  lead.lastInteractionAt = at;
  return note;
}

export function deleteNote(s: DbState, ctx: Ctx, noteId: string): void {
  const business = requireBusiness(s, ctx);
  const note = s.leadNotes.find((n) => n.id === noteId);
  const lead = note && s.leads.find((l) => l.id === note.leadId);
  if (!note || !canManageLead(business, lead)) throw notFound("Note introuvable.");
  s.leadNotes = s.leadNotes.filter((n) => n.id !== noteId);
}

export function addLeadTag(s: DbState, ctx: Ctx, leadId: string, name: string): Tag {
  const { business, lead } = requireLead(s, ctx, leadId);
  const tag = ensureTag(s, business, name, ctx.now);
  attachTag(s, lead, tag);
  return tag;
}

export function removeLeadTag(s: DbState, ctx: Ctx, leadId: string, tagId: string): void {
  const { business, lead } = requireLead(s, ctx, leadId);
  const tag = s.tags.find((t) => t.id === tagId);
  if (!canManageTag(business, tag)) throw notFound("Tag introuvable.");
  s.leadTags = s.leadTags.filter((lt) => !(lt.leadId === lead.id && lt.tagId === tag.id));
}

/**
 * Droit à l'effacement (PRD §12) : le contact, ses notes, tags et consentements sont supprimés ; ses participations
 * sont ANONYMISÉES (lien retiré) pour que les statistiques du quiz restent justes.
 */
export function deleteLead(s: DbState, ctx: Ctx, leadId: string): void {
  const { lead } = requireLead(s, ctx, leadId);
  for (const sub of s.quizSubmissions) if (sub.leadId === lead.id) sub.leadId = null;
  s.leadSubmissions = s.leadSubmissions.filter((ls) => ls.leadId !== lead.id);
  s.leadNotes = s.leadNotes.filter((n) => n.leadId !== lead.id);
  s.leadTags = s.leadTags.filter((lt) => lt.leadId !== lead.id);
  s.leads = s.leads.filter((l) => l.id !== lead.id);
}
