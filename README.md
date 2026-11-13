# Leadora — Quiz marketing et qualification de prospects

Plateforme SaaS pour créer des quiz de diagnostic, collecter des prospects et les qualifier : créateur de quiz en
7 étapes avec assistance IA et design personnalisable, pages publiques, CRM et statistiques.

> **Phase actuelle : application complète avec persistance PostgreSQL.**
> Règles métier, permissions, validations, persistance (PostgreSQL + Drizzle) et authentification (Better Auth)
> sont réelles et testées. Restent simulés : l'envoi d'emails (les liens s'affichent à l'écran), le fournisseur d'IA,
> le stockage de fichiers ; le paiement n'est pas branché. Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
> et [docs/SUIVI.md](docs/SUIVI.md). Cahier des charges : [docs/PRD.md](docs/PRD.md).

## Démarrer

```bash
npm install
cp .env.example .env.local      # puis décommentez DATABASE_URL (PostgreSQL local, voir ci-dessous)
npm run db:up                   # PostgreSQL 16 dans Docker (port 5440)
npm run dev                     # http://localhost:3300 : migrations appliquées et jeu de démonstration chargé au 1er démarrage
```

Deux modes de stockage, choisis par l'environnement :

| Mode | Activation | Usage |
|---|---|---|
| **PostgreSQL** | `DATABASE_URL=postgres://…` | Développement et production |
| **PGlite** (PostgreSQL embarqué, sans Docker) | rien (défaut) | Essai rapide, données dans `.data/pglite` |

Authentification : Better Auth (`BETTER_AUTH_SECRET`, 32 caractères minimum, obligatoire en production ; voir `.env.example`).

`npm run db:migrate` applique les migrations, `npm run db:reset` recharge le jeu de démonstration (efface tout),
`npm run db:empty` vide la base, `npm run db:generate` produit une migration après une modification de `schema.ts`.
En production, le jeu de démonstration n'est jamais chargé (`LEADORA_SEED_DEMO=0` par défaut).

Comptes de démonstration (mot de passe `Leadora2026`, raccourcis sur la page de connexion) :

| Compte | Contenu |
|---|---|
| `demo@leadora.app` | Espace complet : 4 quiz (2 publiés, 1 brouillon, 1 archivé), ~100 prospects, statistiques sur 35 jours |
| `nouveau@leadora.app` | Espace vide : onboarding, états vides, premier quiz à créer |
| `admin@leadora.app` | **Administration** (`/admin`), rôle Administrateur : ~14 comptes clients (offres, anciennetés, un compte suspendu), journal d'audit, équipe |
| `support@leadora.app` / `lecture@leadora.app` | Collaborateurs de l'équipe : rôles **Support** et **Lecture seule** (pour voir les permissions) |

Quiz publics de démonstration : `/q/maturite-financiere` (design par défaut) et `/q/type-entrepreneur` (design personnalisé : thème Océan, titres en Fraunces, centré).
Les données de démonstration sont relatives à la date du jour. Réinitialisation : `npm run db:reset` (efface tout).

## Déploiement (VPS, Coolify)

Même schéma que KOTI : `Dockerfile` (serveur Next.js autonome, utilisateur non root, ~240 Mo) + `docker-compose.yml`
(`app` + `db` PostgreSQL 16, volume `pg-data`). Migrations appliquées au démarrage ; premier administrateur créé à partir de
`LEADORA_BOOTSTRAP_ADMIN_*` ; sondes `/api/health` (processus) et `/api/ready` (base). Guide pas à pas :
[docs/DEPLOIEMENT_COOLIFY.md](docs/DEPLOIEMENT_COOLIFY.md). Test local de l'image :
`docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build` puis http://localhost:3301.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement (port 3300) |
| `npm run db:up` / `db:down` | Démarre / arrête PostgreSQL de développement (`docker-compose.dev.yml`, port 5440) |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm test` | Tests unitaires et de recette (Vitest) |
| `npm run typecheck` | TypeScript strict |
| `npm run lint` | ESLint (config Next.js) |

## Stack

Next.js 16 (App Router, Server Components, Server Actions, Route Handlers) · React 19 · TypeScript strict ·
Tailwind CSS v4 · composants façon shadcn/ui (Radix UI) · React Hook Form + Zod 4 · Recharts · date-fns · Sonner · Vitest.

## IA et modules au chaud

**IA dans la création de quiz (active)** : générer un quiz complet à partir d'une description (onglet « Avec l'IA » de
« Nouveau quiz »), l'**ajuster en langage naturel** avant de créer le brouillon (« Ajoute une question sur l'épargne »,
« Ton plus dynamique »…, avec suivi des ajustements et annulation), reformuler un titre, une question ou un diagnostic
(« Améliorer avec l'IA »), et ajuster un brouillon existant depuis le créateur (bouton « Ajuster avec l'IA »). L'IA propose,
vous validez : rien n'est publié automatiquement. Le fournisseur est **simulé** (`AI_PROVIDER=mock`) : il reconnaît un
jeu de formulations (voir les exemples affichés) en attendant un vrai modèle de langage. `LEADORA_FEATURE_AI=0` désactive tout.

**Au chaud (désactivés)** : le module **Assistant IA** du menu (`LEADORA_FEATURE_ASSISTANT=1`) et le calendrier de
**Publications** (`LEADORA_FEATURE_PUBLICATIONS=1`) : codés et testés, absents du menu, pages en 404, actions refusées.
Voir `.env.example`, puis redémarrer.

## Administration de la plateforme

Réservée à l'équipe (une page 404 pour tout client), à `/admin` : vue d'ensemble avec **filtre de période** (7, 30, 90 jours, tout l'historique ou dates personnalisées ; indicateurs comparés à la période précédente ; courbe par jour, semaine ou mois selon la durée), **mon profil** (`/admin/profil` : informations, rôle et permissions, changement de mot de passe), **équipe** (inviter des collaborateurs avec un rôle : Administrateur, Support, Lecture seule ; changer le rôle, désactiver l'accès, retirer ; invitation par lien valable 7 jours), **comptes** (recherche, filtres, fiche avec usage vs quotas ; changer l'offre, suspendre avec motif, réactiver, confirmer l'email, lien de réinitialisation, déconnecter partout, supprimer définitivement avec confirmation selon le rôle), **quiz** (modération : dépublier ou archiver avec motif), **offres et quotas** (quotas et prix modifiables sans redéploiement), **journal d'audit** (toute action est consignée) et **réglages** (ouverture des inscriptions, annonce affichée à tous les clients). Un administrateur sans espace client est redirigé vers `/admin` après connexion.

## Parcours couverts

Inscription / connexion / mot de passe oublié · onboarding facultatif · dashboard (KPI, évolution, derniers leads,
checklist) · liste des quiz (filtres, dupliquer, archiver, dépublier, supprimer avec confirmation) · créateur de quiz
(informations, questions à choix unique ou multiple, scoring par profil ou par plage, profils et résultats, capture
des coordonnées, publication) avec enregistrement automatique et aperçu ordinateur / mobile · publication versionnée
et liens de partage par canal (UTM) · expérience participant (une question à la fois, progression sauvegardée,
consentement distinct) · CRM (filtres, pagination, fiche, historique des participations, tags, notes, statuts,
export CSV, effacement) · statistiques par quiz · paramètres et quotas.
