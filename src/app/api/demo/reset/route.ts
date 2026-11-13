import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { canResetDemo } from "@/lib/demo";
import "@/server/bootstrap";
import { resetState } from "@/server/db/store";

export const dynamic = "force-dynamic";

/**
 * Remise à zéro de la démonstration (mode test seulement, LEADORA_ALLOW_DEMO_RESET=1) :
 *   curl -X POST -H "Authorization: Bearer <CRON_SECRET>" https://<domaine>/api/demo/reset
 * Efface TOUTES les données et recharge le jeu de démonstration ; ferme toutes les sessions. 404 hors mode test.
 */
export async function POST(req: NextRequest) {
  if (!canResetDemo()) return new NextResponse(null, { status: 404 });
  const secret = process.env.CRON_SECRET ?? "";
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (secret.length < 32 || a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  await resetState(true);
  return NextResponse.json({ ok: true });
}
