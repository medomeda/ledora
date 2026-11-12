import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminFilters } from "@/components/admin/filters";
import { Pager } from "@/components/admin/pager";
import { AccountStatusBadge, PlanBadge } from "@/components/admin/status-badges";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { requireStaffUser } from "@/lib/auth/session";
import { PLAN_LABELS } from "@/lib/constants/labels";
import { fmtDate, fmtRelative } from "@/lib/utils/dates";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { listAccounts, type AccountFilters } from "@/services/admin.service";

export const metadata: Metadata = { title: "Comptes" };
type SP = Record<string, string | undefined>;

export default async function AccountsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await requireStaffUser("/admin/comptes");
  const filters: AccountFilters = {
    q: sp.q,
    plan: sp.plan === "free" || sp.plan === "starter" || sp.plan === "pro" ? sp.plan : "",
    status: sp.status === "active" || sp.status === "suspended" ? sp.status : "",
    sort: sp.sort === "name" || sp.sort === "usage" ? sp.sort : "recent",
    page: Number(sp.page) || 1,
  };
  const page = await read("admin", (s) => listAccounts(s, ctxFor(user.id), filters));
  return (
    <div>
      <PageHeader title="Comptes" description="Les espaces clients de la plateforme : suivez leur activité et agissez sur leur offre ou leur statut." />
      <AdminFilters placeholder="Rechercher une activité, un nom ou un email…" selects={[
        { key: "plan", label: "Toutes les offres", options: Object.entries(PLAN_LABELS).map(([value, label]) => ({ value, label })) },
        { key: "status", label: "Tous les statuts", options: [{ value: "active", label: "Actifs" }, { value: "suspended", label: "Suspendus" }] },
        { key: "sort", label: "Plus récents", options: [{ value: "name", label: "Nom (A → Z)" }, { value: "usage", label: "Plus gros usage" }] },
      ]} />
      <p className="mb-2 text-sm text-muted-foreground" aria-live="polite">{page.total} compte{page.total > 1 ? "s" : ""}</p>
      <Card className="overflow-hidden">
        {page.rows.length === 0 ? <EmptyState icon={Building2} title="Aucun compte ne correspond" description="Modifiez ou réinitialisez les filtres." /> : (
          <Table>
            <THead><tr><TH>Compte</TH><TH>Offre</TH><TH>Statut</TH><TH className="text-right">Quiz</TH><TH>Participations ce mois-ci</TH><TH className="text-right">Prospects</TH><TH>Inscrit le</TH><TH>Dernière connexion</TH></tr></THead>
            <tbody>
              {page.rows.map((a) => {
                const ratio = a.submissionsLimit ? Math.min(1, a.submissionsMonth / a.submissionsLimit) : 0;
                return (
                  <TR key={a.businessId}>
                    <TD><Link href={`/admin/comptes/${a.businessId}`} className="font-medium hover:underline">{a.name}</Link><p className="text-xs text-muted-foreground">{a.ownerName} · {a.email}</p></TD>
                    <TD><PlanBadge plan={a.plan} /></TD>
                    <TD><AccountStatusBadge status={a.status} /></TD>
                    <TD className="text-right tabular-nums">{a.publishedQuizzes}<span className="text-muted-foreground">/{a.activeQuizzes}</span></TD>
                    <TD className="min-w-44">
                      <div className="flex items-center gap-2"><div className="h-1.5 w-24 rounded-full bg-muted"><div className={`h-full rounded-full ${ratio >= 0.8 ? "bg-accent" : "bg-primary"}`} style={{ width: `${a.submissionsLimit === null ? 0 : ratio * 100}%` }} /></div><span className="text-xs tabular-nums text-muted-foreground">{a.submissionsMonth}{a.submissionsLimit !== null ? ` / ${a.submissionsLimit}` : ""}</span></div>
                    </TD>
                    <TD className="text-right tabular-nums">{a.leads}</TD>
                    <TD className="whitespace-nowrap text-muted-foreground">{fmtDate(a.createdAt)}</TD>
                    <TD className="whitespace-nowrap text-muted-foreground">{a.lastLoginAt ? fmtRelative(a.lastLoginAt) : "Jamais"}</TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
      <Pager basePath="/admin/comptes" sp={sp} page={page.page} pages={page.pages} />
    </div>
  );
}
