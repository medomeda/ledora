import { describe, expect, it } from "vitest";
import { blankProfile } from "@/lib/quiz/factory";
import { computeResult, pickProfile, quizMaxScore, ScoringError, validateForPublish } from "@/services/scoring.service";
import { answersFor, sampleConfig } from "@/tests/helpers";

describe("scoring", () => {
  const config = sampleConfig(5);

  it("calcule le score global et le profil dominant", () => {
    const best = computeResult(config, answersFor(config, 0));
    expect(best.totalScore).toBe(15); // 5 questions × 3 points
    expect(best.maxScore).toBe(15);
    expect(best.profileId).toBe(config.profiles[0]!.id);
    const worst = computeResult(config, answersFor(config, 2));
    expect(worst.totalScore).toBe(5);
    expect(worst.profileId).toBe(config.profiles[2]!.id);
  });

  it("départage les égalités par priorité", () => {
    const c = structuredClone(config);
    // Une réponse pour chaque profil : égalité parfaite 1-1-1 entre les trois profils.
    const q = c.questions.slice(0, 3);
    c.questions = q;
    const picks: Record<string, string[]> = {};
    q.forEach((question, i) => (picks[question.id] = [question.options[i]!.id]));
    c.profiles[0]!.priority = 1;
    c.profiles[1]!.priority = 9;
    c.profiles[2]!.priority = 5;
    const r = computeResult(c, picks);
    expect(r.profileId).toBe(c.profiles[1]!.id);
  });

  it("supporte le mode plages de scores", () => {
    const c = structuredClone(config);
    c.scoringMode = "ranges";
    c.profiles[0]!.scoreRange = { min: 11, max: 15 };
    c.profiles[1]!.scoreRange = { min: 8, max: 10 };
    c.profiles[2]!.scoreRange = { min: 0, max: 7 };
    expect(pickProfile(c, 12, {})?.id).toBe(c.profiles[0]!.id);
    expect(pickProfile(c, 9, {})?.id).toBe(c.profiles[1]!.id);
    expect(pickProfile(c, 3, {})?.id).toBe(c.profiles[2]!.id);
    expect(validateForPublish(c)).toEqual([]);
    c.profiles[1]!.scoreRange = { min: 9, max: 10 }; // le score 8 n'est plus couvert
    expect(validateForPublish(c).some((i) => i.message.includes("score 8"))).toBe(true);
  });

  it("rejette les réponses incohérentes", () => {
    const answers = answersFor(config, 0);
    const q0 = config.questions[0]!;
    expect(() => computeResult(config, { ...answers, [q0.id]: ["inconnue"] })).toThrow(ScoringError);
    expect(() => computeResult(config, { ...answers, [q0.id]: [q0.options[0]!.id, q0.options[1]!.id] })).toThrow(/Une seule réponse/);
    expect(() => computeResult(config, { ...answers, inconnue: ["x"] })).toThrow(ScoringError);
    const missing = { ...answers };
    delete missing[q0.id];
    expect(() => computeResult(config, missing)).toThrow(/obligatoire/);
  });

  it("accepte une question facultative sans réponse et additionne les choix multiples", () => {
    const c = structuredClone(config);
    c.questions[0]!.isRequired = false;
    c.questions[1]!.type = "multiple";
    const answers = answersFor(c, 0);
    delete answers[c.questions[0]!.id];
    answers[c.questions[1]!.id] = c.questions[1]!.options.map((o) => o.id);
    const r = computeResult(c, answers);
    expect(r.answers.find((a) => a.questionId === c.questions[1]!.id)!.scoreAwarded).toBe(6); // 3 + 2 + 1
    expect(quizMaxScore(c)).toBe(3 * 4 + 6);
  });

  it("n'attribue aucun profil si le quiz n'en définit pas", () => {
    const c = structuredClone(config);
    c.profiles = [];
    expect(pickProfile(c, 3, {})).toBeNull();
  });

  it("valide la publication", () => {
    expect(validateForPublish(config)).toEqual([]);
    const bad = structuredClone(config);
    bad.title = "";
    bad.questions = [];
    bad.profiles = [blankProfile("X")];
    const messages = validateForPublish(bad).map((i) => i.message);
    expect(messages).toContain("Le titre du quiz est obligatoire.");
    expect(messages).toContain("Ajoutez au moins une question.");
  });
});
