import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-semibold">Mot de passe oublié</h1>
      <p className="mb-8 mt-2 text-sm text-muted-foreground">Indiquez votre email : nous vous envoyons un lien pour en choisir un nouveau.</p>
      <ForgotPasswordForm />
      <p className="mt-8 text-center text-sm"><Link href="/login" className="text-muted-foreground underline underline-offset-4 hover:text-foreground">Retour à la connexion</Link></p>
    </>
  );
}
