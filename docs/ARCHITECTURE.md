# Architecture et décisions — Leadora

Monolithe modulaire Next.js (App Router). Pas de backend séparé. Voir le [PRD](PRD.md) §8 et §9.

## Drapeaux de fonctionnalités

`src/lib/features.ts` : `ai` (IA dans la création de quiz, **active** par défaut, `LEADORA_FEATURE_AI=0` pour couper),
`assistant` (page « Assistant IA » du menu, **au chaud**, `LEADORA_FEATURE_ASSISTANT=1`) et `publications` (**au chaud**,
`LEADORA_FEATURE_PUBLICATIONS=1`). Un module au chaud garde son code (services, actions, pages, tests) ; le drapeau masque le
menu, répond 404 aux pages et refuse les actions. `FeaturesProvider` expose les drapeaux aux composants clients.

### IA dans le workflow de création

`AiProvider` (génération, reformulation, **ajustement** `refineQuiz`). Le serveur renvoie toujours une **proposition** (config
complète + liste lisible des changements) ; rien n'est écrit tant que l'utilisateur ne valide pas. Création : `generateQuizAction`
→ relecture → `refineQuizAction` autant de fois que voulu (historique et annulation côté client) → `createQuizFromAiAction`
(brouillon, jamais publié). Dans le créateur : `refineQuizAction` sur le brouillon courant, application par remplacement du
brouillon avec annulation. Chaque appel est compté dans les quotas (`aiGenerations`, types `quiz`, `improve`, `refine`).
Le fournisseur simulé applique des règles sur un jeu de formulations ; un vrai modèle les remplacera derrière la même interface.

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

## Créateur de quiz : ordre des étapes

Informations → **Profils** (liste ordonnée : nom, description ; l'ordre fixe la priorité en cas d'égalité ; couleur automatique ; mode de calcul
repliable) → **Questions** (chaque réponse « indique » un profil via une liste déroulante ; résumé « N réponses par profil » avec
alerte sur un profil jamais indiqué ; points au score global seulement quand il sert : mode « plages » ou score affiché) → **Résultats** (diagnostic, recommandations, bouton d'action, tags ; éditeur visuel des plages en
mode « plages ») → Capture → **Design** → Publication. Les profils précèdent les questions car celles-ci y font référence ;
leur contenu vient après car il dépend de ce que les questions mesurent. Contrôles d'équilibre :
`profilePotential` (points possibles par profil), `rangeCoverage` (trous et chevauchements), `validateForPublish`.

## Design du quiz (onglet Design)

`QuizConfig.design` (facultatif, valeurs par défaut dans `lib/quiz/design.ts` : les quiz existants ne changent pas) : thème
(6 palettes + surcharge de la couleur principale, de l'accent et du fond), polices des titres et du texte (9 choix, chargées à la
demande), taille des titres, logo (position, taille, nom de marque), alignement, disposition de l'introduction (image
au-dessus / à côté / en fond), durée et nombre de questions, arrondis, style des cartes de réponses, indicateur de
progression, fond (uni / dégradé / points), pied de page libre, mention « Propulsé par Leadora » (obligatoire sur l'offre Gratuit).
Le design suit la configuration : brouillon puis figé dans la version à la publication.

Mise en œuvre : `designStyle()` traduit le design en **variables CSS** posées sur le conteneur du quiz ; la page publique
utilise les mêmes jetons Tailwind que l'application (`bg-primary`, `text-muted-foreground`, `rounded-xl`, `font-display`…), qui
sont simplement surchargés : aucun style dupliqué. Le texte et le bouton s'adaptent automatiquement au contraste (`readableOn`,
fond sombre détecté par luminance). L'aperçu (`PreviewFrame`) réutilise `QuizRunner` en mode `preview` : à droite de l'onglet
Design il se met à jour à chaque réglage et propose un sélecteur d'écran (parcours, introduction, question, formulaire,
résultat, avec des données d'exemple) et un basculement ordinateur / mobile.

## Administration (back-office)

- **Rôles et permissions** : `User.role` = `user` (client) | `admin` | `support` | `readonly` (équipe). La matrice rôle → permissions est dans `lib/permissions/staff.ts` (`can(role, permission)`). Les pages `/admin/*` passent par `requireStaffUser(next, permission)` (404 sans la permission : la route n'est pas révélée) ; **et** chaque fonction de `admin.service.ts` / `team.service.ts` appelle `requireStaff(s, ctx, permission)` : le contrôle d'accès ne dépend jamais de l'interface (qui masque seulement les actions non permises). Un membre de l'équipe n'a pas d'espace client ; `requireUser()` le renvoie vers `/admin`.
- **Équipe** (`services/team.service.ts`, permission `team.manage`) : invitation = utilisateur sans mot de passe utilisable + lien (jeton `reset_password`, 7 jours) remis à l'inviteur ; statuts dérivés (invité / actif / désactivé) ; garde-fous : au moins un administrateur actif, jamais d'action sur soi-même ; désactiver ferme les sessions (`getSession` ignore aussi un compte désactivé, la connexion est refusée).
- **Période du tableau de bord** : `resolveRange()` (7/30/90 jours, tout, dates personnalisées ; valeurs invalides → 30 jours), état dans l'URL (`?range=…&from=…&to=…`), comparaison avec la période précédente de même durée, courbe agrégée par jour (≤ 92 j), semaine ou mois.
- **Audit** : toute modification (offre, suspension, rôle, suppression, modération, quotas, réglages) écrit un `AuditLog` dans la même transaction que l'action. Le journal est en lecture seule.
- **Suspension** : `Business.status`. Effets : espace verrouillé (écran dédié), `authed()` refuse toute écriture, `getPublicQuiz()` ne sert plus ses quiz. Données conservées ; réversible.
- **Offres modifiables** : `settings.planOverrides` surcharge les valeurs par défaut de `lib/constants/plans.ts` ; les services lisent `planDef(s, plan)` (jamais `PLANS` directement). Effet immédiat, y compris sur le prix affiché de la landing page.
- **Réglages** : `settings.registrationsOpen` (inscriptions) et `settings.announcement` (bandeau dans l'espace des clients).
- **Suppression de compte** : cascade complète (quiz, versions, visites, participations, prospects, tags, notes, IA, sessions, identifiants) après saisie de l'email du propriétaire.
- Schéma de la base simulée passé en version 2 (rôle, statut de compte, `auditLogs`, `settings`) : l'ancien fichier `.data` est régénéré au premier démarrage.

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
