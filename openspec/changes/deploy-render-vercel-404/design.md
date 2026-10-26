# Design

## Context

L'application est un monorepo comprenant un frontend React 18 + Vite (avec React Router v6) et un backend microservices Express/TypeScript composé d'un Gateway et de 6 microservices (auth, user, equipment, assignment, inventory, audit) avec bases PostgreSQL et ORM Prisma.

Jusqu'à présent, toutes les routes du frontend étaient déclarées à plat dans `App.tsx` sans contrôle d'accès ni route d'échappement 404. De plus, le déploiement n'était testé qu'en local via Docker Compose.

Voir `proposal.md` pour la motivation et les objectifs du projet.

## Goals / Non-Goals

**Goals:**
- Implémenter un composant `ProtectedRoute` dans le frontend pour contrôler l'authentification et les autorisations de rôles (`ADMIN`, `RESPONSABLE`, `AUDITEUR`, `EMPLOYE`).
- Créer une page 404 personnalisée (`NotFoundPage`) et une page 403 personnalisée (`UnauthorizedPage`) aux normes du design system (dark mode, Material Symbols).
- Configurer le déploiement du frontend sur Vercel avec le fichier `vercel.json` pour la réécriture SPA.
- Concevoir la conteneurisation supervisée de production du backend pour Render (Option A) avec exécution automatique des migrations Prisma.
- Organiser les commits Git récents et préparer la Pull Request GitHub.

**Non-Goals:**
- Fusionner le code des microservices en un véritable monolithe dans le code source : le code reste découpé en microservices propres, ils sont simplement hébergés et supervisés au sein d'une même instance de production.
- Souscrire à des offres payantes d'hébergement.

## Decisions

### 1. Composant de garde de route `ProtectedRoute`
- **Choix** : Créer un composant réutilisable `src/components/auth/ProtectedRoute.tsx` acceptant les propriétés `allowedRoles?: string[]`.
- **Comportement** :
  - Si l'utilisateur n'a pas de jeton actif (`token` absent) : redirection vers `/login` avec conservation de l'URL cible dans `location.state`.
  - Si `allowedRoles` est spécifié et que le rôle de l'utilisateur n'y figure pas : affichage du composant `UnauthorizedPage` (accès refusé 403) plutôt qu'une redirection muette.
- **Alternative rejetée** : Gérer les vérifications de rôle individuellement dans chaque page. Le composant wrapper garantit une sécurité uniforme et déclarative dans `App.tsx`.

### 2. Pages d'erreur personnalisées (404 & 403)
- **Design** : Respect strict du design system existant (`bg-background`, `bg-surface-container`, `text-primary`, boutons primaires et secondaires).
- **NotFoundPage (404)** :
  - Déclenchée par `<Route path="*" element={<NotFoundPage />} />`.
  - Affiche une icône Material Symbols stylisée (`wrong_location` ou `travel_explore`), un code d'erreur 404, une explication claire et deux boutons : *"Retour au tableau de bord"* et *"Page précédente"*.
- **UnauthorizedPage (403)** :
  - Affiche `lock_person` ou `shield_locked`, le rôle actuel de l'utilisateur, et explique que des privilèges supérieurs sont requis.

### 3. Configuration Vercel SPA (`frontend/vercel.json`)
- **Choix** : Définir la règle de réécriture :
  ```json
  {
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ]
  }
  ```
- **Raison** : Les applications React Router (SPA) nécessitent que toutes les routes inexistantes physiquement sur le disque Vercel soient servies par `index.html` pour que le routeur JavaScript prenne le relais.

### 4. Déploiement Render en conteneur supervisé
- **Choix** : Créer `Dockerfile.render` et un script de démarrage supervisé `scripts/start-render.sh`.
- **Architecture d'exécution** :
  1. Au boot du conteneur, exécution séquentielle de `npx prisma migrate deploy` pour chaque microservice disposant d'un schéma Prisma.
  2. Lancement en arrière-plan des 6 microservices sur leurs ports respectifs (`4001` à `4006`) en écoute sur `localhost`.
  3. Lancement au premier plan du `gateway` sur le port public injecté par Render (`PORT` ou `4000`), proxifiant les requêtes vers les services internes.
- **Alternative rejetée** : Déployer 7 Web Services Render distincts (limitation des quotas gratuits et latence inacceptable due aux cold starts cumulés).

### 5. Stratégie Git & Pull Request
- **Choix** :
  1. Créer la branche `feat/deploy-and-custom-404` à partir de la branche courante.
  2. Indexer et committer les fichiers de purge administrative, de sécurité et les ajouts actuels avec des messages conventionnels.
  3. Pousser vers `origin/feat/deploy-and-custom-404`.
  4. Créer la Pull Request GitHub avec un résumé clair des changements apportés.

## Risks / Trade-offs

- **[Mise en veille du conteneur Render gratuit]** $\rightarrow$ *Mitigation* : Le fait d'utiliser un seul conteneur unifié réduit le temps de réveil à une seule instance (environ 30-40s) au lieu de 7 instances consécutives.
- **[Politique CORS entre Vercel et Render]** $\rightarrow$ *Mitigation* : Configurer dans le Gateway la prise en compte de l'origine du frontend Vercel via variable d'environnement `CORS_ORIGIN`.
- **[Stockage des uploads éphémère sur Render gratuit]** $\rightarrow$ *Mitigation* : Prévoir la compatibilité avec un stockage externe ou documenter le comportement éphémère du disque local en plan gratuit.
