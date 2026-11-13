import { NextResponse } from "next/server";
import "@/server/bootstrap";
import { read } from "@/server/db/store";

export const dynamic = "force-dynamic";

/** Sonde de disponibilité : 503 si la base de données est injoignable (/api/health ne vérifie que le processus). */
export async function GET() {
  try {
    await read("settings", (s) => s.settings.registrationsOpen);
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[ready] base de données injoignable", err instanceof Error ? err.message : err);
    return NextResponse.json({ status: "database_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
