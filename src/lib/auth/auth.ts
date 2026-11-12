import "server-only";
import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { SITE_NAME } from "@/lib/site";
import { getDb } from "@/server/db/store";
import * as schema from "@/server/db/schema";
import { newId } from "@/server/ids";
import { sendMail } from "@/server/mailer";

/**
 * Better Auth : connexion, sessions (cookie signé), réinitialisation et changement de mot de passe.
 * Il lit et écrit les MÊMES tables que le reste de l'application (users, accounts, sessions, verifications).
 *  - mots de passe : notre scrypt (lib/auth/password.ts), pour rester compatible avec les comptes existants ;
 *  - l'inscription reste dans services/auth.service.ts (utilisateur + compte + espace en une seule transaction),
 *    puis la session est ouverte par `signInEmail` ;
 *  - les liens de réinitialisation émis par l'administration (services) ont le format de Better Auth.
 */
const SESSION_TTL_S = 14 * 24 * 3600;

function secret(): string {
  const s = process.env.BETTER_AUTH_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") throw new Error("BETTER_AUTH_SECRET (32 caractères minimum) est obligatoire en production.");
  return "leadora-dev-secret-ne-pas-utiliser-en-production-0123456789";
}

/** Construit Better Auth sur une instance Drizzle. `nextCookies: false` hors de Next.js (tests). */
export function createAuth(db: unknown, opts: { nextCookies?: boolean } = {}) {
  {
    const orm = db as PgDatabase<PgQueryResultHKT, Record<string, never>>;
    const baseURL = process.env.BETTER_AUTH_URL;
    return betterAuth({
      appName: SITE_NAME,
      ...(baseURL ? { baseURL } : {}),
      secret: secret(),
      // Les appels serveur (server actions) n'ont pas d'origine : seul le navigateur envoie un en-tête Origin vers /api/auth.
      trustedOrigins: [baseURL, process.env.NEXT_PUBLIC_SITE_URL, "http://localhost:3300", "http://localhost:3800"].filter((x): x is string => !!x),
      database: drizzleAdapter(db as never, { provider: "pg", schema: { user: schema.users, session: schema.sessions, account: schema.accounts, verification: schema.verifications } }),
      emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        maxPasswordLength: 128,
        autoSignIn: true,
        revokeSessionsOnPasswordReset: true,
        resetPasswordTokenExpiresIn: 3600,
        password: { hash: async (p) => hashPassword(p), verify: async ({ hash, password }) => verifyPassword(password, hash) },
        sendResetPassword: async ({ user, token }) => {
          const link = `/reset-password/${token}`;
          await sendMail({ to: user.email, subject: `${SITE_NAME} : réinitialisation de votre mot de passe`, text: `Pour choisir un nouveau mot de passe (lien valable 1 heure) : ${link}`, link });
        },
      },
      emailVerification: {
        sendVerificationEmail: async ({ user, url }) => {
          await sendMail({ to: user.email, subject: `${SITE_NAME} : confirmez votre adresse email`, text: `Confirmez votre adresse : ${url}`, link: url });
        },
      },
      user: {
        additionalFields: {
          firstName: { type: "string", required: false, input: false },
          lastName: { type: "string", required: false, input: false },
          role: { type: "string", required: false, input: false, defaultValue: "user" },
          lastLoginAt: { type: "date", required: false, input: false },
          disabledAt: { type: "date", required: false, input: false },
        },
      },
      session: { expiresIn: SESSION_TTL_S, updateAge: 24 * 3600 },
      advanced: { cookiePrefix: "leadora", useSecureCookies: process.env.NODE_ENV === "production", database: { generateId: () => newId() } },
      databaseHooks: {
        session: {
          create: {
            // Un collaborateur désactivé ne peut pas ouvrir de session.
            before: async (session) => {
              const [u] = await orm.select({ disabledAt: schema.users.disabledAt }).from(schema.users).where(eq(schema.users.id, session.userId));
              if (u?.disabledAt) throw new APIError("FORBIDDEN", { message: "Accès désactivé." });
              return { data: session };
            },
            after: async (session) => {
              await orm.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, session.userId));
            },
          },
        },
      },
      plugins: opts.nextCookies === false ? [] : [nextCookies()],
    });
  }
}

const build = () => getDb().then((db) => createAuth(db));

type AuthInstance = Awaited<ReturnType<typeof build>>;
const g = globalThis as typeof globalThis & { __leadoraAuth?: Promise<AuthInstance> };

/** Instance partagée (créée une fois, après les migrations de la base). */
export function getAuth(): Promise<AuthInstance> {
  return (g.__leadoraAuth ??= build());
}

