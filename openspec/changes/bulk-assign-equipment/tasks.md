# Tasks

## 1. Base Git

- [x] 1.1 Créer la branche `feat/bulk-assign-equipment` à partir de `feat/dashboard-kpi-charts`; vérifier avec `git branch --show-current` et un arbre propre (`git status`, hors dossiers non suivis habituels)

## 2. equipment-service : routes groupées

- [x] 2.1 Ajouter les schémas zod `lookupEquipmentsSchema` (`ids` : 1 à 200 uuid) et `batchStatusSchema` (`ids`, `from`, `to` parmi les statuts connus); vérifier par tests unitaires les cas valides, vide, trop long et statut inconnu
- [x] 2.2 Ajouter au repository `findManyByIds` et `updateStatusIfAll` (transaction : sélection des équipements au statut `from`, annulation si le compte diffère); vérifier par test que rien n'est modifié quand un identifiant est en défaut
- [x] 2.3 Ajouter au service `lookup` et `updateStatusBatch` qui publient, pour chaque équipement modifié, l'audit `EQUIPMENT_UPDATED` et l'événement `equipment.updated` (avant/après); vérifier par test la publication de N événements et l'absence d'événement en cas d'échec
- [x] 2.4 Ajouter les routes `POST /equipments/lookup` et `POST /equipments/status/batch` (409 avec la liste des identifiants en défaut) avec documentation Swagger, déclarées avant les routes `/:id`; vérifier par test HTTP (200, 400, 409) et l'affichage dans la doc Swagger
- [x] 2.5 Documenter les deux routes dans le README d'equipment-service; vérifier la présence du paragraphe

## 3. assignment-service : noyau, index et route groupée

- [x] 3.1 Écrire la migration SQL de l'index unique partiel `Assignment(equipmentId) WHERE status = 'ACTIVE'` avec contrôle préalable des doublons (échec explicite listant les équipements) et un commentaire dans `schema.prisma`; vérifier l'application sur une base de test vide, puis l'échec attendu sur une base contenant un doublon actif
- [x] 3.2 Ajouter les codes d'erreur `BULK_ASSIGNMENT_REFUSED` (409) et `EQUIPMENT_ALREADY_ASSIGNED` (409) et la traduction de l'erreur Prisma `P2002`; vérifier par test unitaire de la traduction
- [x] 3.3 Ajouter au client equipment-service `lookup` et `updateStatusBatch` (délai adapté, erreurs 409/503 traduites); vérifier par tests avec un faux service HTTP (succès, 409, injoignable)
- [x] 3.4 Ajouter le schéma zod `createBulkAssignmentSchema` (type, `assigneeId`, `equipmentIds` 1 à 200 distincts, champs facultatifs) et la constante de plafond; vérifier par tests (vide, 201 éléments, doublon, uuid invalide)
- [x] 3.5 Ajouter au repository `createMany` (transaction) et `deleteByIds` pour la compensation; vérifier par test que le conflit d'index annule toute la transaction
- [x] 3.6 Écrire `assignmentService.createMany` selon l'ordre du design (validation, lookup, transaction, batch de statuts avec 2 tentatives, compensation, événements et audit seulement après succès) et faire de `create` un cas particulier; vérifier par tests unitaires : succès, refus multiples avec liste, conflit d'index, échec du batch avec suppression des affectations, aucun événement en cas d'échec
- [x] 3.7 Ajouter le client d'audit HTTP best-effort (`ASSIGNMENTS_CREATED`, auteur = `req.user.id`, liste des équipements et affectations) et l'appeler pour les créations groupées et unitaires; vérifier par test avec un faux audit-service (contenu de l'entrée, panne sans effet sur la réponse)
- [x] 3.8 Ajouter le contrôleur et la route `POST /assignments/bulk` (authentification, `assignment:create`) avec documentation Swagger; vérifier par test HTTP : 201, 400, 401, 409 avec détails, et que `POST /assignments` garde son contrat
- [x] 3.9 Ajouter `AUDIT_SERVICE_URL` à `.env.example`, `docker-compose.yml` et aux fichiers locaux ignorés; vérifier `docker compose config` et le démarrage du service

## 4. Frontend : logique et interface

- [x] 4.1 Ajouter `assignmentService.createBulk` et les types de la réponse et des refus; vérifier avec `npm run build`
- [x] 4.2 Écrire les fonctions pures de sélection (`isSelectable`, sélection des résultats filtrés, retrait des équipements devenus indisponibles, limite de 200) et leurs tests; vérifier avec `npm test`
- [x] 4.3 Ajouter à `EquipmentsPage` la colonne de cases à cocher (désactivées hors « Disponible »), la case d'en-tête « tout sélectionner » limitée aux résultats filtrés, le compteur et la barre « Affecter la sélection »; vérifier dans le navigateur avec des équipements de statuts variés
- [x] 4.4 Faire évoluer `AssignmentModal` : équipements présélectionnés, liste multiple avec recherche, sélection conservée quand la recherche change, retrait d'un équipement retenu; vérifier dans le navigateur
- [x] 4.5 Appeler l'API groupée dès 2 équipements retenus (l'appel unitaire reste utilisé pour 1) et afficher le rapport : nombre affecté, ou liste des refus avec leur raison, « aucune affectation créée » et retrait possible des équipements refusés; vérifier les deux issues dans le navigateur
- [x] 4.6 Désactiver l'action au-delà de 200 équipements avec un message clair et rafraîchir les listes après une réussite; vérifier avec 201 sélections simulées et après un succès
- [x] 4.7 Vérifier qu'aucune lecture du rôle ne masque la sélection ou l'action; vérifier avec un compte EMPLOYE

## 5. Vérification d'ensemble et livraison

- [x] 5.1 Lancer les tests des services modifiés, `tsc` et, dans `frontend/`, `npm test`, `npm run build` et `npm run lint`; vérifier qu'ils passent
- [x] 5.2 Parcours de bout en bout sur la pile locale avec un compte EMPLOYE et des données préfixées `E2E-` : affecter 5 équipements à un poste et à un département, refus tout ou rien avec un équipement déjà affecté, deux demandes simultanées sur le même équipement (une seule réussit), échec simulé du service équipement (rien n'est conservé), KPIs mis à jour, entrée d'audit présente; vérifier chaque scénario de la spec
- [x] 5.3 Parcours dans un vrai navigateur (Edge headless) : sélection dans la liste, modale, rapport de réussite et de refus; vérifier chaque scénario d'interface de la spec
- [x] 5.4 Supprimer toutes les données de test créées (préfixe `E2E-`, y compris lignes d'affectations et d'audit sans API de suppression) et reconstruire les KPIs; vérifier par une lecture qu'il ne reste rien
- [x] 5.5 Mettre à jour les README (racine, frontend, assignment-service) : affectation groupée, index partiel et `migrate deploy`; vérifier la relecture
- [x] 5.6 Commiter par service avec des messages conventionnels sur `feat/bulk-assign-equipment`; vérifier `git log --oneline`
- [ ] 5.7 Sur confirmation de l'utilisateur, pousser la branche et ouvrir la pull request; vérifier que le pipeline GitHub Actions est vert
