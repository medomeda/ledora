import { Badge } from "@/components/ui/badge";
import { LEAD_STATUS_LABELS } from "@/lib/constants/labels";
import type { LeadStatus } from "@/types/domain";

const TONE: Record<LeadStatus, "neutral" | "info" | "warning" | "success" | "danger" | "ink"> = { new: "info", to_contact: "warning", contacted: "neutral", qualified: "ink", converted: "success", not_interested: "danger" };

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <Badge tone={TONE[status]}>{LEAD_STATUS_LABELS[status]}</Badge>;
}
