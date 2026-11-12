"use client";
import { Copy, MailPlus, MoreHorizontal, Power, Send, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { changeMemberRoleAction, inviteCollaboratorAction, removeCollaboratorAction, resendInvitationAction, setMemberAccessAction } from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { Alert } from "@/components/ui/feedback";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { STAFF_ROLE_INFO, STAFF_ROLES, type StaffRole } from "@/lib/permissions/staff";
import { fmtRelative } from "@/lib/utils/dates";
import type { TeamMember } from "@/services/team.service";

const STATUS = { active: { label: "Actif", tone: "success" }, invited: { label: "Invitation en attente", tone: "warning" }, disabled: { label: "Accès désactivé", tone: "danger" } } as const;

/** Gestion de l'équipe : invitation, rôle, désactivation, retrait. Les garde-fous (dernier administrateur, soi-même) sont appliqués par le service. */
export function TeamManager({ members }: { members: TeamMember[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", role: "support" as StaffRole });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [issued, setIssued] = useState<{ email: string; link: string } | null>(null);
  const [toRemove, setToRemove] = useState<TeamMember | null>(null);

  const absolute = (link: string) => (typeof window === "undefined" ? link : `${window.location.origin}${link}`);
  const copy = async (link: string) => { try { await navigator.clipboard.writeText(absolute(link)); toast.success("Lien copié."); } catch { toast.error("Copie impossible : sélectionnez le lien manuellement."); } };

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) => start(async () => {
    const r = await fn();
    if (r.ok) { toast.success(success); router.refresh(); } else toast.error(r.error ?? "Action impossible.");
  });

  const invite = () => start(async () => {
    const r = await inviteCollaboratorAction(form);
    if (r.ok) { setErrors({}); setIssued({ email: r.data.email, link: r.data.link }); setForm({ firstName: "", lastName: "", email: "", role: "support" }); router.refresh(); } else setErrors(r.fieldErrors ?? { _: r.error });
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><Button onClick={() => { setIssued(null); setErrors({}); setInviteOpen(true); }}><UserPlus /> Inviter un collaborateur</Button></div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card className="overflow-hidden">
          <Table>
            <THead><tr><TH>Collaborateur</TH><TH>Rôle</TH><TH>Statut</TH><TH>Dernière connexion</TH><TH><span className="sr-only">Actions</span></TH></tr></THead>
            <tbody>
              {members.map((m) => (
                <TR key={m.id}>
                  <TD><p className="font-medium">{m.firstName} {m.lastName}{m.isSelf && <span className="ml-2 text-xs font-normal text-muted-foreground">(vous)</span>}</p><p className="text-xs text-muted-foreground">{m.email}</p></TD>
                  <TD>
                    {m.isSelf ? <Badge tone="ink">{STAFF_ROLE_INFO[m.role].label}</Badge> : (
                      <Select aria-label={`Rôle de ${m.firstName} ${m.lastName}`} value={m.role} disabled={pending} onChange={(e) => act(() => changeMemberRoleAction({ userId: m.id, role: e.target.value }), "Rôle modifié.")} className="h-9 w-40">
                        {STAFF_ROLES.map((r) => <option key={r} value={r}>{STAFF_ROLE_INFO[r].label}</option>)}
                      </Select>
                    )}
                  </TD>
                  <TD><Badge tone={STATUS[m.status].tone}>{STATUS[m.status].label}</Badge></TD>
                  <TD className="whitespace-nowrap text-muted-foreground">{m.lastLoginAt ? fmtRelative(m.lastLoginAt) : "Jamais"}</TD>
                  <TD className="text-right">
                    {!m.isSelf && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Actions pour ${m.firstName} ${m.lastName}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {m.status === "invited" && <DropdownMenuItem onSelect={() => act(async () => { const r = await resendInvitationAction({ userId: m.id }); if (r.ok) setIssued({ email: m.email, link: r.data.link }); return r; }, "Nouveau lien d'invitation émis.")}><Send /> Renvoyer l&apos;invitation</DropdownMenuItem>}
                          <DropdownMenuItem onSelect={() => act(() => setMemberAccessAction({ userId: m.id, enabled: m.status === "disabled" }), m.status === "disabled" ? "Accès réactivé." : "Accès désactivé.")}><Power /> {m.status === "disabled" ? "Réactiver l'accès" : "Désactiver l'accès"}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive onSelect={() => setToRemove(m)}><Trash2 /> Retirer de l&apos;équipe</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card className="h-fit p-5">
          <h2 className="font-display text-base font-semibold">Les rôles</h2>
          <dl className="mt-3 space-y-4 text-sm">
            {STAFF_ROLES.map((r) => <div key={r}><dt className="font-medium">{STAFF_ROLE_INFO[r].label}</dt><dd className="mt-0.5 text-muted-foreground">{STAFF_ROLE_INFO[r].description}</dd></div>)}
          </dl>
        </Card>
      </div>

      {issued && !inviteOpen && (
        <Alert tone="info" title={`Lien d'invitation pour ${issued.email} (valable 7 jours)`}>
          <p className="mb-2">Aucun email n&apos;est envoyé en simulation : transmettez-lui ce lien, il y choisira son mot de passe.</p>
          <div className="flex flex-wrap items-center gap-2"><Link href={issued.link} target="_blank" className="break-all underline">{absolute(issued.link)}</Link><Button size="sm" variant="outline" onClick={() => copy(issued.link)}><Copy /> Copier</Button></div>
        </Alert>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent title="Inviter un collaborateur" description="Il choisira lui-même son mot de passe via un lien d'invitation valable 7 jours.">
          {issued ? (
            <div className="space-y-4">
              <Alert tone="success" title="Invitation créée">Transmettez ce lien à {issued.email} (aucun email n&apos;est envoyé en simulation).</Alert>
              <Input readOnly aria-label="Lien d'invitation" value={absolute(issued.link)} onFocus={(e) => e.currentTarget.select()} />
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setInviteOpen(false); }}>Fermer</Button><Button onClick={() => copy(issued.link)}><Copy /> Copier le lien</Button></div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); invite(); }} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Prénom" htmlFor="t-first" error={errors.firstName}><Input id="t-first" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} autoFocus /></Field>
                <Field label="Nom" htmlFor="t-last" error={errors.lastName}><Input id="t-last" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
              </div>
              <Field label="Email professionnel" htmlFor="t-email" error={errors.email}><Input id="t-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label="Rôle" htmlFor="t-role" hint={STAFF_ROLE_INFO[form.role].description} error={errors.role}>
                <Select id="t-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}>{STAFF_ROLES.map((r) => <option key={r} value={r}>{STAFF_ROLE_INFO[r].label}</option>)}</Select>
              </Field>
              {errors._ && <p role="alert" className="text-sm font-medium text-destructive">{errors._}</p>}
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Annuler</Button><Button type="submit" loading={pending}><MailPlus /> Créer l&apos;invitation</Button></div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toRemove}
        onOpenChange={(o) => !o && setToRemove(null)}
        destructive
        loading={pending}
        title="Retirer ce collaborateur ?"
        description={toRemove ? <>{toRemove.firstName} {toRemove.lastName} ({toRemove.email}) perdra définitivement son accès. Son historique d&apos;actions reste dans le journal d&apos;audit.</> : null}
        confirmLabel="Retirer"
        onConfirm={() => { const m = toRemove!; setToRemove(null); act(() => removeCollaboratorAction({ userId: m.id }), "Collaborateur retiré."); }}
      />
    </div>
  );
}
