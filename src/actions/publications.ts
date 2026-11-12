"use server";
import { revalidatePath } from "next/cache";
import { authed, type ActionResult } from "@/actions/_shared";
import "@/server/bootstrap";
import { deletePublicationSchema, publicationSchema } from "@/lib/validations";
import { tx } from "@/server/db/store";
import * as pubs from "@/services/publication.service";

export async function savePublicationAction(raw: unknown): Promise<ActionResult> {
  const res = await authed(publicationSchema, raw, (i, ctx) => void tx((s) => pubs.savePublication(s, ctx, i)));
  if (res.ok) revalidatePath("/publications");
  return res;
}

export async function deletePublicationAction(raw: unknown): Promise<ActionResult> {
  const res = await authed(deletePublicationSchema, raw, (i, ctx) => void tx((s) => pubs.deletePublication(s, ctx, i.id)));
  if (res.ok) revalidatePath("/publications");
  return res;
}
