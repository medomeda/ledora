"use server";
import { revalidatePath } from "next/cache";
import { authed, type ActionResult } from "@/actions/_shared";
import "@/server/bootstrap";
import { adminAccountSchema, adminDeleteSchema, adminModerateSchema, adminPlanChangeSchema, adminPlanSchema, adminResetPlanSchema, adminRoleSchema, adminSettingsSchema, adminSuspendSchema } from "@/lib/validations";
import { tx } from "@/server/db/store";
import * as admin from "@/services/admin.service";

/**
 * Actions du back-office. Le rôle administrateur est revérifié par chaque fonction du service (admin.service.ts) :
 * ces actions n'ont pas d'autre contrôle d'accès à maintenir.
 */
const done = <T,>(res: ActionResult<T>): ActionResult<T> => {
  if (res.ok) revalidatePath("/admin", "layout");
  return res;
};

export async function changePlanAction(raw: unknown): Promise<ActionResult> {
  return done(await authed(adminPlanChangeSchema, raw, (i, ctx) => void tx((s) => admin.setAccountPlan(s, ctx, i.businessId, i.plan))));
}
export async function suspendAccountAction(raw: unknown): Promise<ActionResult> {
  return done(await authed(adminSuspendSchema, raw, (i, ctx) => void tx((s) => admin.suspendAccount(s, ctx, i.businessId, i.reason))));
}
export async function reactivateAccountAction(raw: unknown): Promise<ActionResult> {
  return done(await authed(adminAccountSchema, raw, (i, ctx) => void tx((s) => admin.reactivateAccount(s, ctx, i.businessId))));
}
export async function verifyEmailAction(raw: unknown): Promise<ActionResult> {
  return done(await authed(adminAccountSchema, raw, (i, ctx) => void tx((s) => admin.markEmailVerified(s, ctx, i.businessId))));
}
export async function issueResetLinkAction(raw: unknown): Promise<ActionResult<{ link: string }>> {
  return done(await authed(adminAccountSchema, raw, (i, ctx) => ({ link: tx((s) => admin.issueResetLink(s, ctx, i.businessId)) })));
}
export async function revokeSessionsAction(raw: unknown): Promise<ActionResult<{ count: number }>> {
  return done(await authed(adminAccountSchema, raw, (i, ctx) => ({ count: tx((s) => admin.revokeSessions(s, ctx, i.businessId)) })));
}
export async function setRoleAction(raw: unknown): Promise<ActionResult> {
  return done(await authed(adminRoleSchema, raw, (i, ctx) => void tx((s) => admin.setUserRole(s, ctx, i.userId, i.role))));
}
export async function deleteAccountAction(raw: unknown): Promise<ActionResult> {
  return done(await authed(adminDeleteSchema, raw, (i, ctx) => void tx((s) => admin.deleteAccount(s, ctx, i.businessId, i.confirm))));
}
export async function moderateQuizAction(raw: unknown): Promise<ActionResult> {
  return done(await authed(adminModerateSchema, raw, (i, ctx) => void tx((s) => admin.moderateQuiz(s, ctx, i.quizId, i.action, i.reason))));
}
export async function updateSettingsAction(raw: unknown): Promise<ActionResult> {
  const res = done(await authed(adminSettingsSchema, raw, (i, ctx) => void tx((s) => admin.updatePlatformSettings(s, ctx, i))));
  if (res.ok) revalidatePath("/", "layout");
  return res;
}
export async function updatePlanAction(raw: unknown): Promise<ActionResult> {
  const res = done(await authed(adminPlanSchema, raw, (i, ctx) => void tx((s) => admin.updatePlan(s, ctx, i.plan, i))));
  if (res.ok) revalidatePath("/");
  return res;
}
export async function resetPlanAction(raw: unknown): Promise<ActionResult> {
  const res = done(await authed(adminResetPlanSchema, raw, (i, ctx) => void tx((s) => admin.resetPlan(s, ctx, i.plan))));
  if (res.ok) revalidatePath("/");
  return res;
}
