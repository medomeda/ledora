"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authed, type ActionResult } from "@/actions/_shared";
import "@/server/bootstrap";
import { businessInfoSchema, offersSchema, onboardingSchema } from "@/lib/validations";
import * as business from "@/services/business.service";

export async function saveBusinessAction(raw: unknown): Promise<ActionResult> {
  const res = await authed(businessInfoSchema, raw, (input, ctx, _u, db) => db.txv((s) => business.updateBusiness(s, ctx, input)));
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function saveOffersAction(raw: unknown): Promise<ActionResult> {
  const res = await authed(offersSchema, raw, (input, ctx, _u, db) => db.txv((s) => business.updateOffers(s, ctx, input.offers)));
  if (res.ok) revalidatePath("/business/offers");
  return res;
}

export async function completeOnboardingAction(raw: unknown): Promise<ActionResult> {
  const res = await authed(onboardingSchema, raw, (input, ctx, _u, db) => db.txv((s) => business.completeOnboarding(s, ctx, input)));
  if (res.ok) redirect("/dashboard");
  return res;
}

export async function skipOnboardingAction(): Promise<ActionResult> {
  const res = await authed(z.object({}), {}, (_i, ctx, _u, db) => db.txv((s) => business.skipOnboarding(s, ctx)));
  if (res.ok) redirect("/dashboard");
  return res;
}
