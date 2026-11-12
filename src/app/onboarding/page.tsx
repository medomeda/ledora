import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BusinessForm } from "@/components/forms/business-form";
import { Brand } from "@/components/layout/brand";
import { getBusinessOf, requireUser } from "@/lib/auth/session";
import "@/server/bootstrap";

export const metadata: Metadata = { title: "Configurer mon activité" };

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  const business = getBusinessOf(user.id);
  if (!business) redirect("/dashboard");
  return (
    <div className="min-h-dvh bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Brand href="/dashboard" className="mb-10" />
        <h1 className="font-display text-3xl font-semibold">Parlons de votre activité, {user.firstName}</h1>
        <p className="mb-8 mt-2 max-w-xl text-muted-foreground">Quelques informations suffisent pour personnaliser vos quiz et les propositions de l'IA. Vous pourrez tout compléter plus tard.</p>
        <div className="rounded-xl border bg-card p-6 sm:p-8">
          <BusinessForm business={business} mode="onboarding" />
        </div>
      </div>
    </div>
  );
}
