import type { Metadata } from "next";
import { PublicationsView } from "@/components/shared/publications-view";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { listPublications } from "@/services/publication.service";
import { listQuizzes } from "@/services/quiz.service";

export const metadata: Metadata = { title: "Publications" };
export const dynamic = "force-dynamic";

export default async function PublicationsPage() {
  const user = await requireUser("/publications");
  const ctx = ctxFor(user.id);
  const { publications, quizzes } = read((s) => ({ publications: listPublications(s, ctx), quizzes: listQuizzes(s, ctx).filter((q) => q.status !== "archived").map((q) => ({ id: q.id, title: q.title })) }));
  return (
    <div>
      <PageHeader title="Publications" description="Votre calendrier éditorial : planifiez vos contenus et reliez-les à vos quiz." />
      <PublicationsView publications={publications} quizzes={quizzes} />
    </div>
  );
}
