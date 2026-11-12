import "server-only";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { AiGeneration, Business, Lead, LeadNote, LeadSubmission, LeadTag, Publication, Quiz, QuizSubmission, QuizVersion, QuizVisit, Tag, User } from "@/types/domain";

/**
 * Base de données SIMULÉE (phase « données mockées »).
 *
 * Elle remplace PostgreSQL + Drizzle le temps de construire et de tester l'interface. Les services n'y accèdent qu'au
 * travers de `tx()` (écriture atomique avec retour arrière) et `read()` : le jour de la bascule, `tx()` devient
 * `db.transaction()` et chaque tableau devient une table, sans toucher aux règles métier ni aux écrans.
 *
 * L'état vit côté serveur uniquement et est persisté dans `.data/leadora-demo.json` (hors dépôt git).
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
}

export const SCHEMA_VERSION = 1;

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
  };
}

type Holder = { state: DbState | null };
const g = globalThis as typeof globalThis & { __leadoraDb?: Holder };
const holder: Holder = (g.__leadoraDb ??= { state: null });

const persistEnabled = process.env.NODE_ENV !== "test" && process.env.LEADORA_DEMO_PERSIST !== "0";
const dbPath = resolve(/* turbopackIgnore: true */ process.cwd(), process.env.LEADORA_DEMO_DB_PATH ?? ".data/leadora-demo.json");

let seeder: ((state: DbState) => void) | null = null;

/** Enregistré par le module de seed (évite une dépendance circulaire). */
export function registerSeeder(fn: (state: DbState) => void) {
  seeder = fn;
}

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

/** Lecture seule de l'état. Ne jamais muter l'objet reçu. */
export function read<T>(fn: (s: Readonly<DbState>) => T): T {
  return fn(load());
}

/** Transaction : si `fn` lève une erreur, aucune modification n'est conservée. */
export function tx<T>(fn: (s: DbState) => T): T {
  const draft = structuredClone(load());
  const result = fn(draft);
  holder.state = draft;
  persist(draft);
  return result;
}

/** Réinitialise l'état (tests et bouton « réinitialiser la démo »). */
export function resetState(seed = true) {
  const fresh = emptyState();
  if (seed && seeder) seeder(fresh);
  holder.state = fresh;
  persist(fresh);
}
