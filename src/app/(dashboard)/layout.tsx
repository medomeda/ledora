import type { ReactNode } from "react";
import { FeaturesProvider } from "@/components/layout/features-context";
import { getFeatures } from "@/lib/features";
import { AppShell } from "@/components/layout/app-shell";
import { getBusinessOf, requireUser } from "@/lib/auth/session";
import "@/server/bootstrap";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const business = getBusinessOf(user.id);
  return (
    <FeaturesProvider features={getFeatures()}>
    <AppShell user={{ firstName: user.firstName, lastName: user.lastName, email: user.email, emailVerified: user.emailVerified, businessName: business?.name ?? "Mon espace" }}>
      {children}
    </AppShell>
    </FeaturesProvider>
  );
}
