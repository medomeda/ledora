/**
 * Modèle de domaine de Leadora (PRD §9). Les noms suivent les tables prévues pour PostgreSQL / Drizzle :
 * le passage à la persistance réelle ne devrait modifier ni les services ni les écrans.
 *
 * Choix de la phase simulée : la configuration d'un quiz (questions, réponses, scores, profils, formulaire, résultat)
 * est un document unique `QuizConfig` (équivalent JSONB). Il est figé à chaque publication dans une `QuizVersion` :
 * les participations pointent vers cette version et restent donc interprétables (PRD §9.2, §10.1).
 */
export type ISODateTime = string;

export type PlanId = "free" | "starter" | "pro";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerifiedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string;
  industry: string;
  activityType: ActivityType;
  managerName: string;
  contactEmail: string;
  logoUrl: string | null;
  website: string;
  whatsapp: string;
  bookingUrl: string;
  offers: string[];
  plan: PlanId;
  onboardingCompletedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type ActivityType = "coaching" | "formation" | "conseil" | "entrepreneuriat" | "services" | "autre";

export type QuizStatus = "draft" | "published" | "archived";
export type CapturePosition = "before" | "after";
export type QuestionType = "single" | "multiple";
export type LeadMagnetType = "quiz" | "form" | "pdf";

export interface ScoreRule {
  /** null = points ajoutés au score global uniquement. */
  profileId: string | null;
  points: number;
}

export interface QuizOption {
  id: string;
  label: string;
  description: string;
  imageUrl: string | null;
  /** Points globaux de la réponse (scoring global). */
  points: number;
  /** Contributions aux profils (scoring par profil). */
  profilePoints: Array<{ profileId: string; points: number }>;
}

export interface QuizQuestion {
  id: string;
  title: string;
  description: string;
  type: QuestionType;
  isRequired: boolean;
  options: QuizOption[];
}

export interface QuizProfile {
  id: string;
  name: string;
  description: string;
  resultTitle: string;
  resultContent: string;
  strengths: string[];
  improvementAreas: string[];
  recommendations: string[];
  ctaLabel: string;
  ctaUrl: string;
  /** Couleur d'identification (pastilles du créateur) ; absente = couleur attribuée selon la position. */
  color?: string;
  /** Plus la valeur est élevée, plus le profil l'emporte en cas d'égalité. */
  priority: number;
  /** Tags ajoutés automatiquement au prospect (PRD §6.7 D). */
  autoTags: string[];
  /** Plage de score global (mode « plages ») ; null si le profil n'en a pas. */
  scoreRange: { min: number; max: number } | null;
}

export type ScoringMode = "profiles" | "ranges";

export interface CaptureConfig {
  position: CapturePosition;
  required: boolean;
  title: string;
  message: string;
  askLastName: boolean;
  askPhone: boolean;
  phoneRequired: boolean;
  consentLabel: string;
  privacyUrl: string;
}

/** Apparence de la page publique du quiz. Tous les champs ont une valeur par défaut (voir lib/quiz/design.ts). */
export interface QuizDesign {
  themeId: "classique" | "sombre" | "ocean" | "foret" | "prune" | "epure";
  /** Surcharges facultatives (#rrggbb) de la palette du thème. */
  primaryColor: string | null;
  accentColor: string | null;
  backgroundColor: string | null;
  headingFont: "instrument" | "bricolage" | "dm-sans" | "space-grotesk" | "poppins" | "lora" | "fraunces" | "playfair" | "system";
  bodyFont: "instrument" | "bricolage" | "dm-sans" | "space-grotesk" | "poppins" | "lora" | "fraunces" | "playfair" | "system";
  titleSize: "m" | "l" | "xl";
  logoPosition: "left" | "center" | "hidden";
  logoSize: "s" | "m" | "l";
  showBrandName: boolean;
  align: "left" | "center";
  introLayout: "stack" | "split" | "hero";
  showMeta: boolean;
  corners: "sharp" | "rounded" | "soft";
  optionStyle: "outline" | "filled";
  progress: "bar" | "steps" | "none";
  background: "plain" | "gradient" | "dots";
  footerText: string;
  showPoweredBy: boolean;
}

export interface QuizConfig {
  /** Absent sur les quiz créés avant l'onglet Design : les valeurs par défaut s'appliquent. */
  design?: Partial<QuizDesign>;
  title: string;
  description: string;
  introduction: string;
  objective: string;
  category: string;
  coverImage: string | null;
  estimatedMinutes: number;
  questions: QuizQuestion[];
  scoringMode: ScoringMode;
  profiles: QuizProfile[];
  capture: CaptureConfig;
  result: {
    showScore: boolean;
    fallbackTitle: string;
    fallbackContent: string;
  };
  startLabel: string;
}

export interface Quiz {
  id: string;
  businessId: string;
  type: LeadMagnetType;
  slug: string;
  status: QuizStatus;
  /** Brouillon courant (toujours modifiable). */
  config: QuizConfig;
  /** Version publiée servie au public (null tant que jamais publié). */
  publishedVersionId: string | null;
  /** Modifications du brouillon non publiées depuis la dernière publication. */
  hasUnpublishedChanges: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  publishedAt: ISODateTime | null;
  archivedAt: ISODateTime | null;
}

export interface QuizVersion {
  id: string;
  quizId: string;
  version: number;
  config: QuizConfig;
  createdAt: ISODateTime;
}

export type SubmissionStatus = "started" | "completed";
export type TrafficSource = "direct" | "facebook" | "instagram" | "linkedin" | "whatsapp" | "email" | "autre";

export interface QuizVisit {
  id: string;
  quizId: string;
  sessionId: string;
  source: TrafficSource;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  createdAt: ISODateTime;
}

export interface SubmissionAnswer {
  questionId: string;
  optionIds: string[];
  scoreAwarded: number;
}

export interface QuizSubmission {
  id: string;
  quizId: string;
  versionId: string;
  businessId: string;
  sessionId: string;
  leadId: string | null;
  status: SubmissionStatus;
  answers: SubmissionAnswer[];
  totalScore: number;
  maxScore: number;
  profileId: string | null;
  /** Instantané du résultat, pour que l'historique ne change jamais. */
  profileName: string | null;
  source: TrafficSource;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  startedAt: ISODateTime;
  completedAt: ISODateTime | null;
}

export type LeadStatus = "new" | "to_contact" | "contacted" | "qualified" | "converted" | "not_interested";

export interface Lead {
  id: string;
  businessId: string;
  firstName: string;
  lastName: string;
  /** Email normalisé (minuscules, sans espaces) : unique par business. */
  email: string;
  phone: string;
  status: LeadStatus;
  lastInteractionAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface LeadSubmission {
  id: string;
  leadId: string;
  submissionId: string;
  marketingConsent: boolean;
  consentedAt: ISODateTime | null;
  consentPolicyVersion: string;
  createdAt: ISODateTime;
}

export interface Tag {
  id: string;
  businessId: string;
  name: string;
  color: string;
  createdAt: ISODateTime;
}

export interface LeadTag {
  leadId: string;
  tagId: string;
}

export interface LeadNote {
  id: string;
  leadId: string;
  content: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type PublicationPlatform = "facebook" | "instagram" | "linkedin" | "whatsapp" | "autre";
export type PublicationStatus = "idea" | "draft" | "to_validate" | "scheduled" | "published";

export interface Publication {
  id: string;
  businessId: string;
  title: string;
  content: string;
  platform: PublicationPlatform;
  visualUrl: string | null;
  contentPillar: string;
  objective: string;
  quizId: string | null;
  status: PublicationStatus;
  scheduledAt: ISODateTime | null;
  publishedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type AiGenerationType = "quiz" | "questions" | "profiles" | "results" | "improve" | "refine";

export interface AiGeneration {
  id: string;
  businessId: string;
  userId: string;
  type: AiGenerationType;
  input: Record<string, unknown>;
  output: unknown;
  provider: string;
  model: string;
  status: "success" | "error";
  createdAt: ISODateTime;
}
