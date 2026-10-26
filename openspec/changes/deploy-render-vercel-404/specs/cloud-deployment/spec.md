# Spec Delta

## Purpose

Définit les exigences pour le déploiement infonuagique du système : conteneurisation unifiée supervisée du backend sur Render, hébergement statique SPA du frontend sur Vercel, et traçabilité des versions via Pull Request GitHub.

## ADDED Requirements

### Requirement: Frontend SPA Hosting on Vercel
Le frontend SHALL être configuré pour un déploiement continu sur Vercel avec réécriture SPA et injection de l'URL publique de l'API.

#### Scenario: Navigation directe et rafraîchissement sur Vercel
- **WHEN** un utilisateur rafraîchit une route profonde telle que `/equipments/labels` ou accède directement à `/e/:id`
- **THEN** Vercel réécrit la requête vers `index.html` pour permettre au routeur React de résoudre la route sans erreur HTTP 404 du serveur web

#### Scenario: Consommation des services de production
- **WHEN** le client frontend effectue des requêtes API
- **THEN** les requêtes sont dirigées vers le Gateway de production défini par la variable `VITE_API_URL`

### Requirement: Supervised Backend Container on Render
Le backend distribué SHALL être packagé dans un conteneur unifié exécutant les migrations de base de données puis le Gateway et l'ensemble des microservices sous un superviseur de processus.

#### Scenario: Démarrage et santé du service
- **WHEN** le conteneur démarre sur la plateforme Render
- **THEN** les migrations Prisma sont appliquées, les microservices démarrent en local interne, le Gateway écoute sur le port d'entrée et répond avec succès sur `/health`

### Requirement: Version Control and Pull Request
Tous les changements applicatifs, de sécurité et de déploiement SHALL être commités sur une branche Git dédiée et soumis sous forme de Pull Request documentée.

#### Scenario: Soumission des changements
- **WHEN** les fonctionnalités sont finalisées et vérifiées
- **THEN** une branche de fonctionnalité est poussée vers le dépôt GitHub distant et une Pull Request vers la branche principale est initiée
