# Leadora — Quiz marketing et qualification de prospects

Plateforme SaaS pour créer des quiz de diagnostic, collecter des prospects et les qualifier : créateur de quiz en
5 étapes, pages publiques, CRM et statistiques.

> **Phase actuelle : application complète sur données simulées côté serveur.**
> Règles métier, permissions et validations sont réelles et testées ; seules la persistance (PostgreSQL + Drizzle),
> et l'authentification (Better Auth) sont simulées. Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
> et [docs/SUIVI.md](docs/SUIVI.md). Cahier des charges : [docs/PRD.md](docs/PRD.md).

## Démarrer

```bash
npm install
npm run dev          # http://localhost:3800
```

Comptes de démonstration (mot de passe `Leadora2026`, raccourcis sur la page de connexion) :

| Compte | Contenu |
|---|---|
| `demo@leadora.app` | Espace complet : 4 quiz (2 publiés, 1 brouillon, 1 archivé), ~100 prospects, statistiques sur 35 jours |
| `nouveau@leadora.app` | Espace vide : onboarding, états vides, premier quiz à créer |

Quiz publics de démonstration : `/q/maturite-financiere` et `/q/type-entrepreneur`.
Les données sont relatives à la date du jour, persistées dans `.data/leadora-demo.json`.
Réinitialisation : `npm run demo:reset` puis redémarrage.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement (port 3800) |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm test` | Tests unitaires et de recette (Vitest) |
| `npm run typecheck` | TypeScript strict |
| `npm run lint` | ESLint (config Next.js) |

## Stack

Next.js 16 (App Router, Server Components, Server Actions, Route Handlers) · React 19 · TypeScript strict ·
Tailwind CSS v4 · composants façon shadcn/ui (Radix UI) · React Hook Form + Zod 4 · Recharts · date-fns · Sonner · Vitest.

## Modules au chaud

Le calendrier de **Publications** et l'**Assistant IA** sont codés et testés mais désactivés (hors du cœur de la
plateforme) : absents du menu, pages en 404, actions refusées. Pour les réactiver, mettre
`LEADORA_FEATURE_PUBLICATIONS=1` et/ou `LEADORA_FEATURE_AI=1` (voir `.env.example`), puis redémarrer
(`npm run demo:reset` pour recréer les publications de démonstration).

## Parcours couverts

Inscription / connexion / mot de passe oublié · onboarding facultatif · dashboard (KPI, évolution, derniers leads,
checklist) · liste des quiz (filtres, dupliquer, archiver, dépublier, supprimer avec confirmation) · créateur de quiz
(informations, questions à choix unique ou multiple, scoring par profil ou par plage, profils et résultats, capture
des coordonnées, publication) avec enregistrement automatique et aperçu ordinateur / mobile · publication versionnée
et liens de partage par canal (UTM) · expérience participant (une question à la fois, progression sauvegardée,
consentement distinct) · CRM (filtres, pagination, fiche, historique des participations, tags, notes, statuts,
export CSV, effacement) · statistiques par quiz · paramètres et quotas.
