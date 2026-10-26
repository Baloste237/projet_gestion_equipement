# Proposition

## Why

L'application d'inventaire et de gestion d'équipements ne tourne actuellement qu'en environnement de développement local. Pour permettre un accès universel en ligne, le frontend doit être déployé sur **Vercel** et le backend distribué sur **Render** (via une architecture en conteneur supervisé optimisée pour le plan gratuit). 

Parallèlement, la navigation directe par la barre d'adresse de l'URL n'est pas sécurisée côté client : n'importe quel utilisateur ou visiteur peut saisir une route inexistante (qui affiche actuellement une page blanche ou indéfinie) ou une route administrative comme `/users` ou `/audit` sans disposer des privilèges requis. Une page personnalisée 404 (Not Found) et 403 (Accès Refusé) ainsi que des RouteGuards (`ProtectedRoute`) doivent être intégrés pour verrouiller le périmètre visuel et guider l'utilisateur.

Enfin, les derniers développements achevés (purge administrative, sécurisation des tokens inter-services, tests unitaires) doivent être versionnés proprement et poussés sur GitHub avec une Pull Request documentée.

## What Changes

- **Frontend - Page 404 & Contrôle d'accès** :
  - Création d'une page 404 personnalisée (`NotFoundPage.tsx`) stylisée avec le thème sombre existant de l'application (Material Symbols, palette de couleurs cohérente, boutons de redirection).
  - Création d'un composant de protection de routes (`ProtectedRoute.tsx`) vérifiant l'authentification (`token`) et le rôle requis (`ADMIN`, `RESPONSABLE`, `AUDITEUR`, `EMPLOYE`).
  - Gestion des accès refusés (403 / non autorisé) : redirection ou affichage d'un écran dédié invitant à retourner au tableau de bord ou à se connecter.
  - Ajout du catch-all `<Route path="*" element={<NotFoundPage />} />` dans le routeur React.
- **Frontend - Déploiement Vercel** :
  - Création du fichier `frontend/vercel.json` configurant la réécriture d'URL SPA (`rewrites: [{ source: "/(.*)", destination: "/index.html" }]`) indispensable pour éviter les erreurs 404 lors du rechargement de routes profondes.
  - Configuration de la variable d'environnement `VITE_API_URL` pointant vers le Gateway déployé sur Render.
- **Backend - Déploiement Render (Conteneur unifié supervisé)** :
  - Création d'une configuration de production Docker / Blueprint Render (`render.yaml` et Dockerfile de production) regroupant le Gateway (port public 4000/10000) et les 6 microservices (`auth`, `user`, `equipment`, `assignment`, `inventory`, `audit`) communicant en local interne.
  - Script superviseur de processus assurant le démarrage ordonné et l'exécution des migrations Prisma au lancement (`prisma migrate deploy`).
  - Exposition et sécurisation des variables d'environnement (`DATABASE_URL`, `JWT_SECRET`, `INTERNAL_SERVICE_TOKEN`, `CORS_ORIGIN`).
- **Gestion Git & Pull Request** :
  - Création d'une branche dédiée pour les changements récents (purge admin et tokens de sécurité).
  - Commit soigné de tous les fichiers modifiés et ajoutés.
  - Push vers le dépôt distant GitHub `origin` et instructions/création de la Pull Request vers `main` ou `develop`.

## Capabilities

### New Capabilities
- `route-access-control-and-not-found`: Gestion de la navigation sécurisée côté client, protection des routes par rôle (`ProtectedRoute`), affichage d'une page personnalisée 404 pour les routes inconnues et d'un écran d'accès non autorisé 403.
- `cloud-deployment`: Déploiement en production du backend supervisé sur Render et du frontend SPA sur Vercel avec persistance et variables d'environnement.

### Modified Capabilities
<!-- Aucune exigence fonctionnelle métier existante n'est altérée. -->

## Impact

- **Frontend** :
  - `frontend/src/App.tsx` (encadrement des routes par `ProtectedRoute` et ajout de la route 404).
  - `frontend/src/pages/errors/NotFoundPage.tsx` et `UnauthorizedPage.tsx` (nouveaux composants UI).
  - `frontend/src/components/auth/ProtectedRoute.tsx` (nouveau composant de garde de route).
  - `frontend/vercel.json` (configuration de déploiement).
- **Backend & Déploiement** :
  - `Dockerfile.production` ou `render.yaml` à la racine pour la conteneurisation globale.
  - Scripts de démarrage en production des services et migrations de base de données.
- **Git** :
  - Nouvelle branche Git et création d'une Pull Request sur GitHub.
