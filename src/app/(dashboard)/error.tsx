"use client";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-16">
      <Alert tone="error" title="Cette page n'a pas pu se charger">
        Une erreur inattendue est survenue.{error.digest ? ` Code de référence : ${error.digest}.` : ""}
      </Alert>
      <Button className="mt-4" onClick={reset}>Réessayer</Button>
    </div>
  );
}
