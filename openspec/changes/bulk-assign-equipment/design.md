# Design

## Context

Voir `proposal.md` pour la motivation. État observé dans le code :

- **assignment-service** : `assignmentService.create` enchaîne validation du bénéficiaire, lecture de l'équipement (`GET /equipments/:id`), insertion, puis `PATCH /equipments/:id { status: "ASSIGNED" }`. Aucune transaction ne couvre les deux services ; seul le statut `AVAILABLE` est testé. `findActiveByEquipment` existe mais n'est pas utilisé dans la création. Aucun index n'empêche deux affectations `ACTIVE` sur un équipement. Il n'y a **aucun audit** dans ce service (seule la mise à jour de statut est auditée côté equipment-service, auteur « system »).
- **equipment-service** : `equipmentService.update` publie l'audit `EQUIPMENT_UPDATED` et, si le statut ou la catégorie change, l'événement `equipment.updated` (instantanés avant/après) que le consommateur de KPIs d'inventory-service utilise pour ses compteurs par statut. Il n'existe aucune route groupée.
- **KPIs** : les compteurs se déduisent des événements `assignment.created`, `assignment.transferred`, `assignment.returned` et `equipment.updated`.
- **Authentification** : assignment-service vérifie le JWT et expose `req.user.id` ; tous les rôles ont désormais les mêmes permissions.
- **Frontend** : la liste des équipements n'a pas de sélection ; `AssignmentModal` choisit un seul équipement et gère déjà le type et le choix du bénéficiaire (chargement à la demande, préfiltre par département pour les postes).

## Goals / Non-Goals

**Goals :**
- Affecter N équipements à un bénéficiaire en une opération, avec un résultat sûr (tout ou rien).
- Corriger les fragilités de la création unitaire au passage (unicité, atomicité, audit) plutôt que de les dupliquer.
- Rester compatible : `POST /assignments` garde son contrat et sa réponse.

**Non-Goals :**
- Restitution ou transfert groupés.
- Import de fichier avec affectation, QR code et fiche de scan.
- Mécanisme général de transactions distribuées (saga, outbox) : hors de proportion pour ce besoin.
- Réparation automatique des incohérences dues à un arrêt brutal du processus entre deux étapes (voir Risques).

## Decisions

### 1. Un noyau commun `createMany`, la création unitaire en est un cas particulier
`assignmentService.createMany(input)` fait tout le travail ; `create` l'appelle avec un seul équipement et renvoie la première affectation (contrat inchangé). Ainsi l'unicité, l'atomicité, les événements et l'audit s'appliquent aux deux chemins, sans code parallèle.
- *Alternative : garder `create` intact et écrire `bulk` à côté* → deux implémentations qui divergent, et la création unitaire garderait la course et l'absence d'audit.

### 2. Ordre des opérations : valider, enregistrer en transaction, changer les statuts en groupe, compenser en cas d'échec
```
 1. valider le bénéficiaire (assigneeResolver.validate, une fois)
 2. equipments/lookup (1 appel) -> existence + statut ; tout refus -> 409 avec la liste
 3. transaction assignment DB : createMany (index unique = garde de concurrence)
        conflit d'index -> annulation, 409 EQUIPMENT_ALREADY_ASSIGNED
 4. equipments/status/batch (AVAILABLE -> ASSIGNED), 2 tentatives
        échec -> suppression des affectations de l'étape 3 (ids connus), 503
 5. succès : événements assignment.created (x N) et audit ASSIGNMENTS_CREATED
```
Les événements et l'audit ne partent qu'après l'étape 4 : un échec ne laisse rien à annuler côté KPIs.
- *Alternative : réserver d'abord (changer les statuts, puis insérer)* → une panne au milieu laisse des équipements « assignés » sans affectation, plus difficile à repérer que l'inverse ; la protection de concurrence serait aussi dans un autre service.
- *Alternative : saga / outbox* → durable mais disproportionné ici (voir Non-Goals).
- **Fenêtre résiduelle** : un arrêt du processus après l'étape 3 et avant l'étape 4 laisse des affectations actives sur des équipements encore disponibles. L'index unique empêche toute double affectation ; l'anomalie se détecte par requête (affectation `ACTIVE` dont l'équipement n'est pas `ASSIGNED`). Acceptée et documentée.

### 3. Index unique partiel en base
Migration SQL manuelle : `CREATE UNIQUE INDEX "Assignment_equipmentId_active_key" ON "Assignment"("equipmentId") WHERE "status" = 'ACTIVE'`. Prisma ne sait pas exprimer un index partiel : il est ajouté dans un fichier de migration SQL, avec un commentaire dans `schema.prisma`. La migration commence par détecter les équipements ayant déjà plusieurs affectations actives et échoue avec un message explicite (`RAISE EXCEPTION`) plutôt que de créer un index invalide. L'erreur Prisma `P2002` est traduite en `EQUIPMENT_ALREADY_ASSIGNED` (409).
- *Alternative : vérifier dans le code (`findActiveByEquipment`)* → ne résiste pas à deux requêtes simultanées.
- *Alternative : verrou applicatif ou `SELECT ... FOR UPDATE`* → plus complexe pour un gain moindre que la contrainte déclarative.

### 4. Routes groupées côté equipment-service
- `POST /equipments/lookup { ids: uuid[] }` → équipements trouvés (`id`, `name`, `serialNumber`, `status`) ; les identifiants absents se déduisent par différence côté appelant. Un `POST` évite la limite de longueur d'URL pour 200 identifiants.
- `POST /equipments/status/batch { ids, from, to }` : dans **une transaction**, ne modifie que si tous les équipements sont au statut `from` ; sinon annule et renvoie 409 avec la liste des identifiants en défaut. En cas de succès, publie pour chaque équipement l'audit `EQUIPMENT_UPDATED` et l'événement `equipment.updated` (avant/après), comme la mise à jour unitaire. Cette condition `from` protège aussi contre un changement concurrent de statut.
- *Alternative : boucle de `PATCH` individuels* → N appels HTTP et pas d'atomicité.

### 5. Contrat de l'API et erreurs
- `POST /assignments/bulk` : corps validé par zod (`equipmentIds` : 1 à 200 uuid distincts). Réponse `201 { success, data: { count, assignments: [...] } }` (affectations simples, sans enrichissement : l'interface rafraîchit ses listes).
- Refus de validation : `409 { success: false, code: "BULK_ASSIGNMENT_REFUSED", message, details: [{ equipmentId, name?, serialNumber?, reason }] }` avec `reason` ∈ `NOT_FOUND | NOT_AVAILABLE`. Liste vide, plus de 200 éléments ou doublons : `400`.
- Conflit détecté à l'enregistrement : `409 EQUIPMENT_ALREADY_ASSIGNED`. Service équipement indisponible : `503` (codes existants).
- Le plafond de 200 est une constante partagée avec l'interface.

### 6. Audit : une entrée par opération, envoyée en HTTP best-effort
assignment-service n'a pas de canal d'audit. Comme user-service, il envoie `POST {AUDIT_SERVICE_URL}/audit-logs` sans bloquer la réponse : action `ASSIGNMENTS_CREATED`, `performedBy` = `req.user.id`, `metadata` = type et identifiant du bénéficiaire, liste des `{ equipmentId, assignmentId }`.
**Écart par rapport à la discussion initiale** (une ligne par affectation plus une ligne récapitulative) : une seule ligne par opération, car 200 appels HTTP par lot seraient disproportionnés et les changements de statut sont déjà audités par équipement côté equipment-service. Le détail par équipement reste dans la ligne unique.

### 7. Interface : une seule modale, deux points d'entrée
- La logique de sélection est isolée en fonctions pures testées (équipements sélectionnables, sélection filtrée, retrait des équipements devenus indisponibles après rafraîchissement).
- `EquipmentsPage` : colonne de cases à cocher (désactivées hors `AVAILABLE`), case d'en-tête « tout sélectionner » (limitée aux résultats filtrés et disponibles), barre d'action avec compteur et « Affecter la sélection ».
- `AssignmentModal` reçoit des identifiants présélectionnés et remplace le sélecteur d'équipement par une liste multiple avec recherche, où la sélection est conservée quand la recherche change. Avec un seul équipement, le comportement reste celui d'aujourd'hui (appel unitaire).
- Au-delà de 200 sélectionnés, l'action est désactivée avec un message.
- Le rapport de résultat réutilise les patrons d'affichage d'erreur existants.
- *Alternative : deuxième modale dédiée au groupé* → duplication du choix de bénéficiaire, déjà non trivial.

### 8. Droits
Aucun contrôle de rôle nouveau ; la permission `assignment:create` déjà donnée à tous les rôles suffit. Le frontend ne lit pas le rôle.

### 9. Livraison Git
Branche `feat/bulk-assign-equipment` créée à partir de `feat/dashboard-kpi-charts` (elle dépend des filtres et du sélecteur de type non encore fusionnés). Commits par service (equipment-service, assignment-service, frontend, docs). Pas de publication sans accord explicite.

## Risks / Trade-offs

- [Arrêt brutal du processus entre l'enregistrement et le changement de statut] → Index unique contre la double affectation ; anomalie détectable par requête ; réparation automatique hors périmètre.
- [Index partiel non connu de Prisma : une future `migrate dev` peut proposer de le supprimer] → Commentaire dans `schema.prisma`, migration nommée explicitement, note au README ; utiliser `migrate deploy` pour appliquer.
- [Données existantes avec plusieurs affectations actives par équipement] → La migration détecte et échoue avec la liste des équipements ; correction manuelle préalable.
- [Corps de 200 équipements, appels séquentiels lookup puis batch] → Un appel groupé par étape ; délai d'attente adapté ; plafond de 200.
- [Audit en HTTP sans garantie de livraison] → Best-effort assumé (comme pour les postes) ; les statuts restent audités par equipment-service.
- [Sélection obsolète : un équipement devient indisponible entre la sélection et la validation] → Refus 409 avec la liste ; l'interface propose de retirer ces équipements et de réessayer.
- [Compensation par suppression des affectations si le batch de statuts échoue] → Sans risque pour l'historique : aucune restitution ni transfert n'existe encore pour ces lignes et aucun événement n'a été publié.

## Migration Plan

1. Vérifier l'absence de doublons d'affectations actives (requête fournie dans la migration).
2. Déployer equipment-service (routes groupées, additives), puis assignment-service (migration de l'index, `createMany`, route groupée), puis le frontend.
3. Ajouter `AUDIT_SERVICE_URL` à la configuration d'assignment-service.
4. Retour arrière : supprimer l'index unique et revenir à la version précédente d'assignment-service ; les routes équipement sont additives et inoffensives.

## Open Questions

- Faut-il, plus tard, un outil de réparation des incohérences (affectations actives sur équipements non assignés) ? Sans impact sur ce change.
