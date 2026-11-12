import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PreviewFrame } from "@/components/quiz/preview-frame";
import { Badge } from "@/components/ui/badge";
import { guard } from "@/lib/auth/guard";
import { requireUser } from "@/lib/auth/session";
import { QUIZ_STATUS_LABELS } from "@/lib/constants/labels";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { getBusiness } from "@/services/business.service";
import { getQuiz } from "@/services/quiz.service";

export const metadata: Metadata = { title: "Aperçu du quiz" };
export const dynamic = "force-dynamic";

export default async function QuizPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/lead-magnets/${id}/preview`);
  const ctx = ctxFor(user.id);
  const { quiz, business } = await guard(() => read((s) => ({ quiz: getQuiz(s, ctx, id), business: getBusiness(s, ctx) })));
  return (
    <div>
      <Link href={quiz.status === "archived" ? "/lead-magnets" : `/lead-magnets/${id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> {quiz.status === "archived" ? "Lead Magnets" : "Retour au créateur"}</Link>
      <div className="mb-5 flex flex-wrap items-center gap-3"><h1 className="font-display text-2xl font-semibold">Aperçu : {quiz.config.title}</h1><Badge tone={quiz.status === "published" ? "success" : "neutral"}>{QUIZ_STATUS_LABELS[quiz.status]}</Badge></div>
      <PreviewFrame config={quiz.config} brand={{ name: business.name, logoUrl: business.logoUrl }} plan={business.plan} screens />
    </div>
  );
}
