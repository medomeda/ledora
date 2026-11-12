import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/actions/_shared";
import "@/server/bootstrap";
import { publicEventSchema } from "@/lib/validations";
import { AppError } from "@/server/errors";
import { normalizeEmail } from "@/lib/utils/text";
import { tx } from "@/server/db/store";
import * as pub from "@/services/public.service";

/**
 * Endpoint PUBLIC du quiz (aucune session). Toute entrée est validée par Zod, limitée en fréquence par IP et par quiz,
 * et le score n'est JAMAIS lu dans la requête : le serveur le recalcule à partir des identifiants de réponses.
 */
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  if (process.env.TRUST_PROXY === "1") return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return "local";
}

const STATUS: Record<AppError["code"], number> = { UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, VALIDATION: 422, CONFLICT: 409, INVALID_STATE: 409, QUOTA: 429, RATE_LIMIT: 429 };

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ip = clientIp(req);
  if (!rateLimit(`pub:${ip}:${slug}`, 120, 60_000)) return NextResponse.json({ error: "Trop de requêtes. Patientez un instant." }, { status: 429 });
  if (Number(req.headers.get("content-length") ?? 0) > 20_000) return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const parsed = publicEventSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[issue.path.length - 1] ?? "_")] ??= issue.message;
    return NextResponse.json({ error: "Certains champs sont invalides.", fieldErrors }, { status: 422 });
  }
  const ev = parsed.data;
  if ((ev.type === "contact" || ev.type === "complete") && !rateLimit(`pub-write:${ip}:${slug}`, 20, 10 * 60_000)) return NextResponse.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });

  // Portée minimale : ce quiz, cette session, ce prospect (voir db/store.ts).
  const contactEmail = ev.type === "contact" || ev.type === "complete" ? ev.contact?.email : undefined;
  const scope = { slug, session: ev.sessionId, ...(contactEmail ? { email: normalizeEmail(contactEmail) } : {}) };
  try {
    switch (ev.type) {
      case "visit":
        await tx(scope, (s) => pub.trackVisit(s, slug, ev.sessionId, ev.utm));
        return NextResponse.json({ ok: true });
      case "start":
        await tx(scope, (s) => pub.startQuiz(s, slug, ev.sessionId, ev.utm));
        return NextResponse.json({ ok: true });
      case "contact":
        await tx(scope, (s) => pub.saveContact(s, slug, ev.sessionId, ev.contact));
        return NextResponse.json({ ok: true });
      case "complete": {
        const done = await tx(scope, (s) => pub.completeQuiz(s, slug, ev.sessionId, ev.answers, ev.contact ?? null));
        return NextResponse.json(done);
      }
    }
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message, fieldErrors: err.fieldErrors }, { status: STATUS[err.code] });
    console.error("[public-api] erreur inattendue", err);
    return NextResponse.json({ error: "Une erreur est survenue. Réessayez dans un instant." }, { status: 500 });
  }
}
