import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { normalizeEmail, slugify } from "@/lib/utils/text";
import { conflict, validation, notFound } from "@/server/errors";
import type { DbState } from "@/server/db/store";
import { newId, newToken, sha256 } from "@/server/ids";
import type { Business, User } from "@/types/domain";

/** Comptes et mots de passe (PRD §6.1). Simulé : remplacé par Better Auth lors de la phase persistance. */
const RESET_TTL_MS = 60 * 60 * 1000;
const VERIFY_TTL_MS = 7 * 24 * 3600 * 1000;

export function uniqueBusinessSlug(s: Readonly<DbState>, base: string): string {
  const root = slugify(base) || "mon-activite";
  let slug = root;
  let i = 2;
  while (s.businesses.some((b) => b.slug === slug) || s.reserved?.businessSlugs.includes(slug)) slug = `${root}-${i++}`;
  return slug;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

/** Crée le compte ET son espace professionnel (un utilisateur = un espace). */
export function register(s: DbState, input: RegisterInput, now = new Date()): { user: User; business: Business; verifyToken: string } {
  const email = normalizeEmail(input.email);
  if (s.users.some((u) => u.email === email)) throw conflict("Un compte existe déjà avec cette adresse email.", { email: "Adresse déjà utilisée." });
  const at = now.toISOString();
  const user: User = { id: newId(), email, role: "user", lastLoginAt: null, firstName: input.firstName.trim(), lastName: input.lastName.trim(), emailVerifiedAt: null, createdAt: at, updatedAt: at };
  s.users.push(user);
  s.credentials.push({ userId: user.id, passwordHash: hashPassword(input.password) });
  const business: Business = {
    id: newId(),
    ownerId: user.id,
    name: `${user.firstName} ${user.lastName}`,
    slug: uniqueBusinessSlug(s, `${user.firstName} ${user.lastName}`),
    description: "",
    industry: "",
    activityType: "autre",
    managerName: `${user.firstName} ${user.lastName}`,
    contactEmail: email,
    logoUrl: null,
    website: "",
    whatsapp: "",
    bookingUrl: "",
    offers: [],
    plan: "free",
    status: "active",
    suspendedAt: null,
    suspensionReason: "",
    onboardingCompletedAt: null,
    createdAt: at,
    updatedAt: at,
  };
  s.businesses.push(business);
  const verifyToken = issueToken(s, user.id, "verify_email", VERIFY_TTL_MS, now);
  return { user, business, verifyToken };
}

function issueToken(s: DbState, userId: string, kind: "reset_password" | "verify_email", ttl: number, now: Date): string {
  const token = newToken();
  s.tokens = s.tokens.filter((t) => !(t.userId === userId && t.kind === kind));
  s.tokens.push({ tokenHash: sha256(token), userId, kind, expiresAt: new Date(now.getTime() + ttl).toISOString(), usedAt: null });
  return token;
}

/** Vérifie les identifiants. Message volontairement identique que l'email existe ou non (pas d'énumération de comptes). */
export function authenticate(s: Readonly<DbState>, emailRaw: string, password: string): User | null {
  const user = s.users.find((u) => u.email === normalizeEmail(emailRaw));
  const cred = user && s.credentials.find((c) => c.userId === user.id);
  // Calcul factice si le compte n'existe pas : temps de réponse comparable.
  if (!user || !cred) {
    verifyPassword(password, hashPassword("dummy-password-1"));
    return null;
  }
  return verifyPassword(password, cred.passwordHash) ? user : null;
}

/** Retourne un jeton si le compte existe (null sinon) ; l'appelant répond toujours la même chose à l'utilisateur. */
export function requestPasswordReset(s: DbState, emailRaw: string, now = new Date()): string | null {
  const user = s.users.find((u) => u.email === normalizeEmail(emailRaw));
  return user ? issueToken(s, user.id, "reset_password", RESET_TTL_MS, now) : null;
}

function consumeToken(s: DbState, token: string, kind: "reset_password" | "verify_email", now: Date) {
  const h = sha256(token);
  const row = s.tokens.find((t) => t.tokenHash === h && t.kind === kind);
  if (!row || row.usedAt || new Date(row.expiresAt) <= now) throw validation("Ce lien est invalide ou a expiré.");
  row.usedAt = now.toISOString();
  return row;
}

export function resetPassword(s: DbState, token: string, newPassword: string, now = new Date()): void {
  const row = consumeToken(s, token, "reset_password", now);
  const cred = s.credentials.find((c) => c.userId === row.userId);
  if (!cred) throw notFound("Compte introuvable.");
  cred.passwordHash = hashPassword(newPassword);
  // Toutes les sessions existantes sont révoquées.
  s.sessions = s.sessions.filter((x) => x.userId !== row.userId);
}

export function verifyEmail(s: DbState, token: string, now = new Date()): void {
  const row = consumeToken(s, token, "verify_email", now);
  const user = s.users.find((u) => u.id === row.userId);
  if (user) user.emailVerifiedAt = now.toISOString();
}

export function isResetTokenValid(s: Readonly<DbState>, token: string, now = new Date()): boolean {
  const h = sha256(token);
  const row = s.tokens.find((t) => t.tokenHash === h && t.kind === "reset_password");
  return !!row && !row.usedAt && new Date(row.expiresAt) > now;
}

export function updateProfile(s: DbState, userId: string, input: { firstName: string; lastName: string }, now = new Date()): User {
  const user = s.users.find((u) => u.id === userId);
  if (!user) throw notFound("Compte introuvable.");
  user.firstName = input.firstName.trim();
  user.lastName = input.lastName.trim();
  user.updatedAt = now.toISOString();
  return user;
}

export function changePassword(s: DbState, userId: string, current: string, next: string, keepSessionHash: string | null): void {
  const cred = s.credentials.find((c) => c.userId === userId);
  if (!cred || !verifyPassword(current, cred.passwordHash)) throw validation("Mot de passe actuel incorrect.", { currentPassword: "Mot de passe incorrect." });
  cred.passwordHash = hashPassword(next);
  s.sessions = s.sessions.filter((x) => x.userId !== userId || x.tokenHash === keepSessionHash);
}
