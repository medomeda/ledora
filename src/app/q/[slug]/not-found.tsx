import { Brand } from "@/components/layout/brand";

export default function QuizNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Brand className="mb-8" />
      <h1 className="font-display text-2xl font-semibold">Ce quiz n&apos;est pas disponible</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">Le lien est peut-être incorrect, ou son auteur a retiré ce quiz. Contactez la personne qui vous l&apos;a envoyé.</p>
    </div>
  );
}
