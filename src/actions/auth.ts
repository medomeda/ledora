"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authed, failureLimiter, fieldErrorsOf, safeNext, toFailure, type ActionResult } from "@/actions/_shared";
import "@/server/bootstrap";
import { isStaff } from "@/lib/permissions/staff";
import { createSession, destroySession, getSession, SESSION_COOKIE } from "@/lib/auth/session";
import { changePasswordSchema, forgotPasswordSchema, loginSchema, profileSchema, registerSchema, resetPasswordSchema } from "@/lib/validations";
import { read, tx } from "@/server/db/store";
import { sha256 } from "@/server/ids";
import * as auth from "@/services/auth.service";
import { z } from "zod";

export async function registerAction(raw: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Certains champs sont invalides.", fieldErrors: fieldErrorsOf(parsed.error) };
  if (!read((s) => s.settings.registrationsOpen)) return { ok: false, error: "Les inscriptions sont momentanément fermées." };
  let userId: string;
  try {
    userId = tx((s) => auth.register(s, parsed.data).user.id);
  } catch (err) {
    return toFailure(err);
  }
  await createSession(userId);
  redirect("/onboarding");
}

export async function loginAction(raw: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Certains champs sont invalides.", fieldErrors: fieldErrorsOf(parsed.error) };
  const limiter = failureLimiter(`login:${parsed.data.email}`, 8, 10 * 60_000);
  if (limiter.blocked()) return { ok: false, error: "Trop de tentatives. Réessayez dans quelques minutes." };
  const user = read((s) => auth.authenticate(s, parsed.data.email, parsed.data.password));
  if (!user) {
    limiter.fail();
    return { ok: false, error: "Email ou mot de passe incorrect." };
  }
  limiter.reset();
  if (user.disabledAt) return { ok: false, error: "Votre accès est désactivé. Contactez un administrateur." };
  await createSession(user.id);
  redirect(safeNext(parsed.data.next, isStaff(user.role) ? "/admin" : "/dashboard"));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/** Simulation : aucun email n'est envoyé ; le lien est renvoyé pour être affiché à l'écran (voir docs/ARCHITECTURE.md). */
export async function forgotPasswordAction(raw: unknown): Promise<ActionResult<{ link: string | null }>> {
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Adresse email invalide.", fieldErrors: fieldErrorsOf(parsed.error) };
  const limiter = failureLimiter(`reset:${parsed.data.email}`, 5, 15 * 60_000);
  if (limiter.blocked()) return { ok: false, error: "Trop de demandes. Réessayez plus tard." };
  limiter.fail();
  const token = tx((s) => auth.requestPasswordReset(s, parsed.data.email));
  return { ok: true, data: { link: token ? `/reset-password/${token}` : null } };
}

export async function resetPasswordAction(raw: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Certains champs sont invalides.", fieldErrors: fieldErrorsOf(parsed.error) };
  try {
    tx((s) => auth.resetPassword(s, parsed.data.token, parsed.data.password));
  } catch (err) {
    return toFailure(err);
  }
  redirect("/login?reset=1");
}

/** Simulation de la vérification d'adresse : confirme directement le compte connecté. */
export async function confirmEmailAction(): Promise<ActionResult> {
  return authed(z.object({}), {}, (_i, ctx) => {
    tx((s) => {
      const u = s.users.find((x) => x.id === ctx.userId);
      if (u) u.emailVerifiedAt = ctx.now.toISOString();
    });
  });
}

export async function updateProfileAction(raw: unknown): Promise<ActionResult> {
  const res = await authed(profileSchema, raw, (input, ctx) => void tx((s) => auth.updateProfile(s, ctx.userId, input, ctx.now)));
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function changePasswordAction(raw: unknown): Promise<ActionResult> {
  const user = await getSession();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!user || !token) return { ok: false, error: "Votre session a expiré. Reconnectez-vous." };
  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Certains champs sont invalides.", fieldErrors: fieldErrorsOf(parsed.error) };
  try {
    tx((s) => auth.changePassword(s, user.id, parsed.data.currentPassword, parsed.data.newPassword, sha256(token)));
    return { ok: true, data: undefined, message: "Mot de passe modifié. Vos autres sessions ont été fermées." };
  } catch (err) {
    return toFailure(err);
  }
}
