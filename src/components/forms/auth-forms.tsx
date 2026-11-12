"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction } from "@/actions/auth";
import type { ActionResult } from "@/actions/_shared";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { forgotPasswordSchema, loginSchema, passwordSchema, registerSchema } from "@/lib/validations";

/** Applique les erreurs renvoyées par le serveur sur les champs du formulaire. */
function useServerErrors<T extends Record<string, unknown>>(setError: (name: keyof T & string, e: { message: string }) => void) {
  const [formError, setFormError] = useState<string | null>(null);
  return {
    formError,
    clear: () => setFormError(null),
    handle: (res: ActionResult<unknown> | void) => {
      // Une redirection serveur ne retourne rien : on ne fait rien.
      if (!res || res.ok) return;
      setFormError(res.error);
      for (const [k, m] of Object.entries(res.fieldErrors ?? {})) setError(k as keyof T & string, { message: m });
    },
  };
}

function PasswordInput({ id, invalid, autoComplete, ...rest }: { id: string; invalid?: boolean; autoComplete: string } & React.ComponentProps<"input">) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} autoComplete={autoComplete} aria-invalid={invalid} className="pr-10" {...rest} />
      <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function LoginForm({ next, reset, showDemo }: { next?: string; reset?: boolean; showDemo: boolean }) {
  type V = z.input<typeof loginSchema>;
  const { register, handleSubmit, setError, setValue, formState: { errors } } = useForm<V>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "", next } });
  const { formError, handle, clear } = useServerErrors<V>(setError);
  const [pending, start] = useTransition();
  return (
    <form onSubmit={handleSubmit((v) => { clear(); start(async () => handle(await loginAction(v))); })} className="space-y-4" noValidate>
      {reset && <Alert tone="success" title="Mot de passe modifié">Connectez-vous avec votre nouveau mot de passe.</Alert>}
      {formError && <Alert tone="error">{formError}</Alert>}
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      <Field label="Mot de passe" htmlFor="password" error={errors.password?.message}>
        <PasswordInput id="password" autoComplete="current-password" invalid={!!errors.password} {...register("password")} />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">Mot de passe oublié ?</Link>
      </div>
      <Button type="submit" className="w-full" size="lg" loading={pending}>Se connecter</Button>
      {showDemo && (
        <div className="rounded-lg border border-dashed p-3 text-sm">
          <p className="mb-2 font-medium">Comptes de démonstration</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => { setValue("email", "demo@leadora.app"); setValue("password", "Leadora2026"); }}>Espace complet</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => { setValue("email", "nouveau@leadora.app"); setValue("password", "Leadora2026"); }}>Espace vide</Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Mot de passe : Leadora2026</p>
        </div>
      )}
    </form>
  );
}

export function RegisterForm() {
  type V = z.input<typeof registerSchema>;
  const { register, handleSubmit, setError, formState: { errors } } = useForm<V>({ resolver: zodResolver(registerSchema), defaultValues: { firstName: "", lastName: "", email: "", password: "" } });
  const { formError, handle, clear } = useServerErrors<V>(setError);
  const [pending, start] = useTransition();
  return (
    <form onSubmit={handleSubmit((v) => { clear(); start(async () => handle(await registerAction(v))); })} className="space-y-4" noValidate>
      {formError && <Alert tone="error">{formError}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="firstName" error={errors.firstName?.message}>
          <Input id="firstName" autoComplete="given-name" aria-invalid={!!errors.firstName} {...register("firstName")} />
        </Field>
        <Field label="Nom" htmlFor="lastName" error={errors.lastName?.message}>
          <Input id="lastName" autoComplete="family-name" aria-invalid={!!errors.lastName} {...register("lastName")} />
        </Field>
      </div>
      <Field label="Email professionnel" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      <Field label="Mot de passe" htmlFor="password" error={errors.password?.message} hint="8 caractères minimum, avec au moins une lettre et un chiffre.">
        <PasswordInput id="password" autoComplete="new-password" invalid={!!errors.password} {...register("password")} />
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={pending}>Créer mon espace</Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  type V = z.input<typeof forgotPasswordSchema>;
  const { register, handleSubmit, setError, formState: { errors } } = useForm<V>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });
  const { formError, handle, clear } = useServerErrors<V>(setError);
  const [pending, start] = useTransition();
  const [sent, setSent] = useState<{ link: string | null } | null>(null);
  if (sent) {
    return (
      <div className="space-y-4">
        <Alert tone="success" title="Demande enregistrée">Si un compte existe avec cette adresse, un lien de réinitialisation valable 1 heure vient d'être envoyé.</Alert>
        {sent.link && (
          <div className="rounded-lg border border-dashed p-4 text-sm">
            <p className="mb-1 flex items-center gap-2 font-medium"><MailCheck className="size-4" /> Mode démonstration</p>
            <p className="text-muted-foreground">Aucun email n'est réellement envoyé pour l'instant. Utilisez ce lien :</p>
            <Button asChild variant="outline" size="sm" className="mt-3"><Link href={sent.link}>Choisir un nouveau mot de passe</Link></Button>
          </div>
        )}
      </div>
    );
  }
  return (
    <form onSubmit={handleSubmit((v) => { clear(); start(async () => { const res = await forgotPasswordAction(v); if (res.ok) setSent(res.data); else handle(res); }); })} className="space-y-4" noValidate>
      {formError && <Alert tone="error">{formError}</Alert>}
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={pending}>Envoyer le lien</Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const check = passwordSchema.safeParse(password);
  return (
    <form onSubmit={(e) => { e.preventDefault(); setError(null); start(async () => { const res = await resetPasswordAction({ token, password }); if (res && !res.ok) setError(res.fieldErrors?.password ?? res.error); }); }} className="space-y-4" noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Nouveau mot de passe" htmlFor="password" hint="8 caractères minimum, avec au moins une lettre et un chiffre.">
        <PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={pending} disabled={!check.success}>Enregistrer le mot de passe</Button>
    </form>
  );
}
