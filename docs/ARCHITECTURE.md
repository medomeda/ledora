# Architecture et décisions — Leadora

Monolithe modulaire Next.js (App Router). Pas de backend séparé. Voir le [PRD](PRD.md) §8 et §9.

## Couches

```
src/
├── app/            Pages (Server Components), route handlers (api/public, crm/export), layouts par groupe
│   ├── (auth)/ (dashboard)/ q/[slug]/ onboarding/ api/
├── actions/        Server Actions : session → validation Zod → service dans tx() → résultat typé (ActionResult)
├── services/       RÈGLES MÉTIER (aucune dépendance Next/React) : quiz, scoring, public, lead, analytics, ai, publication, auth, business
│   └── ai/         Couche fournisseur d'IA interchangeable (interface + fournisseur simulé)
├── server/         Base simulée (db/store.ts), jeu de démonstration (db/seed.ts), contexte, erreurs, ids
├── lib/            Validations Zod, permissions, constantes (libellés, plans), utilitaires, session
├── components/     ui/ (design system), layout/, quiz/ (créateur + runner), crm/, analytics/, forms/
├── types/domain.ts Modèle de domaine (noms alignés sur les tables du PRD §9)
└── tests/          Vitest : scoring, quiz, CRM, auth, seed
```

Règle : pas de logique métier dans les composants ; les pages lisent via `read()`, les mutations passent par `tx()`.

## Base simulée (remplace PostgreSQL + Drizzle)

`server/db/store.ts` expose deux fonctions : `read(fn)` (lecture) et `tx(fn)` (écriture atomique : copie de l'état,
retour arrière si une erreur est levée). Persistance dans `.data/leadora-demo.json`. Le jour de la bascule, `tx()`
devient `db.transaction()` et chaque tableau devient une table ; services et écrans ne changent pas.

## Décisions

| Sujet | Décision | Pourquoi |
|---|---|---|
| Configuration d'un quiz | Un document `QuizConfig` (équivalent JSONB) dans `quizzes.config` au lieu des tables `quiz_questions/options/option_scores/profiles/score_ranges` | Le créateur enregistre tout le brouillon d'un bloc ; le snapshot de publication est trivial. À la bascule : soit colonne JSONB, soit normalisation à la publication. |
| Versionnement (PRD §10.1) | Publier fige `config` dans `quizVersions` (nouvelle version seulement si le brouillon a changé). Chaque participation pointe vers sa version. | Les anciennes participations restent interprétables et leurs résultats ne changent jamais. |
| Scoring (§10.2) | `services/scoring.service.ts`, fonctions pures. Le navigateur n'envoie que des identifiants de réponses ; le serveur valide et recalcule. L'aperçu réutilise le même moteur. | Jamais de confiance dans le score du client. |
| Isolation (§11) | Le business est déduit de la session (`requireBusiness`), jamais d'un identifiant client ; toute ressource est vérifiée contre lui (`lib/permissions`) ; ressource étrangère = « introuvable ». | Aucun accès inter-utilisateurs. |
| Participation vs prospect (§10.3) | `quizSubmissions` et `leads` distincts, reliés par `leadSubmissions` (consentement, date, version de politique). Email normalisé unique par business. | Doublons évités, historique et consentement conservés. |
| Endpoint public | `POST /api/public/q/[slug]` (visit, start, contact, complete), validé par Zod, limité par IP et par quiz. | Route Handler HTTP pour un parcours sans session. |
| Taux | Complétion = terminés ÷ démarrés ; conversion = leads ÷ visiteurs (sessions uniques). | Deux taux distincts (§6.3). |
| IA (§6.10) | `AiProvider` (interface) ; `AI_PROVIDER=mock` génère localement à partir de banques par thème. Adopter une proposition crée un brouillon, jamais un quiz publié. Historique et quotas dans `aiGenerations`. | Fournisseur interchangeable ; l'IA propose, l'utilisateur valide. |
| Authentification | Sessions maison (scrypt, cookie httpOnly, empreinte du jeton). Emails simulés : le lien de réinitialisation s'affiche à l'écran ; la confirmation d'email est un bouton. | À remplacer par Better Auth. |
| Plans et quotas (§15) | `lib/constants/plans.ts` (quiz actifs, participations/mois, générations IA/mois), appliqués par les services. | Modifiable sans toucher au code métier. |
| Images | Logo et couverture redimensionnés côté navigateur, stockés en data URL. | Pas de stockage de fichiers en phase simulée. |

## Sécurité en place

Validation Zod côté serveur sur toutes les entrées · mots de passe scrypt · sessions httpOnly/SameSite · limitation de
fréquence (connexion, réinitialisation, endpoint public) · redirections internes uniquement (`safeNext`) · HTML retiré
des contenus saisis · neutralisation des formules dans l'export CSV · en-têtes de sécurité · messages d'erreur
génériques avec code de référence.

## Passage à la persistance (phase suivante)

1. Schéma Drizzle d'après `types/domain.ts` + migrations ; `tx()`/`read()` branchés sur PostgreSQL.
2. Better Auth à la place de `lib/auth/session.ts` et `services/auth.service.ts` (emails réels).
3. Fournisseur d'IA réel dans `services/ai/`.
4. Stockage de fichiers pour logos et couvertures.
5. Rejouer les suites de tests sur PostgreSQL ; ajouter les tests E2E Playwright.
