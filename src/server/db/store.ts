import "server-only";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { AiGeneration, AuditLog, Business, Lead, LeadNote, LeadSubmission, LeadTag, PlatformSettings, Publication, Quiz, QuizSubmission, QuizVersion, QuizVisit, Tag, User } from "@/types/domain";

/**
 * Accès aux données. Les services de règles métier (src/services) travaillent sur un `DbState` en mémoire ; ce module
 * le charge et le persiste, selon le pilote choisi :
 *  - PostgreSQL (`DATABASE_URL`) : le pilote de production. Chaque appel charge seulement ce dont sa `Scope` a besoin,
 *    exécute le service dans une transaction (un seul écrivain à la fois) et écrit la différence ;
 *  - PGlite (`LEADORA_DB=pglite`) : le même SQL, dans le processus, sans installation (développement, tests) ;
 *  - mémoire + fichier JSON (défaut) : la phase de démonstration d'origine, sans base.
 */
export interface Credential {
  userId: string;
  /** scrypt — format « scrypt$N$r$p$sel$empreinte » */
  passwordHash: string;
}

export interface SessionRow {
  /** SHA-256 du jeton : le jeton brut n'est jamais stocké. */
  tokenHash: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface TokenRow {
  tokenHash: string;
  userId: string;
  kind: "reset_password" | "verify_email";
  expiresAt: string;
  usedAt: string | null;
}

export interface DbState {
  version: number;
  users: User[];
  credentials: Credential[];
  sessions: SessionRow[];
  tokens: TokenRow[];
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
 *  - `{ email }` : connexion et inscription ; `{ token }` : jeton de réinitialisation ; `{ session }` : session d'un cookie ;
 *  - `"admin"` : toute la plateforme (administration) ; `"settings"` : seulement les réglages.
 */
export type Scope = "admin" | "settings" | { user: string } | { account: string } | { email: string } | { token: string } | { session: string } | { slug: string; session?: string; email?: string };

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
    credentials: [],
    sessions: [],
    tokens: [],
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

type Holder = { state: DbState | null };
const g = globalThis as typeof globalThis & { __leadoraDb?: Holder; __leadoraDriver?: Promise<Driver> };
const holder: Holder = (g.__leadoraDb ??= { state: null });

const persistEnabled = process.env.NODE_ENV !== "test" && process.env.LEADORA_DEMO_PERSIST !== "0";
const dbPath = resolve(/* turbopackIgnore: true */ process.cwd(), process.env.LEADORA_DEMO_DB_PATH ?? ".data/leadora-demo.json");

let seeder: ((state: DbState) => void) | null = null;

/** Enregistré par le module de seed (évite une dépendance circulaire). */
export function registerSeeder(fn: (state: DbState) => void) {
  seeder = fn;
}

// ---- Pilote « mémoire + fichier JSON » ---------------------------------------------------------------------------

function load(): DbState {
  if (holder.state?.version === SCHEMA_VERSION) return holder.state;
  holder.state = null;
  if (persistEnabled && existsSync(dbPath)) {
    try {
      const parsed = JSON.parse(readFileSync(dbPath, "utf8")) as { version?: number };
      if (parsed.version === SCHEMA_VERSION) {
        holder.state = parsed as DbState;
        return holder.state;
      }
    } catch {
      // Fichier corrompu ou d'une autre version : on repart d'un jeu de démonstration propre.
    }
  }
  const fresh = emptyState();
  if (seeder) seeder(fresh);
  holder.state = fresh;
  persist(fresh);
  return fresh;
}

function persist(state: DbState) {
  if (!persistEnabled) return;
  mkdirSync(dirname(dbPath), { recursive: true });
  const tmp = `${dbPath}.tmp`;
  writeFileSync(tmp, JSON.stringify(state));
  renameSync(tmp, dbPath);
}

const memoryDriver: Driver = {
  async read(_scope, fn) {
    return fn(load());
  },
  async tx(_scope, fn) {
    const draft = structuredClone(load());
    const result = fn(draft);
    holder.state = draft;
    persist(draft);
    return result;
  },
  async replaceAll(state) {
    holder.state = state;
    persist(state);
  },
  async isEmpty() {
    return load().users.length === 0;
  },
};

// ---- Choix du pilote ---------------------------------------------------------------------------------------------

export type DriverKind = "postgres" | "pglite" | "memory";
export const driverKind = (): DriverKind => (process.env.DATABASE_URL ? "postgres" : process.env.LEADORA_DB === "pglite" ? "pglite" : "memory");

async function createDriver(): Promise<Driver> {
  const kind = driverKind();
  if (kind === "memory") return memoryDriver;
  const { createPgDriver } = await import("@/server/db/pg-driver");
  const folder = resolve(/* turbopackIgnore: true */ process.cwd(), "drizzle");
  let driver: Driver;
  if (kind === "postgres") {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const db = drizzle(postgres(process.env.DATABASE_URL!, { max: Number(process.env.DATABASE_POOL ?? 10), onnotice: () => {} }));
    await migrate(db, { migrationsFolder: folder });
    driver = createPgDriver(db);
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const db = drizzle(new PGlite(process.env.LEADORA_PGLITE_DIR ?? resolve(/* turbopackIgnore: true */ process.cwd(), ".data/pglite")));
    await migrate(db, { migrationsFolder: folder });
    driver = createPgDriver(db);
  }
  // Jeu de démonstration : par défaut hors production, sur une base vide uniquement.
  const seedDemo = (process.env.LEADORA_SEED_DEMO ?? (process.env.NODE_ENV === "production" ? "0" : "1")) === "1";
  if (seedDemo && seeder && (await driver.isEmpty())) {
    const fresh = emptyState();
    seeder(fresh);
    await driver.replaceAll(fresh);
  }
  return driver;
}

/** Pilote partagé par tous les modules (une seule connexion, migrations jouées une fois). */
export function getDriver(): Promise<Driver> {
  return (g.__leadoraDriver ??= createDriver());
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
