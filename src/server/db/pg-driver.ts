import "server-only";
import { and, eq, getTableColumns, gte, inArray, or, sql, type SQL } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT, PgTable } from "drizzle-orm/pg-core";
import { fromRow, pkOf, sigOf, TABLES, toRow, type TableSpec } from "@/server/db/mappers";
import * as t from "@/server/db/schema";
import { conflict } from "@/server/errors";
import type { DbState, Driver, Scope } from "@/server/db/store";
import { emptyState } from "@/server/db/store";
import type { PlatformSettings } from "@/types/domain";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = PgDatabase<PgQueryResultHKT, any>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const GLOBAL_WRITE_LOCK = 7001;
const CHUNK = 400;
const ids = <T>(rows: T[], f: (r: T) => string) => [...new Set(rows.map(f))];
const spec = (key: TableSpec["key"]) => TABLES.find((s) => s.key === key)!;

/** Chargement d'un jeu de lignes ; la requête `where` est construite par l'appelant. */
async function fetch<K extends TableSpec["key"]>(tx: Tx, key: K, where?: SQL): Promise<DbState[K]> {
  const s = spec(key);
  const q = tx.select().from(s.table as PgTable);
  const rows = (await (where ? q.where(where) : q)) as Array<Record<string, unknown>>;
  return rows.map((r) => fromRow(s.table, r)) as unknown as DbState[K];
}

const inIds = (col: Parameters<typeof inArray>[0], values: string[]) => (values.length ? inArray(col, values) : sql`false`);

async function loadSettings(tx: Tx): Promise<PlatformSettings> {
  const [row] = await tx.select().from(t.platformSettings).where(eq(t.platformSettings.id, 1));
  return { ...emptyState().settings, ...((row?.data as Partial<PlatformSettings> | undefined) ?? {}) };
}

async function loadReserved(tx: Tx): Promise<NonNullable<DbState["reserved"]>> {
  const [q, b] = await Promise.all([tx.select({ slug: t.quizzes.slug }).from(t.quizzes), tx.select({ slug: t.businesses.slug }).from(t.businesses)]);
  return { quizSlugs: q.map((r) => r.slug), businessSlugs: b.map((r) => r.slug) };
}

/** Données de l'espace d'un propriétaire : l'espace, tout ce qu'il contient, et ce qui l'entoure (sessions, jetons). */
async function loadBusinessData(tx: Tx, s: DbState, businessId: string) {
  s.quizzes = await fetch(tx, "quizzes", eq(t.quizzes.businessId, businessId));
  const quizIds = s.quizzes.map((q) => q.id);
  [s.quizVersions, s.quizVisits, s.quizSubmissions, s.leads, s.tags, s.publications, s.aiGenerations] = await Promise.all([
    fetch(tx, "quizVersions", inIds(t.quizVersions.quizId, quizIds)),
    fetch(tx, "quizVisits", inIds(t.quizVisits.quizId, quizIds)),
    fetch(tx, "quizSubmissions", eq(t.quizSubmissions.businessId, businessId)),
    fetch(tx, "leads", eq(t.leads.businessId, businessId)),
    fetch(tx, "tags", eq(t.tags.businessId, businessId)),
    fetch(tx, "publications", eq(t.publications.businessId, businessId)),
    fetch(tx, "aiGenerations", eq(t.aiGenerations.businessId, businessId)),
  ]);
  const leadIds = s.leads.map((l) => l.id);
  [s.leadSubmissions, s.leadTags, s.leadNotes] = await Promise.all([
    fetch(tx, "leadSubmissions", inIds(t.leadSubmissions.leadId, leadIds)),
    fetch(tx, "leadTags", inIds(t.leadTags.leadId, leadIds)),
    fetch(tx, "leadNotes", inIds(t.leadNotes.leadId, leadIds)),
  ]);
}

async function loadUserCore(tx: Tx, s: DbState, userId: string) {
  [s.users, s.accounts, s.sessions, s.verifications, s.businesses] = await Promise.all([
    fetch(tx, "users", eq(t.users.id, userId)),
    fetch(tx, "accounts", eq(t.accounts.userId, userId)),
    fetch(tx, "sessions", eq(t.sessions.userId, userId)),
    fetch(tx, "verifications", eq(t.verifications.value, userId)),
    fetch(tx, "businesses", eq(t.businesses.ownerId, userId)),
  ]);
}

/**
 * Charge UNIQUEMENT ce dont la portée a besoin (voir `Scope`). Les services ne voient que ces lignes ; la couche de
 * persistance n'écrit que ce qui a changé parmi elles.
 */
async function load(tx: Tx, scope: Scope): Promise<DbState> {
  const s = emptyState();
  s.settings = await loadSettings(tx);
  if (scope === "settings") return s;

  if (scope === "admin") {
    // Tout, sauf les visites et les versions de quiz (volumineuses, inutiles à l'administration ; leur suppression suit la cascade SQL).
    for (const sp of TABLES) {
      if (sp.key === "quizVisits" || sp.key === "quizVersions") continue;
      (s[sp.key] as unknown[]) = await fetch(tx, sp.key);
    }
    return s;
  }

  if ("account" in scope) {
    await loadUserCore(tx, s, scope.account);
    return s;
  }

  if ("user" in scope) {
    await loadUserCore(tx, s, scope.user);
    if (s.businesses[0]) await loadBusinessData(tx, s, s.businesses[0].id);
    s.reserved = await loadReserved(tx);
    return s;
  }

  if ("slug" in scope) {
    // Participation publique : le quiz, son espace, les données de CETTE session, les participations du mois (quota) et le prospect concerné.
    const [quiz] = await fetch(tx, "quizzes", eq(t.quizzes.slug, scope.slug));
    if (!quiz) return s;
    s.quizzes = [quiz];
    s.businesses = await fetch(tx, "businesses", eq(t.businesses.id, quiz.businessId));
    s.quizVersions = await fetch(tx, "quizVersions", eq(t.quizVersions.quizId, quiz.id));
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const mine = scope.session ? eq(t.quizSubmissions.sessionId, scope.session) : sql`false`;
    s.quizSubmissions = await fetch(tx, "quizSubmissions", and(eq(t.quizSubmissions.businessId, quiz.businessId), or(gte(t.quizSubmissions.startedAt, monthStart), mine)));
    s.quizVisits = scope.session ? await fetch(tx, "quizVisits", and(eq(t.quizVisits.quizId, quiz.id), eq(t.quizVisits.sessionId, scope.session))) : [];
    s.leads = scope.email ? await fetch(tx, "leads", and(eq(t.leads.businessId, quiz.businessId), eq(t.leads.email, scope.email))) : [];
    const leadIds = s.leads.map((l) => l.id);
    const subIds = s.quizSubmissions.map((x) => x.id);
    s.tags = await fetch(tx, "tags", eq(t.tags.businessId, quiz.businessId));
    s.leadSubmissions = await fetch(tx, "leadSubmissions", or(inIds(t.leadSubmissions.leadId, leadIds), inIds(t.leadSubmissions.submissionId, subIds)));
    s.leadTags = await fetch(tx, "leadTags", inIds(t.leadTags.leadId, leadIds));
    return s;

  }

  if ("email" in scope) {
    s.users = await fetch(tx, "users", eq(t.users.email, scope.email));
    s.accounts = await fetch(tx, "accounts", inIds(t.accounts.userId, s.users.map((u) => u.id)));
    s.reserved = await loadReserved(tx);
    return s;
  }

  if ("identifier" in scope) {
    s.verifications = await fetch(tx, "verifications", eq(t.verifications.identifier, scope.identifier));
    const userIds = s.verifications.map((x) => x.value);
    [s.users, s.accounts, s.sessions] = await Promise.all([fetch(tx, "users", inIds(t.users.id, userIds)), fetch(tx, "accounts", inIds(t.accounts.userId, userIds)), fetch(tx, "sessions", inIds(t.sessions.userId, userIds))]);
    return s;
  }

  return s;
}

type Snapshot = Map<TableSpec["key"], Map<string, string>>;

function snapshot(s: DbState): Snapshot {
  const snap: Snapshot = new Map();
  for (const sp of TABLES) snap.set(sp.key, new Map((s[sp.key] as object[]).map((o) => [pkOf(sp, o), sigOf(sp, o)])));
  snap.set("settings" as never, new Map([["1", JSON.stringify(s.settings)]]));
  return snap;
}

const PG_UNIQUE = "23505";
function mapDbError(err: unknown): never {
  const e = err as { code?: string; cause?: { code?: string; constraint_name?: string }; constraint_name?: string; constraint?: string };
  const code = e.code ?? e.cause?.code;
  if (code === PG_UNIQUE) {
    const c = e.constraint_name ?? e.cause?.constraint_name ?? e.constraint ?? "";
    if (c.includes("email")) throw conflict("Un compte existe déjà avec cette adresse email.", { email: "Adresse déjà utilisée." });
    if (c.includes("slug")) throw conflict("Cette adresse est déjà utilisée.", { slug: "Adresse déjà utilisée." });
    throw conflict("Cette opération entre en conflit avec des données existantes. Réessayez.");
  }
  throw err;
}

/** Écrit la différence entre l'état chargé et l'état final : suppressions (enfants d'abord), puis insertions/mises à jour. */
async function persist(tx: Tx, before: Snapshot, after: DbState) {
  for (const sp of [...TABLES].reverse()) {
    const prev = before.get(sp.key)!;
    const keep = new Set((after[sp.key] as object[]).map((o) => pkOf(sp, o)));
    const gone = [...prev.keys()].filter((k) => !keep.has(k));
    if (!gone.length) continue;
    const cols = sp.pk.map((k) => (getTableColumns(sp.table) as Record<string, Parameters<typeof eq>[0]>)[k]!);
    for (let i = 0; i < gone.length; i += CHUNK) {
      const part = gone.slice(i, i + CHUNK);
      const cond = cols.length === 1 ? inArray(cols[0]!, part) : or(...part.map((k) => and(...k.split("|").map((v, j) => eq(cols[j]!, v)))));
      await tx.delete(sp.table).where(cond);
    }
  }
  for (const sp of TABLES) {
    const prev = before.get(sp.key)!;
    const changed = (after[sp.key] as object[]).filter((o) => prev.get(pkOf(sp, o)) !== sigOf(sp, o));
    if (!changed.length) continue;
    const columns = getTableColumns(sp.table) as Record<string, { name: string }>;
    const setCols = Object.keys(columns).filter((k) => !sp.pk.includes(k));
    const target = sp.pk.map((k) => columns[k]!) as never;
    for (let i = 0; i < changed.length; i += CHUNK) {
      const rows = changed.slice(i, i + CHUNK).map((o) => toRow(sp.table, o));
      const ins = tx.insert(sp.table).values(rows as never);
      if (setCols.length) await ins.onConflictDoUpdate({ target, set: Object.fromEntries(setCols.map((k) => [k, sql.raw(`excluded."${columns[k]!.name}"`)])) as never });
      else await ins.onConflictDoNothing();
    }
  }
  if (before.get("settings" as never)!.get("1") !== JSON.stringify(after.settings)) {
    await tx.insert(t.platformSettings).values({ id: 1, data: after.settings }).onConflictDoUpdate({ target: t.platformSettings.id, set: { data: after.settings } });
  }
}

export function createPgDriver(db: Db): Driver {
  return {
    async read(scope, fn) {
      return db.transaction(async (tx) => fn(await load(tx, scope)), { isolationLevel: "repeatable read", accessMode: "read only" });
    },
    async tx(scope, fn) {
      try {
        return await db.transaction(async (tx) => {
          // Un seul écrivain à la fois : les services lisent un instantané et écrivent la différence, sans « mise à jour perdue ».
          await tx.execute(sql`select pg_advisory_xact_lock(${GLOBAL_WRITE_LOCK})`);
          const state = await load(tx, scope);
          const snap = snapshot(state);
          const result = fn(state);
          await persist(tx, snap, state);
          return result;
        });
      } catch (err) {
        return mapDbError(err);
      }
    },
    /** Remplace tout le contenu (jeu de démonstration, tests). */
    async replaceAll(state) {
      await db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(${GLOBAL_WRITE_LOCK})`);
        for (const sp of [...TABLES].reverse()) await tx.delete(sp.table);
        await tx.delete(t.platformSettings);
        await persist(tx, snapshot(emptyState()), state);
      });
    },
    async isEmpty() {
      const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(t.users);
      return (r?.n ?? 0) === 0;
    },
  };
}
