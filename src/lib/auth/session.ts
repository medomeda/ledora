import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import "@/server/bootstrap";
import { can, isStaff, type Permission } from "@/lib/permissions/staff";
import { getAuth } from "@/lib/auth/auth";
import { read } from "@/server/db/store";
import type { Business, User } from "@/types/domain";

/**
 * Sessions : gérées par Better Auth (cookie signé « leadora.session_token », session stockée dans la table `sessions`,
 * durée 14 jours). Ce module n'expose que ce dont l'application a besoin.
 */
export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  role: User["role"];
  createdAt: string;
}

/** Session courante (mémoïsée par requête). Un collaborateur désactivé n'a plus de session valide. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const auth = await getAuth();
  const res = await auth.api.getSession({ headers: await headers() });
  if (!res) return null;
  const u = res.user as typeof res.user & { firstName?: string; lastName?: string; role?: User["role"]; disabledAt?: Date | string | null };
  if (u.disabledAt) return null;
  return { id: u.id, email: u.email, firstName: u.firstName ?? "", lastName: u.lastName ?? "", emailVerified: !!u.emailVerified, role: (u.role ?? "user") as User["role"], createdAt: new Date(u.createdAt).toISOString() };
});

/** Ouvre une session (cookie posé par Better Auth). Lève une erreur si les identifiants sont refusés. */
export async function openSession(email: string, password: string): Promise<void> {
  const auth = await getAuth();
  await auth.api.signInEmail({ body: { email, password }, headers: await headers() });
}

export async function closeSession(): Promise<void> {
  const auth = await getAuth();
  await auth.api.signOut({ headers: await headers() }).catch(() => undefined);
}

/** Pages privées : redirige vers la connexion si nécessaire. */
export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  // Un administrateur sans espace client n'a pas de pages « client » : son poste de travail est /admin.
  if (isStaff(user.role) && !(await getBusinessOf(user.id))) redirect("/admin");
  return user;
}

export const getBusinessOf = cache(async (userId: string): Promise<Business | null> => read({ account: userId }, (s) => s.businesses.find((b) => b.ownerId === userId) ?? null));

/** Pages du back-office : réservées à l'équipe, selon la permission requise. Tout autre visiteur voit une page 404 (l'existence de /admin n'est pas révélée). */
export async function requireStaffUser(next = "/admin", permission: Permission = "view"): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!can(user.role, permission)) notFound();
  return user;
}
