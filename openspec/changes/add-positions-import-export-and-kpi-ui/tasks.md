# Tasks

## 1. Base Git : suivre le frontend et isoler les modifications en attente

- [x] 1.1 Ajouter/compléter `frontend/.gitignore` (node_modules, dist, .env) et vérifier avec `git status --short frontend` qu'aucun dossier généré ni secret n'apparaît
- [x] 1.2 Créer la branche `chore/frontend-baseline` depuis `develop`, ajouter `frontend/` et commiter `chore: ajoute le frontend React`; vérifier avec `git show --stat HEAD` que seuls les sources sont inclus
- [x] 1.3 Regrouper les modifications backend en attente par service (assignment, audit, auth, equipment, user, inventory, gateway, infrastructure) en commits conventionnels séparés; vérifier avec `git status` que l'arbre est propre et qu'aucun `.env` n'est suivi
- [ ] 1.4 Sur confirmation de l'utilisateur, pousser la branche et ouvrir une PR vers `develop`; vérifier que le pipeline GitHub Actions passe

## 2. Backend : CRUD des postes (user-service)

- [x] 2.1 Créer `position.validator.ts` (nom ≥ 2 caractères, `departmentId` uuid, description, statut ACTIF/INACTIF) sur le modèle de `department.validator.ts`; vérifier par test unitaire les cas valides et invalides
- [x] 2.2 Ajouter au repository les opérations create, update, delete et la recherche par `(name, departmentId)`; vérifier par test que l'unicité est détectée
- [x] 2.3 Ajouter au service les règles : département existant, nom unique par département, erreurs `POSITION_NOT_FOUND`, `POSITION_NAME_CONFLICT`, `DEPARTMENT_NOT_FOUND`; vérifier par tests unitaires du service
- [x] 2.4 Ajouter les routes `POST /positions`, `PATCH /positions/:id`, `DELETE /positions/:id` avec documentation Swagger, sans contrôle de rôle; vérifier par appel HTTP sur chaque route avec un jeton EMPLOYE (succès) et sans jeton via le gateway (refus 401)
- [x] 2.5 Documenter dans le README de user-service que ces routes reposent sur l'authentification du gateway et que la restriction par rôle viendra dans un change ultérieur; vérifier la présence du paragraphe
- [x] 2.6 Vérifier que le gateway laisse passer `POST/PATCH/DELETE /positions` (méthodes et en-têtes) et corriger la config si nécessaire; vérifier par un appel via le gateway

## 3. Backend : filtres d'affectations et suppression protégée

- [x] 3.1 Ajouter à `GET /assignments` les filtres optionnels `assigneeType`, `assigneeId`, `status` sans changer la réponse sans paramètres; vérifier par tests du repository et du contrôleur
- [x] 3.2 Ajouter à user-service un client assignment-service et l'utiliser dans la suppression d'un poste : refus avec `POSITION_HAS_ACTIVE_ASSIGNMENTS` si une affectation active existe, refus aussi si assignment-service est injoignable; vérifier par tests unitaires des trois cas
- [x] 3.3 Ajouter `ASSIGNMENT_SERVICE_URL` à la config de user-service, à `.env.example` et à `docker-compose.yml`; vérifier que le service démarre avec les nouvelles variables
- [x] 3.4 Vérifier que l'ordre des réponses de `GET /assignments` et l'enrichissement `assignee` restent inchangés; vérifier par les tests existants du service

## 4. Backend : audit des postes et droits identiques pour tous les rôles

- [x] 4.1 Confirmer l'endpoint HTTP d'ingestion d'audit-service utilisé par le repli de `auth-service` et créer un `audit-publisher` best-effort dans user-service (`serviceName: user-service`); vérifier qu'une erreur réseau ne fait pas échouer la requête
- [x] 4.2 Publier `POSITION_CREATED`, `POSITION_UPDATED`, `POSITION_DELETED` (auteur = `x-user-id`); vérifier que chaque opération apparaît dans `GET /audit-logs`
- [x] 4.3 Dans `auth-service/src/config/permissions.config.ts`, définir une constante `ALL_PERMISSIONS` (avec un commentaire « état temporaire, séparation par rôle à venir ») et l'attribuer à ADMIN, RESPONSABLE, EMPLOYE et AUDITEUR; vérifier par test unitaire que `getPermissionsForRole` renvoie la même liste pour les quatre rôles et que les tests auth-service passent
- [x] 4.4 Dans inventory-service, retirer `requireRole("ADMIN")` de `POST /dashboard/kpis/rebuild` (garder `authenticate`) et mettre à jour sa documentation Swagger; vérifier qu'un jeton EMPLOYE obtient 200 et qu'un appel sans jeton obtient 401
- [x] 4.5 Vérifier avec un jeton EMPLOYE émis après 4.3 que la création, le transfert et la restitution d'une affectation, la création d'un inventaire et la lecture de l'audit ne renvoient pas 403

## 5. Backend : aperçu d'import (equipment-service)

- [x] 5.1 Exposer une fonction de lecture des en-têtes et d'un échantillon de lignes à partir de `spreadsheet.reader`, et de mapping suggéré à partir de `equipment-row.mapper`; vérifier par tests sur CSV `,`, CSV `;` et XLSX
- [x] 5.2 Ajouter `POST /equipments/import/preview` (multipart, même limite 5 Mo) qui ne crée rien; vérifier qu'aucun équipement n'est créé après appel et que la réponse contient `headers`, `sampleRows`, `suggestedMapping`
- [x] 5.3 Documenter la route en Swagger et l'ajouter au README du service; vérifier l'affichage de la doc

## 6. Frontend : couche API et types

- [x] 6.1 Ajouter `positionService` (getAll avec `departmentId`, getById, create, update, delete) et le type `Position`; vérifier avec `npm run build` dans `frontend/`
- [x] 6.2 Mettre à jour `Assignment` et `CreateAssignmentDTO` (`assigneeType`, `assigneeId`, `assignee`, `user` optionnel); vérifier que `tsc -b` ne signale aucune erreur dans les pages d'affectation
- [x] 6.3 Ajouter `equipmentService.previewImport`, `importFile`, `exportFile` (réponse `blob` et déclenchement du téléchargement); vérifier par un appel réel contre le gateway
- [x] 6.4 Ajouter `dashboardService.getKpis` et `rebuildKpis` avec leurs types; vérifier avec `npm run build`
- [x] 6.5 Écrire les fonctions pures d'agrégation du tableau de bord (équipements affectés par département avec top 8 + « Autres », créations/restitutions par jour ou par semaine sur la période); vérifier par tests unitaires, y compris période sans donnée et bénéficiaire introuvable

## 7. Frontend : page Postes

- [x] 7.1 Créer `pages/positions/PositionsPage.tsx` : liste, département, statut, filtre par département, états chargement/vide/erreur; vérifier visuellement avec des données
- [x] 7.2 Créer `PositionModal.tsx` (création/modification, choix du département actif, gestion des erreurs de nom en doublon); vérifier la création et la modification en interface
- [x] 7.3 Ajouter la suppression avec `ConfirmModal` et l'affichage du message quand des affectations actives bloquent; vérifier les deux issues
- [x] 7.4 Vérifier qu'aucune action de la page Postes n'est masquée ou désactivée selon le rôle; vérifier avec un compte EMPLOYE que création, modification et suppression fonctionnent
- [x] 7.5 Ajouter la route `/positions` dans `App.tsx` et l'entrée « Postes » dans la navigation de `AppLayout`; vérifier la navigation

## 8. Frontend : affectation par type de bénéficiaire

- [x] 8.1 Ajouter dans `AssignmentModal` le sélecteur de type (Utilisateur / Département / Poste), le chargement à la demande et le filtrage des inactifs; vérifier les trois types en interface
- [x] 8.2 Pour les postes, afficher « Poste, Département » et proposer un préfiltre par département; vérifier avec plusieurs départements
- [x] 8.3 Envoyer `assigneeType` et `assigneeId`; vérifier dans l'onglet réseau qu'aucun `userId` n'est envoyé et que l'équipement passe à ASSIGNED
- [x] 8.4 Adapter la colonne Bénéficiaire de `AssignmentsPage` (icône et libellé par type, repli « Bénéficiaire indisponible ») et ajouter le filtre par type; vérifier avec une affectation de chaque type
- [x] 8.5 Masquer l'action de transfert pour les affectations non USER et afficher une info-bulle explicative; vérifier sur une affectation POSITION
- [x] 8.6 Adapter les modales de transfert et de restitution pour lire le bénéficiaire via `assignee`; vérifier qu'elles s'ouvrent sans erreur pour chaque type

## 9. Frontend : import et export des équipements

- [x] 9.1 Ajouter dans `EquipmentsPage` un bouton « Importer » et un menu « Exporter » (CSV / Excel) visibles pour tous les rôles; vérifier leur présence avec un compte EMPLOYE
- [x] 9.2 Implémenter l'export avec téléchargement du blob et gestion d'erreur; vérifier qu'un CSV et un XLSX s'ouvrent et se réimportent
- [x] 9.3 Créer `ImportEquipmentsModal.tsx` étape 1 : sélection du fichier (glisser-déposer), contrôle du format et de la taille avant envoi; vérifier avec un fichier `.txt` et un fichier > 5 Mo
- [x] 9.4 Étape 2 : appel à l'aperçu, tableau de mapping pré-rempli avec la suggestion, extrait des premières lignes; vérifier qu'un en-tête personnalisé peut être associé à un champ
- [x] 9.5 Étape 3 : import avec mapping choisi et rapport (créés, à compléter, erreurs par ligne, rafraîchissement de la liste); vérifier avec un fichier valide et un fichier contenant une ligne invalide (aucune création)
- [x] 9.6 Afficher le statut « À compléter » (badge) et l'ajouter au filtre de statut; vérifier après un import sans numéro de série

## 10. Frontend : KPIs et diagrammes

- [x] 10.1 Créer les composants de base des diagrammes (conteneur avec titre, légende, infobulle survol/focus, état vide, `role="img"` + `aria-label`, `viewBox` responsive, palette des tokens existants avec motifs ou libellés en plus de la couleur); vérifier le rendu avec des données de test et au clavier
- [x] 10.2 Créer les diagrammes de répartition : barre empilée par statut, barres par catégorie (total et disponibles), anneau par type de bénéficiaire (Utilisateur / Département / Poste); vérifier les valeurs et pourcentages sur un jeu de 5/2/1 affectations
- [x] 10.3 Créer les diagrammes d'analyse : équipements affectés par département (top 8 + « Autres ») et évolution des affectations créées/restituées sur la période, branchés sur le sélecteur de période; vérifier qu'un changement de période met le diagramme à jour
- [x] 10.4 Rendre les segments du diagramme des statuts cliquables vers `/equipments?status=<STATUT>` et faire lire ce paramètre par `EquipmentsPage` pour initialiser son filtre; vérifier qu'un clic sur « En maintenance » affiche la liste déjà filtrée
- [x] 10.5 Brancher `DashboardPage` sur `dashboardService.getKpis` pour les indicateurs et les diagrammes issus des KPIs; vérifier dans l'onglet réseau qu'aucun `GET /equipments` complet n'est nécessaire à ces zones
- [x] 10.6 Afficher l'erreur avec « Réessayer » et ne jamais présenter des zéros en cas d'échec; vérifier en coupant inventory-service
- [x] 10.7 Afficher la date de mise à jour des KPIs, l'avertissement « non synchronisé » et l'action de reconstruction visibles pour tous les rôles; vérifier avec un compte EMPLOYE que la reconstruction aboutit et rafraîchit l'affichage
- [x] 10.8 Vérifier la lisibilité sur écran étroit (≈ 375 px) et l'absence de dépendance de graphiques ajoutée; contrôler l'affichage et `git diff frontend/package.json`
- [x] 10.9 Conserver le rapport exporté du tableau de bord avec les nouvelles données; vérifier le contenu du fichier généré

## 11. Vérification d'ensemble et livraison

- [x] 11.1 Lancer les tests de chaque service modifié et `npm run build` + `npm run lint` dans `frontend/`; vérifier qu'ils passent
- [x] 11.2 Démarrer la pile avec Docker Compose, se connecter avec un compte EMPLOYE (après reconnexion) et parcourir : créer un poste, lui affecter un équipement, importer puis exporter un fichier, consulter les diagrammes, reconstruire les KPIs; vérifier chaque scénario des specs sans erreur 403
- [x] 11.3 Rechercher dans `frontend/src` toute lecture du rôle servant à masquer une action (`role`, `isAdmin`); vérifier qu'il n'en reste aucune hors affichage informatif
- [x] 11.4 Mettre à jour les README (racine, frontend, services concernés) avec les nouvelles fonctionnalités; vérifier la relecture des liens et commandes
- [x] 11.5 Créer les branches `feat/positions-crud`, `feat/assignment-assignee-types-ui`, `feat/equipment-import-export-ui`, `feat/dashboard-kpi-charts` avec commits conventionnels; vérifier `git log --oneline` par branche
- [ ] 11.6 Sur confirmation de l'utilisateur pour chaque publication, pousser les branches et ouvrir les PR vers `develop`; vérifier que le pipeline GitHub Actions est vert
