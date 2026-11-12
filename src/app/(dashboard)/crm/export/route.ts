import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { LEAD_STATUS_LABELS, LEAD_STATUS_ORDER } from "@/lib/constants/labels";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { listLeads } from "@/services/lead.service";
import type { LeadStatus } from "@/types/domain";

export const dynamic = "force-dynamic";

/** Neutralise l'injection de formules dans Excel/Sheets (=, +, -, @) et échappe les guillemets. */
const cell = (v: string | number | null) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return new NextResponse("Non autorisé", { status: 401 });
  const sp = req.nextUrl.searchParams;
  const status = LEAD_STATUS_ORDER.includes(sp.get("status") as LeadStatus) ? (sp.get("status") as LeadStatus) : undefined;
  const page = read((s) => listLeads(s, ctxFor(user.id), { q: sp.get("q") ?? undefined, quizId: sp.get("quiz") ?? undefined, profile: sp.get("profile") ?? undefined, status, tagId: sp.get("tag") ?? undefined, from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined, pageSize: 10000 }));
  const header = ["Prénom", "Nom", "Email", "Téléphone", "Statut", "Profil", "Score", "Score max", "Quiz d'origine", "Tags", "Inscrit le"];
  const lines = page.rows.map((l) => [l.firstName, l.lastName, l.email, l.phone, LEAD_STATUS_LABELS[l.status], l.profileName, l.score, l.maxScore, l.originQuizTitle, l.tags.map((t) => t.name).join(" | "), l.createdAt.slice(0, 10)].map(cell).join(","));
  const csv = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="prospects-leadora.csv"' } });
}
