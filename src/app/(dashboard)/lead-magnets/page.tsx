import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { QuizList } from "@/components/quiz/quiz-list";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { listQuizzes } from "@/services/quiz.service";

export const metadata: Metadata = { title: "Lead Magnets" };

export default async function LeadMagnetsPage() {
  const user = await requireUser("/lead-magnets");
  const rows = await read({ user: user.id }, (s) => listQuizzes(s, ctxFor(user.id)));
  return (
    <div>
      <PageHeader title="Lead Magnets" description="Vos quiz et diagnostics : créez-les, publiez-les, partagez-les." actions={<Button asChild><Link href="/lead-magnets/new"><Plus /> Nouveau quiz</Link></Button>} />
      <QuizList rows={rows} />
    </div>
  );
}
