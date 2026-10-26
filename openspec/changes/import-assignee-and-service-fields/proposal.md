# Proposal

## Why

Les fichiers d'inventaire réels contiennent les colonnes ETAT (FONCTIONNEL / NON-FONCTIONNEL), DATE DE MISE EN SERVICE, DATE DE MISE HORS SERVICE et MIS A LA DISPOSITION DE. Aujourd'hui l'import les ignore : après chaque import, il faut ressaisir l'état, les dates et affecter chaque équipement à la main, alors que le fichier contient déjà l'information.

## What Changes

- Nouveaux champs d'équipement : état de fonctionnement (`FONCTIONNEL` / `NON_FONCTIONNEL`, indépendant du statut), date de mise en service, date de mise hors service. Ils sont acceptés par l'import, l'export, le formulaire et la fiche équipement.
- L'import reconnaît la colonne « mis à la disposition de » et affecte automatiquement chaque équipement créé à l'utilisateur correspondant.
- Un nom qui ne correspond à aucun utilisateur, ou à plusieurs, n'empêche pas l'import : l'équipement est créé sans affectation et le rapport d'import liste ces cas.
- Le rapport d'import indique le nombre d'équipements affectés et la liste des lignes non affectées avec la raison.
- Le mapping de colonnes de l'écran d'import propose les nouveaux champs.

## Capabilities

### New Capabilities
- `equipment-service-lifecycle`: état de fonctionnement et dates de mise en service / hors service d'un équipement.

### Modified Capabilities
- `equipment-import-export`: l'import lit l'état, les dates et le bénéficiaire, affecte automatiquement et rapporte les non-affectés ; l'export inclut les nouveaux champs.

## Impact

- equipment-service : schéma Prisma (3 colonnes + migration), validateurs, mapper d'import, service d'import et d'export, nouveaux clients vers user-service et assignment-service.
- user-service : aucune modification (routes existantes `GET /users`, `/departments`, `/positions`).
- assignment-service : une route de lecture seule ajoutée, `GET /assignments/active-summary`, qui renvoie les affectations actives sans enrichissement, pour l'export. L'import réutilise `POST /assignments/bulk` tel quel.
- Frontend : `importMapping.ts`, modale d'import (rapport), formulaire et fiche équipement.
- Dépend de la branche `bulk-assign-equipment` (route `/assignments/bulk` et index d'affectation unique).
