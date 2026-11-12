import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Schéma PostgreSQL. Les colonnes portent exactement les noms des champs du modèle de domaine (types/domain.ts) :
 * la conversion ligne ↔ objet (db/mappers.ts) se limite aux dates et aux valeurs nulles.
 * Les structures imbriquées (configuration d'un quiz, réponses…) sont en JSONB.
 */
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  role: text("role").notNull().default("user"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  emailVerifiedAt: ts("email_verified_at"),
  lastLoginAt: ts("last_login_at"),
  disabledAt: ts("disabled_at"),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
}, (t) => [uniqueIndex("users_email_uq").on(t.email)]);

export const credentials = pgTable("credentials", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
});

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
  createdAt: ts("created_at").notNull(),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

export const tokens = pgTable("tokens", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
}, (t) => [index("tokens_user_idx").on(t.userId)]);

export const businesses = pgTable("businesses", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull().default(""),
  industry: text("industry").notNull().default(""),
  activityType: text("activity_type").notNull(),
  managerName: text("manager_name").notNull().default(""),
  contactEmail: text("contact_email").notNull().default(""),
  logoUrl: text("logo_url"),
  website: text("website").notNull().default(""),
  whatsapp: text("whatsapp").notNull().default(""),
  bookingUrl: text("booking_url").notNull().default(""),
  offers: jsonb("offers").$type<string[]>().notNull(),
  plan: text("plan").notNull().default("free"),
  status: text("status").notNull().default("active"),
  suspendedAt: ts("suspended_at"),
  suspensionReason: text("suspension_reason").notNull().default(""),
  onboardingCompletedAt: ts("onboarding_completed_at"),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
}, (t) => [uniqueIndex("businesses_owner_uq").on(t.ownerId), uniqueIndex("businesses_slug_uq").on(t.slug)]);

export const quizzes = pgTable("quizzes", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("quiz"),
  slug: text("slug").notNull(),
  status: text("status").notNull(),
  config: jsonb("config").$type<unknown>().notNull(),
  publishedVersionId: text("published_version_id"),
  hasUnpublishedChanges: boolean("has_unpublished_changes").notNull().default(false),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
  publishedAt: ts("published_at"),
  archivedAt: ts("archived_at"),
}, (t) => [uniqueIndex("quizzes_slug_uq").on(t.slug), index("quizzes_business_idx").on(t.businessId)]);

export const quizVersions = pgTable("quiz_versions", {
  id: text("id").primaryKey(),
  quizId: text("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  config: jsonb("config").$type<unknown>().notNull(),
  createdAt: ts("created_at").notNull(),
}, (t) => [index("quiz_versions_quiz_idx").on(t.quizId)]);

export const quizVisits = pgTable("quiz_visits", {
  id: text("id").primaryKey(),
  quizId: text("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  source: text("source").notNull(),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  createdAt: ts("created_at").notNull(),
}, (t) => [index("quiz_visits_quiz_session_idx").on(t.quizId, t.sessionId), index("quiz_visits_created_idx").on(t.quizId, t.createdAt)]);

export const quizSubmissions = pgTable("quiz_submissions", {
  id: text("id").primaryKey(),
  quizId: text("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  versionId: text("version_id").notNull(),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  leadId: text("lead_id"),
  status: text("status").notNull(),
  answers: jsonb("answers").$type<unknown>().notNull(),
  totalScore: integer("total_score").notNull().default(0),
  maxScore: integer("max_score").notNull().default(0),
  profileId: text("profile_id"),
  profileName: text("profile_name"),
  source: text("source").notNull(),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  startedAt: ts("started_at").notNull(),
  completedAt: ts("completed_at"),
}, (t) => [index("quiz_submissions_quiz_session_idx").on(t.quizId, t.sessionId), index("quiz_submissions_business_started_idx").on(t.businessId, t.startedAt)]);

export const leads = pgTable("leads", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull().default(""),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  status: text("status").notNull(),
  lastInteractionAt: ts("last_interaction_at"),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
}, (t) => [uniqueIndex("leads_business_email_uq").on(t.businessId, t.email)]);

export const leadSubmissions = pgTable("lead_submissions", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  submissionId: text("submission_id").notNull().references(() => quizSubmissions.id, { onDelete: "cascade" }),
  marketingConsent: boolean("marketing_consent").notNull(),
  consentedAt: ts("consented_at"),
  consentPolicyVersion: text("consent_policy_version").notNull(),
  createdAt: ts("created_at").notNull(),
}, (t) => [index("lead_submissions_lead_idx").on(t.leadId), index("lead_submissions_submission_idx").on(t.submissionId)]);

export const tags = pgTable("tags", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull(),
  createdAt: ts("created_at").notNull(),
}, (t) => [index("tags_business_idx").on(t.businessId)]);

export const leadTags = pgTable("lead_tags", {
  leadId: text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.leadId, t.tagId] })]);

export const leadNotes = pgTable("lead_notes", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
}, (t) => [index("lead_notes_lead_idx").on(t.leadId)]);

export const publications = pgTable("publications", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  platform: text("platform").notNull(),
  visualUrl: text("visual_url"),
  contentPillar: text("content_pillar").notNull().default(""),
  objective: text("objective").notNull().default(""),
  quizId: text("quiz_id"),
  status: text("status").notNull(),
  scheduledAt: ts("scheduled_at"),
  publishedAt: ts("published_at"),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
}, (t) => [index("publications_business_idx").on(t.businessId)]);

export const aiGenerations = pgTable("ai_generations", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  input: jsonb("input").$type<unknown>().notNull(),
  output: jsonb("output").$type<unknown>(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  status: text("status").notNull(),
  createdAt: ts("created_at").notNull(),
}, (t) => [index("ai_generations_business_idx").on(t.businessId, t.createdAt)]);

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").notNull(),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  targetLabel: text("target_label").notNull(),
  details: text("details").notNull().default(""),
  createdAt: ts("created_at").notNull(),
}, (t) => [index("audit_logs_created_idx").on(t.createdAt)]);

/** Réglages de la plateforme : une seule ligne (id = 1). */
export const platformSettings = pgTable("platform_settings", {
  id: integer("id").primaryKey(),
  data: jsonb("data").$type<unknown>().notNull(),
});
