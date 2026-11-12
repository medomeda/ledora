"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { authed, failureLimiter, fieldErrorsOf, safeNext, toFailure, type ActionResult } from "@/actions/_shared";
import "@/server/bootstrap";
import { isStaff } from "@/lib/permissions/staff";
import { getAuth } from "@/lib/auth/auth";
import { closeSession, getSession, openSession } from "@/lib/auth/session";
import { lastMailTo, mailIsSimulated } from "@/server/mailer";
import { changePasswordSchema, forgotPasswordSchema, loginSchema, profileSchema, registerSchema, resetPasswordSchema } from "@/lib/validations";
import { read, tx } from "@/server/db/store";
import { normalizeEmail } from "@/lib/utils/text";
import * as auth from "@/services/auth.service";
import { z } from "zod";

export async function registerAction(raw: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Certains champs sont invalides.", fieldErrors: fieldErrorsOf(parsed.error) };
  if (!(await read("settings", (s) => s.settings.registrationsOpen))) return { ok: false, error: "Les inscriptions sont momentanément fermées." };
  try {
    await tx({ email: normalizeEmail(parsed.data.email) }, (s) => auth.register(s, parsed.data));
    await openSession(parsed.data.email, parsed.data.password);
  } catch (err) {
    return toFailure(err);
  }
  redirect("/onboarding");
}

export async function loginAction(raw: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Certains champs sont invalides.", fieldErrors: fieldErrorsOf(parsed.error) };
  const limiter = failureLimiter(`login:${parsed.data.email}`, 8, 10 * 60_000);
  if (limiter.blocked()) return { ok: false, error: "Trop de tentatives. Réessayez dans quelques minutes." };
  const user = await read({ email: normalizeEmail(parsed.data.email) }, (s) => auth.authenticate(s, parsed.data.email, parsed.data.password));
  if (!user) {
    limiter.fail();
    return { ok: false, error: "Email ou mot de passe incorrect." };
  }
  limiter.reset();
  if (user.disabledAt) return { ok: false, error: "Votre accès est désactivé. Contactez un administrateur." };
  try {
    await openSession(parsed.data.email, parsed.data.password);
  } catch {
    return { ok: false, error: "Email ou mot de passe incorrect." };
  }
  redirect(safeNext(parsed.data.next, isStaff(user.role) ? "/admin" : "/dashboard"));
}

export async function logoutAction(): Promise<void> {
  await closeSession();
  redirect("/login");
}

/**
 * Demande de réinitialisation : Better Auth crée le jeton et « envoie » l'email (server/mailer.ts). Tant qu'aucun fournisseur
 * d'envoi n'est configuré, le lien est renvoyé pour être affiché à l'écran. Réponse identique que le compte existe ou non.
 */
export async function forgotPasswordAction(raw: unknown): Promise<ActionResult<{ link: string | null }>> {
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Adresse email invalide.", fieldErrors: fieldErrorsOf(parsed.error) };
  const limiter = failureLimiter(`reset:${parsed.data.email}`, 5, 15 * 60_000);
  if (limiter.blocked()) return { ok: false, error: "Trop de demandes. Réessayez plus tard." };
  limiter.fail();
  try {
    await (await getAuth()).api.requestPasswordReset({ body: { email: parsed.data.email, redirectTo: "/reset-password" }, headers: await headers() });
  } catch {
    // Réponse volontairement identique : on ne révèle rien sur l'existence du compte.
  }
  const link = mailIsSimulated() ? (lastMailTo(parsed.data.email)?.link ?? null) : null;
  return { ok: true, data: { link } };
}

export async function resetPasswordAction(raw: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Certains champs sont invalides.", fieldErrors: fieldErrorsOf(parsed.error) };
  try {
    await (await getAuth()).api.resetPassword({ body: { newPassword: parsed.data.password, token: parsed.data.token } });
  } catch {
    return { ok: false, error: "Ce lien est invalide ou a expiré." };
  }
  redirect("/login?reset=1");
}

/** Simulation de la vérification d'adresse : confirme directement le compte connecté. */
export async function confirmEmailAction(): Promise<ActionResult> {
  return authed(z.object({}), {}, async (_i, ctx, _u, db) => {
    await db.txv((s) => {
      const u = s.users.find((x) => x.id === ctx.userId);
      if (u) u.emailVerified = true;
    });
  });
}

export async function updateProfileAction(raw: unknown): Promise<ActionResult> {
  const res = await authed(profileSchema, raw, (input, ctx, _u, db) => db.txv((s) => auth.updateProfile(s, ctx.userId, input, ctx.now)));
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function changePasswordAction(raw: unknown): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: "Votre session a expiré. Reconnectez-vous." };
  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Certains champs sont invalides.", fieldErrors: fieldErrorsOf(parsed.error) };
  try {
    const api = (await getAuth()).api;
    await api.changePassword({ body: { currentPassword: parsed.data.currentPassword, newPassword: parsed.data.newPassword }, headers: await headers() });
    // Les AUTRES sessions sont fermées ; la session courante garde son jeton (sinon la page se rafraîchit avec un cookie déjà périmé et renvoie à la connexion).
    await api.revokeOtherSessions({ headers: await headers() });
    return { ok: true, data: undefined, message: "Mot de passe modifié. Vos autres sessions ont été fermées." };
  } catch {
    return { ok: false, error: "Mot de passe actuel incorrect.", fieldErrors: { currentPassword: "Mot de passe incorrect." } };
  }
}
