import { describe, expect, it } from "vitest";
import { ctxFor } from "@/server/context";
import { emptyState, type DbState } from "@/server/db/store";
import { seed } from "@/server/db/seed";
import { AppError } from "@/server/errors";
import { authenticate } from "@/services/auth.service";
import * as admin from "@/services/admin.service";
import { planDef } from "@/lib/constants/plans";
import { getPublicQuiz, createQuiz } from "@/services/quiz.service";
import { startQuiz } from "@/services/public.service";
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

  it("un administrateur ne peut pas se suspendre, se supprimer ni changer son rôle", () => {
    const { s, adminCtx, adminUser } = world();
    expect(code(() => admin.setUserRole(s, adminCtx, adminUser.id, "user"))).toBe("INVALID_STATE");
    // Il n'a pas d'espace : on lui en crée un pour tester les garde-fous sur son propre compte.
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
    expect(s.credentials.some((c) => c.userId === owner.id)).toBe(false);
    expect(admin.listAudit(s, adminCtx).rows[0]!.action).toBe("account.deleted");
    // Les autres clients ne sont pas touchés.
    expect(s.businesses.length).toBeGreaterThan(10);
  });

  it("émet un lien de réinitialisation et révoque les sessions", () => {
    const { s, adminCtx, demoBiz } = world();
    s.sessions.push({ tokenHash: "x", userId: demoBiz.ownerId, expiresAt: new Date(Date.now() + 1e6).toISOString(), createdAt: new Date().toISOString() });
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
