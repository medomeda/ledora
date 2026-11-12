import type { Metadata } from "next";
import { TeamManager } from "@/components/admin/team-manager";
import { PageHeader } from "@/components/ui/page-header";
import { requireStaffUser } from "@/lib/auth/session";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { listTeam } from "@/services/team.service";

export const metadata: Metadata = { title: "Équipe" };

export default async function TeamPage() {
  const user = await requireStaffUser("/admin/equipe", "team.manage");
  const members = read((s) => listTeam(s, ctxFor(user.id)));
  return (
    <div>
      <PageHeader title="Équipe" description="Les collaborateurs qui administrent la plateforme, avec le rôle qui limite ce qu'ils peuvent faire." />
      <TeamManager members={members} />
    </div>
  );
}
