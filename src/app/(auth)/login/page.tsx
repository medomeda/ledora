import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/auth-forms";
import { getSession } from "@/lib/auth/session";
import { safeNext } from "@/actions/_shared";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  if (await getSession()) redirect(safeNext(sp.next));
  return (
    <>
      <h1 className="font-display text-3xl font-semibold">Bon retour</h1>
      <p className="mb-8 mt-2 text-sm text-muted-foreground">Connectez-vous pour retrouver vos quiz et vos prospects.</p>
      <LoginForm next={sp.next ? safeNext(sp.next) : undefined} reset={sp.reset === "1"} showDemo={process.env.LEADORA_DEMO_MODE !== "0"} />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Pas encore de compte ? <Link href="/register" className="font-medium text-foreground underline underline-offset-4">Créer mon espace</Link>
      </p>
    </>
  );
}
