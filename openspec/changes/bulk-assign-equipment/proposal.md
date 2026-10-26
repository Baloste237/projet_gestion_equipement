# Proposal

## Why

Aujourd'hui une affectation porte sur **un seul équipement** : équiper un département de 20 postes de travail demande 20 opérations manuelles. Le mécanisme actuel est en outre fragile : rien en base n'empêche deux affectations actives sur le même équipement (seul le statut est testé, avec une course possible entre deux utilisateurs), la mise à jour du statut de l'équipement est un appel HTTP séparé non transactionnel, et assignment-service n'écrit aucune trace d'audit. Affecter en masse sans corriger cela multiplierait ces défauts par le nombre d'équipements.

## What Changes

- **Affectation groupée** : une seule requête `POST /assignments/bulk` (`assigneeType`, `assigneeId`, `equipmentIds[]`, `expectedReturnDate?`, `handoverCondition?`, `notes?`) affecte de 1 à 200 équipements à un même département, poste ou utilisateur.
- **Validation tout ou rien** : la cible doit être active et chaque équipement doit exister et être disponible ; sinon aucune affectation n'est créée et la réponse liste chaque équipement en cause avec sa raison.
- **Atomicité** : toutes les affectations sont insérées dans une seule transaction, puis les équipements passent à `ASSIGNED` par un appel groupé unique (deux tentatives) ; si ce passage échoue, les affectations qui viennent d'être créées sont supprimées et l'opération échoue proprement.
- **Une seule affectation active par équipement**, garantie par un index unique partiel en base. La création unitaire (`POST /assignments`) réutilise le même noyau et bénéficie des mêmes garanties.
- **equipment-service** : deux routes groupées, `POST /equipments/lookup` (lecture de N équipements en un appel) et `POST /equipments/status/batch` (changement de statut atomique conditionnel, avec les événements et l'audit habituels par équipement).
- **Audit** : assignment-service enregistre une entrée `ASSIGNMENTS_CREATED` par requête (auteur, bénéficiaire, liste des équipements et des affectations), pour les créations groupées et unitaires.
- **Interface** : cases à cocher dans la liste des équipements (seuls les « Disponible » sont sélectionnables, « tout sélectionner » sur les résultats filtrés) avec une barre « Affecter la sélection », et sélection multiple avec recherche dans la modale d'affectation existante ; rapport de résultat clair, avec la liste des refus en cas d'échec.
- Droits identiques pour tous les rôles (état temporaire déjà en vigueur).

## Capabilities

### New Capabilities
<!-- Aucune : le comportement s'ajoute à la capacité d'affectation existante. -->

### Modified Capabilities
- `equipment-assignment`: ajout de l'affectation groupée (validation tout ou rien, atomicité, plafond), de l'unicité de l'affectation active, de la traçabilité par audit et de la sélection multiple dans l'interface.

## Impact

- **assignment-service** : migration (index unique partiel sur `Assignment(equipmentId)` où `status = 'ACTIVE'`), noyau `createMany` partagé, route `POST /assignments/bulk` (+ Swagger), client d'audit HTTP, client equipment-service groupé, codes d'erreur, tests.
- **equipment-service** : routes `POST /equipments/lookup` et `POST /equipments/status/batch`, service et validators, tests.
- **frontend** : `services/api.ts` (`assignmentService.createBulk`), logique de sélection testée, `EquipmentsPage` (cases à cocher, barre d'action), `AssignmentModal` (équipements multiples).
- **Configuration** : `AUDIT_SERVICE_URL` pour assignment-service (`.env.example`, `docker-compose`).
- **Données existantes** : la migration échoue explicitement si des équipements ont déjà plusieurs affectations actives (à corriger avant application).
- **Dépendance de livraison** : s'appuie sur le code des branches du change `add-positions-import-export-and-kpi-ui` (filtres `GET /assignments`, sélecteur de type de bénéficiaire, permissions identiques), pas encore fusionnées.
- **Hors périmètre** : restitution groupée, import CSV/Excel avec affectation, QR code et fiche de scan (changes ultérieurs), transfert groupé.
