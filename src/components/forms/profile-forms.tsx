"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { changePasswordAction, updateProfileAction } from "@/actions/auth";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { changePasswordSchema, profileSchema } from "@/lib/validations";

export function ProfileForm({ firstName, lastName, email }: { firstName: string; lastName: string; email: string }) {
  type V = z.input<typeof profileSchema>;
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<V>({ resolver: zodResolver(profileSchema), defaultValues: { firstName, lastName } });
  const [pending, start] = useTransition();
  return (
    <form onSubmit={handleSubmit((v) => start(async () => { const r = await updateProfileAction(v); if (r.ok) toast.success("Profil mis à jour."); else toast.error(r.error); }))} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="p-first" error={errors.firstName?.message}><Input id="p-first" {...register("firstName")} /></Field>
        <Field label="Nom" htmlFor="p-last" error={errors.lastName?.message}><Input id="p-last" {...register("lastName")} /></Field>
      </div>
      <Field label="Email de connexion" htmlFor="p-email"><Input id="p-email" value={email} disabled readOnly /></Field>
      <Button type="submit" loading={pending} disabled={!isDirty}>Enregistrer</Button>
    </form>
  );
}

export function PasswordForm() {
  type V = z.input<typeof changePasswordSchema>;
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<V>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: "", newPassword: "" } });
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <form onSubmit={handleSubmit((v) => start(async () => {
      setErr(null);
      const r = await changePasswordAction(v);
      if (r.ok) { toast.success(r.message ?? "Mot de passe modifié."); reset(); return; }
      setErr(r.error);
      for (const [k, m] of Object.entries(r.fieldErrors ?? {})) setError(k as keyof V, { message: m });
    }))} className="space-y-4" noValidate>
      {err && <Alert tone="error">{err}</Alert>}
      <Field label="Mot de passe actuel" htmlFor="cur" error={errors.currentPassword?.message}><Input id="cur" type="password" autoComplete="current-password" {...register("currentPassword")} /></Field>
      <Field label="Nouveau mot de passe" htmlFor="new" error={errors.newPassword?.message} hint="8 caractères minimum, avec au moins une lettre et un chiffre."><Input id="new" type="password" autoComplete="new-password" {...register("newPassword")} /></Field>
      <Button type="submit" loading={pending}>Changer le mot de passe</Button>
    </form>
  );
}
