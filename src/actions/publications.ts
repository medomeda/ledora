"use server";
import { revalidatePath } from "next/cache";
import { getFeatures } from "@/lib/features";
import { authed, type ActionResult } from "@/actions/_shared";
import "@/server/bootstrap";
import { deletePublicationSchema, publicationSchema } from "@/lib/validations";
import * as pubs from "@/services/publication.service";

export async function savePublicationAction(raw: unknown): Promise<ActionResult> {
  if (!getFeatures().publications) return { ok: false, error: "Le module Publications est désactivé." };
  const res = await authed(publicationSchema, raw, (i, ctx, _u, db) => db.txv((s) => pubs.savePublication(s, ctx, i)));
  if (res.ok) revalidatePath("/publications");
  return res;
}

export async function deletePublicationAction(raw: unknown): Promise<ActionResult> {
  if (!getFeatures().publications) return { ok: false, error: "Le module Publications est désactivé." };
  const res = await authed(deletePublicationSchema, raw, (i, ctx, _u, db) => db.txv((s) => pubs.deletePublication(s, ctx, i.id)));
  if (res.ok) revalidatePath("/publications");
  return res;
}
