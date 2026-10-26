# Tasks

## 1. Mise à jour de la Base de Données

- [x] 1.1 `user-service`: Ajouter le modèle `Position` (Poste) et la relation dans Prisma, puis vérifier la génération du client avec `npx prisma generate`.
- [x] 1.2 `assignment-service`: Remplacer `userId` par `assigneeType` (enum) et `assigneeId` (String), puis vérifier la migration avec `npx prisma migrate dev`.
- [x] 1.3 `equipment-service`: Ajouter les nouveaux champs (location, brand, purchaseDate, etc.) dans `Equipment`, puis vérifier la migration avec `npx prisma migrate dev`.

## 2. API et Affectation Polymorphique

- [x] 2.1 `assignment-service`: Mettre à jour le contrôleur et service d'affectation pour traiter le polymorphisme, et vérifier avec des tests d'API (ou unitaires).
- [x] 2.2 `assignment-service`: Ajouter une vérification (HTTP ou Event) auprès de `user-service` pour valider l'existence du département/poste et vérifier avec Postman ou test d'intégration.

## 3. Système d'Import/Export

- [x] 3.1 `equipment-service`: Installer `multer` et `csv-parser`/`xlsx` et vérifier l'installation via npm.
- [x] 3.2 `equipment-service`: Créer le endpoint d'import `POST /api/equipments/import` gérant le mapping JSON et la génération unitaire depuis la quantité, puis vérifier via un fichier CSV de test.
- [x] 3.3 `equipment-service`: Créer le endpoint d'export `GET /api/equipments/export` formatant les données en CSV et vérifier via téléchargement direct.

## 4. Événements et Dashboard (KPIs)

- [x] 4.1 Configurer la connexion RabbitMQ dans `equipment-service` et `assignment-service`, vérifier l'état du broker via les logs Docker.
- [x] 4.2 Émettre des événements (ex: `equipment.created`, `assignment.created`) et vérifier via l'interface management RabbitMQ.
- [x] 4.3 `inventory-service` (ou nouveau service analytique): Mettre en place les consommateurs RabbitMQ pour agréger les stats, et vérifier que les KPIs s'actualisent en base.
- [x] 4.4 Créer un endpoint `GET /api/dashboard/kpis` et vérifier via Postman la récupération des statistiques en temps réel.
