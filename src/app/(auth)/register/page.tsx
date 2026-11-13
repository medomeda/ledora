import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/forms/auth-forms";
import { Alert } from "@/components/ui/feedback";
import { getSession } from "@/lib/auth/session";
import "@/server/bootstrap";
import { read } from "@/server/db/store";

/** Lit les réglages en base (inscriptions ouvertes ou fermées) : jamais prérendue à la compilation. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Créer mon espace" };

export default async function RegisterPage() {
  if (await getSession()) redirect("/dashboard");
  const open = await read("settings", (s) => s.settings.registrationsOpen);
  if (!open) return (
    <>
      <h1 className="font-display text-3xl font-semibold">Inscriptions fermées</h1>
      <Alert tone="info" className="mt-6">Les inscriptions sont momentanément fermées. Revenez bientôt ou connectez-vous si vous avez déjà un compte.</Alert>
      <p className="mt-8 text-center text-sm text-muted-foreground"><Link href="/login" className="font-medium text-foreground underline underline-offset-4">Se connecter</Link></p>
    </>
  );
  return (
    <>
      <h1 className="font-display text-3xl font-semibold">Créez votre espace</h1>
      <p className="mb-8 mt-2 text-sm text-muted-foreground">Gratuit pour commencer. Votre premier quiz peut être en ligne dans la journée.</p>
      <RegisterForm />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Déjà inscrit ? <Link href="/login" className="font-medium text-foreground underline underline-offset-4">Se connecter</Link>
      </p>
    </>
  );
}
