import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireStaffUser } from "@/lib/auth/session";
import { getFeatures } from "@/lib/features";
import { ctxFor } from "@/server/context";
import "@/server/bootstrap";
import { read } from "@/server/db/store";
import { getPlatformSettings } from "@/services/admin.service";

export const metadata: Metadata = { title: "Réglages" };

const FEATURES: Array<{ key: "ai" | "assistant" | "publications"; label: string; env: string }> = [
  { key: "ai", label: "Assistance IA dans la création de quiz", env: "LEADORA_FEATURE_AI" },
  { key: "assistant", label: "Assistant IA (page du menu)", env: "LEADORA_FEATURE_ASSISTANT" },
  { key: "publications", label: "Publications", env: "LEADORA_FEATURE_PUBLICATIONS" },
];

export default async function SettingsAdminPage() {
  const user = await requireStaffUser("/admin/reglages", "settings.manage");
  const settings = await read("admin", (s) => getPlatformSettings(s, ctxFor(user.id)));
  const features = getFeatures();
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Réglages" description="Paramètres de la plateforme, appliqués immédiatement." />
      <Card>
        <CardHeader><div><CardTitle>Plateforme</CardTitle><CardDescription>Inscriptions et communication avec les clients.</CardDescription></div></CardHeader>
        <CardBody><SettingsForm registrationsOpen={settings.registrationsOpen} announcement={settings.announcement} /></CardBody>
      </Card>
      <Card>
        <CardHeader><div><CardTitle>Modules</CardTitle><CardDescription>Activés par variable d&apos;environnement au déploiement (lecture seule ici).</CardDescription></div></CardHeader>
        <ul className="divide-y">
          {FEATURES.map((f) => (
            <li key={f.key} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <div><p className="font-medium">{f.label}</p><p className="font-mono text-xs text-muted-foreground">{f.env}</p></div>
              <Badge tone={features[f.key] ? "success" : "neutral"}>{features[f.key] ? "Activé" : "Désactivé"}</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
