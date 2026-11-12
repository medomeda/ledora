import type { Ctx } from "@/server/context";
import { isoNow, requireBusiness } from "@/server/context";
import type { DbState } from "@/server/db/store";
import { stripHtml } from "@/lib/utils/text";
import type { ActivityType, Business } from "@/types/domain";

export interface BusinessInput {
  name: string;
  activityType: ActivityType;
  industry: string;
  description: string;
  managerName: string;
  contactEmail: string;
  website: string;
  whatsapp?: string;
  bookingUrl?: string;
  logoUrl?: string | null;
  offers?: string[];
}

export function getBusiness(s: Readonly<DbState>, ctx: Ctx): Business {
  return requireBusiness(s, ctx);
}

export function updateBusiness(s: DbState, ctx: Ctx, input: BusinessInput): Business {
  const business = requireBusiness(s, ctx);
  business.name = stripHtml(input.name).trim();
  business.activityType = input.activityType;
  business.industry = stripHtml(input.industry);
  business.description = stripHtml(input.description);
  business.managerName = stripHtml(input.managerName);
  business.contactEmail = input.contactEmail;
  business.website = input.website;
  if (input.whatsapp !== undefined) business.whatsapp = stripHtml(input.whatsapp);
  if (input.bookingUrl !== undefined) business.bookingUrl = input.bookingUrl;
  if (input.logoUrl !== undefined) business.logoUrl = input.logoUrl;
  if (input.offers !== undefined) business.offers = input.offers.map(stripHtml).filter(Boolean);
  business.updatedAt = isoNow(ctx);
  return business;
}

export function updateOffers(s: DbState, ctx: Ctx, offers: string[]): Business {
  const business = requireBusiness(s, ctx);
  business.offers = offers.map((o) => stripHtml(o).trim()).filter(Boolean);
  business.updatedAt = isoNow(ctx);
  return business;
}

export function completeOnboarding(s: DbState, ctx: Ctx, input: BusinessInput): Business {
  const business = updateBusiness(s, ctx, input);
  business.onboardingCompletedAt = isoNow(ctx);
  return business;
}

export function skipOnboarding(s: DbState, ctx: Ctx): void {
  const business = requireBusiness(s, ctx);
  business.onboardingCompletedAt ??= isoNow(ctx);
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  href: string;
}

/** Checklist de démarrage affichée sur le dashboard (PRD §6.2, §6.3). */
export function getChecklist(s: Readonly<DbState>, ctx: Ctx): ChecklistItem[] {
  const b = requireBusiness(s, ctx);
  const quizzes = s.quizzes.filter((q) => q.businessId === b.id);
  const leads = s.leads.filter((l) => l.businessId === b.id);
  return [
    { id: "business", label: "Renseigner mon activité", done: !!b.onboardingCompletedAt && b.description.trim().length > 0, href: "/business" },
    { id: "quiz", label: "Créer mon premier quiz", done: quizzes.length > 0, href: "/lead-magnets/new" },
    { id: "publish", label: "Publier un quiz", done: quizzes.some((q) => q.publishedVersionId), href: "/lead-magnets" },
    { id: "lead", label: "Recevoir mon premier prospect", done: leads.length > 0, href: "/crm" },
  ];
}
