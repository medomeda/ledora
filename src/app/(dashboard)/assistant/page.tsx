import { Lightbulb, PenLine, Sparkles, WandSparkles } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFeatures } from "@/lib/features";
import Link from "next/link";
import { AiQuizGenerator } from "@/components/quiz/ai-generator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";
import { fmtRelative } from "@/lib/utils/dates";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { getUsage, listGenerations } from "@/services/ai.service";
import { getBusiness } from "@/services/business.service";
import type { QuizConfig } from "@/types/domain";

export const metadata: Metadata = { title: "Assistant IA" };
export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  if (!getFeatures().assistant) notFound();
  const user = await requireUser("/assistant");
  const ctx = ctxFor(user.id);
  const { usage, history, business } = read((s) => { const b = getBusiness(s, ctx); return { business: b, usage: getUsage(s, b, ctx.now), history: listGenerations(s, ctx, 5) }; });
  const provider = process.env.AI_PROVIDER ?? "mock";
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Assistant IA" description="Un assistant dédié à vos quiz : il propose, vous décidez. Rien n'est publié sans votre validation." actions={provider === "mock" ? <Badge tone="warning">Mode simulation</Badge> : undefined} />

      <Card>
        <CardHeader><div><CardTitle>Générer un quiz complet</CardTitle><CardDescription>Titre, introduction, questions, scores, profils et recommandations. {business.description ? "Le contexte de votre activité est pris en compte." : "Complétez Mon Business pour des propositions plus pertinentes."}</CardDescription></div></CardHeader>
        <CardBody><AiQuizGenerator usage={usage} /></CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5"><PenLine className="mb-3 size-5 text-muted-foreground" /><h2 className="font-display text-base font-semibold">Reformuler un texte</h2><p className="mt-1 text-sm text-muted-foreground">Dans le créateur de quiz, utilisez « Améliorer avec l&apos;IA » sous un titre, une introduction, une question, un diagnostic ou un bouton d&apos;action.</p><Button asChild variant="outline" size="sm" className="mt-4"><Link href="/lead-magnets">Ouvrir mes quiz</Link></Button></Card>
        <Card className="p-5"><Lightbulb className="mb-3 size-5 text-muted-foreground" /><h2 className="font-display text-base font-semibold">Vos règles restent explicites</h2><p className="mt-1 text-sm text-muted-foreground">L&apos;IA ne calcule aucun résultat : scores et profils sont des règles que vous voyez, modifiez et vérifiez dans le créateur.</p></Card>
      </div>

      <Card>
        <CardHeader><div><CardTitle>Dernières générations</CardTitle><CardDescription>Seules les propositions que vous adoptez deviennent des brouillons.</CardDescription></div></CardHeader>
        {history.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Aucune génération pour l&apos;instant.</p> : (
          <ul className="divide-y">
            {history.map((g) => { const c = g.output as QuizConfig | null; return (
              <li key={g.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0"><p className="truncate font-medium">{g.status === "success" && c ? c.title : "Échec de la génération"}</p><p className="truncate text-xs text-muted-foreground">{String((g.input as { brief?: string }).brief ?? "").slice(0, 90)}</p></div>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"><WandSparkles className="size-3.5" />{fmtRelative(g.createdAt)}</span>
              </li>
            ); })}
          </ul>
        )}
      </Card>
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><Sparkles className="size-3.5" /> Les appels à l&apos;IA sont réalisés côté serveur ; aucune donnée personnelle de prospect n&apos;est transmise.</p>
    </div>
  );
}
