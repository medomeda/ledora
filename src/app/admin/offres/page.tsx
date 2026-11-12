import type { Metadata } from "next";
import { PlanEditor } from "@/components/admin/plan-editor";
import { Alert } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { requireStaffUser } from "@/lib/auth/session";
import { allPlans, PLANS } from "@/lib/constants/plans";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { requireStaff } from "@/services/admin.service";

export const metadata: Metadata = { title: "Offres et quotas" };

export default async function PlansPage() {
  const user = await requireStaffUser("/admin/offres", "plans.configure");
  const plans = read((s) => {
    requireStaff(s, ctxFor(user.id), "plans.configure");
    return allPlans(s).map((p) => ({ ...p, accounts: s.businesses.filter((b) => b.plan === p.id).length, customized: !!s.settings.planOverrides[p.id] }));
  });
  return (
    <div className="space-y-6">
      <PageHeader title="Offres et quotas" description="Fixez les limites et le prix affiché de chaque offre. Les changements s'appliquent immédiatement, sans redéploiement." />
      <Alert tone="info">Abaisser un quota ne supprime rien : les comptes qui le dépassent conservent leurs données mais ne peuvent plus créer de quiz ou accepter de nouvelles participations tant qu&apos;ils sont au-dessus. Le paiement n&apos;est pas encore branché : l&apos;offre d&apos;un compte se change depuis sa fiche.</Alert>
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((p) => <PlanEditor key={`${p.id}-${p.priceLabel}-${p.maxActiveQuizzes}-${p.maxMonthlySubmissions}-${p.maxMonthlyAiGenerations}`} plan={p.id} name={PLANS[p.id].name} accounts={p.accounts} customized={p.customized} values={{ maxActiveQuizzes: p.maxActiveQuizzes, maxMonthlySubmissions: p.maxMonthlySubmissions, maxMonthlyAiGenerations: p.maxMonthlyAiGenerations, priceLabel: p.priceLabel }} />)}
      </div>
    </div>
  );
}
