import { Check } from "lucide-react";
import type { Metadata } from "next";
import { PasswordForm, ProfileForm } from "@/components/forms/profile-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireStaffUser } from "@/lib/auth/session";
import { PERMISSION_LABELS, permissionsOf, STAFF_ROLE_INFO, type StaffRole } from "@/lib/permissions/staff";
import { fmtDate, fmtRelative } from "@/lib/utils/dates";
import { initials } from "@/lib/utils/text";
import "@/server/bootstrap";
import { read } from "@/server/db/store";

export const metadata: Metadata = { title: "Mon profil" };

export default async function AdminProfilePage() {
  const session = await requireStaffUser("/admin/profil");
  const user = await read({ account: session.id }, (s) => s.users.find((u) => u.id === session.id)!);
  const role = STAFF_ROLE_INFO[user.role as StaffRole];
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Mon profil" description="Vos informations, votre rôle dans l'équipe et votre mot de passe." />

      <Card>
        <CardBody className="flex flex-wrap items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent text-lg font-semibold text-primary" aria-hidden>{initials(user.firstName, user.lastName)}</span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-semibold">{user.firstName} {user.lastName}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Badge tone="ink">{role.label}</Badge>
        </CardBody>
        <dl className="grid gap-px border-t bg-border text-sm sm:grid-cols-3">
          {[["Membre depuis", fmtDate(user.createdAt)], ["Dernière connexion", user.lastLoginAt ? fmtRelative(user.lastLoginAt) : "—"], ["Email", user.emailVerified ? "Confirmé" : "Non confirmé"]].map(([k, v]) => (
            <div key={k} className="bg-card px-5 py-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>
          ))}
        </dl>
      </Card>

      <Card>
        <CardHeader><div><CardTitle>Mon rôle</CardTitle><CardDescription>{role.description}</CardDescription></div></CardHeader>
        <ul className="grid gap-2 p-5 text-sm sm:grid-cols-2">
          {permissionsOf(user.role).map((p) => <li key={p} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{PERMISSION_LABELS[p]}</li>)}
        </ul>
        <p className="border-t px-5 py-3 text-xs text-muted-foreground">Seul un administrateur peut modifier votre rôle (page Équipe).</p>
      </Card>

      <Card>
        <CardHeader><div><CardTitle>Informations personnelles</CardTitle><CardDescription>Votre nom, tel qu&apos;il apparaît dans le journal d&apos;audit et l&apos;équipe.</CardDescription></div></CardHeader>
        <CardBody><ProfileForm firstName={user.firstName} lastName={user.lastName} email={user.email} /></CardBody>
      </Card>

      <Card>
        <CardHeader><div><CardTitle>Mot de passe</CardTitle><CardDescription>Vos autres sessions seront fermées après le changement.</CardDescription></div></CardHeader>
        <CardBody><PasswordForm /></CardBody>
      </Card>
    </div>
  );
}
