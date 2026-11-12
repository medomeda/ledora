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

  it("contient des prospects ayant participé à plusieurs quiz", () => {
    const multi = listLeads(s, ctx, { multiple: true, pageSize: 1000 });
    expect(multi.total).toBeGreaterThanOrEqual(5);
    for (const row of multi.rows) {
      const quizzes = new Set(s.quizSubmissions.filter((x) => x.leadId === row.id).map((x) => x.quizId));
      expect(quizzes.size).toBeGreaterThan(1);
    }
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

describe("ajustements de quiz par l'IA simulée", () => {
  const business = { name: "Coach", activityType: "coaching", industry: "", description: "", offers: [], bookingUrl: "https://cal.example/rdv" };
  const base = async () => {
    const { MockAiProvider } = await import("@/services/ai/mock-provider");
    const p = new MockAiProvider();
    return { p, config: p.buildQuiz({ brief: "Diagnostic financier des salariés", target: "", tone: "chaleureux", questionCount: 5, business }) };
  };
  const refine = async (instruction: string) => { const { p, config } = await base(); return { original: config, ...(await p.refineQuiz({ config, instruction, tone: "professionnel", business })) }; };

  it("ajoute des questions sur un thème, reliées aux profils existants", async () => {
    const r = await refine("Ajoute deux questions sur l'épargne de précaution");
    expect(r.config.questions).toHaveLength(7);
    expect(r.config.questions[5]!.title).toContain("l'épargne de précaution");
    const ids = new Set(r.config.profiles.map((p) => p.id));
    expect(r.config.questions[5]!.options.every((o) => o.profilePoints.every((pp) => ids.has(pp.profileId)))).toBe(true);
    expect(r.changes).toHaveLength(2);
  });

  it("supprime, réduit, retitre, renomme et ajoute un profil", async () => {
    expect((await refine("Supprime la dernière question")).config.questions).toHaveLength(4);
    expect((await refine("Réduis à 3 questions")).config.questions).toHaveLength(3);
    expect((await refine("Change le titre en « Mon nouveau titre »")).config.title).toBe("Mon nouveau titre");
    const renamed = await refine("Renomme le profil « Équilibriste financier » en « Funambule »");
    expect(renamed.config.profiles.map((p) => p.name)).toContain("Funambule");
    const added = await refine("Ajoute un profil « Investisseur confirmé »");
    expect(added.config.profiles).toHaveLength(4);
    expect(added.config.profiles.at(-1)!.name).toBe("Investisseur confirmé");
  });

  it("ne modifie rien et explique quand la demande n'est pas comprise ; ne mute jamais l'original", async () => {
    const r = await refine("Fais du café");
    expect(r.changes).toEqual([]);
    expect(r.hint).toContain("Je n'ai pas compris");
    const { p, config } = await base();
    const before = structuredClone(config);
    await p.refineQuiz({ config, instruction: "Supprime la première question", tone: "professionnel", business });
    expect(config).toEqual(before);
  });
});
