# Déploiement sur Coolify — production

Deux services : `app` (Leadora) et `db` (PostgreSQL 16). Les données vivent dans le volume `pg-data` et survivent aux
redéploiements. Au premier démarrage, les migrations sont appliquées et la base reste **vide** : aucun compte ni donnée
fictive. Le premier administrateur est créé à partir des variables `LEADORA_BOOTSTRAP_ADMIN_*` (section 4).

## 1. Prérequis

- Coolify installé sur le VPS, serveur « localhost » validé.
- Un sous-domaine (ex. `app.mondomaine.com`) dont l'enregistrement **A** pointe vers l'IP du VPS (ports 80 et 443 ouverts).
- Le dépôt `github.com/medomeda/ledora` accessible par Coolify (GitHub App ou clé de déploiement), branche `main`.
  Fichiers nécessaires (dans le dépôt) : `Dockerfile`, `docker-compose.yml`, `.dockerignore`, dossier `drizzle/`.

## 2. Créer la ressource

1. **Projet → Environment → + New → Private Repository** (via GitHub App) et choisir `medomeda/ledora`, branche `main`.
2. **Build Pack : Docker Compose**.
3. **Base Directory** : `/` — **Docker Compose Location** : `/docker-compose.yml`.
4. Enregistrer : Coolify lit le fichier et crée les variables.

## 3. Domaine

Onglet **General → Domains**, ligne du service **app** :

```
https://app.mondomaine.com:3300
```

Le `:3300` indique au proxy le port interne ; le public passe par le 443 (HTTPS automatique Let's Encrypt).
Le HTTPS est **obligatoire** : les cookies de session sont marqués `Secure` en production.

## 4. Variables d'environnement

**Générées par Coolify, à ne pas toucher** : `SERVICE_PASSWORD_POSTGRES` (mot de passe de la base) et
`SERVICE_HEX_64_BETTERAUTHSECRET` (secret de signature des sessions : le changer déconnecte tout le monde).

**À renseigner** :

| Variable | Rôle |
|---|---|
| `BETTER_AUTH_URL` | Adresse publique **https** de l'application, **sans** `:3300` (ex. `https://app.mondomaine.com`). Sert aux liens, au contrôle d'origine, au référencement (sitemap, canonical). |
| `LEADORA_BOOTSTRAP_ADMIN_EMAIL` | Adresse du premier administrateur. |
| `LEADORA_BOOTSTRAP_ADMIN_PASSWORD` | Son mot de passe initial (**12 caractères minimum**). Le compte n'est créé **que s'il n'existe aucun compte d'équipe** : après la première connexion, changez le mot de passe depuis « Mon profil » puis **supprimez cette variable** de Coolify. |
| `LEADORA_BOOTSTRAP_ADMIN_NAME` | Nom affiché (facultatif, « Administrateur Leadora » par défaut). |

L'administrateur se connecte sur `https://votre-domaine/login` et arrive directement sur `/admin`. Il y invite ensuite l'équipe
(Administration → Équipe).

**Déjà réglées par défaut dans `docker-compose.yml`** (modifiables dans l'onglet Environment Variables) :

| Variable | Défaut | Rôle |
|---|---|---|
| `LEADORA_SEED_DEMO` | `0` | `1` charge le jeu de démonstration (comptes fictifs aux mots de passe publics) dans une base **vide**. **Jamais en production.** |
| `LEADORA_DEMO_MODE` | `0` | `1` affiche les comptes de démonstration sur la page de connexion. |
| `LEADORA_FEATURE_AI` | `1` | Assistance IA dans la création de quiz (fournisseur simulé : `AI_PROVIDER=mock`). |
| `LEADORA_FEATURE_ASSISTANT` / `_PUBLICATIONS` | `0` | Modules « au chaud ». |
| `MAIL_PROVIDER` | *(vide)* | Aucun fournisseur d'emails branché : les messages sont écrits dans les journaux et les liens (mot de passe oublié, invitations) s'affichent à l'écran. |
| `TRUST_PROXY` | `1` | L'adresse IP réelle du visiteur est lue via le proxy de Coolify (limitation des tentatives). |

Les migrations de la base s'appliquent à chaque démarrage (le serveur ne démarre pas si elles échouent). En production, l'application
**refuse de démarrer sans `DATABASE_URL`**.

## 5. Déployer et vérifier

1. **Deploy**, puis suivre **Deployment Logs** (compilation : 3 à 5 minutes).
2. Le service doit passer **healthy** (sonde `/api/health`).
3. `https://votre-domaine/api/ready` doit répondre **200** (base joignable) ; `https://votre-domaine/` affiche la page d'accueil.
4. Se connecter avec le compte `LEADORA_BOOTSTRAP_ADMIN_*`, changer le mot de passe (Mon profil), retirer
   `LEADORA_BOOTSTRAP_ADMIN_PASSWORD` des variables.
5. Contrôler avec un compte client de test : inscription, création d'un quiz, publication, participation sur `/q/<adresse>`.
6. Administration → Offres et quotas : fixer les prix affichés ; Réglages : inscriptions ouvertes ou fermées.

## 6. Exploitation

- **Sauvegardes** : sauvegardez le volume `pg-data` (Coolify → ressource de base de données, ou `pg_dump` planifié). C'est la seule copie des données.
- **Mettre à jour** : `git push` sur `main` puis **Deploy** (ou activer le webhook). Les données sont conservées ; les évolutions du schéma sont des migrations SQL (`drizzle/`).
- **Une seule instance** `app` pour l'instant : la limitation de fréquence des requêtes est en mémoire du processus (à déplacer vers Redis avant d'en lancer plusieurs).
- **Journaux** : Runtime Logs de Coolify. Les emails « envoyés » y apparaissent (`[mail simulé]`).

## 7. Dépannage

| Symptôme | Cause probable |
|---|---|
| « No Available Server » | Le domaine n'a pas le suffixe `:3300`, ou le service n'est pas encore *healthy* (voir Runtime Logs). |
| La connexion « ne fait rien » / renvoie à la connexion | Site ouvert en `http://` : les cookies `Secure` exigent `https://`. |
| Erreur « origine non autorisée » à la connexion | `BETTER_AUTH_URL` ne correspond pas à l'adresse ouverte (https, sans port, même sous-domaine). |
| `app` redémarre en boucle | `DATABASE_URL` incorrect ou base pas prête (Runtime Logs : message de migration) ; ou `BETTER_AUTH_SECRET` absent. |
| Impossible de se connecter en administrateur | Compte non créé : mot de passe de moins de 12 caractères (Runtime Logs, source `[bootstrap]`), ou un compte d'équipe existe déjà (invitez-vous depuis l'Équipe, ou réinitialisez le mot de passe). |
| `/api/ready` répond 503 | PostgreSQL injoignable (service `db` arrêté). `/api/health` reste 200. |

## 8. Test local de l'image (recommandé avant le premier déploiement)

Avec Docker Desktop lancé :

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
# http://localhost:3301 — administration : admin@local.test / mot-de-passe-local-12
docker compose -f docker-compose.yml -f docker-compose.local.yml down -v   # arrêt et suppression des données de test
```

## 9. Reste avant d'ouvrir au public

Emails réels (fournisseur à choisir : confirmation d'adresse, mot de passe oublié, invitations), textes légaux (CGU, confidentialité)
à faire valider, prix des offres, paiement en ligne, IA réelle (aujourd'hui simulée). Voir `docs/SUIVI.md`.
