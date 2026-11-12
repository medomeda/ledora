import { ScrollText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminFilters } from "@/components/admin/filters";
import { Pager } from "@/components/admin/pager";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { requireStaffUser } from "@/lib/auth/session";
import { AUDIT_ACTION_LABELS } from "@/lib/constants/labels";
import { fmtDateTime } from "@/lib/utils/dates";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { listAudit } from "@/services/admin.service";

export const metadata: Metadata = { title: "Journal d'audit" };
type SP = Record<string, string | undefined>;
const TONE = { account: "info", quiz: "warning", plan: "ink", settings: "neutral", team: "success" } as const;

export default async function AuditPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await requireStaffUser("/admin/journal");
  const { page, existing } = read((s) => ({ page: listAudit(s, ctxFor(user.id), { q: sp.q, action: sp.type, page: Number(sp.page) || 1 }), existing: new Set(s.businesses.map((b) => b.id)) }));
  return (
    <div>
      <PageHeader title="Journal d'audit" description="Qui a fait quoi, sur quoi et quand. Ce journal n'est pas modifiable." />
      <AdminFilters placeholder="Rechercher une cible, un auteur ou un détail…" selects={[{ key: "type", label: "Toutes les actions", options: [{ value: "account", label: "Comptes" }, { value: "quiz", label: "Quiz" }, { value: "plan", label: "Offres" }, { value: "settings", label: "Réglages" }, { value: "team", label: "Équipe" }] }]} />
      <p className="mb-2 text-sm text-muted-foreground" aria-live="polite">{page.total} événement{page.total > 1 ? "s" : ""}</p>
      <Card className="overflow-hidden">
        {page.rows.length === 0 ? <EmptyState icon={ScrollText} title="Aucun événement" description="Les actions d'administration apparaîtront ici." /> : (
          <Table>
            <THead><tr><TH>Date</TH><TH>Action</TH><TH>Cible</TH><TH>Détail</TH><TH>Auteur</TH></tr></THead>
            <tbody>
              {page.rows.map((l) => (
                <TR key={l.id}>
                  <TD className="whitespace-nowrap text-muted-foreground">{fmtDateTime(l.createdAt)}</TD>
                  <TD><Badge tone={TONE[l.targetType]}>{AUDIT_ACTION_LABELS[l.action]}</Badge></TD>
                  <TD className="font-medium">{l.targetType === "account" && existing.has(l.targetId) ? <Link href={`/admin/comptes/${l.targetId}`} className="hover:underline">{l.targetLabel}</Link> : l.targetLabel}</TD>
                  <TD className="max-w-80 text-muted-foreground">{l.details || "—"}</TD>
                  <TD className="whitespace-nowrap text-muted-foreground">{l.actorEmail}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Pager basePath="/admin/journal" sp={sp} page={page.page} pages={page.pages} />
    </div>
  );
}
