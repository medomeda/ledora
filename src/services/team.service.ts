import { hashPassword } from "@/lib/auth/password";
import { isStaff, STAFF_ROLES, type StaffRole } from "@/lib/permissions/staff";
import { normalizeEmail } from "@/lib/utils/text";
import { isoNow, type Ctx } from "@/server/context";
import type { DbState } from "@/server/db/store";
import { conflict, invalidState, notFound, validation } from "@/server/errors";
import { newId, newToken, sha256 } from "@/server/ids";
import { recordAudit, requireStaff } from "@/services/admin.service";
import type { User } from "@/types/domain";

/**
 * Équipe de la plateforme (collaborateurs de l'administration). Réservé aux administrateurs (`team.manage`).
 * Une invitation crée l'accès SANS mot de passe utilisable : le collaborateur le choisit via un lien valable 7 jours
 * (même mécanisme que la réinitialisation). Aucun email n'est envoyé en simulation : le lien est remis à l'inviteur.
 */
const INVITE_TTL_MS = 7 * 24 * 3600 * 1000;

export type TeamStatus = "active" | "invited" | "disabled";

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
  status: TeamStatus;
  lastLoginAt: string | null;
  createdAt: string;
  isSelf: boolean;
}

const statusOf = (u: User): TeamStatus => (u.disabledAt ? "disabled" : u.lastLoginAt ? "active" : "invited");

export function listTeam(s: Readonly<DbState>, ctx: Ctx): TeamMember[] {
  requireStaff(s, ctx, "team.manage");
  return s.users
    .filter((u) => isStaff(u.role))
    .map((u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role as StaffRole, status: statusOf(u), lastLoginAt: u.lastLoginAt, createdAt: u.createdAt, isSelf: u.id === ctx.userId }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function member(s: Readonly<DbState>, userId: string): User {
  const u = s.users.find((x) => x.id === userId);
  if (!u || !isStaff(u.role)) throw notFound("Collaborateur introuvable.");
  return u;
}

/** Il doit toujours rester au moins un administrateur actif. */
function assertAdminRemains(s: Readonly<DbState>, exceptUserId: string) {
  if (!s.users.some((u) => u.id !== exceptUserId && u.role === "admin" && !u.disabledAt)) throw invalidState("Il doit rester au moins un administrateur actif.");
}

function issueInvite(s: DbState, userId: string, now: Date): string {
  const token = newToken();
  s.tokens = s.tokens.filter((t) => !(t.userId === userId && t.kind === "reset_password"));
  s.tokens.push({ tokenHash: sha256(token), userId, kind: "reset_password", expiresAt: new Date(now.getTime() + INVITE_TTL_MS).toISOString(), usedAt: null });
  return `/reset-password/${token}`;
}

export function inviteCollaborator(s: DbState, ctx: Ctx, input: { firstName: string; lastName: string; email: string; role: StaffRole }): { user: User; link: string } {
  const admin = requireStaff(s, ctx, "team.manage");
  if (!STAFF_ROLES.includes(input.role)) throw validation("Rôle inconnu.", { role: "Rôle inconnu." });
  const email = normalizeEmail(input.email);
  if (s.users.some((u) => u.email === email)) throw conflict("Un compte existe déjà avec cette adresse email.", { email: "Adresse déjà utilisée." });
  const at = isoNow(ctx);
  const user: User = { id: newId(), email, role: input.role, lastLoginAt: null, disabledAt: null, firstName: input.firstName.trim(), lastName: input.lastName.trim(), emailVerifiedAt: null, createdAt: at, updatedAt: at };
  s.users.push(user);
  s.credentials.push({ userId: user.id, passwordHash: hashPassword(newToken()) }); // inutilisable tant que le lien n'est pas suivi
  const link = issueInvite(s, user.id, ctx.now);
  recordAudit(s, ctx, admin, "team.invited", { type: "team", id: user.id, label: `${user.firstName} ${user.lastName}`.trim() || email }, `${email} · ${input.role}`);
  return { user, link };
}

export function resendInvitation(s: DbState, ctx: Ctx, userId: string): string {
  const admin = requireStaff(s, ctx, "team.manage");
  const u = member(s, userId);
  if (statusOf(u) !== "invited") throw invalidState("Ce collaborateur s'est déjà connecté.");
  const link = issueInvite(s, u.id, ctx.now);
  recordAudit(s, ctx, admin, "team.invite_resent", { type: "team", id: u.id, label: u.email });
  return link;
}

export function changeMemberRole(s: DbState, ctx: Ctx, userId: string, role: StaffRole): void {
  const admin = requireStaff(s, ctx, "team.manage");
  const u = member(s, userId);
  if (!STAFF_ROLES.includes(role)) throw validation("Rôle inconnu.");
  if (u.id === admin.id) throw invalidState("Vous ne pouvez pas modifier votre propre rôle.");
  if (u.role === role) return;
  if (u.role === "admin") assertAdminRemains(s, u.id);
  const from = u.role;
  u.role = role;
  u.updatedAt = isoNow(ctx);
  recordAudit(s, ctx, admin, "team.role_changed", { type: "team", id: u.id, label: u.email }, `${from} → ${role}`);
}

/** Désactiver coupe l'accès immédiatement (sessions fermées) sans supprimer le collaborateur ni son historique. */
export function setMemberAccess(s: DbState, ctx: Ctx, userId: string, enabled: boolean): void {
  const admin = requireStaff(s, ctx, "team.manage");
  const u = member(s, userId);
  if (u.id === admin.id) throw invalidState("Vous ne pouvez pas désactiver votre propre accès.");
  if (enabled === !u.disabledAt) return;
  if (!enabled) {
    if (u.role === "admin") assertAdminRemains(s, u.id);
    u.disabledAt = isoNow(ctx);
    s.sessions = s.sessions.filter((x) => x.userId !== u.id);
  } else {
    u.disabledAt = null;
  }
  u.updatedAt = isoNow(ctx);
  recordAudit(s, ctx, admin, enabled ? "team.enabled" : "team.disabled", { type: "team", id: u.id, label: u.email });
}

export function removeCollaborator(s: DbState, ctx: Ctx, userId: string): void {
  const admin = requireStaff(s, ctx, "team.manage");
  const u = member(s, userId);
  if (u.id === admin.id) throw invalidState("Vous ne pouvez pas vous retirer vous-même.");
  if (u.role === "admin") assertAdminRemains(s, u.id);
  s.sessions = s.sessions.filter((x) => x.userId !== u.id);
  s.tokens = s.tokens.filter((t) => t.userId !== u.id);
  s.credentials = s.credentials.filter((c) => c.userId !== u.id);
  s.users = s.users.filter((x) => x.id !== u.id);
  recordAudit(s, ctx, admin, "team.removed", { type: "team", id: u.id, label: u.email }, u.role);
}
