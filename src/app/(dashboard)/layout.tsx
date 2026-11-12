import { LifeBuoy, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { logoutAction } from "@/actions/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Brand } from "@/components/layout/brand";
import { FeaturesProvider } from "@/components/layout/features-context";
import { Button } from "@/components/ui/button";
import { getBusinessOf, requireUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/permissions/staff";
import { getFeatures } from "@/lib/features";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const business = getBusinessOf(user.id);
  // Un administrateur sans espace client n'a rien à faire ici : son poste de travail est /admin.
  if (!business && isStaff(user.role)) redirect("/admin");
  if (business?.status === "suspended") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-5 text-center">
        <Brand />
        <h1 className="font-display text-3xl font-semibold">Votre espace est suspendu</h1>
        <p className="max-w-md text-muted-foreground">{business.suspensionReason ? `Motif : ${business.suspensionReason}. ` : ""}Vos données sont conservées. Contactez le support pour rétablir l&apos;accès.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild><a href="mailto:support@leadora.app"><LifeBuoy /> Contacter le support</a></Button>
          <form action={logoutAction}><Button variant="outline" type="submit"><LogOut /> Se déconnecter</Button></form>
        </div>
      </div>
    );
  }
  const announcement = read((s) => s.settings.announcement);
  return (
    <FeaturesProvider features={getFeatures()}>
      <AppShell user={{ firstName: user.firstName, lastName: user.lastName, email: user.email, emailVerified: user.emailVerified, businessName: business?.name ?? "Mon espace", isAdmin: isStaff(user.role) }} announcement={announcement}>
        {children}
      </AppShell>
    </FeaturesProvider>
  );
}
