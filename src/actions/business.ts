"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authed, type ActionResult } from "@/actions/_shared";
import "@/server/bootstrap";
import { businessInfoSchema, offersSchema, onboardingSchema } from "@/lib/validations";
import { tx } from "@/server/db/store";
import * as business from "@/services/business.service";

export async function saveBusinessAction(raw: unknown): Promise<ActionResult> {
  const res = await authed(businessInfoSchema, raw, (input, ctx) => void tx((s) => business.updateBusiness(s, ctx, input)));
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

export async function saveOffersAction(raw: unknown): Promise<ActionResult> {
  const res = await authed(offersSchema, raw, (input, ctx) => void tx((s) => business.updateOffers(s, ctx, input.offers)));
  if (res.ok) revalidatePath("/business/offers");
  return res;
}

export async function completeOnboardingAction(raw: unknown): Promise<ActionResult> {
  const res = await authed(onboardingSchema, raw, (input, ctx) => void tx((s) => business.completeOnboarding(s, ctx, input)));
  if (res.ok) redirect("/dashboard");
  return res;
}

export async function skipOnboardingAction(): Promise<ActionResult> {
  const res = await authed(z.object({}), {}, (_i, ctx) => void tx((s) => business.skipOnboarding(s, ctx)));
  if (res.ok) redirect("/dashboard");
  return res;
}
