import { z } from "zod";

/** Schémas Zod partagés : les mêmes règles valident les formulaires (client) et les actions (serveur). */
const text = (max: number) => z.string().trim().max(max, `${max} caractères maximum.`);
const required = (max: number, msg = "Ce champ est obligatoire.") => z.string().trim().min(1, msg).max(max, `${max} caractères maximum.`);
const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v), "Le lien doit commencer par http:// ou https://.");
const email = z.string().trim().toLowerCase().min(1, "L'email est obligatoire.").max(254).email("Adresse email invalide.");

export const passwordSchema = z
  .string()
  .min(8, "8 caractères minimum.")
  .max(128)
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), "Utilisez au moins une lettre et un chiffre.");

export const registerSchema = z.object({ firstName: required(60, "Le prénom est obligatoire."), lastName: required(60, "Le nom est obligatoire."), email, password: passwordSchema });
export const loginSchema = z.object({ email, password: z.string().min(1, "Le mot de passe est obligatoire.").max(128), next: z.string().optional() });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(10).max(200), password: passwordSchema });

export const profileSchema = z.object({ firstName: required(60), lastName: required(60) });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1, "Mot de passe actuel requis.").max(128), newPassword: passwordSchema });

export const activityTypes = ["coaching", "formation", "conseil", "entrepreneuriat", "services", "autre"] as const;

export const businessSchema = z.object({
  name: required(80, "Le nom de l'activité est obligatoire."),
  activityType: z.enum(activityTypes),
  industry: text(120),
  description: text(1000),
  managerName: text(100),
  contactEmail: z.string().trim().toLowerCase().max(254).refine((v) => v === "" || z.string().email().safeParse(v).success, "Adresse email invalide."),
  website: optionalUrl,
  whatsapp: text(30),
  bookingUrl: optionalUrl,
  logoUrl: z.string().max(400_000).nullable().optional(),
  offers: z.array(required(120)).max(10, "10 offres maximum."),
});

export const onboardingSchema = z.object({
  name: required(80, "Le nom de l'activité est obligatoire."),
  activityType: z.enum(activityTypes),
  industry: text(120),
  description: text(1000),
  managerName: text(100),
  contactEmail: businessSchema.shape.contactEmail,
  website: optionalUrl,
});

// ---- Quiz -----------------------------------------------------------------------------------------------------

const id = z.string().min(1).max(64);
const points = z.number().int("Nombre entier attendu.").min(-100).max(100);

export const quizOptionSchema = z.object({
  id,
  label: text(200),
  description: text(300),
  imageUrl: z.string().max(400_000).nullable(),
  points,
  profilePoints: z.array(z.object({ profileId: id, points })).max(20),
});

export const quizQuestionSchema = z.object({
  id,
  title: text(300),
  description: text(500),
  type: z.enum(["single", "multiple"]),
  isRequired: z.boolean(),
  options: z.array(quizOptionSchema).max(12, "12 réponses maximum par question."),
});

const list = z.array(text(400)).max(10);

export const quizProfileSchema = z.object({
  id,
  name: text(80),
  description: text(400),
  resultTitle: text(160),
  resultContent: text(3000),
  strengths: list,
  improvementAreas: list,
  recommendations: list,
  ctaLabel: text(80),
  ctaUrl: optionalUrl,
  priority: z.number().int().min(0).max(100),
  autoTags: z.array(text(40)).max(5),
  scoreRange: z.object({ min: z.number().int().min(0).max(10000), max: z.number().int().min(0).max(10000) }).nullable(),
});

export const captureSchema = z.object({
  position: z.enum(["before", "after"]),
  required: z.boolean(),
  title: text(120),
  message: text(400),
  askLastName: z.boolean(),
  askPhone: z.boolean(),
  phoneRequired: z.boolean(),
  consentLabel: text(400),
  privacyUrl: optionalUrl,
});

export const quizConfigSchema = z.object({
  title: text(120),
  description: text(500),
  introduction: text(1500),
  objective: text(300),
  category: text(60),
  coverImage: z.string().max(600_000).nullable(),
  estimatedMinutes: z.number().int().min(1).max(60),
  questions: z.array(quizQuestionSchema).max(30, "30 questions maximum."),
  scoringMode: z.enum(["profiles", "ranges"]),
  profiles: z.array(quizProfileSchema).max(8, "8 profils maximum."),
  capture: captureSchema,
  result: z.object({ showScore: z.boolean(), fallbackTitle: text(160), fallbackContent: text(1500) }),
  startLabel: text(60),
});

export const createQuizSchema = z.object({ title: required(120, "Donnez un titre à votre quiz."), category: text(60), description: text(500) });
export const quizIdSchema = z.object({ quizId: id });
export const saveQuizSchema = z.object({ quizId: id, config: quizConfigSchema });

// ---- Public (participant) ----------------------------------------------------------------------------------------

const utm = z.object({ source: z.string().max(100).nullable().optional(), medium: z.string().max(100).nullable().optional(), campaign: z.string().max(100).nullable().optional(), referrer: z.string().max(300).nullable().optional() });
const sessionId = z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/);

export const contactSchema = z.object({
  firstName: required(60, "Votre prénom est obligatoire."),
  lastName: text(60).optional().default(""),
  email,
  phone: text(30).optional().default(""),
  marketingConsent: z.boolean(),
});

export const publicEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("visit"), sessionId, utm }),
  z.object({ type: z.literal("start"), sessionId, utm }),
  z.object({ type: z.literal("contact"), sessionId, contact: contactSchema }),
  z.object({ type: z.literal("complete"), sessionId, answers: z.record(z.string().max(64), z.array(z.string().max(64)).max(12)), contact: contactSchema.nullable().optional() }),
]);

// ---- CRM -------------------------------------------------------------------------------------------------------

export const leadStatusSchema = z.enum(["new", "to_contact", "contacted", "qualified", "converted", "not_interested"]);
export const updateLeadStatusSchema = z.object({ leadId: id, status: leadStatusSchema });
export const leadNoteSchema = z.object({ leadId: id, content: required(2000, "La note ne peut pas être vide.") });
export const leadTagSchema = z.object({ leadId: id, name: required(40, "Le tag est vide.") });
export const removeLeadTagSchema = z.object({ leadId: id, tagId: id });
export const deleteNoteSchema = z.object({ noteId: id });
export const updateLeadSchema = z.object({ leadId: id, firstName: required(60), lastName: text(60), phone: text(30) });
export const deleteLeadSchema = z.object({ leadId: id });

// ---- Publications ----------------------------------------------------------------------------------------------

export const publicationSchema = z.object({
  id: id.optional(),
  title: required(160, "Le titre est obligatoire."),
  content: text(3000),
  platform: z.enum(["facebook", "instagram", "linkedin", "whatsapp", "autre"]),
  visualUrl: z.string().max(400_000).nullable().optional(),
  contentPillar: text(60),
  objective: text(60),
  quizId: id.nullable().optional(),
  status: z.enum(["idea", "draft", "to_validate", "scheduled", "published"]),
  scheduledAt: z.string().max(40).nullable().optional(),
});
export const deletePublicationSchema = z.object({ id });

// ---- IA --------------------------------------------------------------------------------------------------------

export const aiGenerateQuizSchema = z.object({
  brief: required(1500, "Décrivez votre besoin.").pipe(z.string().min(20, "Décrivez votre besoin en quelques phrases (20 caractères minimum).")),
  target: text(200),
  tone: z.enum(["professionnel", "chaleureux", "dynamique", "expert"]),
  questionCount: z.number().int().min(3).max(10),
});
export const aiImproveSchema = z.object({ kind: z.enum(["title", "introduction", "question", "answer", "result", "cta"]), text: required(2000, "Saisissez le texte à améliorer."), instruction: text(300).optional().default("") });
export const aiAdoptSchema = z.object({ generationId: id });
