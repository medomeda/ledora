import { describe, expect, it } from "vitest";
import { ctxFor } from "@/server/context";
import { emptyState } from "@/server/db/store";
import { seed } from "@/server/db/seed";
import { authenticate } from "@/services/auth.service";
import { getDashboard } from "@/services/analytics.service";
import { listLeads } from "@/services/lead.service";
import { listQuizzes } from "@/services/quiz.service";

describe("jeu de démonstration", () => {
  const s = emptyState();
  seed(s);
  const demo = authenticate(s, "demo@leadora.app", "Leadora2026")!;
  const ctx = ctxFor(demo.id);

  it("crée les deux comptes de démonstration", () => {
    expect(demo).toBeTruthy();
    expect(authenticate(s, "nouveau@leadora.app", "Leadora2026")).toBeTruthy();
  });

  it("produit des données cohérentes avec le dashboard", () => {
    const dash = getDashboard(s, ctx);
    expect(dash.hasActivity).toBe(true);
    expect(dash.kpis.publishedQuizzes).toBe(2);
    expect(dash.kpis.totalLeads).toBe(listLeads(s, ctx, { pageSize: 1000 }).total);
    expect(dash.kpis.totalLeads).toBeGreaterThan(40);
    expect(listQuizzes(s, ctx).map((q) => q.status).sort()).toEqual(["archived", "draft", "published", "published"]);
  });

  it("conserve les versions du quiz republié", () => {
    expect(s.quizVersions.filter((v) => v.version === 2)).toHaveLength(1);
    const used = new Set(s.quizSubmissions.map((x) => x.versionId));
    expect(used.size).toBeGreaterThanOrEqual(3);
  });

  it("l'espace « nouveau » est vide", () => {
    const empty = authenticate(s, "nouveau@leadora.app", "Leadora2026")!;
    expect(getDashboard(s, ctxFor(empty.id)).hasActivity).toBe(false);
  });
});

describe("thèmes de l'IA simulée", () => {
  it("choisit le thème d'après le brief, pas d'après l'activité", async () => {
    const { MockAiProvider } = await import("@/services/ai/mock-provider");
    const ctx = { name: "Coach", activityType: "coaching", industry: "Coaching financier", description: "argent, budget, épargne", offers: [], bookingUrl: "" };
    const ent = new MockAiProvider().buildQuiz({ brief: "Évaluer la préparation des futurs entrepreneurs avant de lancer leur activité", target: "", tone: "dynamique", questionCount: 5, business: ctx });
    expect(ent.profiles[0]!.name).toContain("Entrepreneur");
    const lead = new MockAiProvider().buildQuiz({ brief: "Profil de leadership des managers", target: "", tone: "expert", questionCount: 4, business: ctx });
    expect(lead.profiles[0]!.name).toContain("Leader");
  });
});
