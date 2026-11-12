"use client";
import { Button } from "@/components/ui/button";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-2xl font-semibold">Une erreur est survenue</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">Réessayez dans un instant.{error.digest ? ` Code de référence : ${error.digest}.` : ""}</p>
      <Button className="mt-6" onClick={reset}>Réessayer</Button>
    </div>
  );
}
