import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import "@/server/bootstrap";
import { can, isStaff, type Permission } from "@/lib/permissions/staff";
import { read, tx } from "@/server/db/store";
import { newToken, sha256 } from "@/server/ids";
import type { Business, User } from "@/types/domain";

/**
 * Sessions côté serveur (phase simulée). Mêmes garanties que Better Auth, qui les remplacera :
 * jeton aléatoire 256 bits dans un cookie httpOnly SameSite=Lax (Secure en production), seule l'empreinte SHA-256
 * du jeton est stockée, durée fixe de 14 jours.
 */
export const SESSION_COOKIE = "leadora_session";
const SESSION_TTL_MS = 14 * 24 * 3600 * 1000;

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  role: User["role"];
  createdAt: string;
}

export const toSessionUser = (u: User): SessionUser => ({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, emailVerified: !!u.emailVerifiedAt, role: u.role, createdAt: u.createdAt });

export async function createSession(userId: string) {
  const token = newToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  tx((s) => {
    s.sessions = s.sessions.filter((x) => new Date(x.expiresAt) > now);
    s.sessions.push({ tokenHash: sha256(token), userId, expiresAt: expiresAt.toISOString(), createdAt: now.toISOString() });
    const u = s.users.find((x) => x.id === userId);
    if (u) u.lastLoginAt = now.toISOString();
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const h = sha256(token);
    tx((s) => {
      s.sessions = s.sessions.filter((x) => x.tokenHash !== h);
    });
  }
  jar.delete(SESSION_COOKIE);
}

/** Session courante (mémoïsée par requête). */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const h = sha256(token);
  return read((s) => {
    const row = s.sessions.find((x) => x.tokenHash === h);
    if (!row || new Date(row.expiresAt) <= new Date()) return null;
    const user = s.users.find((u) => u.id === row.userId);
    return user && !user.disabledAt ? toSessionUser(user) : null;
  });
});

/** Pages privées : redirige vers la connexion si nécessaire. */
export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  // Un administrateur sans espace client n'a pas de pages « client » : son poste de travail est /admin.
  if (isStaff(user.role) && !getBusinessOf(user.id)) redirect("/admin");
  return user;
}

export function getBusinessOf(userId: string): Business | null {
  return read((s) => s.businesses.find((b) => b.ownerId === userId) ?? null);
}

/** Pages du back-office : réservées à l'équipe, selon la permission requise. Tout autre visiteur voit une page 404 (l'existence de /admin n'est pas révélée). */
export async function requireStaffUser(next = "/admin", permission: Permission = "view"): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!can(user.role, permission)) notFound();
  return user;
}
