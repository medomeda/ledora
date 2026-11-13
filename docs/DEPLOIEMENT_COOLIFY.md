# Déploiement sur Coolify — production

Deux services : `app` (Leadora) et `db` (PostgreSQL 16). Les données vivent dans le volume `pg-data` et survivent aux
redéploiements. Au premier démarrage, les migrations sont appliquées.

**Phase de test (réglage par défaut)** : `LEADORA_DEMO_MODE=1` charge des **données simulées** dans la base vide (comptes
fictifs, quiz, prospects), affiche le bandeau « Version de démonstration », les comptes de test sur la page de connexion et la
page `/guide` pour les testeurs (section 9). **Production réelle** : `LEADORA_DEMO_MODE=0` et base vide : aucun compte
ni donnée fictive, le premier administrateur est créé à partir des variables `LEADORA_BOOTSTRAP_ADMIN_*` (section 4).

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

**Générées par Coolify, à ne pas toucher** : `SERVICE_PASSWORD_POSTGRES` (mot de passe de la base),
`SERVICE_HEX_64_BETTERAUTHSECRET` (secret de signature des sessions : le changer déconnecte tout le monde) et
`SERVICE_HEX_64_CRONSECRET` (secret de la route de réinitialisation de la démonstration, section 9).

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
| `LEADORA_DEMO_MODE` | `1` | **Phase de test : actif par défaut** (bandeau, comptes fictifs sur la connexion, page `/guide`, données simulées chargées dans une base vide). Mettre `0` pour la production réelle, puis repartir d'une base vide (section 9). |
| `LEADORA_SHOWCASE_QUIZ` | *(vide)* | Adresse d'un quiz **publié** proposé par le bouton « Voir un quiz en vrai » de l'accueil (ex. `mon-diagnostic`). Vide : le quiz de démonstration en mode test, sinon le bouton devient « Voir comment ça marche ». |
| `LEADORA_ALLOW_DEMO_RESET` | `0` | Mode test seulement : `1` active le bouton « Réinitialiser la démonstration » (Administration → Réglages) et la route `POST /api/demo/reset`. |
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
# http://localhost:3301 — parcours « production » : administration admin@local.test / mot-de-passe-local-12
LEADORA_DEMO_MODE=1 LEADORA_ALLOW_DEMO_RESET=1 docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
# mode test : bandeau, /guide, comptes de démonstration (mot de passe Leadora2026)
docker compose -f docker-compose.yml -f docker-compose.local.yml down -v   # arrêt et suppression des données de test
```

## 9. Mode test (données simulées)

Actif par défaut dans `docker-compose.yml` (`LEADORA_DEMO_MODE=1`). Au premier démarrage sur une base **vide**, le jeu de démonstration est
chargé (comptes fictifs, 4 quiz, environ 300 prospects, une équipe d'administration). Les testeurs trouvent les comptes et des
parcours conseillés sur `https://votre-domaine/guide` (mot de passe commun `Leadora2026` : comptes Coach, Nouveau client,
Administrateur, Support, Lecture seule). Un bandeau « Version de démonstration » rappelle que rien de réel ne doit être saisi.

- **Remise à zéro** (si `LEADORA_ALLOW_DEMO_RESET=1`) : Administration → Réglages → « Réinitialiser la démonstration », ou
  ```bash
  curl -X POST -H "Authorization: Bearer <SERVICE_HEX_64_CRONSECRET>" https://votre-domaine/api/demo/reset
  ```
  Tout est effacé et rechargé, et tout le monde est déconnecté.
- **Passer en production réelle** : mettre `LEADORA_DEMO_MODE=0` **et repartir d'une base vide** (supprimer le volume `pg-data` de la ressource, puis
  redéployer), sinon les comptes fictifs aux mots de passe publics resteraient dans la base. Renseigner ensuite `LEADORA_BOOTSTRAP_ADMIN_*` (section 4).
- **Ne jamais** laisser le mode test actif sur l'instance qui reçoit des données réelles.
- En mode test, le compte administrateur est `admin@leadora.app` : `LEADORA_BOOTSTRAP_ADMIN_*` n'est pas utilisé (un compte d'équipe existe déjà).

## 10. Reste avant d'ouvrir au public

Emails réels (fournisseur à choisir : confirmation d'adresse, mot de passe oublié, invitations), textes légaux (CGU, confidentialité)
à faire valider, prix des offres, paiement en ligne, IA réelle (aujourd'hui simulée). Voir `docs/SUIVI.md`.
