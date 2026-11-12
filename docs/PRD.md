# PRD — Leadora
## Plateforme SaaS de création de quiz marketing, génération de leads et qualification commerciale

**Version :** 1.0 — MVP  
**Date :** Novembre 2026  
**Type :** Application Web SaaS  
**Langue :** Français (V1)  
**Cible :** Coachs, consultants, formateurs, entrepreneurs, infopreneurs et professionnels du marketing.

---

# 1. VISION ET PRÉSENTATION DU PRODUIT

## 1.1. Vision

Leadora est une plateforme SaaS permettant aux professionnels de créer facilement des quiz interactifs à vocation marketing, afin d'attirer de nouveaux prospects, comprendre leurs besoins, évaluer leur niveau de maturité et les convertir en clients.

La plateforme repose sur un principe simple :

**Transformer un simple questionnaire en un véritable outil de prospection et de conversion commerciale.**

Un coach pourra, par exemple, créer un quiz intitulé :

- Quel est votre niveau de maturité financière ?
- Quel type d'entrepreneur êtes-vous ?
- Pourquoi votre business ne décolle-t-il pas ?
- Quel est votre profil de leadership ?
- Êtes-vous prêt à lancer votre activité ?
- Quel est votre niveau de maîtrise de l'anglais ?

Le participant répond aux questions, renseigne ses coordonnées et reçoit un diagnostic personnalisé en fonction de ses réponses.

De son côté, le créateur du quiz récupère un nouveau contact dans son CRM, accompagné de ses réponses, de son profil, de son niveau et de ses éventuels besoins.

Il peut ensuite engager une démarche commerciale adaptée.

## 1.2. Problème à résoudre

Les professionnels qui commercialisent des formations, du coaching, des accompagnements ou des services rencontrent plusieurs difficultés :

- Attirer régulièrement de nouveaux prospects.
- Transformer les visiteurs en contacts qualifiés.
- Comprendre les véritables besoins de leur audience.
- Identifier les prospects les plus susceptibles d'acheter.
- Personnaliser leurs approches commerciales.
- Créer des lead magnets sans compétences techniques.
- Exploiter les données collectées pour améliorer leur prospection.

Les formulaires classiques collectent des coordonnées, mais donnent peu d'informations sur les besoins réels des prospects.

Les quiz interactifs permettent d'aller plus loin en combinant engagement, collecte de données et qualification.

## 1.3. Proposition de valeur

Leadora permet de :

1. Créer un quiz sans compétence technique.
2. Définir des questions et des réponses personnalisées.
3. Associer des scores et des profils aux réponses.
4. Générer des diagnostics et recommandations personnalisés.
5. Collecter les coordonnées des participants.
6. Centraliser automatiquement les prospects dans un CRM.
7. Identifier les prospects prioritaires.
8. Suivre les performances des quiz et les conversions.

## 1.4. Positionnement

Leadora ne doit pas être présenté comme un simple outil de création de formulaires.

Il doit être positionné comme un :

**Outil de génération et de qualification intelligente de prospects grâce aux quiz marketing.**

La différence fondamentale réside dans la valeur commerciale des données collectées.

---

# 2. OBJECTIFS DU MVP

## 2.1. Objectif principal

Permettre à un professionnel de créer, publier et exploiter un quiz marketing en quelques minutes, sans avoir besoin d'un développeur ou d'un outil marketing complexe.

## 2.2. Objectifs fonctionnels

Le MVP doit permettre à un utilisateur de :

- Créer un compte et configurer son espace.
- Renseigner les informations de son activité.
- Créer et gérer plusieurs quiz.
- Concevoir des questions à choix multiples.
- Définir des scores et des profils de résultats.
- Configurer un formulaire de collecte de coordonnées.
- Personnaliser la page de résultat.
- Publier un quiz avec une URL publique.
- Partager son quiz sur les réseaux sociaux, WhatsApp ou par email.
- Collecter les réponses et les coordonnées.
- Retrouver automatiquement les participants dans un CRM.
- Consulter les résultats et statistiques.
- Utiliser l'IA pour accélérer la création de quiz.

## 2.3. Indicateurs de réussite du MVP

Les indicateurs suivants permettront d'évaluer le produit :

| Indicateur | Objectif |
|---|---|
| Création d'un premier quiz | Moins de 10 minutes |
| Publication | Sans intervention technique |
| Collecte de leads | Automatique |
| Enregistrement des réponses | 100 % des soumissions valides |
| Disponibilité des résultats | Immédiate après soumission |
| Accès aux statistiques | Depuis le dashboard |
| Utilisation de l'IA | Facultative |

---

# 3. UTILISATEURS CIBLES

## 3.1. Coachs et consultants

Ils souhaitent attirer des prospects, identifier leurs problématiques et proposer des accompagnements adaptés.

Exemples :
- Coach en développement personnel.
- Coach business.
- Coach financier.
- Coach professionnel.
- Consultant en stratégie.

## 3.2. Formateurs

Ils souhaitent identifier le niveau de connaissance de leur audience et orienter les participants vers leurs formations.

Exemples :
- Formation en marketing digital.
- Formation en entrepreneuriat.
- Formation en informatique.
- Formation en langues.

## 3.3. Entrepreneurs et infopreneurs

Ils souhaitent développer leur audience, collecter des contacts qualifiés et promouvoir leurs produits et services.

## 3.4. Autres professionnels

Consultants indépendants, agences, experts, prestataires de services et petites entreprises.

---

# 4. PARCOURS GLOBAL DU PRODUIT

Le fonctionnement de la plateforme repose sur six grandes étapes.

**1. CRÉER**

L'utilisateur crée un quiz manuellement ou avec l'assistance de l'IA.

**2. PUBLIER**

Il personnalise son quiz, configure les paramètres de collecte et obtient un lien public.

**3. CAPTURER**

Les visiteurs répondent au quiz et renseignent leurs coordonnées.

**4. QUALIFIER**

La plateforme calcule automatiquement les scores, identifie le profil et génère un résultat personnalisé.

**5. CONVERTIR**

Les prospects sont enregistrés dans le CRM. Le professionnel peut les consulter, les segmenter et assurer leur suivi commercial.

**6. ANALYSER**

L'utilisateur consulte les statistiques de participation, les taux de complétion et les performances de ses quiz.

---

# 5. ARCHITECTURE FONCTIONNELLE

L'application doit disposer d'une navigation principale organisée autour des modules suivants :

1. Dashboard
2. Mon Business
3. Lead Magnets
4. CRM
5. Publications
6. Assistant IA
7. Paramètres

La création et la gestion des quiz seront regroupées dans le module Lead Magnets.

Le module Publications sera un espace de planification éditoriale simplifié, distinct de la création des lead magnets.

Le module Assistant IA permettra d'assister l'utilisateur dans ses tâches de conception et de rédaction.

---

# 6. SPÉCIFICATIONS FONCTIONNELLES

## 6.1. AUTHENTIFICATION ET GESTION DES COMPTES

### Objectif

Permettre aux utilisateurs de créer leur compte et d'accéder à leur espace personnel.

### Fonctionnalités

- Inscription par prénom, nom, email et mot de passe.
- Connexion par email et mot de passe.
- Déconnexion.
- Réinitialisation du mot de passe.
- Vérification de l'adresse email.
- Gestion de la session.
- Protection des routes privées.
- Gestion du profil utilisateur.

### Règles

- Un utilisateur possède un espace de travail.
- Toutes ses données sont isolées de celles des autres utilisateurs.
- Un utilisateur ne peut accéder qu'à ses propres quiz, prospects et statistiques.
- L'authentification est assurée par Better Auth.

La structure devra anticiper une évolution future vers les équipes et les espaces de travail collaboratifs, sans implémenter cette complexité dans le MVP.

## 6.2. ONBOARDING ET CONFIGURATION DE L'ACTIVITÉ

### Objectif

Permettre à l'utilisateur de configurer son espace professionnel dès sa première connexion.

### Informations à collecter

- Nom de l'activité ou de la marque.
- Type d'activité.
- Domaine d'intervention.
- Description de l'activité.
- Nom du responsable.
- Email professionnel.
- Site web (facultatif).
- Logo (facultatif).

### Catégories d'activité

- Coaching.
- Formation.
- Conseil.
- Entrepreneuriat.
- Services.
- Autre.

### Règles UX

- Onboarding court et progressif.
- Possibilité de compléter les informations ultérieurement.
- Affichage d'une checklist de démarrage sur le dashboard.
- Ne pas imposer la configuration complète avant de pouvoir créer un premier quiz.

## 6.3. DASHBOARD

### Objectif

Fournir une vue synthétique de l'activité commerciale et marketing de l'utilisateur.

### Indicateurs principaux

Afficher des cartes KPI :

- Nombre total de quiz.
- Quiz publiés.
- Nombre total de participants.
- Nombre de nouveaux leads.
- Taux de complétion moyen.
- Nombre de leads qualifiés.

### Formules de calcul

**Taux de complétion :**

Nombre de quiz terminés / Nombre de sessions de quiz commencées × 100.

**Taux de conversion en leads :**

Nombre de participants ayant transmis leurs coordonnées / Nombre de visiteurs ou sessions éligibles × 100.

Les deux taux doivent être clairement différenciés.

### Sections complémentaires

- Activité récente.
- Derniers leads collectés.
- Quiz les plus performants.
- Évolution des participations.
- Raccourcis vers la création d'un quiz.
- Checklist de configuration.

### États

Prévoir un dashboard vide pour les nouveaux utilisateurs avec un CTA clair :

« Créer mon premier quiz ».

Ne pas afficher de graphiques artificiels ou de statistiques fictives.

## 6.4. MODULE LEAD MAGNETS

### Objectif

Centraliser la création, la publication et la gestion des ressources marketing destinées à générer des prospects.

### Types de lead magnets

L'architecture fonctionnelle doit prévoir :

- Quiz / Diagnostic.
- Formulaire.
- PDF / Guide téléchargeable.

**Priorité du MVP : le Quiz / Diagnostic.**

Les formulaires et PDF doivent être anticipés dans l'architecture, mais leur expérience complète de création et de diffusion pourra être ajoutée dans une version ultérieure.

### Liste des quiz

Afficher une liste des quiz créés sous forme de tableau ou de cartes.

Informations :

- Nom du quiz.
- Catégorie.
- Statut.
- Nombre de participants.
- Nombre de leads.
- Date de création.
- Dernière modification.

### Statuts

- Brouillon.
- Publié.
- Archivé.

### Actions

- Créer.
- Modifier.
- Prévisualiser.
- Publier.
- Copier le lien.
- Dupliquer.
- Archiver.
- Consulter les statistiques.

La suppression définitive devra être protégée par une confirmation et tenir compte des données associées.

## 6.5. CRÉATEUR DE QUIZ

### Objectif

Permettre de concevoir un quiz interactif sans compétences techniques.

C'est le module central du produit. Il doit bénéficier d'une attention particulière en matière d'ergonomie.

### A. Création du quiz

L'utilisateur peut créer un quiz de deux façons :

**Option 1 : Création manuelle**

Il renseigne :

- Titre du quiz.
- Description.
- Introduction.
- Catégorie.
- Image de couverture.
- Objectif du quiz.

**Option 2 : Création assistée par IA**

L'utilisateur décrit son besoin en langage naturel.

Exemple :

« Je suis coach financier et je souhaite attirer des salariés qui rencontrent des difficultés à gérer leur argent. Je veux un quiz permettant d'identifier leur profil financier et de leur proposer un accompagnement. »

L'IA propose :

- Un titre.
- Une description.
- Une introduction.
- Une série de questions.
- Les réponses possibles.
- Les scores associés.
- Les profils de résultats.
- Les recommandations correspondantes.

L'utilisateur doit pouvoir modifier chaque élément avant publication.

L'IA ne doit jamais publier automatiquement un quiz sans validation de l'utilisateur.

### B. Structure du créateur

Organiser l'interface en étapes :

**Étape 1 — Informations générales**

- Titre.
- Description.
- Introduction.
- Image de couverture.
- Catégorie.

**Étape 2 — Questions**

L'utilisateur peut ajouter, modifier, supprimer et réorganiser les questions.

Types de questions du MVP :

1. Choix unique (radio).
2. Choix multiple (checkbox).

Chaque question possède :

- Un intitulé.
- Une description facultative.
- Une liste de réponses.
- Un caractère obligatoire ou facultatif.
- Un ordre d'affichage.
- Des règles de scoring.

Prévoir la possibilité d'ajouter des images aux réponses dans une évolution future.

### C. Gestion des réponses et du scoring

Chaque réponse peut être associée à :

- Un score numérique.
- Un ou plusieurs profils.
- Des points attribués à des catégories de diagnostic.

Exemple :

Question : Comment gérez-vous votre argent à la fin du mois ?

| Réponse | Score |
|---|---:|
| Je termine généralement avec de l'épargne | 3 |
| Je termine juste à l'équilibre | 2 |
| Je suis souvent à découvert | 1 |

Les scores doivent être configurables.

Prévoir deux mécanismes complémentaires :

**Scoring global :**

Addition des points obtenus pour déterminer un niveau général.

**Scoring par profil :**

Chaque réponse contribue à un profil particulier. Le profil ayant le score le plus élevé devient le résultat principal.

Cette approche permet de construire des diagnostics plus pertinents qu'un simple questionnaire de connaissances.

### D. Profils de résultats

L'utilisateur définit les profils possibles.

Exemple pour un quiz financier :

- Profil 1 : Gestionnaire maîtrisé.
- Profil 2 : Équilibriste financier.
- Profil 3 : Dépendant du découvert.

Pour chaque profil, définir :

- Nom.
- Description.
- Conditions de déclenchement.
- Message personnalisé.
- Points forts.
- Points d'amélioration.
- Recommandations.
- Appel à l'action.

Prévoir un système de priorité pour gérer les égalités entre plusieurs profils.

Si aucun profil n'est défini, le créateur peut utiliser des plages de scores.

### E. Configuration des résultats

L'utilisateur peut configurer :

- Le titre du résultat.
- Le texte de diagnostic.
- Les recommandations.
- Les conseils personnalisés.
- Une image.
- Un bouton d'action.

Exemples de CTA :

- Réserver un appel découverte.
- Découvrir ma formation.
- Prendre rendez-vous.
- Contacter le coach sur WhatsApp.
- Visiter une page de vente.

Les URL des CTA sont configurables.

### F. Configuration du formulaire de capture

Le créateur doit pouvoir décider à quel moment les coordonnées sont demandées.

Options :

- Avant le quiz.
- Après les questions, avant l'affichage des résultats.

**Configuration recommandée : après les questions et avant les résultats.**

Champs standards :

- Prénom.
- Nom (facultatif).
- Email.
- Téléphone (facultatif).

L'utilisateur peut activer ou désactiver certains champs facultatifs.

Prévoir :
- Personnalisation du titre du formulaire.
- Message explicatif.
- Case de consentement marketing.
- Lien vers la politique de confidentialité.

Le consentement à recevoir des communications commerciales doit être distinct de la simple demande d'affichage du résultat.

### G. Prévisualisation

Permettre de tester le quiz avant publication.

L'aperçu doit reproduire fidèlement l'expérience du participant :

- Introduction.
- Questions.
- Progression.
- Formulaire.
- Résultat.

Prévoir un aperçu responsive desktop et mobile.

### H. Publication

Lors de la publication :

- Vérifier que les informations obligatoires sont renseignées.
- Vérifier qu'au moins une question existe.
- Vérifier les réponses.
- Vérifier les règles de scoring.
- Vérifier les profils ou plages de résultats.
- Vérifier la configuration de capture.
- Générer une URL publique unique.

Exemple :

`https://app.diagnosticintelligent.com/q/mon-diagnostic-financier`

Le quiz doit pouvoir être dépublié sans supprimer ses données historiques.

## 6.6. EXPÉRIENCE PUBLIQUE DU QUIZ

### Objectif

Proposer aux participants une expérience fluide, professionnelle et engageante.

La page publique ne doit pas ressembler à un formulaire administratif.

### Structure

**1. Page d'introduction**

- Logo ou marque.
- Titre.
- Description.
- Temps estimé.
- Bouton « Commencer le diagnostic ».

**2. Questions**

- Affichage d'une question à la fois.
- Réponses clairement présentées.
- Bouton suivant.
- Bouton précédent.
- Indicateur de progression.
- Validation des réponses obligatoires.

**3. Capture des coordonnées**

Afficher le formulaire au moment configuré par le créateur.

**4. Calcul du résultat**

Calculer automatiquement les scores et déterminer le profil.

**5. Page de résultat**

Afficher :

- Profil identifié.
- Niveau ou score.
- Diagnostic.
- Points forts.
- Axes d'amélioration.
- Recommandations.
- Appel à l'action.

### Règles techniques

- Interface responsive.
- Chargement rapide.
- Sauvegarde des réponses pendant la session.
- Gestion des erreurs de connexion.
- Validation des données côté serveur.
- Protection contre les soumissions frauduleuses.
- Identification de la source de trafic à partir des paramètres UTM.

Le quiz doit être accessible sans créer de compte.

## 6.7. MODULE CRM — GESTION DES PROSPECTS

### Objectif

Transformer les participants aux quiz en contacts commerciaux exploitables.

Le CRM doit être simple, rapide et directement lié aux quiz.

### A. Liste des prospects

Afficher :

- Prénom.
- Nom.
- Email.
- Téléphone.
- Profil obtenu.
- Score.
- Quiz d'origine.
- Date d'inscription.
- Statut commercial.

### B. Fiche prospect

Chaque contact possède une fiche détaillée comprenant :

**Informations personnelles**
- Prénom.
- Nom.
- Email.
- Téléphone.

**Informations marketing**
- Quiz d'origine.
- Profil de diagnostic.
- Score obtenu.
- Réponses aux questions.
- Date de participation.
- Source de trafic.
- Paramètres UTM.
- Tags.

**Suivi commercial**
- Statut.
- Notes.
- Date de dernière interaction.

### C. Statuts commerciaux

- Nouveau.
- À contacter.
- Contacté.
- Qualifié.
- Converti.
- Non intéressé.

### D. Gestion des tags

Permettre d'ajouter des tags manuellement.

Exemples :
- Coaching financier.
- Besoin urgent.
- Prospect chaud.
- Formation marketing.
- Intéressé par un accompagnement.

Prévoir l'ajout automatique de tags en fonction du quiz ou du profil obtenu.

### E. Gestion des doublons

Un même email ne doit pas créer plusieurs contacts CRM.

Lorsqu'un participant existant répond à un autre quiz :

- Mettre à jour ses informations si nécessaire.
- Enregistrer une nouvelle participation.
- Conserver l'historique des quiz.
- Ne pas écraser les anciennes réponses.
- Conserver la traçabilité du consentement marketing.

Un contact peut donc avoir plusieurs participations à différents quiz.

### F. Recherche et filtrage

Permettre de filtrer les contacts par :

- Nom.
- Email.
- Quiz.
- Profil.
- Statut.
- Tag.
- Période.

Prévoir une fiche prospect accessible depuis les statistiques d'un quiz.

**Important :** le CRM du MVP est un CRM de prospection et de qualification. Il ne doit pas devenir un outil de gestion commerciale complexe.

## 6.8. STATISTIQUES ET ANALYTICS

### Objectif

Mesurer l'efficacité marketing des quiz.

### Statistiques générales

- Nombre de visiteurs.
- Nombre de sessions commencées.
- Nombre de quiz terminés.
- Nombre de leads collectés.
- Taux de complétion.
- Taux de conversion en leads.

### Statistiques par quiz

- Nombre de visites.
- Nombre de démarrages.
- Nombre de participations terminées.
- Nombre de coordonnées collectées.
- Taux de complétion.
- Taux de conversion.
- Répartition des profils.
- Répartition des scores.

### Sources de trafic

Identifier les provenances :

- Direct.
- Facebook.
- Instagram.
- LinkedIn.
- WhatsApp.
- Email.
- Autre.

Utiliser les paramètres UTM lorsque disponibles.

### Représentations

- Graphiques d'évolution.
- Graphiques de répartition.
- Cartes KPI.
- Tableaux de résultats.

Les données doivent provenir exclusivement des événements réellement enregistrés.

## 6.9. MODULE MON BUSINESS

### Objectif

Centraliser les informations de l'activité professionnelle de l'utilisateur.

Dans le MVP, ce module doit rester simple.

Informations :

- Nom commercial.
- Description.
- Secteur.
- Activité.
- Logo.
- Site web.
- Liens de réservation.
- Lien WhatsApp.
- Offres et services principaux.

Ces informations peuvent être réutilisées pour contextualiser les propositions de l'Assistant IA.

## 6.10. ASSISTANT IA

### Objectif

Faciliter la création de contenus marketing et de diagnostics pertinents.

L'IA doit être un assistant opérationnel, et non un chatbot généraliste sans lien avec les fonctionnalités de l'application.

### Fonctionnalités MVP

**1. Génération de quiz**

À partir d'une description du besoin.

**2. Génération de questions**

Proposer des questions pertinentes et des réponses cohérentes.

**3. Création de profils**

Proposer les profils de résultats et leurs caractéristiques.

**4. Génération de diagnostics**

Proposer les textes de résultats et les recommandations associées.

**5. Amélioration de contenus**

Permettre de reformuler :
- Un titre.
- Une introduction.
- Une question.
- Une réponse.
- Un résultat.
- Un appel à l'action.

### Contexte de génération

L'IA doit tenir compte :
- Du domaine d'activité.
- De la cible.
- De l'offre.
- De l'objectif marketing.
- Du ton souhaité.

### Règles

- L'IA propose, l'utilisateur valide.
- Les contenus générés restent modifiables.
- L'IA ne doit pas inventer de résultats réels.
- Les scores et règles de calcul doivent rester explicites et vérifiables.
- Les appels à l'IA doivent être réalisés côté serveur.
- Prévoir une gestion des erreurs et des limites d'utilisation.
- Le fournisseur d'IA doit être interchangeable via une couche de service.

L'intégration doit utiliser une API de modèle de langage configurée par variables d'environnement.

Ne pas imposer un fournisseur unique dans le code métier.

## 6.11. MODULE PUBLICATIONS

### Objectif

Permettre à l'utilisateur de planifier ses contenus marketing et de les associer à ses campagnes de génération de leads.

### Fonctionnalités

Créer une publication avec :

- Titre.
- Contenu.
- Plateforme.
- Visuel facultatif.
- Date et heure prévues.
- Pilier de contenu.
- Objectif.
- Quiz ou lead magnet associé.
- Statut.

### Plateformes

- Facebook.
- Instagram.
- LinkedIn.
- WhatsApp.
- Autre.

### Statuts

- Idée.
- Brouillon.
- À valider.
- Planifiée.
- Publiée.

### Vues

- Calendrier mensuel.
- Vue hebdomadaire.
- Vue liste.

### Limites MVP

Le module sert uniquement à organiser et planifier les publications.

Pas de publication automatique sur les réseaux sociaux dans le MVP.

Pas d'intégration aux API Meta, LinkedIn ou autres plateformes.

L'objectif est de permettre au professionnel d'organiser sa communication et d'associer ses contenus à ses quiz.

---

# 7. EXPÉRIENCE UTILISATEUR ET DESIGN

## 7.1. Direction artistique

Créer une interface SaaS moderne, premium, minimaliste et professionnelle.

L'interface doit inspirer confiance et donner l'impression d'utiliser un véritable outil marketing.

Éviter absolument le rendu générique souvent produit par les outils de vibecoding :

- Accumulation de cartes inutiles.
- Dégradés décoratifs excessifs.
- Couleurs criardes.
- Ombres trop prononcées.
- Icônes sans cohérence.
- Espacements aléatoires.
- Boutons sans hiérarchie visuelle.

### Principes de design

- Design épuré.
- Typographie lisible.
- Hiérarchie visuelle claire.
- Espacements cohérents.
- Couleurs sobres.
- Contrastes suffisants.
- Icônes Lucide.
- Composants réutilisables.
- Feedback visuel immédiat.

## 7.2. Structure de navigation

### Desktop

Sidebar latérale fixe ou rétractable.

Navigation :

- Dashboard
- Mon Business
- Lead Magnets
- CRM
- Publications
- Assistant IA
- Paramètres

La partie supérieure peut accueillir :
- Recherche.
- Aide.
- Notifications futures.
- Profil utilisateur.

### Mobile

Navigation compacte adaptée aux petits écrans.

Les tableaux doivent devenir des listes ou des cartes adaptées.

Le créateur de quiz doit rester utilisable sur mobile, même si l'expérience de création principale est optimisée pour desktop.

## 7.3. Pages publiques

Les quiz publics doivent bénéficier d'une interface distincte de l'application privée.

L'expérience participant doit être :
- Rapide.
- Accessible.
- Sans authentification.
- Sans éléments de navigation inutiles.
- Optimisée pour mobile.
- Personnalisée selon l'identité du créateur.

## 7.4. États de l'interface

Chaque module doit prévoir :

- Loading state.
- Empty state.
- Error state.
- Success state.
- Confirmation avant les actions sensibles.
- Messages de validation.
- Feedback lors des sauvegardes.

Ne jamais laisser une page vide sans explication.

---

# 8. ARCHITECTURE TECHNIQUE

## 8.1. Stack technologique

Le projet doit être développé avec une architecture monolithique modulaire Next.js.

| Composant | Technologie |
|---|---|
| Framework | Next.js App Router |
| Langage | TypeScript |
| UI | React |
| Styling | Tailwind CSS |
| Composants | Shadcn/UI |
| Icônes | Lucide React |
| Authentification | Better Auth |
| ORM | Drizzle ORM |
| Base de données | PostgreSQL |
| Validation | Zod |
| Formulaires | React Hook Form |
| Gestion des états serveur | TanStack React Query si nécessaire |
| Graphiques | Recharts |
| Dates | date-fns |
| Tests unitaires | Vitest |
| Tests E2E | Playwright |

Utiliser les versions stables et compatibles des dépendances au démarrage du projet.

## 8.2. Architecture applicative

Une seule application Next.js.

Pas de backend séparé.
Pas de frontend séparé.
Pas de microservices.

Utiliser :

- Server Components pour les pages et données principalement consultatives.
- Server Actions pour les mutations métier.
- Route Handlers pour les endpoints HTTP nécessaires, notamment les quiz publics, les intégrations et les callbacks.
- Services métier pour centraliser les règles.
- Drizzle pour les accès aux données.

Éviter de disperser les requêtes SQL et la logique métier directement dans les composants.

## 8.3. Structure de dossiers recommandée

```text
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   │
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── business/
│   │   ├── lead-magnets/
│   │   ├── crm/
│   │   ├── publications/
│   │   ├── assistant/
│   │   └── settings/
│   │
│   ├── q/
│   │   └── [slug]/
│   │
│   ├── api/
│   │   ├── auth/
│   │   └── public/
│   │
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── dashboard/
│   ├── quiz/
│   ├── crm/
│   ├── analytics/
│   └── shared/
│
├── features/
│   ├── auth/
│   ├── business/
│   ├── lead-magnets/
│   ├── quizzes/
│   ├── crm/
│   ├── publications/
│   ├── analytics/
│   └── ai/
│
├── lib/
│   ├── auth/
│   ├── db/
│   ├── validations/
│   ├── permissions/
│   ├── utils/
│   └── constants/
│
├── services/
│   ├── quiz.service.ts
│   ├── scoring.service.ts
│   ├── lead.service.ts
│   ├── analytics.service.ts
│   └── ai.service.ts
│
└── db/
    ├── schema/
    ├── migrations/
    └── seed.ts
```

Cette structure est indicative et peut être adaptée, mais la séparation fonctionnelle doit être conservée.

---

# 9. MODÉLISATION DE LA BASE DE DONNÉES

Utiliser PostgreSQL avec Drizzle ORM.

Toutes les tables métier doivent être correctement reliées et protégées par les contraintes nécessaires.

## 9.1. Authentification

Better Auth gère les tables nécessaires à l'authentification :

- User.
- Session.
- Account.
- Verification.

Respecter le schéma attendu par Better Auth.

## 9.2. Tables métier

### businesses

Représente l'espace professionnel de l'utilisateur.

Champs :
- id.
- owner_id.
- name.
- slug.
- description.
- industry.
- activity_type.
- logo_url.
- website.
- whatsapp.
- booking_url.
- created_at.
- updated_at.

### quizzes

- id.
- business_id.
- title.
- slug.
- description.
- introduction.
- cover_image.
- category.
- status.
- capture_position.
- settings (JSONB).
- created_at.
- updated_at.
- published_at.

### quiz_questions

- id.
- quiz_id.
- title.
- description.
- type.
- is_required.
- position.
- settings (JSONB).
- created_at.
- updated_at.

### quiz_options

- id.
- question_id.
- label.
- description.
- image_url.
- position.
- created_at.

### quiz_option_scores

Table permettant de dissocier les réponses de leurs règles de scoring.

- id.
- option_id.
- profile_id (nullable).
- points.
- created_at.

Une réponse pourra ainsi contribuer à plusieurs dimensions de scoring si nécessaire.

### quiz_profiles

- id.
- quiz_id.
- name.
- description.
- result_title.
- result_content.
- strengths (JSONB).
- improvement_areas (JSONB).
- recommendations (JSONB).
- cta_label.
- cta_url.
- priority.
- created_at.
- updated_at.

### quiz_score_ranges

Pour les diagnostics basés sur des plages de scores.

- id.
- quiz_id.
- profile_id.
- min_score.
- max_score.

### quiz_submissions

Représente une participation à un quiz.

- id.
- quiz_id.
- participant_id (nullable).
- session_id.
- total_score.
- profile_id.
- started_at.
- completed_at.
- source.
- utm_source.
- utm_medium.
- utm_campaign.
- status.

### quiz_answers

- id.
- submission_id.
- question_id.
- option_id.
- answer_value (nullable).
- score_awarded.
- created_at.

Conserver les réponses historiques même si le créateur modifie ultérieurement le quiz.

Prévoir une stratégie de versionnement ou de snapshot de la configuration publiée pour que les anciennes participations restent interprétables.

### leads

- id.
- business_id.
- first_name.
- last_name.
- email.
- phone.
- status.
- created_at.
- updated_at.

Prévoir une unicité de l'email normalisé à l'intérieur d'un même espace professionnel.

### lead_submissions

Table de liaison entre les prospects et leurs participations.

- id.
- lead_id.
- submission_id.
- marketing_consent.
- consented_at.
- consent_policy_version.
- created_at.

Un prospect peut avoir plusieurs participations.

### tags

- id.
- business_id.
- name.
- color.
- created_at.

### lead_tags

- id.
- lead_id.
- tag_id.

### lead_notes

- id.
- lead_id.
- content.
- created_at.
- updated_at.

### publications

- id.
- business_id.
- title.
- content.
- platform.
- visual_url.
- content_pillar.
- objective.
- quiz_id (nullable).
- status.
- scheduled_at.
- published_at.
- created_at.
- updated_at.

### ai_generations

- id.
- business_id.
- user_id.
- type.
- input.
- output (JSONB).
- provider.
- model.
- status.
- created_at.

Cette table permet de conserver l'historique des générations et de faciliter le suivi des coûts d'utilisation.

## 9.3. Règles de modélisation

- Utiliser des UUID pour les identifiants.
- Utiliser des timestamps avec timezone.
- Ajouter created_at et updated_at aux entités concernées.
- Définir les clés étrangères.
- Définir les index utiles.
- Utiliser des transactions pour les opérations liées.
- Éviter les suppressions en cascade non maîtrisées.
- Prévoir les contraintes d'unicité.
- Isoler toutes les données par business_id.
- Vérifier les autorisations côté serveur.

Les scores calculés doivent être enregistrés dans les participations afin de conserver l'historique des résultats.

Les résultats historiques ne doivent pas changer lorsque le créateur modifie les questions, les profils ou les règles de scoring.

---

# 10. RÈGLES MÉTIER IMPORTANTES

## 10.1. Cycle de vie d'un quiz

Brouillon → Publié → Archivé.

Un quiz publié peut être modifié, mais les changements structurants doivent être traités comme une nouvelle version de configuration.

Les anciennes participations restent associées à leur version initiale.

## 10.2. Scoring

Le calcul du score doit être réalisé côté serveur.

Ne jamais faire confiance au score transmis par le navigateur.

Le serveur récupère les réponses enregistrées, applique les règles de scoring et détermine le résultat.

## 10.3. Capture des prospects

Une participation n'est considérée comme un lead que si les informations de contact requises sont correctement validées.

La participation et le contact CRM sont deux entités distinctes.

## 10.4. Gestion des doublons

Un contact existant peut participer plusieurs fois.

Chaque participation doit conserver :
- Le quiz concerné.
- Les réponses.
- Le score.
- Le résultat.
- La date.
- La source.
- Le consentement.

## 10.5. Sécurité

- Validation systématique côté serveur.
- Vérification des droits sur chaque mutation.
- Protection des endpoints publics.
- Limitation des soumissions abusives.
- Protection contre les injections.
- Nettoyage des contenus HTML.
- Protection contre les accès inter-utilisateurs.
- Secrets uniquement côté serveur.

---

# 11. MULTI-TENANCY ET PERMISSIONS

Le MVP est destiné à des professionnels indépendants disposant chacun de leur espace.

L'architecture doit néanmoins être compatible avec une évolution vers des équipes.

### Règles

- Un business appartient à un utilisateur propriétaire.
- Chaque quiz appartient à un business.
- Chaque lead appartient à un business.
- Chaque publication appartient à un business.
- Toutes les requêtes doivent vérifier le périmètre du business.

Ne jamais considérer qu'un identifiant fourni par le navigateur garantit l'autorisation d'accès.

Les contrôles d'accès doivent être centralisés dans des fonctions réutilisables.

---

# 12. SÉCURITÉ, CONFIDENTIALITÉ ET CONFORMITÉ

La plateforme traite des données personnelles.

Le MVP doit intégrer les bonnes pratiques suivantes :

- Politique de confidentialité.
- Consentement marketing explicite.
- Séparation du consentement nécessaire au traitement et du consentement commercial.
- Conservation de la date et de la version du consentement.
- Possibilité de demander la suppression de ses données.
- Suppression ou anonymisation selon les obligations applicables.
- Protection des données contre les accès non autorisés.
- Limitation des informations personnelles transmises au fournisseur d'IA.

Prévoir également des paramètres de conservation des données à faire évoluer selon les obligations légales des marchés ciblés.

---

# 13. PERFORMANCE ET QUALITÉ

## 13.1. Performance

- Pages optimisées.
- Chargement rapide des quiz publics.
- Pagination des listes de prospects.
- Indexation des colonnes de recherche.
- Requêtes SQL optimisées.
- Chargement différé des éléments non essentiels.
- Images optimisées.

## 13.2. Qualité du code

- TypeScript strict.
- Architecture modulaire.
- Fonctions métier réutilisables.
- Pas de duplication excessive.
- Pas de logique métier dans les composants UI.
- Gestion cohérente des erreurs.
- Validation avec Zod.
- Gestion des transactions.
- Respect des conventions de nommage.

## 13.3. Tests

Prévoir des tests pour :

**Authentification**
- Inscription.
- Connexion.
- Protection des pages.

**Quiz**
- Création.
- Modification.
- Publication.
- Calcul des scores.
- Détermination des profils.
- Soumission publique.

**CRM**
- Création d'un prospect.
- Gestion des doublons.
- Historique des participations.
- Gestion des tags.

**Sécurité**
- Isolation des données.
- Contrôle des permissions.
- Protection des endpoints.

**E2E**
- Création complète d'un quiz.
- Publication.
- Participation en tant que visiteur.
- Capture d'un prospect.
- Consultation du résultat dans le CRM.

Prévoir une vérification systématique :
- ESLint.
- TypeScript.
- Tests unitaires.
- Tests E2E.
- Build de production.

---

# 14. PÉRIMÈTRE DU MVP ET EXCLUSIONS

Le MVP doit rester concentré sur la création et l'exploitation commerciale des quiz.

| Fonctionnalité | MVP |
|---|---|
| Authentification | Oui |
| Gestion du business | Oui |
| Dashboard | Oui |
| Création manuelle de quiz | Oui |
| Création de quiz avec IA | Oui |
| Questions QCM | Oui |
| Scoring global | Oui |
| Scoring par profil | Oui |
| Résultats personnalisés | Oui |
| Formulaire de capture | Oui |
| Pages publiques | Oui |
| Publication par lien | Oui |
| CRM prospects | Oui |
| Tags et statuts | Oui |
| Historique des participations | Oui |
| Statistiques | Oui |
| Sources UTM | Oui |
| Assistant IA | Oui |
| Publications éditoriales | Version simplifiée |
| Formulaires indépendants | V2 |
| PDF téléchargeables | V2 |
| Publication automatique réseaux sociaux | Non |
| Email marketing automatisé | Non |
| Séquences de relance automatiques | Non |
| WhatsApp API | Non |
| Paiement et facturation intégrés | Non |
| Équipes et collaborateurs | Non |
| Application mobile native | Non |
| Marketplace de quiz | Non |
| White label avancé | Non |
| Domaine personnalisé | Non |
| Webhooks | Non |
| Intégrations CRM externes | Non |

Les quiz doivent néanmoins être conçus avec une architecture permettant d'ajouter ultérieurement ces fonctionnalités sans réécrire le cœur du produit.

---

# 15. MODÈLE ÉCONOMIQUE ENVISAGÉ

Le produit doit être conçu pour accueillir un modèle SaaS par abonnement.

### Offre gratuite

Objectif : permettre de découvrir le produit.

Pistes de limitation :
- Nombre limité de quiz actifs.
- Nombre limité de participations.
- Branding Leadora.
- Quota limité de générations IA.

### Offre Starter

Pour les indépendants qui commencent leur prospection.

- Davantage de quiz.
- Quota de participants supérieur.
- CRM.
- Statistiques.
- Assistance IA.

### Offre Pro

Pour les coachs, formateurs et entrepreneurs qui utilisent régulièrement les quiz.

- Quiz et participations plus nombreux.
- Fonctionnalités avancées de qualification.
- Personnalisation plus poussée.
- Quotas IA supérieurs.
- Statistiques détaillées.

### Offre Business

À envisager ultérieurement pour les structures ayant plusieurs collaborateurs.

**Important :** les tarifs, quotas et limites exactes ne sont pas figés dans le MVP. Prévoir une structure technique permettant de les configurer sans modifier le code métier.

Ne pas intégrer de paiement dans la première version si cela retarde la livraison du cœur fonctionnel. Prévoir néanmoins une couche de gestion des plans et des quotas.

---

# 16. DÉCOUPAGE DU DÉVELOPPEMENT

Le développement doit être réalisé par incréments fonctionnels. Chaque étape doit être testable avant de passer à la suivante.

## Phase 1 — Fondations

- Initialisation Next.js.
- Configuration TypeScript.
- Tailwind CSS.
- Shadcn/UI.
- PostgreSQL.
- Drizzle ORM.
- Better Auth.
- Layout principal.
- Sidebar.
- Gestion des utilisateurs.
- Configuration du business.

**Livrable :** application fonctionnelle avec authentification et espace privé.

## Phase 2 — Création des quiz

- Module Lead Magnets.
- Liste des quiz.
- Création manuelle.
- Gestion des questions.
- Gestion des réponses.
- Scoring global.
- Profils de résultats.
- Configuration des résultats.
- Prévisualisation.
- Sauvegarde des brouillons.

**Livrable :** un utilisateur peut concevoir un quiz complet.

## Phase 3 — Publication et participation

- Pages publiques.
- URL unique.
- Expérience de participation.
- Progression.
- Sauvegarde des réponses.
- Formulaire de capture.
- Calcul des scores.
- Affichage des résultats.

**Livrable :** un visiteur peut participer à un quiz et recevoir son diagnostic.

## Phase 4 — CRM

- Enregistrement automatique des leads.
- Gestion des doublons.
- Fiches prospects.
- Historique des participations.
- Tags.
- Statuts.
- Recherche et filtres.

**Livrable :** les participants deviennent des contacts exploitables.

## Phase 5 — Dashboard et Analytics

- KPI.
- Statistiques par quiz.
- Taux de complétion.
- Taux de conversion.
- Répartition des profils.
- Sources de trafic.

**Livrable :** l'utilisateur peut mesurer l'efficacité de ses quiz.

## Phase 6 — Assistant IA

- Intégration API IA.
- Génération de quiz.
- Génération de questions.
- Génération de profils.
- Génération des résultats.
- Historique des générations.
- Gestion des erreurs et quotas.

**Livrable :** création assistée par IA.

## Phase 7 — Publications et finalisation

- Calendrier éditorial.
- Création de publications.
- Association aux quiz.
- Gestion des statuts.
- Paramètres.
- Tests complets.
- Corrections UX.
- Optimisation responsive.
- Build de production.

**Livrable :** MVP prêt à être mis en production.

---

# 17. CRITÈRES D'ACCEPTATION DU MVP

Le produit est considéré comme fonctionnel lorsque le scénario suivant est entièrement opérationnel :

1. Un professionnel crée son compte.
2. Il configure son activité.
3. Il accède à son dashboard.
4. Il crée un nouveau quiz.
5. Il ajoute 5 à 10 questions.
6. Il configure les réponses et les scores.
7. Il définit trois profils de résultats.
8. Il configure le formulaire de capture.
9. Il prévisualise son quiz.
10. Il publie le quiz.
11. Il copie son lien public.
12. Un visiteur ouvre le lien sans authentification.
13. Il répond aux questions.
14. Il renseigne ses coordonnées.
15. Il reçoit son résultat personnalisé.
16. Le prospect apparaît automatiquement dans le CRM.
17. Ses réponses et son profil sont consultables.
18. Les statistiques du quiz sont actualisées.
19. Le propriétaire peut modifier ou archiver son quiz.
20. Les anciennes participations conservent leurs résultats historiques.

Ce scénario doit fonctionner de bout en bout sans intervention manuelle dans la base de données.

---

# 18. INSTRUCTIONS FINALES POUR L'IA DE VIBECODING

Tu es un ingénieur logiciel senior spécialisé dans la conception et le développement d'applications SaaS modernes.

Ta mission est de développer Leadora à partir de ce PRD.

Tu dois respecter les consignes suivantes :

## 18.1. Respect du périmètre

- Ne développe pas toutes les fonctionnalités futures.
- Respecte strictement le périmètre MVP.
- Ne crée pas de fonctionnalités fictives.
- Ne simule pas des données de production.
- Ne remplace pas une fonctionnalité complexe par un simple bouton décoratif.
- Chaque fonctionnalité visible doit être réellement opérationnelle.

## 18.2. Architecture

- Utilise Next.js App Router.
- Conserve une architecture full-stack dans une seule application.
- Utilise Better Auth.
- Utilise Drizzle ORM.
- Utilise PostgreSQL.
- Utilise TypeScript strict.
- Centralise les règles métier.
- Sépare les composants, les services et les accès aux données.
- Utilise des Server Actions et Route Handlers selon les besoins.
- Applique les permissions côté serveur.

Ne crée pas une architecture frontend/backend séparée.

## 18.3. Design

Produis une interface SaaS professionnelle, moderne et élégante.

L'expérience doit être comparable aux meilleurs outils SaaS actuels.

Évite le AI Slop.

Ne te contente pas de générer un dashboard avec des cartes génériques.

Travaille particulièrement :
- La hiérarchie visuelle.
- La navigation.
- Les tableaux.
- Les formulaires.
- Le créateur de quiz.
- L'expérience publique.
- Les pages de résultats.
- Les états vides.
- Les interactions.

Le créateur de quiz doit être le module le plus abouti de l'application.

## 18.4. Méthode de travail

Ne génère pas toute l'application en une seule fois.

Procède par phases fonctionnelles.

Pour chaque phase :

1. Analyse les dépendances.
2. Prépare les modèles de données.
3. Implémente les fonctionnalités.
4. Vérifie les règles métier.
5. Teste les interactions.
6. Vérifie les permissions.
7. Corrige les erreurs.
8. Vérifie le build.

Ne passe pas à la phase suivante tant que la précédente ne fonctionne pas correctement.

## 18.5. Qualité et robustesse

- Aucune donnée utilisateur ne doit être accessible par un autre utilisateur.
- Les validations doivent être réalisées côté serveur.
- Les erreurs doivent être correctement gérées.
- Les transactions doivent garantir la cohérence des données.
- Les formulaires doivent être ergonomiques.
- Les interfaces doivent être responsive.
- Les états de chargement et d'erreur doivent être prévus.
- Les données historiques doivent être préservées.
- Le code doit rester maintenable et évolutif.

## 18.6. Résultat attendu

À la fin du développement, nous devons disposer d'une véritable application SaaS opérationnelle permettant à un coach, un formateur ou un entrepreneur de :

**Créer un quiz → Le publier → Attirer des visiteurs → Collecter des prospects → Qualifier leurs besoins → Obtenir des statistiques → Transformer les prospects en clients.**

Le produit doit être suffisamment abouti pour être présenté à de premiers utilisateurs et commercialisé.

---

# FIN DU PRD

**Nom du produit :** Leadora  
**Promesse :** Transformez vos quiz en véritables outils de prospection et de conversion.  
**Positionnement :** La plateforme intelligente de génération et de qualification de prospects par quiz.