import type { QuizConfig, QuizProfile, QuizQuestion, SubmissionAnswer } from "@/types/domain";

/**
 * Moteur de scoring (PRD §6.5 C/D, §10.2). Fonctions pures : exécutées côté serveur pour le résultat officiel
 * (le navigateur n'envoie que des identifiants de réponses, jamais de score) et réutilisées par l'aperçu.
 */
export interface ScoringResult {
  answers: SubmissionAnswer[];
  totalScore: number;
  maxScore: number;
  profileId: string | null;
  /** Points cumulés par profil (scoring par profil). */
  profileScores: Record<string, number>;
}

export type AnswerInput = Record<string, string[]>;

export class ScoringError extends Error {
  constructor(
    message: string,
    public readonly questionId?: string,
  ) {
    super(message);
  }
}

/** Score maximal atteignable à une question (réponse unique : la meilleure ; multiple : somme des points positifs). */
export function questionMaxScore(q: QuizQuestion): number {
  const points = q.options.map((o) => o.points);
  if (points.length === 0) return 0;
  return q.type === "multiple" ? points.filter((p) => p > 0).reduce((a, b) => a + b, 0) : Math.max(0, ...points);
}

export function quizMaxScore(config: QuizConfig): number {
  return config.questions.reduce((sum, q) => sum + questionMaxScore(q), 0);
}

/** Départage les profils : points (mode profils) ou plage (mode plages), puis priorité, puis ordre de définition. */
export function pickProfile(config: QuizConfig, totalScore: number, profileScores: Record<string, number>): QuizProfile | null {
  const profiles = config.profiles;
  if (profiles.length === 0) return null;
  if (config.scoringMode === "ranges") {
    const matches = profiles.filter((p) => p.scoreRange && totalScore >= p.scoreRange.min && totalScore <= p.scoreRange.max);
    return matches.sort((a, b) => b.priority - a.priority)[0] ?? null;
  }
  let best: QuizProfile | null = null;
  let bestScore = -Infinity;
  for (const p of profiles) {
    const score = profileScores[p.id] ?? 0;
    if (score > bestScore || (score === bestScore && best && p.priority > best.priority)) {
      best = p;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Valide les réponses (appartenance des options, cardinalité, questions obligatoires) puis calcule le résultat.
 * Lève `ScoringError` si les réponses sont incohérentes avec la configuration.
 */
export function computeResult(config: QuizConfig, input: AnswerInput): ScoringResult {
  const known = new Set(config.questions.map((q) => q.id));
  for (const qid of Object.keys(input)) if (!known.has(qid)) throw new ScoringError("Réponse à une question inconnue.", qid);

  const answers: SubmissionAnswer[] = [];
  const profileScores: Record<string, number> = {};
  let totalScore = 0;

  for (const q of config.questions) {
    const selected = [...new Set(input[q.id] ?? [])];
    if (selected.length === 0) {
      if (q.isRequired) throw new ScoringError("Une question obligatoire n'a pas de réponse.", q.id);
      continue;
    }
    if (q.type === "single" && selected.length > 1) throw new ScoringError("Une seule réponse est autorisée.", q.id);
    let awarded = 0;
    for (const oid of selected) {
      const option = q.options.find((o) => o.id === oid);
      if (!option) throw new ScoringError("Réponse inconnue pour cette question.", q.id);
      awarded += option.points;
      for (const pp of option.profilePoints) profileScores[pp.profileId] = (profileScores[pp.profileId] ?? 0) + pp.points;
    }
    totalScore += awarded;
    answers.push({ questionId: q.id, optionIds: selected, scoreAwarded: awarded });
  }

  const profile = pickProfile(config, totalScore, profileScores);
  return { answers, totalScore, maxScore: quizMaxScore(config), profileId: profile?.id ?? null, profileScores };
}

export interface PublishIssue {
  /** Étape du créateur concernée, pour y renvoyer l'utilisateur. */
  step: "general" | "questions" | "profiles" | "capture" | "result";
  message: string;
}

/** Contrôles avant publication (PRD §6.5 H). Une liste vide signifie « publiable ». */
export function validateForPublish(config: QuizConfig): PublishIssue[] {
  const issues: PublishIssue[] = [];
  const add = (step: PublishIssue["step"], message: string) => issues.push({ step, message });

  if (!config.title.trim()) add("general", "Le titre du quiz est obligatoire.");
  if (!config.introduction.trim() && !config.description.trim()) add("general", "Ajoutez une description ou une introduction.");

  if (config.questions.length === 0) add("questions", "Ajoutez au moins une question.");
  config.questions.forEach((q, i) => {
    const n = i + 1;
    if (!q.title.trim()) add("questions", `La question ${n} n'a pas d'intitulé.`);
    if (q.options.length < 2) add("questions", `La question ${n} doit proposer au moins 2 réponses.`);
    if (q.options.some((o) => !o.label.trim())) add("questions", `La question ${n} contient une réponse vide.`);
  });

  if (config.profiles.length === 0) {
    add("profiles", "Définissez au moins un profil de résultat.");
  } else {
    config.profiles.forEach((p) => {
      if (!p.name.trim()) add("profiles", "Un profil n'a pas de nom.");
      if (!p.resultContent.trim()) add("profiles", `Le profil « ${p.name || "sans nom"} » n'a pas de texte de diagnostic.`);
      if (p.ctaUrl.trim() && !/^https?:\/\//i.test(p.ctaUrl.trim())) add("profiles", `Le lien du bouton d'action du profil « ${p.name || "sans nom"} » doit commencer par http:// ou https://.`);
    });
    if (config.scoringMode === "profiles") {
      const contributing = new Set(config.questions.flatMap((q) => q.options.flatMap((o) => o.profilePoints.filter((pp) => pp.points > 0).map((pp) => pp.profileId))));
      for (const p of config.profiles) if (!contributing.has(p.id)) add("profiles", `Aucune réponse ne rapporte de points au profil « ${p.name || "sans nom"} » : il ne pourra jamais être obtenu.`);
    } else {
      const max = quizMaxScore(config);
      const ranged = config.profiles.filter((p) => p.scoreRange);
      if (ranged.length !== config.profiles.length) add("profiles", "Chaque profil doit avoir une plage de score.");
      for (const p of ranged) if (p.scoreRange!.min > p.scoreRange!.max) add("profiles", `La plage du profil « ${p.name} » est invalide (minimum supérieur au maximum).`);
      // Couverture : chaque score entier possible entre 0 et le maximum doit mener à un profil.
      for (let s = 0; s <= max; s++) {
        if (!ranged.some((p) => s >= p.scoreRange!.min && s <= p.scoreRange!.max)) {
          add("profiles", `Le score ${s} n'est couvert par aucune plage (les scores vont de 0 à ${max}).`);
          break;
        }
      }
    }
  }

  const c = config.capture;
  if (c.required && c.consentLabel.trim() === "") add("capture", "Le texte du consentement marketing est obligatoire lorsque la collecte est activée.");
  if (c.privacyUrl.trim() && !/^https?:\/\//i.test(c.privacyUrl.trim())) add("capture", "Le lien vers la politique de confidentialité doit commencer par http:// ou https://.");
  return issues;
}

/** Ce que voit le participant sur la page de résultat. */
export interface ResultView {
  profile: Pick<QuizProfile, "name" | "description" | "strengths" | "improvementAreas" | "recommendations" | "ctaLabel" | "ctaUrl"> | null;
  title: string;
  content: string;
  totalScore: number;
  maxScore: number;
  showScore: boolean;
}

export function buildResultView(config: QuizConfig, result: Pick<ScoringResult, "profileId" | "totalScore" | "maxScore">): ResultView {
  const profile = config.profiles.find((p) => p.id === result.profileId) ?? null;
  return {
    profile: profile ? { name: profile.name, description: profile.description, strengths: profile.strengths, improvementAreas: profile.improvementAreas, recommendations: profile.recommendations, ctaLabel: profile.ctaLabel, ctaUrl: profile.ctaUrl } : null,
    title: profile ? profile.resultTitle || profile.name : config.result.fallbackTitle,
    content: profile ? profile.resultContent : config.result.fallbackContent,
    totalScore: result.totalScore,
    maxScore: result.maxScore,
    showScore: config.result.showScore && result.maxScore > 0,
  };
}
