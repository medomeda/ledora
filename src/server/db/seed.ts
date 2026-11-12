import "server-only";
import { hashPassword } from "@/lib/auth/password";
import { register, uniqueBusinessSlug } from "@/services/auth.service";
import { MockAiProvider } from "@/services/ai/mock-provider";
import { ctxFor } from "@/server/context";
import { registerSeeder, type DbState } from "@/server/db/store";
import { addLeadTag, addNote, updateLeadStatus } from "@/services/lead.service";
import { completeQuiz, startQuiz, trackVisit } from "@/services/public.service";
import { createQuiz, publishQuiz, saveQuizConfig, archiveQuiz } from "@/services/quiz.service";
import { getFeatures } from "@/lib/features";
import { savePublication } from "@/services/publication.service";
import { newId } from "@/server/ids";
import type { Business, LeadStatus, QuizConfig } from "@/types/domain";

/**
 * Jeu de démonstration, relatif à la date du jour. Il est produit en rejouant les VRAIS services (visites, démarrages,
 * participations, scoring, CRM) à des dates passées : les chiffres du dashboard sont donc cohérents avec les données.
 *
 * Comptes (mot de passe « Leadora2026 ») :
 *  - demo@leadora.app : espace complet (quiz publiés, prospects, publications) ;
 *  - nouveau@leadora.app : espace vide, pour voir l'onboarding et les états vides.
 */
export const DEMO_PASSWORD = "Leadora2026";

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Aminata", "Moussa", "Fatou", "Ibrahim", "Awa", "Koffi", "Mariam", "Yao", "Salimata", "Ousmane", "Nadia", "Karim", "Julie", "Thomas", "Sarah", "Antoine", "Léa", "Mehdi", "Inès", "Paul", "Clarisse", "Seydou", "Hawa", "Adama", "Chloé", "Rachid", "Estelle", "Boubacar", "Laura", "Samuel"];
const LAST = ["Diallo", "Traoré", "Koné", "Ouédraogo", "Camara", "Bamba", "Sow", "Martin", "Dupont", "Bernard", "Keita", "Cissé", "Konaté", "Petit", "Moreau", "Fofana", "Sylla", "Laurent", "Haddad", "Ndiaye"];
const SOURCES: Array<{ utm: string | null; referrer: string | null; weight: number }> = [
  { utm: null, referrer: null, weight: 22 },
  { utm: "facebook", referrer: null, weight: 24 },
  { utm: "instagram", referrer: null, weight: 20 },
  { utm: "linkedin", referrer: null, weight: 14 },
  { utm: "whatsapp", referrer: null, weight: 14 },
  { utm: "newsletter", referrer: null, weight: 6 },
];
const CAMPAIGNS = ["lancement-novembre", "story-budget", "post-epargne", "newsletter-hebdo"];

function seed(s: DbState) {
  const now = new Date();
  const random = rng(20261112);
  const pick = <T,>(arr: T[]) => arr[Math.floor(random() * arr.length)]!;
  const weighted = <T extends { weight: number }>(arr: T[]) => {
    let r = random() * arr.reduce((a, b) => a + b.weight, 0);
    for (const x of arr) if ((r -= x.weight) <= 0) return x;
    return arr[0]!;
  };

  // ---- Comptes -----------------------------------------------------------------------------------------------
  const { user, business } = register(s, { firstName: "Aïcha", lastName: "Diallo", email: "demo@leadora.app", password: DEMO_PASSWORD }, new Date(now.getTime() - 40 * 86400000));
  user.emailVerifiedAt = new Date(now.getTime() - 40 * 86400000).toISOString();
  Object.assign(business, {
    name: "Aïcha Diallo Coaching",
    slug: uniqueBusinessSlug(s, "aicha-diallo-coaching"),
    description: "J'accompagne les salariés et les indépendants à reprendre le contrôle de leur argent : budget, épargne, premiers investissements.",
    industry: "Coaching financier",
    activityType: "coaching",
    managerName: "Aïcha Diallo",
    contactEmail: "contact@aichadiallo.example",
    website: "https://aichadiallo.example",
    whatsapp: "+33 6 12 34 56 78",
    bookingUrl: "https://cal.example/aicha/decouverte",
    offers: ["Bilan financier personnalisé (90 min)", "Programme « Budget serein » — 6 semaines", "Coaching investissement débutant"],
    plan: "starter",
    onboardingCompletedAt: new Date(now.getTime() - 40 * 86400000).toISOString(),
  });
  const ctxAt = (d: Date) => ctxFor(user.id, d);
  const ago = (days: number, hour = 9) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days, hour, 0, 0);
    return d > now ? new Date(now.getTime() - 60000) : d;
  };

  const empty = register(s, { firstName: "Nouveau", lastName: "Testeur", email: "nouveau@leadora.app", password: DEMO_PASSWORD }, now);
  empty.user.emailVerifiedAt = now.toISOString();

  // ---- Quiz --------------------------------------------------------------------------------------------------
  const ai = new MockAiProvider();
  const ctxBiz = { name: business.name, activityType: business.activityType, industry: business.industry, description: business.description, offers: business.offers, bookingUrl: business.bookingUrl };
  const gen = (brief: string, count: number, tone: "professionnel" | "chaleureux" | "dynamique" | "expert"): QuizConfig => ai.buildQuiz({ brief, target: "salariés et indépendants", tone, questionCount: count, business: ctxBiz });

  const finance = gen("Quiz sur la maturité financière des salariés qui rencontrent des difficultés à gérer leur argent.", 8, "chaleureux");
  finance.title = "Quel est votre niveau de maturité financière ?";
  finance.estimatedMinutes = 3;
  const quiz1 = createQuiz(s, ctxAt(ago(38)), { title: finance.title, config: finance });
  quiz1.slug = "maturite-financiere";
  publishQuiz(s, ctxAt(ago(36)), quiz1.id);

  const entre = gen("Quiz pour aider les futurs entrepreneurs à évaluer leur niveau de préparation avant de lancer leur activité.", 6, "dynamique");
  entre.title = "Quel type d'entrepreneur êtes-vous ?";
  entre.capture.required = false;
  entre.capture.askPhone = true;
  // Un quiz au design personnalisé, pour la démonstration (onglet Design).
  entre.design = { themeId: "ocean", headingFont: "fraunces", align: "center", corners: "soft", optionStyle: "filled", progress: "steps", background: "gradient", footerText: "Aïcha Diallo Coaching — vos réponses restent confidentielles." };
  const quiz2 = createQuiz(s, ctxAt(ago(30)), { title: entre.title, config: entre });
  quiz2.slug = "type-entrepreneur";
  publishQuiz(s, ctxAt(ago(28)), quiz2.id);

  const lead = gen("Quiz sur le profil de leadership des managers qui débutent.", 4, "expert");
  lead.title = "Quel est votre profil de leadership ?";
  const quiz3 = createQuiz(s, ctxAt(ago(5)), { title: lead.title, config: lead });
  void quiz3;

  const old = gen("Test budget", 3, "professionnel");
  old.title = "Test budget 2025 (ancien)";
  const quiz4 = createQuiz(s, ctxAt(ago(35)), { title: old.title, config: old });
  archiveQuiz(s, ctxAt(ago(32)), quiz4.id);

  // ---- Participations ------------------------------------------------------------------------------------------
  const pool: Array<{ first: string; last: string; email: string; phone: string }> = [];
  const newPerson = () => {
    const first = pick(FIRST);
    const last = pick(LAST);
    const n = pool.length + 1;
    const person = { first, last, email: `${first}.${last}${n}@mail.test`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""), phone: random() < 0.55 ? `+33 6 ${String(10 + Math.floor(random() * 89))} ${String(10 + Math.floor(random() * 89))} ${String(10 + Math.floor(random() * 89))} ${String(10 + Math.floor(random() * 89))}` : "" };
    pool.push(person);
    return person;
  };

  type Flow = { slug: string; quizId: string; config: () => QuizConfig; visits: number; startRate: number; finishRate: number; contactRate: number; fromDay: number; reusePool: number };
  const flows: Flow[] = [
    { slug: "maturite-financiere", quizId: quiz1.id, config: () => s.quizzes.find((q) => q.id === quiz1.id)!.config, visits: 132, startRate: 0.74, finishRate: 0.8, contactRate: 1, fromDay: 35, reusePool: 0 },
    { slug: "type-entrepreneur", quizId: quiz2.id, config: () => s.quizzes.find((q) => q.id === quiz2.id)!.config, visits: 64, startRate: 0.7, finishRate: 0.74, contactRate: 0.72, fromDay: 27, reusePool: 0.34 },
  ];

  const events: Array<() => void> = [];
  let sessionN = 0;
  let contactN = 0;
  for (const f of flows) {
    for (let i = 0; i < f.visits; i++) {
      // Plus de trafic récemment (courbe en croissance) : jour = fromDay * (1 - r^0.6).
      const day = Math.floor(f.fromDay * (1 - Math.pow(random(), 0.55)));
      const at = new Date(ago(day, 7 + Math.floor(random() * 15)).getTime() + Math.floor(random() * 3600000));
      const when = at > now ? new Date(now.getTime() - Math.floor(random() * 3600000)) : at;
      const src = weighted(SOURCES);
      const utm = { source: src.utm, medium: src.utm ? "social" : null, campaign: src.utm && random() < 0.5 ? pick(CAMPAIGNS) : null, referrer: src.referrer };
      const sessionId = `seed-${f.slug}-${++sessionN}-${i}`;
      const persona = Math.floor(random() * 3);
      const wantsStart = random() < f.startRate;
      const wantsFinish = wantsStart && random() < f.finishRate;
      const wantsContact = wantsFinish && random() < f.contactRate;
      // Cas « même prospect, plusieurs quiz » : un contact sur trois du second quiz est une personne déjà issue du premier (déterministe, pour la démonstration).
      const reuse = wantsContact && f.reusePool > 0 && contactN++ % Math.round(1 / f.reusePool) === 0 && pool.length > 0;
      const person = wantsContact ? (reuse ? pool[(contactN * 7) % pool.length]! : newPerson()) : null;
      const consent = random() < 0.7;
      events.push(() => {
        // Les participations sont rejouées dans l'ordre chronologique (voir tri ci-dessous).
        trackVisit(s, f.slug, sessionId, utm, when);
        if (!wantsStart) return;
        const t1 = new Date(when.getTime() + 20000);
        startQuiz(s, f.slug, sessionId, utm, t1);
        if (!wantsFinish) return;
        const config = f.config();
        const answers: Record<string, string[]> = {};
        for (const q of config.questions) {
          const idx = random() < 0.68 ? persona : Math.floor(random() * q.options.length);
          answers[q.id] = [q.options[Math.min(idx, q.options.length - 1)]!.id];
        }
        const t2 = new Date(t1.getTime() + (90 + Math.floor(random() * 150)) * 1000);
        const contact = person ? { firstName: person.first, lastName: person.last, email: person.email, phone: person.phone, marketingConsent: consent } : null;
        completeQuiz(s, f.slug, sessionId, answers, contact, t2);
      });
      (events[events.length - 1] as unknown as { at: number }).at = when.getTime();
    }
  }
  events.sort((a, b) => (a as unknown as { at: number }).at - (b as unknown as { at: number }).at);

  // Le quiz financier est modifié et republié au milieu de la période : les anciennes participations gardent leur version.
  const midpoint = Math.floor(events.length * 0.45);
  events.forEach((run, i) => {
    if (i === midpoint) {
      const q = s.quizzes.find((x) => x.id === quiz1.id)!;
      const cfg = structuredClone(q.config);
      cfg.questions[0]!.title = "Comment se passe généralement votre fin de mois ?";
      cfg.introduction = `${cfg.introduction} (Version enrichie : questions reformulées.)`;
      saveQuizConfig(s, ctxAt(ago(14)), quiz1.id, cfg);
      publishQuiz(s, ctxAt(ago(14)), quiz1.id);
    }
    run();
  });

  // ---- CRM : statuts, tags, notes ------------------------------------------------------------------------------
  const statusFor = (ageDays: number): LeadStatus => {
    const r = random();
    if (ageDays < 3) return r < 0.7 ? "new" : "to_contact";
    if (ageDays < 10) return r < 0.25 ? "new" : r < 0.5 ? "to_contact" : r < 0.8 ? "contacted" : "qualified";
    return r < 0.1 ? "new" : r < 0.2 ? "to_contact" : r < 0.42 ? "contacted" : r < 0.62 ? "qualified" : r < 0.76 ? "converted" : "not_interested";
  };
  const manual = ["Besoin urgent", "Coaching financier", "Intéressé par un accompagnement", "Prospect chaud"];
  const leadsSorted = [...s.leads].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  leadsSorted.forEach((l, i) => {
    const age = (now.getTime() - new Date(l.createdAt).getTime()) / 86400000;
    const status = statusFor(age);
    if (status !== "new") updateLeadStatus(s, ctxAt(new Date(new Date(l.createdAt).getTime() + 86400000 * Math.min(age, 1 + random() * 3))), l.id, status);
    if (i % 5 === 0) addLeadTag(s, ctxAt(new Date(l.createdAt)), l.id, pick(manual));
    if (i % 7 === 0) addNote(s, ctxAt(new Date(new Date(l.createdAt).getTime() + 3600000 * 5)), l.id, pick(["Appel de découverte prévu jeudi.", "A demandé un devis pour le programme « Budget serein ».", "Très motivée, à relancer par WhatsApp.", "Souhaite d'abord comparer avec une autre offre.", "Premier échange cordial, à recontacter la semaine prochaine."]));
  });

  // ---- Publications --------------------------------------------------------------------------------------------
  const inDays = (d: number, h = 9) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, h, 0, 0).toISOString();
  const pubs: Array<Parameters<typeof savePublication>[2]> = [
    { title: "5 signes que votre budget vous échappe", content: "Fin de mois difficile ? Voici 5 signaux qui ne trompent pas… Faites le test pour connaître votre niveau : lien en bio.", platform: "instagram", contentPillar: "Lead magnet", objective: "Générer des leads", quizId: quiz1.id, status: "published", scheduledAt: inDays(-6, 18) },
    { title: "Carrousel : épargner sans se priver", content: "3 règles simples pour commencer à épargner dès ce mois-ci.", platform: "linkedin", contentPillar: "Éducation", objective: "Engagement", status: "published", scheduledAt: inDays(-3, 8) },
    { title: "Quel type d'entrepreneur êtes-vous ?", content: "Vous hésitez à vous lancer ? 2 minutes pour savoir où vous en êtes réellement.", platform: "facebook", contentPillar: "Lead magnet", objective: "Générer des leads", quizId: quiz2.id, status: "scheduled", scheduledAt: inDays(1, 12) },
    { title: "Témoignage : de -300 € à 2 000 € d'épargne", content: "Le parcours de Fatou en 3 mois.", platform: "instagram", contentPillar: "Preuve sociale", objective: "Promouvoir une offre", status: "scheduled", scheduledAt: inDays(3, 19) },
    { title: "Message WhatsApp aux anciens contacts", content: "Rappel du diagnostic gratuit + lien du quiz financier.", platform: "whatsapp", contentPillar: "Offre", objective: "Générer des leads", quizId: quiz1.id, status: "to_validate", scheduledAt: inDays(5, 10) },
    { title: "Coulisses : préparer un atelier budget", content: "", platform: "instagram", contentPillar: "Coulisses", objective: "Engagement", status: "draft", scheduledAt: inDays(8, 17) },
    { title: "Webinaire « Budget serein »", content: "Annonce du prochain webinaire gratuit.", platform: "linkedin", contentPillar: "Offre", objective: "Promouvoir une offre", status: "draft", scheduledAt: inDays(11, 9) },
    { title: "Idée : série « Mon erreur d'argent »", content: "", platform: "facebook", contentPillar: "Inspiration", objective: "Engagement", status: "idea" },
    { title: "Idée : quiz sur l'investissement débutant", content: "", platform: "linkedin", contentPillar: "Lead magnet", objective: "Générer des leads", status: "idea" },
  ];
  if (getFeatures().publications) for (const p of pubs) savePublication(s, ctxAt(ago(7)), p);

  seedPlatform(s, now);
}

/**
 * Administration et clientèle de la plateforme : un compte administrateur et une dizaine d'autres comptes clients
 * (offres, ancienneté, activité et statuts variés) pour que le back-office ait de quoi montrer. Générateur
 * aléatoire distinct : ajouter ce bloc ne modifie pas les données de l'espace de démonstration.
 */
function seedPlatform(s: DbState, now: Date) {
  const random = rng(4242);
  const day = 86400000;
  const admin = register(s, { firstName: "Équipe", lastName: "Leadora", email: "admin@leadora.app", password: DEMO_PASSWORD }, new Date(now.getTime() - 120 * day));
  admin.user.role = "admin";
  admin.user.emailVerifiedAt = admin.user.createdAt;
  s.businesses = s.businesses.filter((b) => b.ownerId !== admin.user.id);

  const ai = new MockAiProvider();
  type Spec = { first: string; last: string; email: string; brand: string; type: Business["activityType"]; industry: string; plan: Business["plan"]; age: number; verified: boolean; quizzes: number; people: number; login: number | null };
  const specs: Spec[] = [
    { first: "Moussa", last: "Koné", email: "moussa@koneformation.example", brand: "Koné Formation", type: "formation", industry: "Formation professionnelle", plan: "pro", age: 95, verified: true, quizzes: 2, people: 60, login: 0 },
    { first: "Julie", last: "Moreau", email: "julie@moreau-conseil.example", brand: "Moreau Conseil", type: "conseil", industry: "Conseil en organisation", plan: "pro", age: 70, verified: true, quizzes: 2, people: 36, login: 1 },
    { first: "Karim", last: "Haddad", email: "karim@haddadcoaching.example", brand: "Haddad Coaching", type: "coaching", industry: "Coaching sportif", plan: "starter", age: 55, verified: true, quizzes: 1, people: 28, login: 2 },
    { first: "Inès", last: "Laurent", email: "ines@atelier-ines.example", brand: "Atelier Inès", type: "services", industry: "Design d'intérieur", plan: "starter", age: 41, verified: true, quizzes: 1, people: 18, login: 5 },
    { first: "Seydou", last: "Camara", email: "seydou@camara-digital.example", brand: "Camara Digital", type: "conseil", industry: "Marketing digital", plan: "free", age: 33, verified: true, quizzes: 1, people: 94, login: 0 },
    { first: "Chloé", last: "Bernard", email: "chloe@chloe-bernard.example", brand: "Chloé Bernard", type: "coaching", industry: "Développement personnel", plan: "free", age: 24, verified: true, quizzes: 1, people: 12, login: 3 },
    { first: "Rachid", last: "Sylla", email: "rachid@sylla-entreprendre.example", brand: "Sylla Entreprendre", type: "entrepreneuriat", industry: "Accompagnement de créateurs", plan: "free", age: 18, verified: false, quizzes: 1, people: 7, login: 12 },
    { first: "Estelle", last: "Petit", email: "estelle@petit-langues.example", brand: "Petit Langues", type: "formation", industry: "Cours de langues", plan: "free", age: 12, verified: true, quizzes: 1, people: 5, login: 4 },
    { first: "Boubacar", last: "Diop", email: "boubacar@diop-finance.example", brand: "Diop Finance Express", type: "services", industry: "Crédit et finance", plan: "free", age: 9, verified: true, quizzes: 1, people: 9, login: 6 },
    { first: "Laura", last: "Fofana", email: "laura@fofana-rh.example", brand: "Fofana RH", type: "conseil", industry: "Ressources humaines", plan: "free", age: 6, verified: false, quizzes: 0, people: 0, login: null },
    { first: "Samuel", last: "Ndiaye", email: "samuel@ndiaye.example", brand: "Samuel Ndiaye", type: "autre", industry: "", plan: "free", age: 3, verified: false, quizzes: 0, people: 0, login: null },
    { first: "Clarisse", last: "Yao", email: "clarisse@yao-beaute.example", brand: "Yao Beauté", type: "services", industry: "Soins esthétiques", plan: "starter", age: 2, verified: true, quizzes: 1, people: 4, login: 0 },
  ];

  specs.forEach((sp, n) => {
    const created = new Date(now.getTime() - sp.age * day);
    const { user, business } = register(s, { firstName: sp.first, lastName: sp.last, email: sp.email, password: DEMO_PASSWORD }, created);
    if (sp.verified) user.emailVerifiedAt = created.toISOString();
    user.lastLoginAt = sp.login === null ? null : new Date(now.getTime() - sp.login * day - 3600000).toISOString();
    Object.assign(business, { name: sp.brand, slug: uniqueBusinessSlug(s, sp.brand), activityType: sp.type, industry: sp.industry, managerName: `${sp.first} ${sp.last}`, contactEmail: sp.email, plan: sp.plan, onboardingCompletedAt: sp.quizzes > 0 ? created.toISOString() : null });
    const ctxBiz = { name: business.name, activityType: business.activityType, industry: business.industry, description: "", offers: [], bookingUrl: "" };
    for (let k = 0; k < sp.quizzes; k++) {
      const topic = ["la gestion du temps", "la préparation d'un projet", "la santé au travail", "la prise de parole"][(n + k) % 4]!;
      const cfg = ai.buildQuiz({ brief: `Quiz de diagnostic sur ${topic} pour des prospects de ${sp.brand}`, target: "prospects", tone: "chaleureux", questionCount: 5, business: ctxBiz });
      cfg.title = `Diagnostic : ${topic}`;
      const at = new Date(created.getTime() + (k + 1) * day);
      const quiz = createQuiz(s, ctxFor(user.id, at), { title: cfg.title, config: cfg });
      publishQuiz(s, ctxFor(user.id, new Date(at.getTime() + 3600000)), quiz.id);
      const count = Math.round(sp.people / sp.quizzes);
      for (let i = 0; i < count; i++) {
        const t = new Date(at.getTime() + 2 * 3600000 + Math.floor(random() * Math.max(1, now.getTime() - at.getTime() - 4 * 3600000)));
        const sid = `plat-${n}-${k}-${i}`;
        startQuiz(s, quiz.slug, sid, {}, t);
        if (random() < 0.22) continue;
        const answers: Record<string, string[]> = {};
        for (const q of cfg.questions) answers[q.id] = [q.options[Math.floor(random() * q.options.length)]!.id];
        const person = { firstName: ["Awa", "Ali", "Nina", "Omar", "Zoé", "Luc"][i % 6]!, lastName: ["Traoré", "Roux", "Diaby", "Faure"][i % 4]!, email: `p${n}-${k}-${i}@mail.test`, phone: "", marketingConsent: random() < 0.7 };
        completeQuiz(s, quiz.slug, sid, answers, person, new Date(t.getTime() + 150000));
      }
    }
  });

  // Cas à surveiller : un compte suspendu (les autres, comme un quota presque atteint, découlent des données).
  const suspended = s.businesses.find((b) => b.name === "Diop Finance Express")!;
  suspended.status = "suspended";
  suspended.suspendedAt = new Date(now.getTime() - 2 * day).toISOString();
  suspended.suspensionReason = "Contenu trompeur signalé (promesses de gains garantis)";
  s.auditLogs.push(
    { id: newId(), actorId: admin.user.id, actorEmail: admin.user.email, action: "account.suspended", targetType: "account", targetId: suspended.id, targetLabel: suspended.name, details: suspended.suspensionReason, createdAt: suspended.suspendedAt },
    { id: newId(), actorId: admin.user.id, actorEmail: admin.user.email, action: "account.plan_changed", targetType: "account", targetId: s.businesses.find((b) => b.name === "Koné Formation")!.id, targetLabel: "Koné Formation", details: "Starter → Pro", createdAt: new Date(now.getTime() - 20 * day).toISOString() },
    { id: newId(), actorId: admin.user.id, actorEmail: admin.user.email, action: "settings.updated", targetType: "settings", targetId: "platform", targetLabel: "Réglages de la plateforme", details: "Inscriptions ouvertes", createdAt: new Date(now.getTime() - 60 * day).toISOString() },
  );
}

registerSeeder(seed);
export { seed, hashPassword };
