import { getTableColumns } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { DbState } from "@/server/db/store";
import * as t from "@/server/db/schema";

/**
 * Correspondance table ↔ tableau de `DbState`. Les colonnes portent les noms des champs du domaine : la conversion
 * ligne ↔ objet se limite aux dates (Date ↔ chaîne ISO) et aux valeurs absentes (undefined ↔ null).
 * L'ordre de TABLES est celui des dépendances (parents d'abord) : insertions dans cet ordre, suppressions à l'envers.
 */
export interface TableSpec {
  key: Exclude<keyof DbState, "version" | "settings" | "reserved">;
  table: PgTable;
  pk: string[];
}

export const TABLES: TableSpec[] = [
  { key: "users", table: t.users, pk: ["id"] },
  { key: "accounts", table: t.accounts, pk: ["id"] },
  { key: "sessions", table: t.sessions, pk: ["id"] },
  { key: "verifications", table: t.verifications, pk: ["id"] },
  { key: "businesses", table: t.businesses, pk: ["id"] },
  { key: "quizzes", table: t.quizzes, pk: ["id"] },
  { key: "quizVersions", table: t.quizVersions, pk: ["id"] },
  { key: "quizVisits", table: t.quizVisits, pk: ["id"] },
  { key: "quizSubmissions", table: t.quizSubmissions, pk: ["id"] },
  { key: "leads", table: t.leads, pk: ["id"] },
  { key: "leadSubmissions", table: t.leadSubmissions, pk: ["id"] },
  { key: "tags", table: t.tags, pk: ["id"] },
  { key: "leadTags", table: t.leadTags, pk: ["leadId", "tagId"] },
  { key: "leadNotes", table: t.leadNotes, pk: ["id"] },
  { key: "publications", table: t.publications, pk: ["id"] },
  { key: "aiGenerations", table: t.aiGenerations, pk: ["id"] },
  { key: "auditLogs", table: t.auditLogs, pk: ["id"] },
];

type Row = Record<string, unknown>;
const colsCache = new Map<PgTable, Array<{ key: string; isDate: boolean }>>();

function cols(table: PgTable) {
  let c = colsCache.get(table);
  if (!c) {
    c = Object.entries(getTableColumns(table)).map(([key, col]) => ({ key, isDate: col.dataType === "date" }));
    colsCache.set(table, c);
  }
  return c;
}

/** Objet du domaine → ligne (dates en Date, absent → null). */
export function toRow(table: PgTable, obj: object): Row {
  const src = obj as Row;
  const out: Row = {};
  for (const { key, isDate } of cols(table)) {
    const v = src[key];
    out[key] = v === undefined || v === null ? null : isDate ? new Date(v as string) : v;
  }
  return out;
}

/** Ligne → objet du domaine (dates en ISO). */
export function fromRow<T>(table: PgTable, row: Row): T {
  const out: Row = {};
  for (const { key, isDate } of cols(table)) {
    const v = row[key];
    out[key] = isDate && v instanceof Date ? v.toISOString() : v;
  }
  return out as T;
}

export const pkOf = (spec: TableSpec, obj: object): string => spec.pk.map((k) => String((obj as Row)[k])).join("|");
/** Signature d'une ligne : sert à repérer ce qu'une transaction a modifié. */
export const sigOf = (spec: TableSpec, obj: object): string => JSON.stringify(toRow(spec.table, obj));
