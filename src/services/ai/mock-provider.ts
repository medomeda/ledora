import { blankConfig, blankOption, blankProfile, blankQuestion, estimateMinutes } from "@/lib/quiz/factory";
import type { QuizConfig } from "@/types/domain";
import type { AiProvider, BusinessContext, GenerateQuizInput, ImproveInput, Tone } from "@/services/ai/types";

/**
 * Fournisseur SIMULÉ : génération déterministe à partir de banques de questions par thème. Il tient lieu de modèle de
 * langage tant qu'aucun fournisseur réel n'est branché (variable AI_PROVIDER). Les contenus sont des propositions
 * éditables ; aucune statistique ni résultat réel n'est inventé.
 */
interface Domain {
  key: string;
  category: string;
  match: RegExp;
  subject: string;
  profiles: Array<{ name: string; description: string; content: string; strengths: string[]; improvements: string[]; recommendations: string[]; tag: string }>;
  questions: Array<{ title: string; answers: [string, string, string] }>;
}

const DOMAINS: Domain[] = [
  {
    key: "finance",
    category: "Finance",
    match: /financ|argent|budget|épargne|epargne|invest|dette|salari/i,
    subject: "votre maturité financière",
    profiles: [
      { name: "Gestionnaire maîtrisé", description: "Vous pilotez vos finances avec méthode.", content: "Vous avez de bonnes habitudes : vous suivez vos dépenses et vous épargnez régulièrement. Votre prochain palier : faire travailler votre épargne.", strengths: ["Suivi régulier du budget", "Épargne constituée", "Vision à moyen terme"], improvements: ["Diversifier vos placements", "Définir des objectifs chiffrés à 5 ans"], recommendations: ["Automatisez un virement d'épargne mensuel", "Fixez un objectif d'investissement précis"], tag: "Finances solides" },
      { name: "Équilibriste financier", description: "Vous tenez, mais sans marge de sécurité.", content: "Vous bouclez vos mois, mais un imprévu pourrait vous mettre en difficulté. Quelques ajustements simples vous feront gagner en sérénité.", strengths: ["Conscience de vos dépenses", "Capacité à équilibrer vos comptes"], improvements: ["Constituer un fonds d'urgence", "Réduire les dépenses non essentielles"], recommendations: ["Suivez vos dépenses pendant 30 jours", "Mettez de côté 10 % de chaque revenu"], tag: "Besoin d'un cadre" },
      { name: "Dépendant du découvert", description: "Votre budget vous échappe en fin de mois.", content: "Vos fins de mois sont tendues et le découvert est devenu un réflexe. La bonne nouvelle : un plan simple peut inverser la tendance rapidement.", strengths: ["Vous avez identifié le problème", "Vous cherchez des solutions"], improvements: ["Reprendre le contrôle des dépenses", "Sortir du découvert durablement"], recommendations: ["Listez toutes vos charges fixes", "Échangez avec un coach pour bâtir un plan de redressement"], tag: "Besoin urgent" },
    ],
    questions: [
      { title: "Comment se passe votre fin de mois ?", answers: ["Je termine généralement avec de l'épargne", "Je termine juste à l'équilibre", "Je suis souvent à découvert"] },
      { title: "Suivez-vous vos dépenses ?", answers: ["Oui, chaque semaine avec un outil dédié", "De temps en temps, de manière approximative", "Non, je regarde mon solde quand j'y pense"] },
      { title: "Si une dépense imprévue de 500 € arrivait demain ?", answers: ["Je la règle avec mon épargne", "Je pourrais, mais cela me ferait mal", "Je devrais emprunter ou attendre"] },
      { title: "Quelle part de vos revenus mettez-vous de côté ?", answers: ["Plus de 10 %", "Quelques pourcents, de façon irrégulière", "Rien du tout"] },
      { title: "Avez-vous un objectif financier clair ?", answers: ["Oui, chiffré et daté", "J'ai une idée générale", "Non, je vis au jour le jour"] },
      { title: "Comment vivez-vous le sujet de l'argent ?", answers: ["Sereinement, j'ai confiance", "Avec une inquiétude régulière", "Avec du stress, voire de l'évitement"] },
      { title: "Connaissez-vous vos crédits et charges fixes ?", answers: ["Précisément, tout est listé", "Globalement", "Pas vraiment"] },
      { title: "Que feriez-vous d'une augmentation de salaire ?", answers: ["J'en investirais une partie", "Je relèverais mon niveau de vie", "Je rembourserais mes retards"] },
    ],
  },
  {
    key: "entrepreneuriat",
    category: "Business",
    match: /entrepren|business|activit|lancer|startup|vente|client|freelance|indépendant|independant/i,
    subject: "votre niveau de préparation entrepreneuriale",
    profiles: [
      { name: "Entrepreneur prêt à décoller", description: "Votre projet est structuré et prêt à passer à l'échelle.", content: "Vous avez posé des bases solides : offre claire, premiers clients, méthode. Il est temps d'accélérer avec un système d'acquisition fiable.", strengths: ["Offre clairement définie", "Premiers résultats concrets", "Discipline de travail"], improvements: ["Automatiser l'acquisition de clients", "Déléguer les tâches à faible valeur"], recommendations: ["Mettez en place un lead magnet", "Structurez un parcours de vente en 3 étapes"], tag: "Prospect chaud" },
      { name: "Entrepreneur en construction", description: "Vous avez de bonnes idées mais manquez de structure.", content: "Votre projet existe, mais il manque un cadre pour transformer vos efforts en résultats réguliers. Un plan d'action clair vous fera gagner des mois.", strengths: ["Motivation et énergie", "Compréhension de votre marché"], improvements: ["Clarifier votre cible", "Formaliser votre offre et vos prix"], recommendations: ["Définissez votre client idéal en une phrase", "Testez votre offre auprès de 5 prospects"], tag: "Accompagnement" },
      { name: "Entrepreneur en exploration", description: "Vous êtes au tout début de votre réflexion.", content: "Vous explorez encore les possibles. C'est la meilleure étape pour poser de bonnes fondations et éviter les erreurs coûteuses.", strengths: ["Curiosité et ouverture", "Temps pour bien préparer"], improvements: ["Valider un besoin réel", "Passer de l'idée à un premier test"], recommendations: ["Interrogez 10 clients potentiels", "Lancez une offre pilote à petite échelle"], tag: "Débutant" },
    ],
    questions: [
      { title: "Où en est votre activité aujourd'hui ?", answers: ["J'ai déjà des clients réguliers", "J'ai lancé, avec quelques ventes", "C'est encore au stade de l'idée"] },
      { title: "Pouvez-vous décrire votre client idéal en une phrase ?", answers: ["Oui, très précisément", "À peu près", "Pas vraiment"] },
      { title: "Comment trouvez-vous vos clients ?", answers: ["Via un système d'acquisition structuré", "Par le bouche-à-oreille et les réseaux", "Je n'ai pas encore de méthode"] },
      { title: "Votre offre est-elle clairement formulée ?", answers: ["Oui, avec un prix et une promesse", "Elle existe mais reste floue", "Je cherche encore ce que je vends"] },
      { title: "Combien de temps consacrez-vous à votre projet ?", answers: ["Plus de 20 h par semaine", "Entre 5 et 20 h", "Moins de 5 h"] },
      { title: "Suivez-vous vos chiffres (ventes, prospects) ?", answers: ["Oui, chaque semaine", "Occasionnellement", "Non"] },
      { title: "Quel est votre principal frein ?", answers: ["Passer à l'échelle", "Trouver des clients régulièrement", "Savoir par où commencer"] },
      { title: "Êtes-vous accompagné dans votre démarche ?", answers: ["Oui, par un coach ou un mentor", "J'ai des conseils ponctuels", "Je suis seul(e)"] },
    ],
  },
  {
    key: "leadership",
    category: "Leadership",
    match: /leader|manag|équipe|equipe|dirig|influence|confiance|personnel/i,
    subject: "votre profil de leadership",
    profiles: [
      { name: "Leader inspirant", description: "Vous fédérez et donnez le cap.", content: "Votre équipe vous suit parce que vous donnez du sens et de la confiance. Votre défi : former d'autres leaders autour de vous.", strengths: ["Vision claire", "Capacité à fédérer", "Communication ouverte"], improvements: ["Déléguer davantage", "Former votre relève"], recommendations: ["Instaurez des rituels de feedback", "Coachez vos futurs leaders"], tag: "Leader confirmé" },
      { name: "Leader en progression", description: "Vous avez de bonnes bases à consolider.", content: "Vous maîtrisez l'essentiel mais votre impact varie selon les situations. Un cadre de pratique vous aidera à gagner en constance.", strengths: ["Bonne écoute", "Volonté d'apprendre"], improvements: ["Gagner en assertivité", "Mieux prioriser"], recommendations: ["Pratiquez un point individuel hebdomadaire", "Clarifiez vos attentes par écrit"], tag: "Leader en progression" },
      { name: "Leader à structurer", description: "Vous démarrez dans votre rôle de leader.", content: "Vous découvrez la posture de leader. C'est le bon moment pour acquérir les fondamentaux et éviter les pièges classiques.", strengths: ["Humilité", "Envie de progresser"], improvements: ["Poser un cadre d'équipe", "Oser les conversations difficiles"], recommendations: ["Fixez 3 priorités claires par trimestre", "Suivez un programme de leadership"], tag: "Débutant" },
    ],
    questions: [
      { title: "Comment prenez-vous une décision importante ?", answers: ["J'écoute, je tranche et j'explique", "Je cherche le consensus, parfois trop longtemps", "J'hésite et je repousse"] },
      { title: "Comment gérez-vous un désaccord dans l'équipe ?", answers: ["J'en parle ouvertement et rapidement", "J'attends que cela se calme", "J'évite le sujet"] },
      { title: "Donnez-vous du feedback régulièrement ?", answers: ["Oui, positif comme constructif", "Rarement, surtout en cas de problème", "Presque jamais"] },
      { title: "Votre équipe connaît-elle votre vision ?", answers: ["Oui, elle peut la reformuler", "En partie", "Je ne l'ai pas formalisée"] },
      { title: "Savez-vous déléguer ?", answers: ["Oui, avec un cadre clair", "J'ai du mal à lâcher prise", "Je fais tout moi-même"] },
      { title: "Comment réagissez-vous sous pression ?", answers: ["Je reste calme et je priorise", "Je me tends mais je m'en sors", "Je me laisse déborder"] },
      { title: "Investissez-vous dans votre développement ?", answers: ["Oui, un plan de formation régulier", "De temps en temps", "Peu, faute de temps"] },
      { title: "Comment mesurez-vous votre impact ?", answers: ["Avec des indicateurs précis", "À l'intuition", "Je ne le mesure pas"] },
    ],
  },
];

const GENERIC: Domain = {
  key: "generic",
  category: "Autre",
  match: /./,
  subject: "votre situation",
  profiles: [
    { name: "Niveau avancé", description: "Vous maîtrisez déjà bien le sujet.", content: "Vos réponses montrent une vraie maîtrise. Il vous reste à optimiser pour passer à l'étape supérieure.", strengths: ["Bonne compréhension du sujet", "Pratiques déjà en place"], improvements: ["Affiner votre stratégie", "Mesurer vos résultats"], recommendations: ["Fixez un objectif ambitieux à 6 mois", "Faites-vous accompagner pour accélérer"], tag: "Niveau avancé" },
    { name: "Niveau intermédiaire", description: "Vous avez des bases solides à structurer.", content: "Vous avez posé de bonnes bases, mais certains points restent à consolider pour obtenir des résultats réguliers.", strengths: ["Des fondations en place", "Motivation à progresser"], improvements: ["Structurer vos pratiques", "Prioriser vos actions"], recommendations: ["Établissez un plan d'action simple", "Identifiez votre principal blocage"], tag: "Niveau intermédiaire" },
    { name: "Niveau débutant", description: "Vous démarrez : beaucoup de marge de progression.", content: "Vous en êtes au début, c'est la meilleure position pour construire de bonnes habitudes dès maintenant.", strengths: ["Ouverture d'esprit", "Potentiel de progression important"], improvements: ["Acquérir les fondamentaux", "Passer à l'action"], recommendations: ["Commencez par un premier petit objectif", "Appuyez-vous sur un accompagnement"], tag: "Débutant" },
  ],
  questions: [
    { title: "Comment décririez-vous votre situation actuelle ?", answers: ["Je maîtrise déjà bien le sujet", "J'ai des bases mais pas de méthode", "Je débute"] },
    { title: "Avez-vous des objectifs précis ?", answers: ["Oui, chiffrés et datés", "Une idée générale", "Pas encore"] },
    { title: "À quelle fréquence travaillez-vous sur ce sujet ?", answers: ["Chaque semaine", "De temps en temps", "Rarement"] },
    { title: "Quel est votre principal obstacle ?", answers: ["Optimiser ce qui marche déjà", "Manque de méthode", "Je ne sais pas par où commencer"] },
    { title: "Avez-vous déjà été accompagné(e) ?", answers: ["Oui, régulièrement", "Ponctuellement", "Jamais"] },
    { title: "Comment mesurez-vous vos progrès ?", answers: ["Avec des indicateurs clairs", "À l'intuition", "Je ne les mesure pas"] },
    { title: "Quel niveau de confiance avez-vous dans vos résultats ?", answers: ["Élevé", "Moyen", "Faible"] },
    { title: "Êtes-vous prêt(e) à agir dans les 30 prochains jours ?", answers: ["Oui, immédiatement", "Oui, si j'ai un plan clair", "J'ai besoin de plus de temps"] },
  ],
};

const TONE_INTRO: Record<Tone, (name: string, subject: string) => string> = {
  professionnel: (n, sub) => `Ce diagnostic proposé par ${n} vous permet d'évaluer ${sub} en quelques minutes et d'obtenir des recommandations adaptées à votre situation.`,
  chaleureux: (n, sub) => `Bienvenue ! Prenez quelques minutes pour faire le point sur ${sub}. ${n} vous prépare un retour personnalisé, avec bienveillance.`,
  dynamique: (n, sub) => `Prêt(e) à y voir clair sur ${sub} ? Répondez à quelques questions rapides : ${n} vous dévoile votre profil tout de suite !`,
  expert: (n, sub) => `Ce diagnostic structuré, conçu par ${n}, analyse ${sub} selon plusieurs dimensions afin d'identifier vos leviers de progression prioritaires.`,
};

function pickDomain(text: string): Domain {
  return DOMAINS.find((d) => d.match.test(text)) ?? GENERIC;
}

export class MockAiProvider implements AiProvider {
  readonly name = "mock";
  readonly model = "leadora-simulation";

  async generateQuiz(input: GenerateQuizInput): Promise<QuizConfig> {
    return this.buildQuiz(input);
  }

  /** Version synchrone (utilisée aussi par le jeu de démonstration). */
  buildQuiz(input: GenerateQuizInput): QuizConfig {
    const domain = pickDomain(`${input.brief} ${input.business.industry} ${input.business.description}`);
    const brand = input.business.name || "votre coach";
    const config = blankConfig({ category: domain.category });
    const target = input.target.trim();
    config.title = domain.key === "generic" ? `Quel est votre niveau ? Le diagnostic de ${brand}` : `Quel est ${domain.subject.replace(/^votre /, "votre ")} ? Faites le test`;
    config.title = config.title.charAt(0).toUpperCase() + config.title.slice(1);
    config.description = `Un diagnostic rapide pour évaluer ${domain.subject}${target ? ` — pensé pour ${target.toLowerCase()}` : ""}.`;
    config.introduction = `${TONE_INTRO[input.tone](brand, domain.subject)}${target ? ` Ce quiz s'adresse en particulier à : ${target}.` : ""}`;
    config.objective = input.brief.trim().slice(0, 300);
    const count = Math.min(input.questionCount, domain.questions.length);
    config.estimatedMinutes = estimateMinutes(count);

    config.profiles = domain.profiles.map((p, i) => {
      const profile = blankProfile(p.name, domain.profiles.length - i);
      profile.description = p.description;
      profile.resultTitle = p.name;
      profile.resultContent = p.content;
      profile.strengths = p.strengths;
      profile.improvementAreas = p.improvements;
      profile.recommendations = p.recommendations;
      profile.autoTags = [p.tag];
      profile.ctaLabel = input.business.bookingUrl ? "Réserver un appel découverte" : "Contacter " + brand;
      profile.ctaUrl = input.business.bookingUrl;
      return profile;
    });

    // Réponses ordonnées du meilleur au moins bon : 3, 2, 1 points ; le profil i reçoit des points sur sa réponse.
    config.questions = domain.questions.slice(0, count).map((q) => {
      const question = blankQuestion(q.title);
      question.options = q.answers.map((label, i) => {
        const opt = blankOption(label);
        opt.points = 3 - i;
        opt.profilePoints = [{ profileId: config.profiles[i]!.id, points: 1 }];
        return opt;
      });
      return question;
    });
    return config;
  }

  async improve(input: ImproveInput): Promise<string[]> {
    const t = input.text.trim().replace(/\s+/g, " ");
    const clean = t.replace(/[.!?…]+$/, "");
    const lower = clean.charAt(0).toLowerCase() + clean.slice(1);
    const brand = input.business.name;
    switch (input.kind) {
      case "title":
        return [`${capitalize(clean)} ? Faites le test en 3 minutes`, `Le diagnostic gratuit : ${lower}`, `${capitalize(clean)} — découvrez votre profil et vos priorités`];
      case "introduction":
        return [`${capitalize(clean)}. Répondez à quelques questions et recevez immédiatement votre diagnostic personnalisé.`, `${TONE_INTRO[input.tone](brand || "notre équipe", "votre situation")} ${capitalize(clean)}.`, `${capitalize(clean)}. C'est rapide, gratuit et sans engagement.`];
      case "question":
        return [`${capitalize(clean)} ?`.replace(/\?\s*\?$/, "?"), `Dans votre quotidien, ${lower} ?`.replace(/\?\s*\?$/, "?"), `Pour être précis : ${lower} ?`.replace(/\?\s*\?$/, "?")];
      case "answer":
        return [capitalize(clean), `${capitalize(clean)}, la plupart du temps`, `Oui — ${lower}`];
      case "result":
        return [`${capitalize(clean)}. Voici ce que cela signifie concrètement pour vous et comment progresser rapidement.`, `Bonne nouvelle : ${lower}. Avec les bons leviers, vous pouvez avancer vite.`, `${capitalize(clean)}. La suite ? Un plan d'action simple, adapté à votre situation.`];
      case "cta":
        return ["Réserver mon appel découverte gratuit", "Je veux mon plan d'action personnalisé", `Parler avec ${brand || "un expert"}`];
    }
  }
}

function capitalize(v: string) {
  return v.charAt(0).toUpperCase() + v.slice(1);
}

export const toContext = (b: BusinessContext) => b;
