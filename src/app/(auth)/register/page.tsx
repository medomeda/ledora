import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/forms/auth-forms";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Créer mon espace" };

export default async function RegisterPage() {
  if (await getSession()) redirect("/dashboard");
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
