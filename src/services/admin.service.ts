import { allPlans, planDef, PLAN_IDS } from "@/lib/constants/plans";
import { isoNow, type Ctx } from "@/server/context";
import type { DbState } from "@/server/db/store";
import { can, isStaff, type Permission } from "@/lib/permissions/staff";
import { forbidden, invalidState, notFound, validation } from "@/server/errors";
import { newId, newToken, sha256 } from "@/server/ids";
import type { AuditAction, AuditLog, Business, BusinessStatus, PlanId, PlanOverride, PlatformSettings, Quiz, QuizStatus, User } from "@/types/domain";

/**
 * Back-office de la plateforme. TOUTES les fonctions vérifient le rôle administrateur ici, dans le service (et pas
 * seulement dans la page) : un oubli côté interface ne peut pas ouvrir l'accès. Toute modification est consignée
 * dans le journal d'audit, dans la même transaction que l'action.
 */
export function requireStaff(s: Readonly<DbState>, ctx: Ctx, permission: Permission = "view"): User {
  const user = s.users.find((u) => u.id === ctx.userId);
  if (!user || user.disabledAt || !can(user.role, permission)) throw forbidden(user && isStaff(user.role) ? "Votre rôle ne permet pas cette action." : "Accès réservé à l'équipe de la plateforme.");
  return user;
}

export function recordAudit(s: DbState, ctx: Ctx, admin: User, action: AuditAction, target: { type: AuditLog["targetType"]; id: string; label: string }, details = "") {
  s.auditLogs.push({ id: newId(), actorId: admin.id, actorEmail: admin.email, action, targetType: target.type, targetId: target.id, targetLabel: target.label, details, createdAt: isoNow(ctx) });
}

function businessOrThrow(s: Readonly<DbState>, businessId: string): Business {
  const b = s.businesses.find((x) => x.id === businessId);
  if (!b) throw notFound("Compte introuvable.");
  return b;
}

const monthStart = (now: Date) => new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
const dayKey = (iso: string) => iso.slice(0, 10);
const pct = (used: number, limit: number | null) => (limit === null || limit === 0 ? 0 : used / limit);

// ---- Comptes (lecture) ------------------------------------------------------------------------------------------

export interface AccountRow {
  businessId: string;
  ownerId: string;
  name: string;
  ownerName: string;
  email: string;
  plan: PlanId;
  status: BusinessStatus;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  activeQuizzes: number;
  publishedQuizzes: number;
  submissionsMonth: number;
  submissionsLimit: number | null;
  leads: number;
}

function accountRow(s: Readonly<DbState>, b: Business, now: Date): AccountRow {
  const owner = s.users.find((u) => u.id === b.ownerId)!;
  const start = monthStart(now);
  const quizzes = s.quizzes.filter((q) => q.businessId === b.id);
  return {
    businessId: b.id,
    ownerId: owner.id,
    name: b.name,
    ownerName: `${owner.firstName} ${owner.lastName}`.trim(),
    email: owner.email,
    plan: b.plan,
    status: b.status,
    emailVerified: !!owner.emailVerifiedAt,
    createdAt: b.createdAt,
    lastLoginAt: owner.lastLoginAt,
    activeQuizzes: quizzes.filter((q) => q.status !== "archived").length,
    publishedQuizzes: quizzes.filter((q) => q.status === "published").length,
    submissionsMonth: s.quizSubmissions.filter((x) => x.businessId === b.id && x.startedAt >= start).length,
    submissionsLimit: planDef(s, b.plan).maxMonthlySubmissions,
    leads: s.leads.filter((l) => l.businessId === b.id).length,
  };
}

export interface AccountFilters {
  q?: string;
  plan?: PlanId | "";
  status?: BusinessStatus | "";
  sort?: "recent" | "name" | "usage";
  page?: number;
  pageSize?: number;
}

export interface Page<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

function paginate<T>(rows: T[], page = 1, pageSize = 15): Page<T> {
  const size = Math.min(Math.max(pageSize, 1), 100);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(Math.max(page, 1), pages);
  return { rows: rows.slice((p - 1) * size, p * size), total: rows.length, page: p, pageSize: size, pages };
}

export function listAccounts(s: Readonly<DbState>, ctx: Ctx, f: AccountFilters = {}): Page<AccountRow> {
  requireStaff(s, ctx, "view");
  const q = f.q?.trim().toLowerCase();
  let rows = s.businesses.map((b) => accountRow(s, b, ctx.now));
  if (q) rows = rows.filter((r) => [r.name, r.ownerName, r.email].some((v) => v.toLowerCase().includes(q)));
  if (f.plan) rows = rows.filter((r) => r.plan === f.plan);
  if (f.status) rows = rows.filter((r) => r.status === f.status);
  const sort = f.sort ?? "recent";
  rows.sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name, "fr") : sort === "usage" ? pct(b.submissionsMonth, b.submissionsLimit) - pct(a.submissionsMonth, a.submissionsLimit) : b.createdAt.localeCompare(a.createdAt)));
  return paginate(rows, f.page, f.pageSize);
}

export interface AccountDetail {
  account: AccountRow;
  business: Business;
  owner: Pick<User, "id" | "email" | "firstName" | "lastName" | "role" | "createdAt" | "lastLoginAt" | "emailVerifiedAt">;
  plan: ReturnType<typeof planDef>;
  usage: { aiMonth: number; sessions: number };
  quizzes: Array<{ id: string; title: string; slug: string; status: QuizStatus; participants: number; updatedAt: string }>;
  audit: AuditLog[];
}

export function getAccount(s: Readonly<DbState>, ctx: Ctx, businessId: string): AccountDetail {
  requireStaff(s, ctx, "view");
  const business = businessOrThrow(s, businessId);
  const owner = s.users.find((u) => u.id === business.ownerId)!;
  const start = monthStart(ctx.now);
  return {
    account: accountRow(s, business, ctx.now),
    business,
    owner: { id: owner.id, email: owner.email, firstName: owner.firstName, lastName: owner.lastName, role: owner.role, createdAt: owner.createdAt, lastLoginAt: owner.lastLoginAt, emailVerifiedAt: owner.emailVerifiedAt },
    plan: planDef(s, business.plan),
    usage: { aiMonth: s.aiGenerations.filter((g) => g.businessId === business.id && g.createdAt >= start && g.status === "success").length, sessions: s.sessions.filter((x) => x.userId === owner.id && new Date(x.expiresAt) > ctx.now).length },
    quizzes: s.quizzes
      .filter((q) => q.businessId === business.id)
      .map((q) => ({ id: q.id, title: q.config.title, slug: q.slug, status: q.status, participants: s.quizSubmissions.filter((x) => x.quizId === q.id && x.status === "completed").length, updatedAt: q.updatedAt }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    audit: s.auditLogs.filter((l) => l.targetType === "account" && l.targetId === business.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10),
  };
}

// ---- Comptes (actions) ------------------------------------------------------------------------------------------

const label = (b: Business) => b.name;

export function setAccountPlan(s: DbState, ctx: Ctx, businessId: string, plan: PlanId): Business {
  const admin = requireStaff(s, ctx, "account.billing");
  if (!PLAN_IDS.includes(plan)) throw validation("Offre inconnue.");
  const b = businessOrThrow(s, businessId);
  if (b.plan === plan) return b;
  const from = b.plan;
  b.plan = plan;
  b.updatedAt = isoNow(ctx);
  recordAudit(s, ctx, admin, "account.plan_changed", { type: "account", id: b.id, label: label(b) }, `${planDef(s, from).name} → ${planDef(s, plan).name}`);
  return b;
}

export function suspendAccount(s: DbState, ctx: Ctx, businessId: string, reason: string): Business {
  const admin = requireStaff(s, ctx, "account.support");
  const b = businessOrThrow(s, businessId);
  const trimmed = reason.trim();
  if (trimmed.length < 3) throw validation("Indiquez le motif de la suspension.", { reason: "Motif obligatoire." });
  if (b.ownerId === admin.id) throw invalidState("Vous ne pouvez pas suspendre votre propre compte.");
  if (b.status === "suspended") return b;
  b.status = "suspended";
  b.suspendedAt = isoNow(ctx);
  b.suspensionReason = trimmed.slice(0, 300);
  b.updatedAt = b.suspendedAt;
  recordAudit(s, ctx, admin, "account.suspended", { type: "account", id: b.id, label: label(b) }, trimmed.slice(0, 300));
  return b;
}

export function reactivateAccount(s: DbState, ctx: Ctx, businessId: string): Business {
  const admin = requireStaff(s, ctx, "account.support");
  const b = businessOrThrow(s, businessId);
  if (b.status === "active") return b;
  b.status = "active";
  b.suspendedAt = null;
  b.suspensionReason = "";
  b.updatedAt = isoNow(ctx);
  recordAudit(s, ctx, admin, "account.reactivated", { type: "account", id: b.id, label: label(b) });
  return b;
}

export function markEmailVerified(s: DbState, ctx: Ctx, businessId: string): void {
  const admin = requireStaff(s, ctx, "account.support");
  const b = businessOrThrow(s, businessId);
  const owner = s.users.find((u) => u.id === b.ownerId)!;
  if (owner.emailVerifiedAt) return;
  owner.emailVerifiedAt = isoNow(ctx);
  recordAudit(s, ctx, admin, "account.email_verified", { type: "account", id: b.id, label: label(b) });
}

/** Émet un lien de réinitialisation valable 1 h (affiché à l'administrateur : aucun email n'est envoyé en simulation). */
export function issueResetLink(s: DbState, ctx: Ctx, businessId: string): string {
  const admin = requireStaff(s, ctx, "account.support");
  const b = businessOrThrow(s, businessId);
  const token = newToken();
  s.tokens = s.tokens.filter((t) => !(t.userId === b.ownerId && t.kind === "reset_password"));
  s.tokens.push({ tokenHash: sha256(token), userId: b.ownerId, kind: "reset_password", expiresAt: new Date(ctx.now.getTime() + 3600_000).toISOString(), usedAt: null });
  recordAudit(s, ctx, admin, "account.reset_link_issued", { type: "account", id: b.id, label: label(b) });
  return `/reset-password/${token}`;
}

export function revokeSessions(s: DbState, ctx: Ctx, businessId: string): number {
  const admin = requireStaff(s, ctx, "account.support");
  const b = businessOrThrow(s, businessId);
  const before = s.sessions.length;
  s.sessions = s.sessions.filter((x) => x.userId !== b.ownerId);
  const n = before - s.sessions.length;
  recordAudit(s, ctx, admin, "account.sessions_revoked", { type: "account", id: b.id, label: label(b) }, `${n} session${n > 1 ? "s" : ""}`);
  return n;
}

export interface DeletionPreview {
  quizzes: number;
  submissions: number;
  leads: number;
}

export function previewAccountDeletion(s: Readonly<DbState>, ctx: Ctx, businessId: string): DeletionPreview {
  requireStaff(s, ctx, "account.delete");
  const b = businessOrThrow(s, businessId);
  return { quizzes: s.quizzes.filter((q) => q.businessId === b.id).length, submissions: s.quizSubmissions.filter((x) => x.businessId === b.id).length, leads: s.leads.filter((l) => l.businessId === b.id).length };
}

/** Suppression définitive et complète d'un compte client (droit à l'effacement). L'email saisi doit correspondre. */
export function deleteAccount(s: DbState, ctx: Ctx, businessId: string, confirmEmail: string): void {
  const admin = requireStaff(s, ctx, "account.delete");
  const b = businessOrThrow(s, businessId);
  const owner = s.users.find((u) => u.id === b.ownerId)!;
  if (owner.id === admin.id) throw invalidState("Vous ne pouvez pas supprimer votre propre compte.");
  if (confirmEmail.trim().toLowerCase() !== owner.email) throw validation("L'adresse saisie ne correspond pas.", { confirm: "Adresse différente." });
  const quizIds = new Set(s.quizzes.filter((q) => q.businessId === b.id).map((q) => q.id));
  const leadIds = new Set(s.leads.filter((l) => l.businessId === b.id).map((l) => l.id));
  const tagIds = new Set(s.tags.filter((t) => t.businessId === b.id).map((t) => t.id));
  const subIds = new Set(s.quizSubmissions.filter((x) => x.businessId === b.id).map((x) => x.id));
  s.leadSubmissions = s.leadSubmissions.filter((ls) => !subIds.has(ls.submissionId) && !leadIds.has(ls.leadId));
  s.leadTags = s.leadTags.filter((lt) => !leadIds.has(lt.leadId) && !tagIds.has(lt.tagId));
  s.leadNotes = s.leadNotes.filter((n) => !leadIds.has(n.leadId));
  s.leads = s.leads.filter((l) => l.businessId !== b.id);
  s.tags = s.tags.filter((t) => t.businessId !== b.id);
  s.quizSubmissions = s.quizSubmissions.filter((x) => x.businessId !== b.id);
  s.quizVisits = s.quizVisits.filter((v) => !quizIds.has(v.quizId));
  s.quizVersions = s.quizVersions.filter((v) => !quizIds.has(v.quizId));
  s.quizzes = s.quizzes.filter((q) => q.businessId !== b.id);
  s.publications = s.publications.filter((p) => p.businessId !== b.id);
  s.aiGenerations = s.aiGenerations.filter((g) => g.businessId !== b.id);
  s.businesses = s.businesses.filter((x) => x.id !== b.id);
  s.sessions = s.sessions.filter((x) => x.userId !== owner.id);
  s.tokens = s.tokens.filter((t) => t.userId !== owner.id);
  s.credentials = s.credentials.filter((c) => c.userId !== owner.id);
  s.users = s.users.filter((u) => u.id !== owner.id);
  recordAudit(s, ctx, admin, "account.deleted", { type: "account", id: b.id, label: label(b) }, owner.email);
}

// ---- Quiz (modération) ------------------------------------------------------------------------------------------

export interface AdminQuizRow {
  id: string;
  title: string;
  slug: string;
  status: QuizStatus;
  businessId: string;
  businessName: string;
  accountStatus: BusinessStatus;
  participants: number;
  leads: number;
  updatedAt: string;
  publishedAt: string | null;
}

export function listAllQuizzes(s: Readonly<DbState>, ctx: Ctx, f: { q?: string; status?: QuizStatus | ""; page?: number; pageSize?: number } = {}): Page<AdminQuizRow> {
  requireStaff(s, ctx, "view");
  const q = f.q?.trim().toLowerCase();
  let rows: AdminQuizRow[] = s.quizzes.map((quiz) => {
    const b = s.businesses.find((x) => x.id === quiz.businessId)!;
    const subs = s.quizSubmissions.filter((x) => x.quizId === quiz.id);
    return { id: quiz.id, title: quiz.config.title, slug: quiz.slug, status: quiz.status, businessId: b.id, businessName: b.name, accountStatus: b.status, participants: subs.filter((x) => x.status === "completed").length, leads: new Set(subs.filter((x) => x.leadId).map((x) => x.leadId)).size, updatedAt: quiz.updatedAt, publishedAt: quiz.publishedAt };
  });
  if (q) rows = rows.filter((r) => [r.title, r.slug, r.businessName].some((v) => v.toLowerCase().includes(q)));
  if (f.status) rows = rows.filter((r) => r.status === f.status);
  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return paginate(rows, f.page, f.pageSize);
}

function quizOrThrow(s: Readonly<DbState>, quizId: string): Quiz {
  const q = s.quizzes.find((x) => x.id === quizId);
  if (!q) throw notFound("Quiz introuvable.");
  return q;
}

/** Modération : coupe un quiz public (contenu inapproprié, abus). Les données du client sont conservées. */
export function moderateQuiz(s: DbState, ctx: Ctx, quizId: string, action: "unpublish" | "archive", reason: string): Quiz {
  const admin = requireStaff(s, ctx, "quiz.moderate");
  const quiz = quizOrThrow(s, quizId);
  const trimmed = reason.trim();
  if (trimmed.length < 3) throw validation("Indiquez le motif de la modération.", { reason: "Motif obligatoire." });
  const at = isoNow(ctx);
  if (action === "unpublish") {
    if (quiz.status !== "published") throw invalidState("Ce quiz n'est pas publié.");
    quiz.status = "draft";
  } else {
    if (quiz.status === "archived") throw invalidState("Ce quiz est déjà archivé.");
    quiz.status = "archived";
    quiz.archivedAt = at;
  }
  quiz.updatedAt = at;
  recordAudit(s, ctx, admin, action === "unpublish" ? "quiz.unpublished" : "quiz.archived", { type: "quiz", id: quiz.id, label: quiz.config.title }, trimmed.slice(0, 300));
  return quiz;
}

// ---- Vue d'ensemble ---------------------------------------------------------------------------------------------

export interface WatchItem {
  businessId: string;
  name: string;
  reason: string;
  tone: "warning" | "danger" | "info";
}

export type RangeKey = "7" | "30" | "90" | "all" | "custom";

export interface Range {
  key: RangeKey;
  from: Date;
  to: Date;
  label: string;
  /** Période précédente de même durée (absente pour « tout »). */
  previous: { from: Date; to: Date } | null;
}

const DAY = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const parseDay = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00`).getTime()) ? new Date(`${v}T00:00:00`) : null);
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

/** Période d'analyse : 7, 30 ou 90 derniers jours, tout l'historique, ou une période personnalisée (dates incluses). Toute valeur invalide retombe sur 30 jours. */
export function resolveRange(s: Readonly<DbState>, input: { range?: string; from?: string; to?: string }, now = new Date()): Range {
  const today = endOfDay(now);
  const lastDays = (n: number): Range => {
    const from = startOfDay(new Date(now.getTime() - (n - 1) * DAY));
    return { key: String(n) as RangeKey, from, to: today, label: `${n} derniers jours`, previous: { from: new Date(from.getTime() - n * DAY), to: new Date(from.getTime() - 1) } };
  };
  const key = input.range;
  if (key === "7" || key === "30" || key === "90") return lastDays(Number(key));
  if (key === "all") {
    const dates = [...s.businesses.map((b) => b.createdAt), ...s.quizSubmissions.map((x) => x.startedAt)].sort();
    const first = dates[0] ? startOfDay(new Date(dates[0])) : startOfDay(now);
    return { key: "all", from: first, to: today, label: "Tout l'historique", previous: null };
  }
  const f = parseDay(input.from);
  const t = parseDay(input.to);
  if (key === "custom" || f || t) {
    if (f || t) {
      let from = f ?? new Date(2020, 0, 1);
      let to = endOfDay(t ?? now);
      if (to > today) to = today;
      if (from > to) from = startOfDay(to);
      const span = to.getTime() - from.getTime() + 1;
      return { key: "custom", from, to, label: `Du ${fmt(from)} au ${fmt(to)}`, previous: { from: new Date(from.getTime() - span), to: new Date(from.getTime() - 1) } };
    }
  }
  return lastDays(30);
}

export interface Overview {
  range: { key: RangeKey; label: string; /** Jours locaux (AAAA-MM-JJ). */ fromDay: string; toDay: string; hasPrevious: boolean };
  kpis: { accounts: number; newAccounts: number; previousNewAccounts: number | null; activeAccounts: number; publishedQuizzes: number; submissions: number; previousSubmissions: number | null; leads: number; aiGenerations: number; suspended: number };
  series: Array<{ date: string; signups: number; submissions: number }>;
  bucketDays: number;
  plans: Array<{ plan: PlanId; name: string; count: number }>;
  watch: WatchItem[];
  recent: AuditLog[];
}

export function getOverview(s: Readonly<DbState>, ctx: Ctx, range?: Range): Overview {
  requireStaff(s, ctx, "view");
  const now = ctx.now;
  const r = range ?? resolveRange(s, { range: "30" }, now);
  const from = r.from.toISOString();
  const to = r.to.toISOString();
  const inRange = (iso: string) => iso >= from && iso <= to;
  const inPrev = (iso: string) => !!r.previous && iso >= r.previous.from.toISOString() && iso <= r.previous.to.toISOString();
  const subs = s.quizSubmissions.filter((x) => inRange(x.startedAt));
  const active = new Set(subs.map((x) => x.businessId));

  // Courbe : un point par jour jusqu'à ~3 mois, puis par semaine, puis par période de 30 jours (lisibilité sur « tout »).
  const totalDays = Math.max(1, Math.round((startOfDay(r.to).getTime() - startOfDay(r.from).getTime()) / DAY) + 1);
  const bucketDays = totalDays <= 92 ? 1 : totalDays <= 400 ? 7 : 30;
  const buckets = Math.ceil(totalDays / bucketDays);
  const series: Overview["series"] = Array.from({ length: buckets }, (_, i) => ({ date: ymd(new Date(r.from.getFullYear(), r.from.getMonth(), r.from.getDate() + i * bucketDays)), signups: 0, submissions: 0 }));
  const indexOf = (iso: string) => Math.min(buckets - 1, Math.floor((startOfDay(new Date(iso)).getTime() - startOfDay(r.from).getTime()) / (bucketDays * DAY)));
  for (const b of s.businesses) if (inRange(b.createdAt)) series[indexOf(b.createdAt)]!.signups++;
  for (const x of subs) series[indexOf(x.startedAt)]!.submissions++;

  const watch: WatchItem[] = [];
  for (const b of s.businesses) {
    const row = accountRow(s, b, now);
    if (b.status === "suspended") watch.push({ businessId: b.id, name: b.name, reason: `Suspendu : ${b.suspensionReason || "sans motif"}`, tone: "danger" });
    else if (row.submissionsLimit !== null && pct(row.submissionsMonth, row.submissionsLimit) >= 0.8) watch.push({ businessId: b.id, name: b.name, reason: `${row.submissionsMonth}/${row.submissionsLimit} participations ce mois-ci : candidat à une offre supérieure`, tone: "warning" });
    else if (!row.emailVerified && now.getTime() - new Date(b.createdAt).getTime() > 7 * DAY) watch.push({ businessId: b.id, name: b.name, reason: "Email non confirmé depuis plus de 7 jours", tone: "info" });
  }

  return {
    range: { key: r.key, label: r.label, fromDay: ymd(r.from), toDay: ymd(r.to), hasPrevious: !!r.previous },
    kpis: {
      accounts: s.businesses.filter((b) => b.createdAt <= to).length,
      newAccounts: s.businesses.filter((b) => inRange(b.createdAt)).length,
      previousNewAccounts: r.previous ? s.businesses.filter((b) => inPrev(b.createdAt)).length : null,
      activeAccounts: active.size,
      publishedQuizzes: s.quizzes.filter((q) => q.status === "published").length,
      submissions: subs.length,
      previousSubmissions: r.previous ? s.quizSubmissions.filter((x) => inPrev(x.startedAt)).length : null,
      leads: s.leads.filter((l) => inRange(l.createdAt)).length,
      aiGenerations: s.aiGenerations.filter((g) => inRange(g.createdAt) && g.status === "success").length,
      suspended: s.businesses.filter((b) => b.status === "suspended").length,
    },
    series,
    bucketDays,
    plans: allPlans(s).map((p) => ({ plan: p.id, name: p.name, count: s.businesses.filter((b) => b.plan === p.id).length })),
    watch: watch.slice(0, 8),
    recent: [...s.auditLogs].reverse().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
  };
}

// ---- Journal d'audit --------------------------------------------------------------------------------------------

export function listAudit(s: Readonly<DbState>, ctx: Ctx, f: { action?: string; q?: string; page?: number; pageSize?: number } = {}): Page<AuditLog> {
  requireStaff(s, ctx, "view");
  const q = f.q?.trim().toLowerCase();
  // Inversé avant le tri (stable) : à date égale, l'événement le plus récent passe en premier.
  let rows = [...s.auditLogs].reverse();
  if (f.action) rows = rows.filter((l) => l.action.startsWith(f.action!));
  if (q) rows = rows.filter((l) => [l.targetLabel, l.actorEmail, l.details].some((v) => v.toLowerCase().includes(q)));
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return paginate(rows, f.page, f.pageSize ?? 20);
}

// ---- Réglages et offres -----------------------------------------------------------------------------------------

export function getPlatformSettings(s: Readonly<DbState>, ctx: Ctx): PlatformSettings {
  requireStaff(s, ctx, "settings.manage");
  return structuredClone(s.settings);
}

export function updatePlatformSettings(s: DbState, ctx: Ctx, input: { registrationsOpen: boolean; announcement: string }): PlatformSettings {
  const admin = requireStaff(s, ctx, "settings.manage");
  const changes: string[] = [];
  if (s.settings.registrationsOpen !== input.registrationsOpen) changes.push(input.registrationsOpen ? "Inscriptions ouvertes" : "Inscriptions fermées");
  const announcement = input.announcement.trim().slice(0, 240);
  if (s.settings.announcement !== announcement) changes.push(announcement ? "Annonce modifiée" : "Annonce retirée");
  s.settings.registrationsOpen = input.registrationsOpen;
  s.settings.announcement = announcement;
  if (changes.length) recordAudit(s, ctx, admin, "settings.updated", { type: "settings", id: "platform", label: "Réglages de la plateforme" }, changes.join(" · "));
  return s.settings;
}

const quota = (v: number | null | undefined, field: string): number | null => {
  if (v === null || v === undefined) return null;
  if (!Number.isInteger(v) || v < 0 || v > 1_000_000) throw validation("Valeur invalide : entier positif attendu, ou vide pour illimité.", { [field]: "Entier positif ou vide." });
  return v;
};

export function updatePlan(s: DbState, ctx: Ctx, plan: PlanId, input: { maxActiveQuizzes: number | null; maxMonthlySubmissions: number | null; maxMonthlyAiGenerations: number | null; priceLabel: string }): PlanOverride {
  const admin = requireStaff(s, ctx, "plans.configure");
  if (!PLAN_IDS.includes(plan)) throw validation("Offre inconnue.");
  const priceLabel = input.priceLabel.trim();
  if (!priceLabel || priceLabel.length > 40) throw validation("Le prix affiché est obligatoire (40 caractères maximum).", { priceLabel: "Texte de prix obligatoire." });
  const next: PlanOverride = { maxActiveQuizzes: quota(input.maxActiveQuizzes, "maxActiveQuizzes"), maxMonthlySubmissions: quota(input.maxMonthlySubmissions, "maxMonthlySubmissions"), maxMonthlyAiGenerations: quota(input.maxMonthlyAiGenerations, "maxMonthlyAiGenerations"), priceLabel };
  const prev = planDef(s, plan);
  s.settings.planOverrides[plan] = next;
  const diff = (["maxActiveQuizzes", "maxMonthlySubmissions", "maxMonthlyAiGenerations", "priceLabel"] as const).filter((k) => prev[k] !== next[k]).map((k) => `${k} : ${prev[k] ?? "illimité"} → ${next[k] ?? "illimité"}`);
  if (diff.length) recordAudit(s, ctx, admin, "plan.updated", { type: "plan", id: plan, label: prev.name }, diff.join(" · "));
  return next;
}

export function resetPlan(s: DbState, ctx: Ctx, plan: PlanId): void {
  const admin = requireStaff(s, ctx, "plans.configure");
  if (!s.settings.planOverrides[plan]) return;
  delete s.settings.planOverrides[plan];
  recordAudit(s, ctx, admin, "plan.updated", { type: "plan", id: plan, label: planDef(s, plan).name }, "Valeurs par défaut rétablies");
}
