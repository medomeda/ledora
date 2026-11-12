"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { completeOnboardingAction, saveBusinessAction, skipOnboardingAction } from "@/actions/business";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ACTIVITY_LABELS } from "@/lib/constants/labels";
import { resizeImage } from "@/lib/utils/image-client";
import { businessInfoSchema, businessSchema, onboardingSchema } from "@/lib/validations";
import type { Business } from "@/types/domain";

type Full = z.input<typeof businessInfoSchema>;

export function BusinessForm({ business, mode }: { business: Business; mode: "onboarding" | "full" }) {
  const full = mode === "full";
  const { register, handleSubmit, setError, setValue, watch, formState: { errors, isDirty } } = useForm<Full>({
    resolver: zodResolver(full ? businessInfoSchema : onboardingSchema.extend({ whatsapp: businessSchema.shape.whatsapp.optional(), bookingUrl: businessSchema.shape.bookingUrl.optional(), logoUrl: businessSchema.shape.logoUrl })) as Resolver<Full>,
    defaultValues: { name: business.name, activityType: business.activityType, industry: business.industry, description: business.description, managerName: business.managerName, contactEmail: business.contactEmail, website: business.website, whatsapp: business.whatsapp, bookingUrl: business.bookingUrl, logoUrl: business.logoUrl },
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const logo = watch("logoUrl");

  const submit = handleSubmit((values) => {
    setFormError(null);
    start(async () => {
      const res = full ? await saveBusinessAction(values) : await completeOnboardingAction(values);
      if (!res) return;
      if (res.ok) { toast.success("Informations enregistrées."); return; }
      setFormError(res.error);
      for (const [k, m] of Object.entries(res.fieldErrors ?? {})) setError(k as keyof Full, { message: m });
    });
  });

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {formError && <Alert tone="error">{formError}</Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nom de l'activité ou de la marque" htmlFor="name" error={errors.name?.message} className="sm:col-span-2">
          <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
        </Field>
        <Field label="Type d'activité" htmlFor="activityType" error={errors.activityType?.message}>
          <Select id="activityType" {...register("activityType")}>{Object.entries(ACTIVITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        </Field>
        <Field label="Domaine d'intervention" htmlFor="industry" optional hint="Ex. : coaching financier, marketing digital, langues…">
          <Input id="industry" {...register("industry")} />
        </Field>
        <Field label="Description de votre activité" htmlFor="description" className="sm:col-span-2" hint="Présentez votre activité en quelques phrases.">
          <Textarea id="description" rows={3} {...register("description")} />
        </Field>
        <Field label="Nom du responsable" htmlFor="managerName"><Input id="managerName" {...register("managerName")} /></Field>
        <Field label="Email professionnel" htmlFor="contactEmail" error={errors.contactEmail?.message}><Input id="contactEmail" type="email" aria-invalid={!!errors.contactEmail} {...register("contactEmail")} /></Field>
        <Field label="Site web" htmlFor="website" optional error={errors.website?.message}><Input id="website" placeholder="https://" aria-invalid={!!errors.website} {...register("website")} /></Field>
        {full && (
          <>
            <Field label="Lien WhatsApp" htmlFor="whatsapp" optional><Input id="whatsapp" placeholder="+33 6 00 00 00 00" {...register("whatsapp")} /></Field>
            <Field label="Lien de réservation" htmlFor="bookingUrl" optional error={errors.bookingUrl?.message} className="sm:col-span-2" hint="Proposé par défaut comme bouton d'action sur vos pages de résultat.">
              <Input id="bookingUrl" placeholder="https://cal.com/vous/decouverte" aria-invalid={!!errors.bookingUrl} {...register("bookingUrl")} />
            </Field>
          </>
        )}
      </div>

      <Field label="Logo" optional hint="Affiché sur vos quiz publics. PNG ou JPG.">
        <div className="flex items-center gap-4">
          <div className="flex size-16 items-center justify-center overflow-hidden rounded-xl border bg-muted text-muted-foreground">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo ? <img src={logo} alt="Logo" className="size-full object-contain" /> : <ImagePlus className="size-5" />}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setValue("logoUrl", await resizeImage(f, 256), { shouldDirty: true }); } catch (err) { toast.error(err instanceof Error ? err.message : "Image invalide."); } e.target.value = ""; }} />
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>{logo ? "Changer" : "Ajouter un logo"}</Button>
          {logo && <Button type="button" variant="ghost" size="sm" onClick={() => setValue("logoUrl", null, { shouldDirty: true })}>Retirer</Button>}
        </div>
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending} disabled={full && !isDirty} size={full ? "default" : "lg"}>{full ? "Enregistrer" : "Accéder à mon espace"}</Button>
        {!full && <Button type="button" variant="ghost" onClick={() => start(async () => void (await skipOnboardingAction()))}>Passer pour l'instant</Button>}
      </div>
    </form>
  );
}
