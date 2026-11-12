import { PenLine, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AiQuizGenerator } from "@/components/quiz/ai-generator";
import { QuizCreateForm } from "@/components/forms/quiz-create-form";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { getUsage } from "@/services/ai.service";
import { getBusiness } from "@/services/business.service";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Nouveau quiz" };

export default async function NewQuizPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const user = await requireUser("/lead-magnets/new");
  const sp = await searchParams;
  const ctx = ctxFor(user.id);
  const usage = read((s) => getUsage(s, getBusiness(s, ctx), ctx.now));
  const ai = sp.mode === "ai";
  const tab = (active: boolean) => cn("flex flex-1 items-start gap-3 rounded-xl border p-4 text-left transition-colors", active ? "border-primary bg-card ring-1 ring-primary" : "bg-card/60 hover:bg-card");
  return (
    <div className="max-w-3xl">
      <PageHeader title="Nouveau quiz" description="Deux façons de démarrer. Dans les deux cas, vous relisez et modifiez tout avant de publier." />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row" role="tablist">
        <Link href="/lead-magnets/new" role="tab" aria-selected={!ai} className={tab(!ai)}><PenLine className="mt-0.5 size-5" /><span><span className="block font-medium">Partir de zéro</span><span className="text-sm text-muted-foreground">Vous écrivez vos questions et vos profils.</span></span></Link>
        <Link href="/lead-magnets/new?mode=ai" role="tab" aria-selected={ai} className={tab(ai)}><Sparkles className="mt-0.5 size-5" /><span><span className="block font-medium">Avec l&apos;Assistant IA</span><span className="text-sm text-muted-foreground">Vous décrivez votre besoin, l&apos;IA propose un quiz complet.</span></span></Link>
      </div>
      <Card>
        <CardHeader><div><CardTitle>{ai ? "Décrivez votre besoin" : "Informations de départ"}</CardTitle><CardDescription>{ai ? "L'IA ne publie jamais rien sans votre validation." : "Vous complèterez les questions à l'étape suivante."}</CardDescription></div></CardHeader>
        <CardBody>{ai ? <AiQuizGenerator usage={usage} /> : <QuizCreateForm />}</CardBody>
      </Card>
    </div>
  );
}
