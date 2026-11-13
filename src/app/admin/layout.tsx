import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { getBusinessOf, requireStaffUser } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/demo";
import { permissionsOf, STAFF_ROLE_INFO, type StaffRole } from "@/lib/permissions/staff";
import "@/server/bootstrap";

export const metadata: Metadata = { title: { default: "Administration", template: "%s · Administration Leadora" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireStaffUser();
  return (
    <AdminShell user={{ firstName: user.firstName, lastName: user.lastName, email: user.email }} roleLabel={STAFF_ROLE_INFO[user.role as StaffRole].label} permissions={permissionsOf(user.role)} hasWorkspace={!!(await getBusinessOf(user.id))} demo={isDemoMode()}>
      {children}
    </AdminShell>
  );
}
