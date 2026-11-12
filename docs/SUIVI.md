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
| §6.6 Expérience publique | ✅ Une question à la fois, reprise de session, consentement, UTM | ⬜ Anti-fraude renforcé (captcha) |
| §6.7 CRM | ✅ Doublons, historique, tags (auto et manuels), notes, statuts, filtres, export CSV, effacement | — |
| §6.8 Statistiques | ✅ Par quiz et globales, sources, profils, scores | — |
| §6.9 Mon Business | ✅ | ⬜ Stockage du logo |
| §6.10 Assistant IA | ⏸ Au chaud (codé, testé, désactivé) | ⬜ Modèle de langage réel si réactivé |
| §6.11 Publications | ⏸ Au chaud (codé, désactivé) | — |
| §13 Tests | ✅ 45 tests (dont modules au chaud) (scoring, cycle de vie, versions, participation, CRM, isolation, stats, auth, seed) | ⬜ Tests d'intégration base, E2E Playwright |
| §15 Plans et quotas | ✅ Structure et application des limites | ⬜ Paiement (hors MVP) |

## 3. Journal des livraisons

| Date | Livraison |
|---|---|
| 12/11/2026 | **Publications et Assistant IA mis au chaud** (hors objectif de la plateforme). Drapeaux `LEADORA_FEATURE_PUBLICATIONS` / `LEADORA_FEATURE_AI` (désactivés par défaut) : menu, pages, actions, boutons d'amélioration IA, onglet IA de création, quota IA des paramètres, publications de démonstration, textes d'aide associés. Code et tests conservés. 45 tests. |
| 12/11/2026 | **Phase 1 complète sur données simulées.** Socle (domaine, base simulée avec transactions, services testés), design system, authentification, dashboard, créateur de quiz, page publique et endpoint public, CRM, statistiques, Assistant IA, publications, paramètres. Jeu de démonstration produit en rejouant les vrais services. Vérifié : typecheck, 43 tests, build de production, parcours public → CRM → export CSV via HTTP. **Non vérifié** : rendu visuel dans un navigateur (aucun navigateur piloté dans cet environnement) — à contrôler lors de la première session de test. |

## 4. Questions ouvertes

- Nom de domaine et adresse publique des quiz (le PRD donne `app.diagnosticintelligent.com/q/…` en exemple).
- Politique de confidentialité : texte et versionnement du consentement (la version `2026-11` est un marqueur).
- Durée de conservation des données et procédure de demande de suppression côté participant (aujourd'hui : suppression par le créateur).
- Captcha ou équivalent sur le formulaire de capture pour les volumes réels.

## 5. Limites connues de la phase simulée

- Un seul processus serveur : la base est un fichier JSON, les limiteurs de fréquence sont en mémoire.
- Les e-mails ne sont pas envoyés (lien de réinitialisation affiché à l'écran).
- Pas de glisser-déposer pour réordonner : boutons monter / descendre.
- Les images sont stockées en data URL dans la base simulée.
