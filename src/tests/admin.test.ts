import { describe, expect, it } from "vitest";
import { ctxFor } from "@/server/context";
import { emptyState, type DbState } from "@/server/db/store";
import { seed } from "@/server/db/seed";
import { AppError } from "@/server/errors";
import { authenticate, isResetTokenValid } from "@/services/auth.service";
import * as admin from "@/services/admin.service";
import { resolveRange } from "@/services/admin.service";
import { hashPassword } from "@/lib/auth/password";
import { planDef } from "@/lib/constants/plans";
import { getPublicQuiz, createQuiz } from "@/services/quiz.service";
import { startQuiz } from "@/services/public.service";
import * as team from "@/services/team.service";
import { can } from "@/lib/permissions/staff";
import { makeWorld, publishedQuiz, sampleConfig } from "./helpers";

function world() {
  const s: DbState = emptyState();
  seed(s);
  const adminUser = authenticate(s, "admin@leadora.app", "Leadora2026")!;
  const demo = authenticate(s, "demo@leadora.app", "Leadora2026")!;
  return { s, adminCtx: ctxFor(adminUser.id), adminUser, demoCtx: ctxFor(demo.id), demoBiz: s.businesses.find((b) => b.ownerId === demo.id)! };
}
const code = (fn: () => unknown) => { try { fn(); } catch (e) { return e instanceof AppError ? e.code : "OTHER"; } return null; };

describe("administration : contrôle d'accès", () => {
  it("refuse toute fonction à un utilisateur non administrateur", () => {
    const { s, demoCtx, demoBiz } = world();
    expect(code(() => admin.getOverview(s, demoCtx))).toBe("FORBIDDEN");
    expect(code(() => admin.listAccounts(s, demoCtx))).toBe("FORBIDDEN");
    expect(code(() => admin.setAccountPlan(s, demoCtx, demoBiz.id, "pro"))).toBe("FORBIDDEN");
    expect(code(() => admin.suspendAccount(s, demoCtx, demoBiz.id, "test"))).toBe("FORBIDDEN");
    expect(code(() => admin.deleteAccount(s, demoCtx, demoBiz.id, "demo@leadora.app"))).toBe("FORBIDDEN");
    expect(code(() => admin.updatePlatformSettings(s, demoCtx, { registrationsOpen: false, announcement: "" }))).toBe("FORBIDDEN");
    expect(demoBiz.plan).toBe("starter");
  });

  it("le compte administrateur n'a pas d'espace client", () => {
    const { s, adminUser } = world();
    expect(s.businesses.some((b) => b.ownerId === adminUser.id)).toBe(false);
    expect(adminUser.role).toBe("admin");
  });
});

describe("administration : comptes", () => {
  it("liste, filtre et recherche les comptes", () => {
    const { s, adminCtx } = world();
    const all = admin.listAccounts(s, adminCtx, { pageSize: 100 });
    expect(all.total).toBeGreaterThan(10);
    expect(admin.listAccounts(s, adminCtx, { plan: "pro", pageSize: 100 }).rows.every((r) => r.plan === "pro")).toBe(true);
    expect(admin.listAccounts(s, adminCtx, { status: "suspended" }).total).toBe(1);
    expect(admin.listAccounts(s, adminCtx, { q: "koné" }).rows.map((r) => r.name)).toContain("Koné Formation");
  });

  it("change l'offre et consigne l'action", () => {
    const { s, adminCtx, demoBiz } = world();
    admin.setAccountPlan(s, adminCtx, demoBiz.id, "pro");
    expect(demoBiz.plan).toBe("pro");
    const last = admin.listAudit(s, adminCtx).rows[0]!;
    expect(last.action).toBe("account.plan_changed");
    expect(last.details).toBe("Starter → Pro");
  });

  it("suspendre exige un motif, coupe les quiz publics et peut être annulé", () => {
    const { s, adminCtx, demoBiz } = world();
    expect(code(() => admin.suspendAccount(s, adminCtx, demoBiz.id, " "))).toBe("VALIDATION");
    expect(getPublicQuiz(s, "maturite-financiere")).not.toBeNull();
    admin.suspendAccount(s, adminCtx, demoBiz.id, "Abus signalé");
    expect(getPublicQuiz(s, "maturite-financiere")).toBeNull();
    admin.reactivateAccount(s, adminCtx, demoBiz.id);
    expect(getPublicQuiz(s, "maturite-financiere")).not.toBeNull();
    expect(demoBiz.suspensionReason).toBe("");
  });

  it("un administrateur ne peut pas se suspendre ni se supprimer lui-même", () => {
    const w = makeWorld("self-admin@test.dev");
    w.user.role = "admin";
    expect(code(() => admin.suspendAccount(w.s, w.ctx, w.business.id, "motif"))).toBe("INVALID_STATE");
    expect(code(() => admin.deleteAccount(w.s, w.ctx, w.business.id, w.user.email))).toBe("INVALID_STATE");
  });

  it("supprime un compte en cascade après confirmation par email", () => {
    const { s, adminCtx, demoBiz } = world();
    const owner = s.users.find((u) => u.id === demoBiz.ownerId)!;
    const impact = admin.previewAccountDeletion(s, adminCtx, demoBiz.id);
    expect(impact.leads).toBeGreaterThan(40);
    expect(code(() => admin.deleteAccount(s, adminCtx, demoBiz.id, "autre@mail.test"))).toBe("VALIDATION");
    admin.deleteAccount(s, adminCtx, demoBiz.id, owner.email.toUpperCase());
    expect(s.businesses.find((b) => b.id === demoBiz.id)).toBeUndefined();
    expect(s.users.find((u) => u.id === owner.id)).toBeUndefined();
    for (const key of ["quizzes", "quizVersions", "quizVisits", "quizSubmissions", "leads", "leadSubmissions", "leadTags", "leadNotes", "tags", "publications", "aiGenerations"] as const) {
      expect((s[key] as Array<{ businessId?: string }>).some((x) => x.businessId === demoBiz.id), key).toBe(false);
    }
    expect(s.accounts.some((c) => c.userId === owner.id)).toBe(false);
    expect(admin.listAudit(s, adminCtx).rows[0]!.action).toBe("account.deleted");
    // Les autres clients ne sont pas touchés.
    expect(s.businesses.length).toBeGreaterThan(10);
  });

  it("émet un lien de réinitialisation et révoque les sessions", () => {
    const { s, adminCtx, demoBiz } = world();
    s.sessions.push({ id: "x", token: "x", userId: demoBiz.ownerId, expiresAt: new Date(Date.now() + 1e6).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ipAddress: null, userAgent: null });
    expect(admin.issueResetLink(s, adminCtx, demoBiz.id)).toMatch(/^\/reset-password\/.+/);
    expect(admin.revokeSessions(s, adminCtx, demoBiz.id)).toBe(1);
  });
});

describe("administration : quiz, offres et réglages", () => {
  it("dépublie un quiz avec motif obligatoire", () => {
    const { s, adminCtx } = world();
    const quiz = s.quizzes.find((q) => q.slug === "type-entrepreneur")!;
    expect(code(() => admin.moderateQuiz(s, adminCtx, quiz.id, "unpublish", ""))).toBe("VALIDATION");
    admin.moderateQuiz(s, adminCtx, quiz.id, "unpublish", "Contenu trompeur");
    expect(quiz.status).toBe("draft");
    expect(getPublicQuiz(s, "type-entrepreneur")).toBeNull();
    expect(code(() => admin.moderateQuiz(s, adminCtx, quiz.id, "unpublish", "encore"))).toBe("INVALID_STATE");
  });

  it("les quotas modifiés s'appliquent immédiatement aux services métier", () => {
    const w = publishedQuiz();
    const adminUser = w.s.users.find((u) => u.id === w.user.id)!;
    adminUser.role = "admin";
    admin.updatePlan(w.s, w.ctx, "free", { maxActiveQuizzes: 1, maxMonthlySubmissions: 1, maxMonthlyAiGenerations: 5, priceLabel: "0 €" });
    expect(planDef(w.s, "free").maxMonthlySubmissions).toBe(1);
    expect(code(() => createQuiz(w.s, w.ctx, { title: "Second", config: sampleConfig(3) }))).toBe("QUOTA");
    startQuiz(w.s, w.quiz.slug, "s1", {});
    expect(code(() => startQuiz(w.s, w.quiz.slug, "s2", {}))).toBe("QUOTA");
    admin.resetPlan(w.s, w.ctx, "free");
    expect(planDef(w.s, "free").maxMonthlySubmissions).toBe(100);
    expect(code(() => admin.updatePlan(w.s, w.ctx, "free", { maxActiveQuizzes: -3, maxMonthlySubmissions: null, maxMonthlyAiGenerations: null, priceLabel: "0 €" }))).toBe("VALIDATION");
  });

  it("met à jour les réglages et trace uniquement les changements réels", () => {
    const { s, adminCtx } = world();
    const before = admin.listAudit(s, adminCtx).total;
    admin.updatePlatformSettings(s, adminCtx, { registrationsOpen: true, announcement: "" });
    expect(admin.listAudit(s, adminCtx).total).toBe(before);
    admin.updatePlatformSettings(s, adminCtx, { registrationsOpen: false, announcement: "  Maintenance dimanche  " });
    expect(s.settings.registrationsOpen).toBe(false);
    expect(s.settings.announcement).toBe("Maintenance dimanche");
    expect(admin.listAudit(s, adminCtx).total).toBe(before + 1);
  });

  it("calcule une vue d'ensemble cohérente", () => {
    const { s, adminCtx } = world();
    const o = admin.getOverview(s, adminCtx);
    expect(o.kpis.accounts).toBe(s.businesses.length);
    expect(o.kpis.suspended).toBe(1);
    expect(o.series).toHaveLength(30);
    expect(o.plans.reduce((n, p) => n + p.count, 0)).toBe(s.businesses.length);
    expect(o.watch.some((w) => w.tone === "danger")).toBe(true);
  });
});

describe("administration : équipe et rôles", () => {
  const ctxOf = (s: DbState, email: string) => ctxFor(s.users.find((u) => u.email === email)!.id);

  it("applique la matrice de permissions par rôle", () => {
    const { s, adminCtx, demoBiz } = world();
    const support = ctxOf(s, "support@leadora.app");
    const readonly = ctxOf(s, "lecture@leadora.app");
    expect(can("support", "account.support")).toBe(true);
    expect(can("support", "plans.configure")).toBe(false);
    // Lecture seule : consulte, ne modifie rien.
    expect(admin.listAccounts(s, readonly).total).toBeGreaterThan(5);
    expect(code(() => admin.suspendAccount(s, readonly, demoBiz.id, "motif"))).toBe("FORBIDDEN");
    // Support : aide les clients, mais ni offre, ni suppression, ni réglages, ni équipe.
    admin.markEmailVerified(s, support, demoBiz.id);
    admin.suspendAccount(s, support, demoBiz.id, "Signalement");
    expect(code(() => admin.setAccountPlan(s, support, demoBiz.id, "pro"))).toBe("FORBIDDEN");
    expect(code(() => admin.deleteAccount(s, support, demoBiz.id, "demo@leadora.app"))).toBe("FORBIDDEN");
    expect(code(() => admin.updatePlatformSettings(s, support, { registrationsOpen: false, announcement: "" }))).toBe("FORBIDDEN");
    expect(code(() => admin.updatePlan(s, support, "free", { maxActiveQuizzes: 1, maxMonthlySubmissions: 1, maxMonthlyAiGenerations: 1, priceLabel: "0 €" }))).toBe("FORBIDDEN");
    expect(code(() => team.listTeam(s, support))).toBe("FORBIDDEN");
    expect(code(() => team.inviteCollaborator(s, support, { firstName: "A", lastName: "B", email: "x@y.dev", role: "admin" }))).toBe("FORBIDDEN");
    expect(team.listTeam(s, adminCtx).length).toBe(4);
  });

  it("invite un collaborateur, qui choisit son mot de passe via le lien puis se connecte", () => {
    const { s, adminCtx } = world();
    expect(code(() => team.inviteCollaborator(s, adminCtx, { firstName: "Doublon", lastName: "X", email: "SUPPORT@leadora.app", role: "support" }))).toBe("CONFLICT");
    const { user, link } = team.inviteCollaborator(s, adminCtx, { firstName: "Léo", lastName: "Martin", email: "Leo@Leadora.app", role: "support" });
    expect(user.email).toBe("leo@leadora.app");
    expect(s.businesses.some((b) => b.ownerId === user.id)).toBe(false);
    expect(team.listTeam(s, adminCtx).find((m) => m.id === user.id)!.status).toBe("invited");
    expect(authenticate(s, "leo@leadora.app", "Motdepasse1")).toBeNull();
    const token = link.split("/").pop()!;
    expect(isResetTokenValid(s, token)).toBe(true);
    // Le mot de passe est ensuite choisi via Better Auth (voir persistence.test.ts) ; ici : le jeton est consommé et le compte de connexion remplacé.
    s.verifications = s.verifications.filter((v) => v.identifier !== `reset-password:${token}`);
    s.accounts.find((a) => a.userId === user.id)!.password = hashPassword("Motdepasse1");
    expect(authenticate(s, "leo@leadora.app", "Motdepasse1")?.role).toBe("support");
  });

  it("protège le dernier administrateur et le collaborateur lui-même", () => {
    const { s, adminCtx, adminUser } = world();
    expect(code(() => team.changeMemberRole(s, adminCtx, adminUser.id, "support"))).toBe("INVALID_STATE");
    expect(code(() => team.setMemberAccess(s, adminCtx, adminUser.id, false))).toBe("INVALID_STATE");
    expect(code(() => team.removeCollaborator(s, adminCtx, adminUser.id))).toBe("INVALID_STATE");
    // Un second admin peut être promu, puis le premier peut être rétrogradé par lui.
    const support = s.users.find((u) => u.email === "support@leadora.app")!;
    team.changeMemberRole(s, adminCtx, support.id, "admin");
    expect(code(() => team.setMemberAccess(s, ctxFor(support.id), adminUser.id, false))).toBeNull();
    // Il ne reste que lui : il ne peut plus se retirer, ni être retiré.
    expect(code(() => team.changeMemberRole(s, ctxFor(adminUser.id), support.id, "readonly"))).toBe("FORBIDDEN");
  });

  it("désactiver un accès ferme ses sessions et bloque ses permissions", () => {
    const { s, adminCtx } = world();
    const m = s.users.find((u) => u.email === "support@leadora.app")!;
    s.sessions.push({ id: "t", token: "t", userId: m.id, expiresAt: new Date(Date.now() + 1e6).toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ipAddress: null, userAgent: null });
    team.setMemberAccess(s, adminCtx, m.id, false);
    expect(s.sessions.some((x) => x.userId === m.id)).toBe(false);
    expect(code(() => admin.listAccounts(s, ctxFor(m.id)))).toBe("FORBIDDEN");
    team.setMemberAccess(s, adminCtx, m.id, true);
    expect(admin.listAccounts(s, ctxFor(m.id)).total).toBeGreaterThan(5);
    team.removeCollaborator(s, adminCtx, m.id);
    expect(s.users.some((u) => u.id === m.id)).toBe(false);
    expect(admin.listAudit(s, adminCtx).rows[0]!.action).toBe("team.removed");
  });

  it("un client n'est jamais membre de l'équipe", () => {
    const { s, adminCtx, demoCtx } = world();
    expect(team.listTeam(s, adminCtx).every((m) => m.email.endsWith("@leadora.app") && m.email !== "demo@leadora.app")).toBe(true);
    expect(code(() => team.listTeam(s, demoCtx))).toBe("FORBIDDEN");
  });
});

describe("administration : filtre de période du tableau de bord", () => {
  it("résout les préréglages, « tout » et les périodes personnalisées", () => {
    const { s } = world();
    const now = new Date(2026, 10, 12, 15, 0);
    expect(resolveRange(s, { range: "7" }, now).previous).not.toBeNull();
    const seven = resolveRange(s, { range: "7" }, now);
    expect(Math.round((seven.to.getTime() - seven.from.getTime()) / 86400000)).toBe(7);
    expect(resolveRange(s, { range: "n'importe quoi" }, now).key).toBe("30");
    expect(resolveRange(s, { range: "all" }, now).previous).toBeNull();
    const custom = resolveRange(s, { range: "custom", from: "2026-10-01", to: "2026-10-10" }, now);
    expect(custom.key).toBe("custom");
    expect(custom.from.getDate()).toBe(1);
    // Dates inversées ou futures : corrigées, jamais d'erreur.
    const fixed = resolveRange(s, { from: "2026-11-30", to: "2026-11-20" }, now);
    expect(fixed.from <= fixed.to).toBe(true);
    expect(fixed.to <= new Date(2026, 10, 12, 23, 59, 59, 999)).toBe(true);
  });

  it("recalcule indicateurs et courbe selon la période", () => {
    const { s, adminCtx } = world();
    const now = adminCtx.now;
    const o7 = admin.getOverview(s, adminCtx, admin.resolveRange(s, { range: "7" }, now));
    const o90 = admin.getOverview(s, adminCtx, admin.resolveRange(s, { range: "90" }, now));
    const all = admin.getOverview(s, adminCtx, admin.resolveRange(s, { range: "all" }, now));
    expect(o7.series).toHaveLength(7);
    expect(o90.series.length).toBeGreaterThan(30);
    expect(o7.kpis.submissions).toBeLessThanOrEqual(o90.kpis.submissions);
    expect(o90.kpis.submissions).toBeLessThanOrEqual(all.kpis.submissions);
    expect(all.kpis.submissions).toBe(s.quizSubmissions.length);
    expect(all.kpis.newAccounts).toBe(s.businesses.length);
    expect(all.kpis.previousNewAccounts).toBeNull();
    expect(o7.series.reduce((n, p) => n + p.submissions, 0)).toBe(o7.kpis.submissions);
    const none = admin.getOverview(s, adminCtx, admin.resolveRange(s, { range: "custom", from: "2020-01-01", to: "2020-01-31" }, now));
    expect(none.kpis.submissions).toBe(0);
    expect(none.kpis.newAccounts).toBe(0);
  });
});
