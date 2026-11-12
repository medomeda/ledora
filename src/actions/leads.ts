"use server";
import { revalidatePath } from "next/cache";
import { authed, type ActionResult } from "@/actions/_shared";
import "@/server/bootstrap";
import { deleteLeadSchema, deleteNoteSchema, leadNoteSchema, leadTagSchema, removeLeadTagSchema, updateLeadSchema, updateLeadStatusSchema } from "@/lib/validations";
import { tx } from "@/server/db/store";
import * as leads from "@/services/lead.service";

const touch = (id?: string) => {
  revalidatePath("/crm");
  if (id) revalidatePath(`/crm/${id}`);
  revalidatePath("/dashboard");
};

export async function updateLeadStatusAction(raw: unknown): Promise<ActionResult> {
  const res = await authed(updateLeadStatusSchema, raw, (i, ctx) => void tx((s) => leads.updateLeadStatus(s, ctx, i.leadId, i.status)));
  if (res.ok) touch((raw as { leadId: string }).leadId);
  return res;
}

export async function updateLeadAction(raw: unknown): Promise<ActionResult> {
  const res = await authed(updateLeadSchema, raw, (i, ctx) => void tx((s) => leads.updateLeadInfo(s, ctx, i.leadId, i)));
  if (res.ok) touch((raw as { leadId: string }).leadId);
  return res;
}

export async function addNoteAction(raw: unknown): Promise<ActionResult> {
  const res = await authed(leadNoteSchema, raw, (i, ctx) => void tx((s) => leads.addNote(s, ctx, i.leadId, i.content)));
  if (res.ok) touch((raw as { leadId: string }).leadId);
  return res;
}

export async function deleteNoteAction(raw: unknown): Promise<ActionResult> {
  const res = await authed(deleteNoteSchema, raw, (i, ctx) => void tx((s) => leads.deleteNote(s, ctx, i.noteId)));
  if (res.ok) revalidatePath("/crm/[id]", "page");
  return res;
}

export async function addTagAction(raw: unknown): Promise<ActionResult> {
  const res = await authed(leadTagSchema, raw, (i, ctx) => void tx((s) => leads.addLeadTag(s, ctx, i.leadId, i.name)));
  if (res.ok) touch((raw as { leadId: string }).leadId);
  return res;
}

export async function removeTagAction(raw: unknown): Promise<ActionResult> {
  const res = await authed(removeLeadTagSchema, raw, (i, ctx) => void tx((s) => leads.removeLeadTag(s, ctx, i.leadId, i.tagId)));
  if (res.ok) touch((raw as { leadId: string }).leadId);
  return res;
}

export async function deleteLeadAction(raw: unknown): Promise<ActionResult> {
  const res = await authed(deleteLeadSchema, raw, (i, ctx) => void tx((s) => leads.deleteLead(s, ctx, i.leadId)));
  if (res.ok) touch();
  return res;
}
