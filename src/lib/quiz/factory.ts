import type { QuizConfig, QuizOption, QuizProfile, QuizQuestion } from "@/types/domain";

/** Fabriques de la configuration d'un quiz — utilisables côté client (créateur) comme côté serveur. */
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);
export const newUid = uid;

export function blankOption(label = ""): QuizOption {
  return { id: uid(), label, description: "", imageUrl: null, points: 0, profilePoints: [] };
}

export function blankQuestion(title = ""): QuizQuestion {
  return { id: uid(), title, description: "", type: "single", isRequired: true, options: [blankOption(), blankOption(), blankOption()] };
}

export function blankProfile(name = "", priority = 0): QuizProfile {
  return { id: uid(), name, description: "", resultTitle: "", resultContent: "", strengths: [], improvementAreas: [], recommendations: [], ctaLabel: "Réserver un appel découverte", ctaUrl: "", priority, autoTags: [], scoreRange: null };
}

export function blankConfig(init: Partial<Pick<QuizConfig, "title" | "description" | "category">> = {}): QuizConfig {
  return {
    title: init.title ?? "",
    description: init.description ?? "",
    introduction: "",
    objective: "",
    category: init.category ?? "",
    coverImage: null,
    estimatedMinutes: 3,
    questions: [],
    scoringMode: "profiles",
    profiles: [],
    capture: {
      position: "after",
      required: true,
      title: "Où doit-on envoyer votre résultat ?",
      message: "Renseignez vos coordonnées pour découvrir votre diagnostic personnalisé.",
      askLastName: true,
      askPhone: false,
      phoneRequired: false,
      consentLabel: "J'accepte de recevoir des conseils et des offres par email. Je peux me désinscrire à tout moment.",
      privacyUrl: "",
    },
    result: { showScore: true, fallbackTitle: "Merci d'avoir participé !", fallbackContent: "Votre diagnostic est prêt. Contactez-nous pour en discuter." },
    startLabel: "Commencer le diagnostic",
  };
}

/** Durée estimée : ~20 s par question, minimum 1 minute. */
export const estimateMinutes = (questionCount: number) => Math.max(1, Math.round((questionCount * 20) / 60));
