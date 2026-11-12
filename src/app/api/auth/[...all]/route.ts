import { toNextJsHandler } from "better-auth/next-js";
import type { NextRequest } from "next/server";
import { getAuth } from "@/lib/auth/auth";
import "@/server/bootstrap";

export const dynamic = "force-dynamic";

/** Points d'entrée de Better Auth (/api/auth/*) : vérification d'email, OAuth à venir, etc. Les formulaires de l'application passent par des Server Actions. */
async function handler(req: NextRequest, method: "GET" | "POST") {
  return toNextJsHandler(await getAuth())[method](req);
}
export const GET = (req: NextRequest) => handler(req, "GET");
export const POST = (req: NextRequest) => handler(req, "POST");
