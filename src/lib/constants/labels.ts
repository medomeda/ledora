import type { ActivityType, LeadStatus, PublicationPlatform, PublicationStatus, QuizStatus, TrafficSource } from "@/types/domain";

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  coaching: "Coaching",
  formation: "Formation",
  conseil: "Conseil",
  entrepreneuriat: "Entrepreneuriat",
  services: "Services",
  autre: "Autre",
};

export const QUIZ_STATUS_LABELS: Record<QuizStatus, string> = { draft: "Brouillon", published: "Publié", archived: "Archivé" };

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nouveau",
  to_contact: "À contacter",
  contacted: "Contacté",
  qualified: "Qualifié",
  converted: "Converti",
  not_interested: "Non intéressé",
};
export const LEAD_STATUS_ORDER: LeadStatus[] = ["new", "to_contact", "contacted", "qualified", "converted", "not_interested"];

export const PLATFORM_LABELS: Record<PublicationPlatform, string> = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", whatsapp: "WhatsApp", autre: "Autre" };

export const PUBLICATION_STATUS_LABELS: Record<PublicationStatus, string> = { idea: "Idée", draft: "Brouillon", to_validate: "À valider", scheduled: "Planifiée", published: "Publiée" };
export const PUBLICATION_STATUS_ORDER: PublicationStatus[] = ["idea", "draft", "to_validate", "scheduled", "published"];

export const SOURCE_LABELS: Record<TrafficSource, string> = { direct: "Direct", facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", whatsapp: "WhatsApp", email: "Email", autre: "Autre" };
export const SOURCE_ORDER: TrafficSource[] = ["direct", "facebook", "instagram", "linkedin", "whatsapp", "email", "autre"];

export const QUIZ_CATEGORIES = ["Finance", "Business", "Leadership", "Développement personnel", "Marketing", "Formation & compétences", "Santé & bien-être", "Langues", "Autre"];

export const CONTENT_PILLARS = ["Éducation", "Preuve sociale", "Coulisses", "Offre", "Inspiration", "Lead magnet"];
export const PUBLICATION_OBJECTIVES = ["Notoriété", "Engagement", "Générer des leads", "Promouvoir une offre", "Fidéliser"];

/** Couleurs des tags (CRM). */
export const TAG_COLORS = ["#6d5dfc", "#0f9d8a", "#e2574c", "#d98e04", "#3b82f6", "#8b5cf6", "#64748b"];
