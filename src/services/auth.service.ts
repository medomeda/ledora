import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { normalizeEmail, slugify } from "@/lib/utils/text";
import { conflict, notFound } from "@/server/errors";
import type { DbState } from "@/server/db/store";
import { newId, newToken } from "@/server/ids";
import type { Business, User } from "@/types/domain";

/**
 * Comptes et mots de passe (PRD §6.1). L'inscription est atomique (utilisateur + compte de connexion + espace) ;
 * la connexion, les sessions, la réinitialisation et le changement de mot de passe sont gérés par Better Auth
 * (lib/auth/auth.ts) sur les mêmes tables. Ce module garde les règles propres à Leadora.
 */
export const RESET_PREFIX = "reset-password:";

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

/** Crée le compte ET son espace professionnel (un utilisateur = un espace). Le mot de passe est stocké dans le compte de connexion Better Auth. */
export function register(s: DbState, input: RegisterInput, now = new Date()): { user: User; business: Business } {
  const email = normalizeEmail(input.email);
  if (s.users.some((u) => u.email === email)) throw conflict("Un compte existe déjà avec cette adresse email.", { email: "Adresse déjà utilisée." });
  const at = now.toISOString();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const user: User = { id: newId(), name: `${firstName} ${lastName}`.trim(), email, role: "user", lastLoginAt: null, disabledAt: null, firstName, lastName, emailVerified: false, createdAt: at, updatedAt: at };
  s.users.push(user);
  addCredential(s, user.id, hashPassword(input.password), now);
  const business: Business = {
    id: newId(),
    ownerId: user.id,
    name: user.name,
    slug: uniqueBusinessSlug(s, user.name),
    description: "",
    industry: "",
    activityType: "autre",
    managerName: user.name,
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
  return { user, business };
}

/** Compte de connexion « credential » (format attendu par Better Auth : accountId = id de l'utilisateur). */
export function addCredential(s: DbState, userId: string, passwordHash: string, now = new Date()) {
  const at = now.toISOString();
  s.accounts.push({ id: newId(), accountId: userId, providerId: "credential", userId, password: passwordHash, createdAt: at, updatedAt: at });
}

/**
 * Jeton de réinitialisation de mot de passe, au format de Better Auth (identifiant « reset-password:<jeton> », valeur = id de
 * l'utilisateur) : le lien émis ici est consommé par `auth.api.resetPassword`. Remplace le jeton précédent de cet utilisateur.
 */
export function issueResetToken(s: DbState, userId: string, ttlMs: number, now = new Date()): string {
  const token = newToken();
  s.verifications = s.verifications.filter((v) => !(v.value === userId && v.identifier.startsWith(RESET_PREFIX)));
  const at = now.toISOString();
  s.verifications.push({ id: newId(), identifier: `${RESET_PREFIX}${token}`, value: userId, expiresAt: new Date(now.getTime() + ttlMs).toISOString(), createdAt: at, updatedAt: at });
  return token;
}

/** Vérifie les identifiants (mêmes règles que la connexion Better Auth). Calcul factice si le compte n'existe pas : temps de réponse comparable. */
export function authenticate(s: Readonly<DbState>, emailRaw: string, password: string): User | null {
  const user = s.users.find((u) => u.email === normalizeEmail(emailRaw));
  const cred = user && s.accounts.find((a) => a.userId === user.id && a.providerId === "credential");
  if (!user || !cred?.password) {
    verifyPassword(password, hashPassword("dummy-password-1"));
    return null;
  }
  return verifyPassword(password, cred.password) ? user : null;
}

export function isResetTokenValid(s: Readonly<DbState>, token: string, now = new Date()): boolean {
  const v = s.verifications.find((x) => x.identifier === `${RESET_PREFIX}${token}`);
  return !!v && new Date(v.expiresAt) > now;
}

export function updateProfile(s: DbState, userId: string, input: { firstName: string; lastName: string }, now = new Date()): User {
  const user = s.users.find((u) => u.id === userId);
  if (!user) throw notFound("Compte introuvable.");
  user.firstName = input.firstName.trim();
  user.lastName = input.lastName.trim();
  user.name = `${user.firstName} ${user.lastName}`.trim();
  user.updatedAt = now.toISOString();
  return user;
}
