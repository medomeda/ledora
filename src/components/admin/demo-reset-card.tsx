"use client";
import { RotateCcw } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { resetDemoAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";

/** Mode test : remet toute la plateforme dans l'état de la démonstration. */
export function DemoResetCard() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardHeader><div><CardTitle>Données de démonstration</CardTitle><CardDescription>Mode test : efface toutes les données (comptes, quiz, prospects) et recharge le jeu fictif. Vous serez déconnecté.</CardDescription></div></CardHeader>
      <CardBody>
        <Button variant="destructive" onClick={() => setOpen(true)}><RotateCcw /> Réinitialiser la démonstration</Button>
        <ConfirmDialog open={open} onOpenChange={setOpen} destructive loading={pending} title="Réinitialiser la démonstration ?" confirmLabel="Tout effacer et recharger" description="Toutes les données actuelles seront définitivement supprimées et remplacées par le jeu de démonstration. Tous les utilisateurs seront déconnectés."
          onConfirm={() => start(async () => { const r = await resetDemoAction(); if (r && !r.ok) { toast.error(r.error); setOpen(false); } })} />
      </CardBody>
    </Card>
  );
}
