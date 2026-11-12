"use client";
import { CheckCircle2, Copy, ExternalLink, Mail, MessageCircle, Rocket, TriangleAlert, Undo2 } from "lucide-react";
import Link from "next/link";
import type { StepProps } from "@/components/quiz/quiz-builder";
import { Alert } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fmtDate } from "@/lib/utils/dates";
import type { PublishIssue } from "@/services/scoring.service";
import { toast } from "sonner";

const CHANNELS = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "email", label: "Email" },
] as const;

function copy(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success("Lien copié."), () => toast.error("Copie impossible."));
}

export function PublishStep({ config, quiz, issues, goTo, slug, onSlugChange, slugError, onPublish, onUnpublish, busy, dirty }: StepProps & {
  issues: PublishIssue[]; slug: string; onSlugChange: (s: string) => void; slugError: string | null; onPublish: () => void; onUnpublish: () => void; busy: boolean; dirty: boolean;
}) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = `${origin}/q/${slug}`;
  const published = quiz.status === "published";
  const neverPublished = !quiz.publishedAt;
  const stepLabel: Record<PublishIssue["step"], string> = { general: "Informations", questions: "Questions", profiles: "Profils", capture: "Capture", result: "Résultats" };
  const channelUrl = (id: string) => `${url}?utm_source=${id}&utm_medium=${id === "email" ? "email" : "social"}`;
  const share = encodeURIComponent(`${config.title} — ${channelUrl("whatsapp")}`);

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-semibold">Contrôle avant publication</h3>
          {issues.length === 0 ? <Badge tone="success"><CheckCircle2 className="size-3" /> Prêt à publier</Badge> : <Badge tone="warning"><TriangleAlert className="size-3" /> {issues.length} point{issues.length > 1 ? "s" : ""} à corriger</Badge>}
        </div>
        {issues.length === 0 ? (
          <p className="text-sm text-muted-foreground">Titre, questions, réponses, scoring, profils et formulaire de capture sont cohérents.</p>
        ) : (
          <ul className="space-y-2">
            {issues.map((i, k) => (
              <li key={k} className="flex items-start justify-between gap-3 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-soft-foreground">
                <span>{i.message}</span>
                <button onClick={() => goTo(i.step === "result" ? "results" : i.step)} className="shrink-0 font-medium underline underline-offset-2">Corriger ({stepLabel[i.step]})</button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-semibold">Adresse publique</h3>
          {published ? <Badge tone="success">En ligne{quiz.publishedAt ? ` depuis le ${fmtDate(quiz.publishedAt)}` : ""}</Badge> : <Badge tone="neutral">Non publié</Badge>}
        </div>
        <Field label="Lien du quiz" htmlFor="slug" error={slugError ?? undefined} hint={neverPublished ? "Vous pouvez modifier la fin de l'adresse tant que le quiz n'a jamais été publié." : "L'adresse est figée : les liens déjà partagés continueront de fonctionner."}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex min-w-0 flex-1 items-center rounded-lg border border-input bg-card text-sm">
              <span className="hidden truncate pl-3 text-muted-foreground sm:block">{origin}/q/</span>
              <Input id="slug" value={slug} disabled={!neverPublished} onChange={(e) => onSlugChange(e.target.value)} className="border-0 bg-transparent focus-visible:outline-0" />
            </div>
            <Button variant="outline" onClick={() => copy(url)} disabled={!published}><Copy /> Copier</Button>
            {published && <Button variant="outline" asChild><a href={`/q/${slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink /> Ouvrir</a></Button>}
          </div>
        </Field>

        {published && dirty === false && quiz.hasUnpublishedChanges && <Alert tone="info" title="Modifications non publiées">Le public voit encore la version précédente. Les participations déjà reçues conservent leur version d&apos;origine.</Alert>}

        <div className="flex flex-wrap gap-2">
          <Button onClick={onPublish} loading={busy} disabled={issues.length > 0 || (published && !quiz.hasUnpublishedChanges && !dirty)}><Rocket /> {published ? "Publier les modifications" : "Publier le quiz"}</Button>
          {published && <Button variant="outline" onClick={onUnpublish} disabled={busy}><Undo2 /> Dépublier</Button>}
        </div>
        {!published && <p className="text-sm text-muted-foreground">Dépublier ne supprime rien : les participations, les prospects et les statistiques sont conservés.</p>}
      </Card>

      {published && (
        <Card className="space-y-4 p-4 sm:p-5">
          <div><h3 className="font-display text-base font-semibold">Partager par canal</h3><p className="mt-1 text-sm text-muted-foreground">Chaque lien contient un paramètre UTM : vous verrez dans les statistiques d&apos;où viennent vos participants.</p></div>
          <ul className="divide-y rounded-lg border">
            {CHANNELS.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <div className="min-w-0"><p className="text-sm font-medium">{c.label}</p><p className="max-w-xs truncate text-xs text-muted-foreground sm:max-w-md">{channelUrl(c.id)}</p></div>
                <Button size="sm" variant="outline" onClick={() => copy(channelUrl(c.id))}><Copy /> Copier</Button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><a href={`https://wa.me/?text=${share}`} target="_blank" rel="noopener noreferrer"><MessageCircle /> Envoyer sur WhatsApp</a></Button>
            <Button asChild variant="outline" size="sm"><a href={`mailto:?subject=${encodeURIComponent(config.title)}&body=${encodeURIComponent(`Faites le test : ${channelUrl("email")}`)}`}><Mail /> Envoyer par email</a></Button>
            <Button asChild variant="ghost" size="sm"><Link href={`/lead-magnets/${quiz.id}/stats`}>Voir les statistiques</Link></Button>
          </div>
        </Card>
      )}
    </div>
  );
}
