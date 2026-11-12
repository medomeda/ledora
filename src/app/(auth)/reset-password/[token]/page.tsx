import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/forms/auth-forms";
import "@/server/bootstrap";
import { sha256 } from "@/server/ids";
import { read } from "@/server/db/store";
import { isResetTokenValid } from "@/services/auth.service";
import { Alert } from "@/components/ui/feedback";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = await read({ token: sha256(token) }, (s) => isResetTokenValid(s, token));
  return (
    <>
      <h1 className="font-display text-3xl font-semibold">Nouveau mot de passe</h1>
      <div className="mt-8">
        {valid ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="space-y-4">
            <Alert tone="error" title="Lien invalide ou expiré">Les liens de réinitialisation sont valables 1 heure et ne servent qu'une fois.</Alert>
            <Link href="/forgot-password" className="text-sm font-medium underline underline-offset-4">Demander un nouveau lien</Link>
          </div>
        )}
      </div>
    </>
  );
}
