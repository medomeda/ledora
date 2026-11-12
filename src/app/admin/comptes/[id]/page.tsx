import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AccountActions } from "@/components/admin/account-actions";
import { AccountStatusBadge, PlanBadge, QuizStatusBadge } from "@/components/admin/status-badges";
import { Alert } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { requireStaffUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/staff";
import { guard } from "@/lib/auth/guard";
import { AUDIT_ACTION_LABELS } from "@/lib/constants/labels";
import { fmtDate, fmtDateTime, fmtRelative } from "@/lib/utils/dates";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { getAccount, previewAccountDeletion } from "@/services/admin.service";

export const metadata: Metadata = { title: "Compte" };

function Meter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const p = limit ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm"><span>{label}</span><span className="text-muted-foreground tabular-nums">{used} / {limit ?? "illimité"}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={label} aria-valuenow={used} aria-valuemin={0} aria-valuemax={limit ?? undefined}><div className={`h-full rounded-full ${p >= 80 ? "bg-destructive" : "bg-accent"}`} style={{ width: `${p}%` }} /></div>
    </div>
  );
}

const Row = ({ k, children }: { k: string; children: React.ReactNode }) => <div className="flex justify-between gap-4 py-2 text-sm"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{children}</dd></div>;

export default async function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireStaffUser(`/admin/comptes/${id}`);
  const ctx = ctxFor(user.id);
  const canDelete = can(user.role, "account.delete");
  const { d, impact } = await guard(() => read("admin", (s) => ({ d: getAccount(s, ctx, id), impact: canDelete ? previewAccountDeletion(s, ctx, id) : { quizzes: 0, submissions: 0, leads: 0 } })));
  const b = d.business;
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/comptes" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Tous les comptes</Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{b.name}</h1>
          <PlanBadge plan={b.plan} /><AccountStatusBadge status={b.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{d.owner.firstName} {d.owner.lastName} · {d.owner.email}</p>
      </div>

      {b.status === "suspended" && <Alert tone="error" title="Compte suspendu">{b.suspensionReason}{b.suspendedAt ? ` — depuis le ${fmtDate(b.suspendedAt)}` : ""}</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><div><CardTitle>Actions</CardTitle><CardDescription>Chaque action est consignée dans le journal d&apos;audit.</CardDescription></div></CardHeader>
          <CardBody>
            <AccountActions businessId={b.id} ownerEmail={d.owner.email} plan={b.plan} suspended={b.status === "suspended"} emailVerified={!!d.owner.emailVerifiedAt} can={{ support: can(user.role, "account.support"), billing: can(user.role, "account.billing"), delete: can(user.role, "account.delete") }} impact={impact} />
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><div><CardTitle>Usage du mois</CardTitle><CardDescription>Offre {d.plan.name}</CardDescription></div></CardHeader>
            <CardBody className="space-y-4">
              <Meter label="Quiz actifs" used={d.account.activeQuizzes} limit={d.plan.maxActiveQuizzes} />
              <Meter label="Participations" used={d.account.submissionsMonth} limit={d.plan.maxMonthlySubmissions} />
              <Meter label="Générations IA" used={d.usage.aiMonth} limit={d.plan.maxMonthlyAiGenerations} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
            <CardBody className="py-2"><dl className="divide-y">
              <Row k="Inscrit le">{fmtDate(b.createdAt)}</Row>
              <Row k="Dernière connexion">{d.owner.lastLoginAt ? fmtRelative(d.owner.lastLoginAt) : "Jamais"}</Row>
              <Row k="Email">{d.owner.emailVerifiedAt ? <Badge tone="success">Confirmé</Badge> : <Badge tone="warning">Non confirmé</Badge>}</Row>
              <Row k="Sessions ouvertes">{d.usage.sessions}</Row>
              <Row k="Prospects">{d.account.leads}</Row>
              <Row k="Activité">{b.industry || "—"}</Row>
              <Row k="Site web">{b.website || "—"}</Row>
            </dl></CardBody>
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader><div><CardTitle>Quiz du compte</CardTitle><CardDescription>Pour dépublier un quiz problématique, utilisez la page Quiz.</CardDescription></div></CardHeader>
        {d.quizzes.length === 0 ? <CardBody className="text-sm text-muted-foreground">Aucun quiz créé.</CardBody> : (
          <Table>
            <THead><tr><TH>Quiz</TH><TH>Statut</TH><TH className="text-right">Participations</TH><TH>Modifié</TH></tr></THead>
            <tbody>{d.quizzes.map((q) => (
              <TR key={q.id}><TD><p className="font-medium">{q.title}</p><p className="text-xs text-muted-foreground">/q/{q.slug}</p></TD><TD><QuizStatusBadge status={q.status} /></TD><TD className="text-right tabular-nums">{q.participants}</TD><TD className="text-muted-foreground">{fmtRelative(q.updatedAt)}</TD></TR>
            ))}</tbody>
          </Table>
        )}
      </Card>

      {d.audit.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Historique des actions sur ce compte</CardTitle></CardHeader>
          <ul className="divide-y">{d.audit.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
              <span><Badge tone="neutral">{AUDIT_ACTION_LABELS[l.action]}</Badge> {l.details && <span className="text-muted-foreground">{l.details}</span>}</span>
              <span className="text-xs text-muted-foreground">{l.actorEmail} · {fmtDateTime(l.createdAt)}</span>
            </li>
          ))}</ul>
        </Card>
      )}
    </div>
  );
}
