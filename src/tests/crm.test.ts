import { describe, expect, it } from "vitest";
import { ctxFor } from "@/server/context";
import { register } from "@/services/auth.service";
import { getDashboard, getQuizStats } from "@/services/analytics.service";
import { addLeadTag, addNote, deleteLead, deleteNote, getLead, listLeads, listTags, removeLeadTag, updateLeadStatus } from "@/services/lead.service";
import { completeQuiz, startQuiz, trackVisit } from "@/services/public.service";
import { createQuiz, publishQuiz } from "@/services/quiz.service";
import { answersFor, contact, publishedQuiz, sampleConfig } from "@/tests/helpers";

function participate(w: ReturnType<typeof publishedQuiz>, session: string, email: string, idx = 0, consent = true) {
  trackVisit(w.s, w.quiz.slug, session, {});
  startQuiz(w.s, w.quiz.slug, session, {});
  return completeQuiz(w.s, w.quiz.slug, session, answersFor(w.quiz.config, idx), contact(email, consent));
}

describe("CRM", () => {
  it("crée un prospect par email et regroupe les participations (pas de doublon)", () => {
    const w = publishedQuiz();
    participate(w, "session-crm-000001", "Awa@Example.com", 0, true);
    participate(w, "session-crm-000002", " awa@example.com ", 2, false);
    expect(w.s.leads).toHaveLength(1);
    const detail = getLead(w.s, w.ctx, w.s.leads[0]!.id);
    expect(detail.participations).toHaveLength(2);
    // Chaque participation garde son propre consentement : ni écrasé ni fusionné.
    const consents = detail.participations.map((p) => p.marketingConsent).sort();
    expect(consents).toEqual([false, true]);
    expect(detail.participations.every((p) => p.answers.length === 5)).toBe(true);
  });

  it("un même email dans deux espaces donne deux contacts distincts", () => {
    const a = publishedQuiz();
    const b = publishedQuiz();
    participate(a, "session-iso-000001", "same@example.com");
    participate(b, "session-iso-000002", "same@example.com");
    expect(a.s.leads).toHaveLength(1);
    expect(b.s.leads).toHaveLength(1);
    expect(a.s.leads[0]!.businessId).not.toBe(b.s.leads[0]!.businessId);
  });

  it("applique les tags automatiques du profil, sans doublons", () => {
    const w = publishedQuiz();
    participate(w, "session-tag-000001", "t@example.com", 0);
    participate(w, "session-tag-000002", "t@example.com", 0);
    const tags = listTags(w.s, w.ctx);
    expect(tags.map((t) => t.name)).toEqual(["Finances solides"]);
    expect(tags[0]!.count).toBe(1);
  });

  it("filtre par quiz, profil, statut, tag, recherche et pagine", () => {
    const w = publishedQuiz();
    for (let i = 0; i < 25; i++) participate(w, `session-flt-${String(i).padStart(6, "0")}`, `p${i}@example.com`, i % 3);
    const page1 = listLeads(w.s, w.ctx, { pageSize: 10 });
    expect(page1.total).toBe(25);
    expect(page1.pages).toBe(3);
    expect(page1.rows).toHaveLength(10);
    expect(listLeads(w.s, w.ctx, { pageSize: 10, page: 99 }).page).toBe(3);
    expect(listLeads(w.s, w.ctx, { q: "p7@" }).total).toBe(1);
    expect(listLeads(w.s, w.ctx, { profile: w.quiz.config.profiles[1]!.name }).total).toBe(8);
    expect(listLeads(w.s, w.ctx, { quizId: w.quiz.id }).total).toBe(25);
    expect(listLeads(w.s, w.ctx, { quizId: "autre" }).total).toBe(0);
    const id = w.s.leads[0]!.id;
    updateLeadStatus(w.s, w.ctx, id, "qualified");
    expect(listLeads(w.s, w.ctx, { status: "qualified" }).total).toBe(1);
    const tag = addLeadTag(w.s, w.ctx, id, "Prospect chaud");
    expect(listLeads(w.s, w.ctx, { tagId: tag.id }).total).toBe(1);
  });

  it("gère notes et tags manuels (casse ignorée)", () => {
    const w = publishedQuiz();
    participate(w, "session-note-00001", "n@example.com");
    const id = w.s.leads[0]!.id;
    const t1 = addLeadTag(w.s, w.ctx, id, "Besoin urgent");
    const t2 = addLeadTag(w.s, w.ctx, id, "besoin URGENT");
    expect(t1.id).toBe(t2.id);
    const note = addNote(w.s, w.ctx, id, "  Rappeler lundi  ");
    expect(note.content).toBe("Rappeler lundi");
    expect(getLead(w.s, w.ctx, id).notes).toHaveLength(1);
    deleteNote(w.s, w.ctx, note.id);
    removeLeadTag(w.s, w.ctx, id, t1.id);
    expect(getLead(w.s, w.ctx, id).notes).toHaveLength(0);
    expect(getLead(w.s, w.ctx, id).tags.map((t) => t.name)).not.toContain("Besoin urgent");
  });

  it("interdit l'accès aux prospects d'un autre espace", () => {
    const w = publishedQuiz();
    participate(w, "session-sec-000001", "secret@example.com");
    const id = w.s.leads[0]!.id;
    const { user } = register(w.s, { firstName: "Intrus", lastName: "X", email: "intrus@test.dev", password: "Motdepasse1" });
    const intruder = ctxFor(user.id);
    expect(listLeads(w.s, intruder).total).toBe(0);
    expect(() => getLead(w.s, intruder, id)).toThrow(/introuvable/);
    expect(() => updateLeadStatus(w.s, intruder, id, "converted")).toThrow(/introuvable/);
    expect(() => addNote(w.s, intruder, id, "x")).toThrow(/introuvable/);
    expect(() => addLeadTag(w.s, intruder, id, "x")).toThrow(/introuvable/);
    expect(() => deleteLead(w.s, intruder, id)).toThrow(/introuvable/);
    expect(w.s.leads[0]!.status).toBe("new");
  });

  it("l'effacement supprime le contact mais anonymise les participations", () => {
    const w = publishedQuiz();
    participate(w, "session-del-000001", "del@example.com");
    deleteLead(w.s, w.ctx, w.s.leads[0]!.id);
    expect(w.s.leads).toHaveLength(0);
    expect(w.s.leadSubmissions).toHaveLength(0);
    expect(w.s.quizSubmissions).toHaveLength(1);
    expect(w.s.quizSubmissions[0]!.leadId).toBeNull();
  });
});

describe("statistiques", () => {
  it("distingue taux de complétion et taux de conversion, à partir d'événements réels", () => {
    const w = publishedQuiz();
    // 10 visiteurs ; 8 démarrent ; 4 terminent avec coordonnées.
    for (let i = 0; i < 10; i++) trackVisit(w.s, w.quiz.slug, `session-st-${String(i).padStart(6, "0")}`, { source: i < 5 ? "facebook" : null });
    for (let i = 0; i < 8; i++) startQuiz(w.s, w.quiz.slug, `session-st-${String(i).padStart(6, "0")}`, {});
    for (let i = 0; i < 4; i++) completeQuiz(w.s, w.quiz.slug, `session-st-${String(i).padStart(6, "0")}`, answersFor(w.quiz.config, i % 3), contact(`s${i}@example.com`));
    const stats = getQuizStats(w.s, w.ctx, w.quiz.id);
    expect(stats.funnel).toMatchObject({ visits: 10, started: 8, completed: 4, leads: 4, completionRate: 50, conversionRate: 40 });
    expect(stats.sources.find((x) => x.source === "facebook")?.count).toBe(5);
    expect(stats.profiles.reduce((a, b) => a + b.count, 0)).toBe(4);
    expect(stats.daily.at(-1)).toMatchObject({ visits: 10, completed: 4 });
  });

  it("n'affiche aucune statistique pour un espace vide (pas de NaN)", () => {
    const w = publishedQuiz();
    const quiz2 = createQuiz(w.s, w.ctx, { title: "Autre", config: sampleConfig() });
    const stats = getQuizStats(w.s, w.ctx, quiz2.id);
    expect(stats.funnel).toEqual({ visits: 0, started: 0, completed: 0, leads: 0, completionRate: 0, conversionRate: 0 });
    publishQuiz(w.s, w.ctx, quiz2.id);
    const dash = getDashboard(w.s, w.ctx);
    expect(dash.hasActivity).toBe(false);
    expect(dash.kpis.participants).toBe(0);
  });

  it("n'expose pas les statistiques d'un autre espace", () => {
    const w = publishedQuiz();
    const { user } = register(w.s, { firstName: "Autre", lastName: "X", email: "autre@test.dev", password: "Motdepasse1" });
    expect(() => getQuizStats(w.s, ctxFor(user.id), w.quiz.id)).toThrow(/introuvable/);
    expect(getDashboard(w.s, ctxFor(user.id)).kpis.totalQuizzes).toBe(0);
  });
});
