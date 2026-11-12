import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import { ctxFor } from "@/server/context";
import { createPgDriver } from "@/server/db/pg-driver";
import { seed } from "@/server/db/seed";
import { emptyState, type Driver, type DbState } from "@/server/db/store";
import { AppError } from "@/server/errors";
import { createAuth } from "@/lib/auth/auth";
import { lastMailTo } from "@/server/mailer";
import { setMemberAccess, inviteCollaborator } from "@/services/team.service";
import * as admin from "@/services/admin.service";
import { isResetTokenValid, register } from "@/services/auth.service";
import { listLeads } from "@/services/lead.service";
import { completeQuiz, startQuiz, trackVisit } from "@/services/public.service";
import { createQuiz, getQuiz, listQuizzes, publishQuiz } from "@/services/quiz.service";
import { updateBusiness } from "@/services/business.service";
import { sampleConfig } from "./helpers";

/** Intégration : les VRAIS services sur du SQL réel (PGlite = PostgreSQL en mémoire), via le pilote de production. */
let driver: Driver;
let auth: ReturnType<typeof createAuth>;
let demo: DbState;
let ids: { demoUser: string; demoBiz: string; otherUser: string; adminUser: string };

beforeAll(async () => {
  const db = drizzle(new PGlite());
  await migrate(db, { migrationsFolder: "drizzle" });
  driver = createPgDriver(db);
  auth = createAuth(db, { nextCookies: false });
  demo = emptyState();
  seed(demo);
  await driver.replaceAll(demo);
  const u = (e: string) => demo.users.find((x) => x.email === e)!;
  ids = { demoUser: u("demo@leadora.app").id, demoBiz: demo.businesses.find((b) => b.ownerId === u("demo@leadora.app").id)!.id, otherUser: u("moussa@koneformation.example").id, adminUser: u("admin@leadora.app").id };
}, 60_000);

const code = async (fn: () => Promise<unknown>) => { try { await fn(); } catch (e) { return e instanceof AppError ? e.code : `OTHER:${(e as Error).message}`; } return null; };

describe("persistance PostgreSQL : aller-retour", () => {
  it("restitue exactement ce qui a été écrit (espace de démonstration)", async () => {
    const loaded = await driver.read({ user: ids.demoUser }, (s) => structuredClone(s));
    // Ignore l'ordre des clés JSONB et la différence « champ absent » / « null ».
    const norm = (o: unknown) => JSON.parse(JSON.stringify(o, (_k, v) => (v === null ? undefined : v)));
    expect(loaded.quizzes.length).toBe(demo.quizzes.filter((q) => q.businessId === ids.demoBiz).length);
    expect(norm(loaded.quizzes.find((q) => q.slug === "maturite-financiere"))).toEqual(norm(demo.quizzes.find((q) => q.slug === "maturite-financiere")));
    expect(loaded.leads.length).toBe(demo.leads.filter((l) => l.businessId === ids.demoBiz).length);
    expect(loaded.quizSubmissions.length).toBe(demo.quizSubmissions.filter((x) => x.businessId === ids.demoBiz).length);
    expect(norm(loaded.businesses[0])).toEqual(norm(demo.businesses.find((b) => b.id === ids.demoBiz)));
    expect(norm(loaded.users[0])).toEqual(norm(demo.users.find((u) => u.id === ids.demoUser)));
    expect(loaded.quizVersions.length).toBeGreaterThanOrEqual(3);
  });

  it("charge par portée : un espace ne voit jamais les données d'un autre", async () => {
    const mine = await driver.read({ user: ids.demoUser }, (s) => ({ quizzes: s.quizzes.map((q) => q.id), businesses: s.businesses.map((b) => b.id), users: s.users.map((u) => u.id) }));
    const other = await driver.read({ user: ids.otherUser }, (s) => s.quizzes.map((q) => q.id));
    expect(mine.businesses).toEqual([ids.demoBiz]);
    expect(mine.users).toEqual([ids.demoUser]);
    expect(other.some((id) => mine.quizzes.includes(id))).toBe(false);
    const foreign = other[0]!;
    expect(await code(() => driver.read({ user: ids.demoUser }, (s) => getQuiz(s, ctxFor(ids.demoUser), foreign)))).toBe("NOT_FOUND");
  });
});

describe("persistance PostgreSQL : écritures", () => {
  it("n'écrit que la différence et la conserve d'une lecture à l'autre", async () => {
    await driver.tx({ user: ids.demoUser }, (s) => updateBusiness(s, ctxFor(ids.demoUser), { name: "Aïcha Coaching Plus", description: "x", industry: "y", activityType: "coaching", managerName: "A", contactEmail: "a@b.dev", website: "", whatsapp: "", bookingUrl: "", logoUrl: null }));
    const b = await driver.read({ account: ids.demoUser }, (s) => s.businesses[0]!);
    expect(b.name).toBe("Aïcha Coaching Plus");
    const quizzes = await driver.read({ user: ids.demoUser }, (s) => listQuizzes(s, ctxFor(ids.demoUser)));
    expect(quizzes.length).toBe(4);
  });

  it("annule tout en cas d'erreur dans la transaction", async () => {
    await expect(driver.tx({ user: ids.demoUser }, (s) => { s.businesses[0]!.name = "À ANNULER"; throw new Error("boom"); })).rejects.toThrow("boom");
    expect((await driver.read({ account: ids.demoUser }, (s) => s.businesses[0]!)).name).toBe("Aïcha Coaching Plus");
  });

  it("garantit l'unicité des adresses de quiz entre espaces (même en ne chargeant qu'un espace)", async () => {
    const a = await driver.tx({ user: ids.demoUser }, (s) => createQuiz(s, ctxFor(ids.demoUser), { title: "Quel type d'entrepreneur êtes-vous ?", config: sampleConfig(3) }).slug);
    expect(a).not.toBe("type-entrepreneur"); // adresse déjà prise dans CET espace
    const b = await driver.tx({ user: ids.otherUser }, (s) => createQuiz(s, ctxFor(ids.otherUser), { title: "Quel type d'entrepreneur êtes-vous ?", config: sampleConfig(3) }).slug);
    expect(b).not.toBe("type-entrepreneur"); // adresse prise dans un AUTRE espace, invisible pour cette portée : couvert par `reserved`
    expect(b).not.toBe(a);
  });

  it("refuse deux comptes avec le même email", async () => {
    const res = await code(() => driver.tx({ email: "demo@leadora.app" }, (s) => register(s, { firstName: "A", lastName: "B", email: "demo@leadora.app", password: "Motdepasse1" })));
    expect(res).toBe("CONFLICT");
  });

  it("Better Auth : connexion, session, réinitialisation et changement de mot de passe sur les mêmes tables", async () => {
    const email = "nouveau.client@mail.test";
    const cookieOf = (res: Response) => res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    const signIn = (password: string) => auth.api.signInEmail({ body: { email, password }, asResponse: true });
    await driver.tx({ email }, (s) => register(s, { firstName: "Nina", lastName: "Test", email, password: "Motdepasse1" }));

    // Connexion : la session est une ligne de la table `sessions`, le cookie est signé.
    expect((await signIn("mauvais-mot-de-passe")).ok).toBe(false);
    const res = await signIn("Motdepasse1");
    expect(res.ok).toBe(true);
    const headers = new Headers({ cookie: cookieOf(res) });
    expect((await auth.api.getSession({ headers }))?.user.email).toBe(email);
    expect(await driver.read({ email }, (s) => s.users[0]!.lastLoginAt)).toBeTruthy();
    expect(await driver.read({ account: (await auth.api.getSession({ headers }))!.user.id }, (s) => s.sessions.length)).toBe(1);

    // Changement de mot de passe (mot de passe actuel exigé).
    await expect(auth.api.changePassword({ body: { currentPassword: "faux", newPassword: "Intermediaire3" }, headers })).rejects.toThrow();
    await auth.api.changePassword({ body: { currentPassword: "Motdepasse1", newPassword: "Intermediaire3", revokeOtherSessions: true }, headers });
    expect((await signIn("Motdepasse1")).ok).toBe(false);

    // Réinitialisation : jeton créé par Better Auth, vérifiable côté application, à usage unique, ferme les sessions.
    await auth.api.requestPasswordReset({ body: { email, redirectTo: "/reset-password" } });
    const token = lastMailTo(email)!.link!.split("/").pop()!;
    expect(await driver.read({ identifier: `reset-password:${token}` }, (s) => isResetTokenValid(s, token))).toBe(true);
    await auth.api.resetPassword({ body: { newPassword: "Autremotdepasse2", token } });
    await expect(auth.api.resetPassword({ body: { newPassword: "Encore3Autre", token } })).rejects.toThrow();
    expect(await driver.read({ identifier: `reset-password:${token}` }, (s) => isResetTokenValid(s, token))).toBe(false);
    expect(await auth.api.getSession({ headers })).toBeNull();
    expect((await signIn("Autremotdepasse2")).ok).toBe(true);
  });

  it("un lien émis par l'administration (services) est consommé par Better Auth ; un accès désactivé ne peut pas se connecter", async () => {
    const adminCtx = ctxFor(ids.adminUser);
    const invited = await driver.tx("admin", (s) => inviteCollaborator(s, adminCtx, { firstName: "Léo", lastName: "Martin", email: "leo.invite@leadora.app", role: "support" }));
    const token = invited.link.split("/").pop()!;
    await auth.api.resetPassword({ body: { newPassword: "Collaborateur1", token } });
    const ok = await auth.api.signInEmail({ body: { email: "leo.invite@leadora.app", password: "Collaborateur1" } });
    expect(ok.user.email).toBe("leo.invite@leadora.app");
    await driver.tx("admin", (s) => setMemberAccess(s, adminCtx, invited.user.id, false));
    await expect(auth.api.signInEmail({ body: { email: "leo.invite@leadora.app", password: "Collaborateur1" } })).rejects.toThrow();
    expect(await driver.read({ account: invited.user.id }, (s) => s.sessions.length)).toBe(0);
  });
});

describe("persistance PostgreSQL : parcours public", () => {
  it("enregistre visite, démarrage, participation et prospect avec des portées minimales", async () => {
    const slug = "maturite-financiere";
    const session = "sess-integration-1";
    const email = "participante@mail.test";
    const config = demo.quizzes.find((q) => q.slug === slug)!.config;
    const answers = Object.fromEntries(config.questions.map((q) => [q.id, [q.options[0]!.id]]));
    await driver.tx({ slug, session }, (s) => trackVisit(s, slug, session, { source: "instagram" }));
    await driver.tx({ slug, session }, (s) => startQuiz(s, slug, session, { source: "instagram" }));
    const result = await driver.tx({ slug, session, email }, (s) => completeQuiz(s, slug, session, answers, { firstName: "Awa", lastName: "K", email, phone: "", marketingConsent: true }));
    expect(result.result.profile?.name).toBeTruthy();
    // Rejouer le même événement est sans effet (idempotent par session).
    await driver.tx({ slug, session }, (s) => trackVisit(s, slug, session, {}));
    const leads = await driver.read({ user: ids.demoUser }, (s) => listLeads(s, ctxFor(ids.demoUser), { q: email }));
    expect(leads.total).toBe(1);
    expect(leads.rows[0]!.participations).toBe(1);
    const visits = await driver.read({ slug, session }, (s) => s.quizVisits.length);
    expect(visits).toBe(1);
  });
});

describe("persistance PostgreSQL : administration", () => {
  it("liste les comptes, puis supprime un compte en cascade (y compris les lignes non chargées)", async () => {
    const adminCtx = ctxFor(ids.adminUser);
    const total = await driver.read("admin", (s) => admin.listAccounts(s, adminCtx, { pageSize: 100 }).total);
    expect(total).toBeGreaterThan(10);
    const biz = demo.businesses.find((b) => b.ownerId === ids.otherUser)!;
    const owner = demo.users.find((u) => u.id === ids.otherUser)!;
    const quizIds = demo.quizzes.filter((q) => q.businessId === biz.id).map((q) => q.id);
    await driver.tx("admin", (s) => admin.deleteAccount(s, adminCtx, biz.id, owner.email));
    // Les visites et versions n'étaient pas chargées par la portée « admin » : la cascade SQL les a supprimées.
    const left = await driver.read({ slug: demo.quizzes.find((q) => q.id === quizIds[0])!.slug }, (s) => s.quizzes.length);
    expect(left).toBe(0);
    expect(await driver.read("admin", (s) => s.businesses.some((b) => b.id === biz.id))).toBe(false);
    expect(await driver.read("admin", (s) => s.auditLogs.some((l) => l.action === "account.deleted"))).toBe(true);
  });

  it("persiste les réglages de la plateforme", async () => {
    const adminCtx = ctxFor(ids.adminUser);
    await driver.tx("admin", (s) => admin.updatePlatformSettings(s, adminCtx, { registrationsOpen: false, announcement: "Maintenance" }));
    const st = await driver.read("settings", (s) => s.settings);
    expect(st.registrationsOpen).toBe(false);
    expect(st.announcement).toBe("Maintenance");
  });

  it("publier un quiz crée une version figée en base", async () => {
    const ctx = ctxFor(ids.demoUser);
    const quizId = await driver.tx({ user: ids.demoUser }, (s) => { const q = createQuiz(s, ctx, { title: "Un autre diagnostic", config: sampleConfig(4) }); publishQuiz(s, ctx, q.id); return q.id; });
    const versions = await driver.read({ user: ids.demoUser }, (s) => s.quizVersions.filter((v) => v.quizId === quizId).length);
    expect(versions).toBe(1);
  });
});
