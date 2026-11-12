# Suivi du projet — Leadora

Document de pilotage. À mettre à jour à chaque livraison (sections 2, 3 et 4).
Dernière mise à jour : 12/11/2026.

Liens : [PRD](PRD.md) · [Architecture et décisions](ARCHITECTURE.md) · [README](../README.md)

## 1. Où en est-on ?

**Phase 1 — Application complète sur données simulées : livrée, prête à tester** (`npm run dev`, voir README).
Les phases fonctionnelles du PRD §16 sont couvertes, **hors Publications et Assistant IA mis au chaud le 12/11/2026** (désactivés par drapeau, code conservé) avec des règles métier et des permissions réelles.

**Phase 2 — Persistance et services réels : à venir** (PostgreSQL, Drizzle, Better Auth, IA réelle, e-mails, stockage de fichiers).

## 2. Avancement par module du PRD

| Module (PRD) | Phase 1 (simulée) | Phase 2 (réel) |
|---|---|---|
| §6.1 Authentification | ✅ Inscription, connexion, déconnexion, mot de passe oublié, confirmation d'email (simulée), profil | ⬜ Better Auth, e-mails |
| §6.2 Onboarding | ✅ Facultatif, passable, checklist sur le dashboard | — |
| §6.3 Dashboard | ✅ KPI, évolution, derniers leads, top quiz, activité, état vide | — |
| §6.4 Lead Magnets | ✅ Quiz ; formulaires et PDF annoncés (« Bientôt ») | ⬜ Formulaires, PDF (V2) |
| §6.5 Créateur de quiz | ✅ 5 étapes, scoring profil/plage, aperçu, publication versionnée, autosave | — |
| §6.6 Expérience publique | ✅ Une question à la fois, reprise de session, consentement, UTM, **design personnalisable** | ⬜ Anti-fraude renforcé (captcha) |
| §6.7 CRM | ✅ Doublons, historique, tags (auto et manuels), notes, statuts, filtres, export CSV, effacement | — |
| §6.8 Statistiques | ✅ Par quiz et globales, sources, profils, scores | — |
| §6.9 Mon Business | ✅ Deux onglets : Informations (`/business`) et Offres et services (`/business/offers`) | ⬜ Stockage du logo |
| §6.10 Assistant IA | ✅ Dans le workflow de création : génération, ajustements en langage naturel avec suivi et annulation, reformulations ; fournisseur simulé. Le module « Assistant IA » du menu reste au chaud. | ⬜ Modèle de langage réel |
| §6.11 Publications | ⏸ Au chaud (codé, désactivé) | — |
| §13 Tests | ✅ 74 tests (dont modules au chaud, séparation business/offres, prospects multi-quiz) (scoring, cycle de vie, versions, participation, CRM, isolation, stats, auth, seed) | ⬜ Tests d'intégration base, E2E Playwright |
| §15 Plans et quotas | ✅ Structure et application des limites, **modifiables depuis l'administration** | ⬜ Paiement (hors MVP) |
| Administration | ✅ Vue d'ensemble, comptes (offre, suspension, suppression…), modération des quiz, offres et quotas, journal d'audit, réglages | ⬜ Rôles d'équipe fins, impersonation tracée, facturation |

## 3. Journal des livraisons

| Date | Livraison |
|---|---|
| 12/11/2026 | **Module d'administration du SaaS** (`/admin`, rôle `admin`) : vue d'ensemble (KPI, croissance, offres, comptes à surveiller), comptes (recherche/filtres, fiche, usage vs quotas, changement d'offre, suspension avec motif, réactivation, confirmation d'email, lien de réinitialisation, révocation de sessions, rôle admin, suppression en cascade avec confirmation), modération des quiz, offres et quotas éditables (prix affiché sur la landing), journal d'audit, réglages (inscriptions, annonce globale). Contrôle d'accès dans les services, audit transactionnel, suspension appliquée (espace, actions, quiz publics). Compte `admin@leadora.app` et ~12 comptes clients de démonstration. 74 tests. |
| 12/11/2026 | **Onglet Design du quiz + aperçu en direct.** Thèmes (6) et couleurs personnalisables, polices (9), taille des titres, logo (position, taille, nom), alignement, dispositions d'introduction (image au-dessus / à côté / en fond), durée et nombre de questions, arrondis, style des réponses, progression (barre / étapes / masquée), fond (uni / dégradé / points), pied de page libre, mention « Propulsé par Leadora » (obligatoire sur l'offre Gratuit, retirable au-dessus). Aperçu à droite mis à jour en temps réel, avec sélecteur d'écran (introduction, question, formulaire, résultat) et appareil (ordinateur / mobile), aussi disponible dans le créateur et la page d'aperçu. Quiz existants inchangés (valeurs par défaut) ; design figé avec la version publiée ; un quiz de démonstration au design personnalisé (`/q/type-entrepreneur`). 62 tests. |
| 12/11/2026 | **Assistance IA remise dans la création de quiz** (le module du menu reste au chaud, drapeau `LEADORA_FEATURE_ASSISTANT`). Création manuelle OU générée par IA ; sur une proposition comme sur un brouillon existant, ajustements demandés en langage naturel (« Ajoute une question sur l'épargne », « Réduis à 5 questions », « Renomme le profil… », « Ton plus dynamique »…) : l'IA propose une liste de changements, l'utilisateur applique, peut annuler ; suivi des ajustements dans l'écran de génération ; création du brouillon à partir de la proposition ajustée. Fournisseur simulé reconnaissant ces formulations. 55 tests. |
| 12/11/2026 | **Profils et scoring : refonte ergonomique.** Profils = liste ordonnée simple (nom + phrase ; l'ordre remplace le champ « priorité » ; couleur automatique ; mode de calcul replié par défaut). Réponses : une liste déroulante « Indique : <profil> » à côté du texte de la réponse (remplace les pastilles et la pondération) ; résumé « N réponses par profil » avec alerte rouge sur un profil jamais indiqué (remplace la barre « points possibles »). Le modèle de données n'a pas changé ; la pondération reste possible dans les données. |
| 12/11/2026 | **Questions simplifiées** : description, choix multiple et « obligatoire » masqués dans l'éditeur (interrupteur `SHOW_ADVANCED_QUESTION_FIELDS` dans `questions-step.tsx`) ; moteur, page publique et données inchangés, donc réactivables sans migration. Toute question créée reste à choix unique et obligatoire. |
| 12/11/2026 | **Créateur de quiz : étapes réordonnées et scoring repensé.** Ordre : Informations, Profils, Questions, Résultats, Capture, Publication. Profils colorés ; chaque réponse se relie aux profils par pastilles (pondération facultative par question) ; « Points au score global » affiché seulement quand il sert ; barre « points possibles par profil » (alerte profil inatteignable) ; plages de score visuelles avec détection des trous et chevauchements. Aucun changement du modèle de données stocké (champ `color` facultatif ajouté aux profils). 52 tests. |
| 12/11/2026 | **Prospects multi-participations** : la fiche liste toutes les participations (plus récente d'abord, objectif du quiz affiché) ; le CRM gagne une colonne « Participations » (pastille si > 1) et le filtre « Plusieurs participations seulement » (pris en compte par l'export CSV) ; le jeu de démo contient une dizaine de prospects ayant fait les deux quiz. 50 tests. |
| 12/11/2026 | **Mon Business en deux onglets** (`/business`, `/business/offers`), chacun avec sa propre adresse (composant `TabNav`, réutilisable pour les Paramètres). Avant : deux cartes sur une page. |
| 12/11/2026 | **Mon Business : informations de l'activité et offres/services séparées** en deux cartes avec leurs propres formulaires, schémas de validation, actions et enregistrements (modifier l'un ne touche pas l'autre). |
| 12/11/2026 | **Publications et Assistant IA mis au chaud** (hors objectif de la plateforme). Drapeaux `LEADORA_FEATURE_PUBLICATIONS` / `LEADORA_FEATURE_AI` (désactivés par défaut) : menu, pages, actions, boutons d'amélioration IA, onglet IA de création, quota IA des paramètres, publications de démonstration, textes d'aide associés. Code et tests conservés. 45 tests. |
| 12/11/2026 | **Phase 1 complète sur données simulées.** Socle (domaine, base simulée avec transactions, services testés), design system, authentification, dashboard, créateur de quiz, page publique et endpoint public, CRM, statistiques, Assistant IA, publications, paramètres. Jeu de démonstration produit en rejouant les vrais services. Vérifié : typecheck, 43 tests, build de production, parcours public → CRM → export CSV via HTTP. **Non vérifié** : rendu visuel dans un navigateur (aucun navigateur piloté dans cet environnement) — à contrôler lors de la première session de test. |

## 4. Questions ouvertes

- Nom de domaine et adresse publique des quiz (le PRD donne `app.diagnosticintelligent.com/q/…` en exemple).
- Politique de confidentialité : texte et versionnement du consentement (la version `2026-11` est un marqueur).
- Durée de conservation des données et procédure de demande de suppression côté participant (aujourd'hui : suppression par le créateur).
- Captcha ou équivalent sur le formulaire de capture pour les volumes réels.

- Landing page de conversion : démo jouable, cas d'usage, fonctionnalités, tarifs (lus depuis `PLANS`), FAQ ; SEO : métadonnées, canonical, Open Graph + image générée, JSON-LD (Organization, SoftwareApplication, FAQPage), `sitemap.xml`, `robots.txt`. Variable `NEXT_PUBLIC_SITE_URL`. Prix Starter/Pro non figés : affichés « Bientôt ».

## 5. Limites connues de la phase simulée

- Un seul processus serveur : la base est un fichier JSON, les limiteurs de fréquence sont en mémoire.
- Les e-mails ne sont pas envoyés (lien de réinitialisation affiché à l'écran).
- Pas de glisser-déposer pour réordonner : boutons monter / descendre.
- Les images sont stockées en data URL dans la base simulée.
