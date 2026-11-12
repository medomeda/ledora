import "server-only";
import { resolve } from "node:path";
import type { AiGeneration, AuditLog, Business, Lead, LeadNote, LeadSubmission, LeadTag, PlatformSettings, Publication, Quiz, QuizSubmission, QuizVersion, QuizVisit, Tag, User } from "@/types/domain";

/**
 * Accès aux données. Les services de règles métier (src/services) travaillent sur un `DbState` en mémoire ; ce module
 * le charge depuis PostgreSQL et en persiste la différence. Pilotes :
 *  - PostgreSQL (`DATABASE_URL`) : développement et production. Chaque appel charge seulement ce dont sa `Scope` a besoin,
 *    exécute le service dans une transaction (un seul écrivain à la fois) et écrit la différence ;
 *  - PGlite (défaut sans `DATABASE_URL`) : le même SQL, embarqué dans le processus, sans installation (`.data/pglite`).
 * Better Auth (comptes, sessions) lit et écrit les MÊMES tables (users, accounts, sessions, verifications).
 */

/** Compte de connexion (table « account » de Better Auth). Le mot de passe est celui du fournisseur « credential ». */
export interface Account {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  /** scrypt — format « scrypt$N$r$p$sel$empreinte » (voir lib/auth/password.ts, branché dans Better Auth). */
  password: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Session de connexion (table « session » de Better Auth), gérée par Better Auth. */
export interface SessionRow {
  id: string;
  token: string;
  userId: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Jeton à usage unique (table « verification » de Better Auth) : `identifier` = « reset-password:<jeton> », `value` = id de l'utilisateur. */
export interface Verification {
  id: string;
  identifier: string;
  value: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbState {
  version: number;
  users: User[];
  accounts: Account[];
  sessions: SessionRow[];
  verifications: Verification[];
  businesses: Business[];
  quizzes: Quiz[];
  quizVersions: QuizVersion[];
  quizVisits: QuizVisit[];
  quizSubmissions: QuizSubmission[];
  leads: Lead[];
  leadSubmissions: LeadSubmission[];
  tags: Tag[];
  leadTags: LeadTag[];
  leadNotes: LeadNote[];
  publications: Publication[];
  aiGenerations: AiGeneration[];
  auditLogs: AuditLog[];
  settings: PlatformSettings;
  /** Adresses déjà prises dans toute la base (le chargement par portée n'en voit qu'une partie) : unicité des adresses de quiz et d'espace. */
  reserved?: { quizSlugs: string[]; businessSlugs: string[] };
}

/**
 * Ce qu'une lecture ou une transaction a besoin de voir. Plus la portée est étroite, moins on charge.
 *  - `{ user }` : l'espace de ce propriétaire et tout son contenu ;
 *  - `{ account: id }` : seulement l'utilisateur, ses identifiants, sessions, jetons et la fiche de son espace (léger) ;
 *  - `{ slug, session?, email? }` : un quiz public, la session et le prospect concernés ;
 *  - `{ email }` : connexion et inscription ; `{ identifier }` : jeton de réinitialisation de mot de passe ;
 *  - `"admin"` : toute la plateforme (administration) ; `"settings"` : seulement les réglages.
 */
export type Scope = "admin" | "settings" | { user: string } | { account: string } | { email: string } | { identifier: string } | { slug: string; session?: string; email?: string };

export interface Driver {
  read<T>(scope: Scope, fn: (s: Readonly<DbState>) => T): Promise<T>;
  tx<T>(scope: Scope, fn: (s: DbState) => T): Promise<T>;
  replaceAll(state: DbState): Promise<void>;
  isEmpty(): Promise<boolean>;
}

export const SCHEMA_VERSION = 2;

export function emptyState(): DbState {
  return {
    version: SCHEMA_VERSION,
    users: [],
    accounts: [],
    sessions: [],
    verifications: [],
    businesses: [],
    quizzes: [],
    quizVersions: [],
    quizVisits: [],
    quizSubmissions: [],
    leads: [],
    leadSubmissions: [],
    tags: [],
    leadTags: [],
    leadNotes: [],
    publications: [],
    aiGenerations: [],
    auditLogs: [],
    settings: { registrationsOpen: true, announcement: "", planOverrides: {} },
  };
}

let seeder: ((state: DbState) => void) | null = null;

/** Enregistré par le module de seed (évite une dépendance circulaire). */
export function registerSeeder(fn: (state: DbState) => void) {
  seeder = fn;
}

const g = globalThis as typeof globalThis & { __leadoraDriver?: Promise<{ driver: Driver; db: unknown }> };

// ---- Choix du pilote ---------------------------------------------------------------------------------------------

export type DriverKind = "postgres" | "pglite";
export const driverKind = (): DriverKind => (process.env.DATABASE_URL ? "postgres" : "pglite");

async function createDriver(): Promise<{ driver: Driver; db: unknown }> {
  const kind = driverKind();
  const { createPgDriver } = await import("@/server/db/pg-driver");
  const folder = resolve(/* turbopackIgnore: true */ process.cwd(), "drizzle");
  let driver: Driver;
  let db: unknown;
  if (kind === "postgres") {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const pg = drizzle(postgres(process.env.DATABASE_URL!, { max: Number(process.env.DATABASE_POOL ?? 10), onnotice: () => {} }));
    await migrate(pg, { migrationsFolder: folder });
    driver = createPgDriver(pg);
    db = pg;
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const pg = drizzle(new PGlite(process.env.LEADORA_PGLITE_DIR ?? resolve(/* turbopackIgnore: true */ process.cwd(), ".data/pglite")));
    await migrate(pg, { migrationsFolder: folder });
    driver = createPgDriver(pg);
    db = pg;
  }
  // Jeu de démonstration : par défaut hors production, sur une base vide uniquement.
  const seedDemo = (process.env.LEADORA_SEED_DEMO ?? (process.env.NODE_ENV === "production" ? "0" : "1")) === "1";
  if (seedDemo && seeder && (await driver.isEmpty())) {
    const fresh = emptyState();
    seeder(fresh);
    await driver.replaceAll(fresh);
  }
  return { driver, db };
}

function getBoth() {
  return (g.__leadoraDriver ??= createDriver());
}

/** Pilote partagé par tous les modules (une seule connexion, migrations jouées une fois). */
export async function getDriver(): Promise<Driver> {
  return (await getBoth()).driver;
}

/** Instance Drizzle partagée (utilisée par Better Auth pour lire et écrire les mêmes tables). */
export async function getDb(): Promise<unknown> {
  return (await getBoth()).db;
}

/** Lecture seule de l'état visible depuis `scope`. Ne jamais muter l'objet reçu. */
export async function read<T>(scope: Scope, fn: (s: Readonly<DbState>) => T): Promise<T> {
  return (await getDriver()).read(scope, fn);
}

/** Transaction : si `fn` lève une erreur, aucune modification n'est conservée. */
export async function tx<T>(scope: Scope, fn: (s: DbState) => T): Promise<T> {
  return (await getDriver()).tx(scope, fn);
}

/** Comme `tx`, pour les actions qui ne renvoient rien. */
export async function txv(scope: Scope, fn: (s: DbState) => unknown): Promise<void> {
  await (await getDriver()).tx(scope, fn);
}

/** Réinitialise tout (tests et bouton « réinitialiser la démo »). */
export async function resetState(seed = true) {
  const fresh = emptyState();
  if (seed && seeder) seeder(fresh);
  await (await getDriver()).replaceAll(fresh);
}
