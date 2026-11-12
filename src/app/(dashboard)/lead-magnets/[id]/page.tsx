import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { QuizBuilder } from "@/components/quiz/quiz-builder";
import { guard } from "@/lib/auth/guard";
import { requireUser } from "@/lib/auth/session";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { getBusiness } from "@/services/business.service";
import { getQuiz } from "@/services/quiz.service";

export const metadata: Metadata = { title: "Créateur de quiz" };
export const dynamic = "force-dynamic";

export default async function QuizBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/lead-magnets/${id}`);
  const ctx = ctxFor(user.id);
  const data = await guard(() => read({ user: user.id }, (s) => {
    const quiz = getQuiz(s, ctx, id);
    const business = getBusiness(s, ctx);
    return { quiz, business, participants: s.quizSubmissions.filter((x) => x.quizId === quiz.id && x.status === "completed").length };
  }));
  if (data.quiz.status === "archived") redirect(`/lead-magnets/${id}/stats`);
  const { quiz, business } = data;
  return (
    <QuizBuilder
      initialConfig={quiz.config}
      initialMeta={{ id: quiz.id, slug: quiz.slug, status: quiz.status, hasUnpublishedChanges: quiz.hasUnpublishedChanges, publishedAt: quiz.publishedAt, participants: data.participants }}
      brand={{ name: business.name, logoUrl: business.logoUrl }}
      bookingUrl={business.bookingUrl}
      plan={business.plan}
    />
  );
}
