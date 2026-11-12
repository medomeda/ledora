import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { getBusinessOf, requireAdminUser } from "@/lib/auth/session";
import "@/server/bootstrap";

export const metadata: Metadata = { title: { default: "Administration", template: "%s · Administration Leadora" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdminUser();
  return <AdminShell user={{ firstName: user.firstName, lastName: user.lastName, email: user.email }} hasWorkspace={!!getBusinessOf(user.id)}>{children}</AdminShell>;
}
