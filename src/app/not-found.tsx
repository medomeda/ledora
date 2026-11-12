import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-6xl font-semibold">404</p>
      <h1 className="mt-3 font-display text-xl font-semibold">Page introuvable</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">Le lien est peut-être incorrect, ou ce contenu n'est plus disponible.</p>
      <Button asChild className="mt-6"><Link href="/">Retour à l'accueil</Link></Button>
    </div>
  );
}
