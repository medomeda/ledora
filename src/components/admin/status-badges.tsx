import { Badge } from "@/components/ui/badge";
import { PLAN_LABELS, QUIZ_STATUS_LABELS } from "@/lib/constants/labels";
import type { BusinessStatus, PlanId, QuizStatus } from "@/types/domain";

export const PlanBadge = ({ plan }: { plan: PlanId }) => <Badge tone={plan === "pro" ? "ink" : plan === "starter" ? "info" : "neutral"}>{PLAN_LABELS[plan]}</Badge>;
export const AccountStatusBadge = ({ status }: { status: BusinessStatus }) => (status === "suspended" ? <Badge tone="danger">Suspendu</Badge> : <Badge tone="success">Actif</Badge>);
export const QuizStatusBadge = ({ status }: { status: QuizStatus }) => <Badge tone={status === "published" ? "success" : status === "draft" ? "neutral" : "warning"}>{QUIZ_STATUS_LABELS[status]}</Badge>;
