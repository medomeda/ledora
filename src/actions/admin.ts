"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canResetDemo } from "@/lib/demo";
import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions/staff";
import { resetState } from "@/server/db/store";
import { authed, type ActionResult } from "@/actions/_shared";

const adm: typeof authed = (schema, raw, run) => authed(schema, raw, run, "admin");
import "@/server/bootstrap";
import { adminAccountSchema, adminDeleteSchema, adminModerateSchema, adminPlanChangeSchema, adminPlanSchema, adminResetPlanSchema, adminSettingsSchema, adminSuspendSchema, teamAccessSchema, teamInviteSchema, teamMemberSchema, teamRoleSchema } from "@/lib/validations";
import * as admin from "@/services/admin.service";
import * as team from "@/services/team.service";

/**
 * Actions du back-office. Le rôle administrateur est revérifié par chaque fonction du service (admin.service.ts) :
 * ces actions n'ont pas d'autre contrôle d'accès à maintenir.
 */
const done = <T,>(res: ActionResult<T>): ActionResult<T> => {
  if (res.ok) revalidatePath("/admin", "layout");
  return res;
};

export async function changePlanAction(raw: unknown): Promise<ActionResult> {
  return done(await adm(adminPlanChangeSchema, raw, (i, ctx, _u, db) => db.txv((s) => admin.setAccountPlan(s, ctx, i.businessId, i.plan))));
}
export async function suspendAccountAction(raw: unknown): Promise<ActionResult> {
  return done(await adm(adminSuspendSchema, raw, (i, ctx, _u, db) => db.txv((s) => admin.suspendAccount(s, ctx, i.businessId, i.reason))));
}
export async function reactivateAccountAction(raw: unknown): Promise<ActionResult> {
  return done(await adm(adminAccountSchema, raw, (i, ctx, _u, db) => db.txv((s) => admin.reactivateAccount(s, ctx, i.businessId))));
}
export async function verifyEmailAction(raw: unknown): Promise<ActionResult> {
  return done(await adm(adminAccountSchema, raw, (i, ctx, _u, db) => db.txv((s) => admin.markEmailVerified(s, ctx, i.businessId))));
}
export async function issueResetLinkAction(raw: unknown): Promise<ActionResult<{ link: string }>> {
  return done(await adm(adminAccountSchema, raw, async (i, ctx, _u, db) => ({ link: await db.tx((s) => admin.issueResetLink(s, ctx, i.businessId)) })));
}
export async function revokeSessionsAction(raw: unknown): Promise<ActionResult<{ count: number }>> {
  return done(await adm(adminAccountSchema, raw, async (i, ctx, _u, db) => ({ count: await db.tx((s) => admin.revokeSessions(s, ctx, i.businessId)) })));
}
export async function deleteAccountAction(raw: unknown): Promise<ActionResult> {
  return done(await adm(adminDeleteSchema, raw, (i, ctx, _u, db) => db.txv((s) => admin.deleteAccount(s, ctx, i.businessId, i.confirm))));
}
export async function moderateQuizAction(raw: unknown): Promise<ActionResult> {
  return done(await adm(adminModerateSchema, raw, (i, ctx, _u, db) => db.txv((s) => admin.moderateQuiz(s, ctx, i.quizId, i.action, i.reason))));
}
export async function updateSettingsAction(raw: unknown): Promise<ActionResult> {
  const res = done(await adm(adminSettingsSchema, raw, (i, ctx, _u, db) => db.txv((s) => admin.updatePlatformSettings(s, ctx, i))));
  if (res.ok) revalidatePath("/", "layout");
  return res;
}
export async function updatePlanAction(raw: unknown): Promise<ActionResult> {
  const res = done(await adm(adminPlanSchema, raw, (i, ctx, _u, db) => db.txv((s) => admin.updatePlan(s, ctx, i.plan, i))));
  if (res.ok) revalidatePath("/");
  return res;
}
export async function resetPlanAction(raw: unknown): Promise<ActionResult> {
  const res = done(await adm(adminResetPlanSchema, raw, (i, ctx, _u, db) => db.txv((s) => admin.resetPlan(s, ctx, i.plan))));
  if (res.ok) revalidatePath("/");
  return res;
}

// ---- Équipe ---------------------------------------------------------------------------------------------------
export async function inviteCollaboratorAction(raw: unknown): Promise<ActionResult<{ link: string; email: string }>> {
  return done(await adm(teamInviteSchema, raw, async (i, ctx, _u, db) => { const r = await db.tx((s) => team.inviteCollaborator(s, ctx, i)); return { link: r.link, email: r.user.email }; }));
}
export async function resendInvitationAction(raw: unknown): Promise<ActionResult<{ link: string }>> {
  return done(await adm(teamMemberSchema, raw, async (i, ctx, _u, db) => ({ link: await db.tx((s) => team.resendInvitation(s, ctx, i.userId)) })));
}
export async function changeMemberRoleAction(raw: unknown): Promise<ActionResult> {
  return done(await adm(teamRoleSchema, raw, (i, ctx, _u, db) => db.txv((s) => team.changeMemberRole(s, ctx, i.userId, i.role))));
}
export async function setMemberAccessAction(raw: unknown): Promise<ActionResult> {
  return done(await adm(teamAccessSchema, raw, (i, ctx, _u, db) => db.txv((s) => team.setMemberAccess(s, ctx, i.userId, i.enabled))));
}
export async function removeCollaboratorAction(raw: unknown): Promise<ActionResult> {
  return done(await adm(teamMemberSchema, raw, (i, ctx, _u, db) => db.txv((s) => team.removeCollaborator(s, ctx, i.userId))));
}

/** Remise à zéro de la démonstration depuis l'administration (mode test seulement) : tout est effacé et rechargé, les sessions sont fermées. */
export async function resetDemoAction(): Promise<ActionResult> {
  if (!canResetDemo()) return { ok: false, error: "La réinitialisation de la démonstration n'est pas activée." };
  const user = await getSession();
  if (!user || !can(user.role, "settings.manage")) return { ok: false, error: "Votre rôle ne permet pas cette action." };
  await resetState(true);
  redirect("/login");
}
