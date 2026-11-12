import { describe, expect, it } from "vitest";
import { ctxFor } from "@/server/context";
import { completeQuiz, saveContact, startQuiz, trackVisit } from "@/services/public.service";
import { archiveQuiz, createQuiz, deleteQuiz, duplicateQuiz, getPublicQuiz, getQuiz, listQuizzes, publishQuiz, restoreQuiz, saveQuizConfig, setQuizSlug, unpublishQuiz } from "@/services/quiz.service";
import { register } from "@/services/auth.service";
import { answersFor, contact, makeWorld, publishedQuiz, sampleConfig } from "@/tests/helpers";

describe("cycle de vie d'un quiz", () => {
  it("brouillon → publié → dépublié → archivé → restauré", () => {
    const w = makeWorld();
    const quiz = createQuiz(w.s, w.ctx, { title: "Mon quiz", config: sampleConfig() });
    expect(quiz.status).toBe("draft");
    expect(getPublicQuiz(w.s, quiz.slug)).toBeNull();
    publishQuiz(w.s, w.ctx, quiz.id);
    expect(getPublicQuiz(w.s, quiz.slug)).not.toBeNull();
    unpublishQuiz(w.s, w.ctx, quiz.id);
    expect(getPublicQuiz(w.s, quiz.slug)).toBeNull();
    publishQuiz(w.s, w.ctx, quiz.id);
    archiveQuiz(w.s, w.ctx, quiz.id);
    expect(getPublicQuiz(w.s, quiz.slug)).toBeNull();
    expect(() => saveQuizConfig(w.s, w.ctx, quiz.id, quiz.config)).toThrow(/archivé/);
    restoreQuiz(w.s, w.ctx, quiz.id);
    expect(getQuiz(w.s, w.ctx, quiz.id).status).toBe("draft");
  });

  it("refuse de publier un quiz incomplet", () => {
    const w = makeWorld();
    const quiz = createQuiz(w.s, w.ctx, { title: "Vide" });
    expect(() => publishQuiz(w.s, w.ctx, quiz.id)).toThrow(/pas prêt/);
  });

  it("génère des adresses uniques et fige l'adresse après publication", () => {
    const w = makeWorld();
    const a = createQuiz(w.s, w.ctx, { title: "Diagnostic", config: sampleConfig() });
    const b = createQuiz(w.s, w.ctx, { title: "Diagnostic", config: sampleConfig() });
    expect(a.slug).toBe("diagnostic");
    expect(b.slug).toBe("diagnostic-2");
    expect(() => setQuizSlug(w.s, w.ctx, b.id, "diagnostic")).toThrow(/déjà utilisée/);
    setQuizSlug(w.s, w.ctx, b.id, "Mon Adresse Perso");
    expect(b.slug).toBe("mon-adresse-perso");
    publishQuiz(w.s, w.ctx, b.id);
    expect(() => setQuizSlug(w.s, w.ctx, b.id, "autre")).toThrow(/plus être modifiée/);
  });

  it("respecte le quota de quiz actifs de l'offre", () => {
    const w = makeWorld(); // offre gratuite : 3 quiz actifs
    for (let i = 0; i < 3; i++) createQuiz(w.s, w.ctx, { title: `Quiz ${i}`, config: sampleConfig() });
    expect(() => createQuiz(w.s, w.ctx, { title: "Quatrième" })).toThrow(/limitée à 3/);
    const first = listQuizzes(w.s, w.ctx)[0]!;
    archiveQuiz(w.s, w.ctx, first.id);
    expect(() => createQuiz(w.s, w.ctx, { title: "Quatrième" })).not.toThrow();
  });

  it("duplique avec de nouveaux identifiants et des profils remappés", () => {
    const w = publishedQuiz();
    const copy = duplicateQuiz(w.s, w.ctx, w.quiz.id);
    expect(copy.status).toBe("draft");
    expect(copy.config.title).toContain("(copie)");
    const oldIds = new Set([...w.quiz.config.questions.map((q) => q.id), ...w.quiz.config.profiles.map((p) => p.id)]);
    expect(copy.config.questions.every((q) => !oldIds.has(q.id))).toBe(true);
    const profileIds = new Set(copy.config.profiles.map((p) => p.id));
    expect(copy.config.questions.flatMap((q) => q.options.flatMap((o) => o.profilePoints)).every((pp) => profileIds.has(pp.profileId))).toBe(true);
  });

  it("nettoie le HTML des contenus saisis", () => {
    const w = makeWorld();
    const quiz = createQuiz(w.s, w.ctx, { title: "XSS", config: sampleConfig() });
    const cfg = structuredClone(quiz.config);
    cfg.title = "Titre <script>alert(1)</script> propre";
    saveQuizConfig(w.s, w.ctx, quiz.id, cfg);
    expect(getQuiz(w.s, w.ctx, quiz.id).config.title).toBe("Titre alert(1) propre");
  });

  it("la suppression définitive conserve les prospects du CRM mais retire les participations", () => {
    const w = publishedQuiz();
    startQuiz(w.s, w.quiz.slug, "session-aaaa1111", {});
    completeQuiz(w.s, w.quiz.slug, "session-aaaa1111", answersFor(w.quiz.config, 0), contact());
    expect(w.s.leads).toHaveLength(1);
    expect(() => deleteQuiz(w.s, w.ctx, w.quiz.id)).toThrow(/Dépubliez/);
    unpublishQuiz(w.s, w.ctx, w.quiz.id);
    deleteQuiz(w.s, w.ctx, w.quiz.id);
    expect(w.s.quizzes).toHaveLength(0);
    expect(w.s.quizSubmissions).toHaveLength(0);
    expect(w.s.leadSubmissions).toHaveLength(0);
    expect(w.s.leads).toHaveLength(1);
  });
});

describe("versions et historique", () => {
  it("les anciennes participations conservent leur version et leur résultat", () => {
    const w = publishedQuiz();
    startQuiz(w.s, w.quiz.slug, "session-v1-0001", {});
    const v1Answers = answersFor(w.quiz.config, 0);
    completeQuiz(w.s, w.quiz.slug, "session-v1-0001", v1Answers, contact());
    const before = structuredClone(w.s.quizSubmissions[0]!);

    // Modification structurante puis republication : nouvelle version.
    const cfg = structuredClone(w.quiz.config);
    cfg.profiles[0]!.name = "Nouveau nom de profil";
    cfg.questions[0]!.options[0]!.points = 99;
    saveQuizConfig(w.s, w.ctx, w.quiz.id, cfg);
    expect(w.s.quizzes[0]!.hasUnpublishedChanges).toBe(true);
    // Avant republication, le public voit encore la version 1.
    expect(getPublicQuiz(w.s, w.quiz.slug)!.config.profiles[0]!.name).not.toBe("Nouveau nom de profil");
    publishQuiz(w.s, w.ctx, w.quiz.id);
    expect(w.s.quizVersions).toHaveLength(2);
    expect(getPublicQuiz(w.s, w.quiz.slug)!.config.profiles[0]!.name).toBe("Nouveau nom de profil");

    expect(w.s.quizSubmissions[0]).toEqual(before);
    startQuiz(w.s, w.quiz.slug, "session-v2-0002", {});
    expect(w.s.quizSubmissions[1]!.versionId).toBe(w.s.quizVersions[1]!.id);
  });

  it("republier sans modification ne crée pas de nouvelle version", () => {
    const w = publishedQuiz();
    publishQuiz(w.s, w.ctx, w.quiz.id);
    expect(w.s.quizVersions).toHaveLength(1);
  });
});

describe("participation publique", () => {
  it("calcule le score côté serveur et ignore tout score transmis", () => {
    const w = publishedQuiz();
    trackVisit(w.s, w.quiz.slug, "session-zz-000001", { source: "facebook" });
    startQuiz(w.s, w.quiz.slug, "session-zz-000001", { source: "facebook" });
    const { result } = completeQuiz(w.s, w.quiz.slug, "session-zz-000001", answersFor(w.quiz.config, 1), contact());
    expect(result.totalScore).toBe(10);
    expect(result.profile?.name).toBe(w.quiz.config.profiles[1]!.name);
    const sub = w.s.quizSubmissions[0]!;
    expect(sub.status).toBe("completed");
    expect(sub.source).toBe("facebook");
    expect(sub.profileName).toBe(w.quiz.config.profiles[1]!.name);
  });

  it("exige les coordonnées quand la collecte est obligatoire, et un téléphone s'il est requis", () => {
    const w = publishedQuiz();
    startQuiz(w.s, w.quiz.slug, "session-req-00001", {});
    expect(() => completeQuiz(w.s, w.quiz.slug, "session-req-00001", answersFor(w.quiz.config, 0), null)).toThrow(/coordonnées/);

    const cfg = structuredClone(w.quiz.config);
    cfg.capture.askPhone = true;
    cfg.capture.phoneRequired = true;
    saveQuizConfig(w.s, w.ctx, w.quiz.id, cfg);
    publishQuiz(w.s, w.ctx, w.quiz.id);
    startQuiz(w.s, w.quiz.slug, "session-req-00002", {});
    expect(() => saveContact(w.s, w.quiz.slug, "session-req-00002", contact())).toThrow(/invalides/);
  });

  it("autorise une participation anonyme quand la collecte est facultative", () => {
    const w = makeWorld();
    const cfg = sampleConfig();
    cfg.capture.required = false;
    const quiz = createQuiz(w.s, w.ctx, { title: "Libre", config: cfg });
    publishQuiz(w.s, w.ctx, quiz.id);
    startQuiz(w.s, quiz.slug, "session-anon-0001", {});
    completeQuiz(w.s, quiz.slug, "session-anon-0001", answersFor(cfg, 0), null);
    expect(w.s.leads).toHaveLength(0);
    expect(w.s.quizSubmissions[0]!.status).toBe("completed");
  });

  it("refuse un quiz non publié et une réponse invalide", () => {
    const w = makeWorld();
    const quiz = createQuiz(w.s, w.ctx, { title: "Brouillon", config: sampleConfig() });
    expect(() => startQuiz(w.s, quiz.slug, "session-draft-001", {})).toThrow(/pas disponible/);
    const p = publishedQuiz();
    startQuiz(p.s, p.quiz.slug, "session-bad-00001", {});
    expect(() => completeQuiz(p.s, p.quiz.slug, "session-bad-00001", { [p.quiz.config.questions[0]!.id]: ["nimporte"] }, contact())).toThrow();
  });

  it("une visite est comptée une seule fois par session ; le démarrage est idempotent", () => {
    const w = publishedQuiz();
    trackVisit(w.s, w.quiz.slug, "session-dup-00001", {});
    trackVisit(w.s, w.quiz.slug, "session-dup-00001", {});
    expect(w.s.quizVisits).toHaveLength(1);
    const a = startQuiz(w.s, w.quiz.slug, "session-dup-00001", {});
    const b = startQuiz(w.s, w.quiz.slug, "session-dup-00001", {});
    expect(a.submissionId).toBe(b.submissionId);
    expect(w.s.quizSubmissions).toHaveLength(1);
  });

  it("applique le quota mensuel de participations", () => {
    const w = publishedQuiz();
    for (let i = 0; i < 100; i++) startQuiz(w.s, w.quiz.slug, `session-quota-${String(i).padStart(4, "0")}`, {});
    expect(() => startQuiz(w.s, w.quiz.slug, "session-quota-9999", {})).toThrow(/plus de participations/);
  });
});

describe("isolation entre espaces", () => {
  it("un autre utilisateur ne voit ni ne modifie les quiz d'autrui", () => {
    const a = publishedQuiz();
    const { user: other } = register(a.s, { firstName: "Autre", lastName: "User", email: "other@test.dev", password: "Motdepasse1" });
    const ctxOther = ctxFor(other.id);
    expect(listQuizzes(a.s, ctxOther)).toHaveLength(0);
    expect(() => getQuiz(a.s, ctxOther, a.quiz.id)).toThrow(/introuvable/);
    expect(() => saveQuizConfig(a.s, ctxOther, a.quiz.id, a.quiz.config)).toThrow(/introuvable/);
    expect(() => publishQuiz(a.s, ctxOther, a.quiz.id)).toThrow(/introuvable/);
    expect(() => archiveQuiz(a.s, ctxOther, a.quiz.id)).toThrow(/introuvable/);
    expect(() => deleteQuiz(a.s, ctxOther, a.quiz.id)).toThrow(/introuvable/);
    expect(() => duplicateQuiz(a.s, ctxOther, a.quiz.id)).toThrow(/introuvable/);
  });
});
