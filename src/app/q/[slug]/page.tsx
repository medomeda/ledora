import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { getPublicQuiz } from "@/services/quiz.service";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const pq = await read({ slug }, (s) => getPublicQuiz(s, slug));
  if (!pq) return { title: "Quiz indisponible", robots: { index: false } };
  return { title: pq.config.title, description: pq.config.description || undefined };
}

/** Page publique : aucune navigation de l'application, aucune authentification. */
export default async function PublicQuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pq = await read({ slug }, (s) => getPublicQuiz(s, slug));
  if (!pq) notFound();
  return (
    <QuizRunner config={pq.config} brand={{ name: pq.brand.name, logoUrl: pq.brand.logoUrl }} slug={pq.slug} mode="public" plan={pq.plan} />
  );
}
