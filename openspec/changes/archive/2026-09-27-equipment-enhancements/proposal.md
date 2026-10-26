# Proposal

## Why

L'application doit permettre une gestion plus granulaire des affectations (par département ou poste, et non plus seulement par utilisateur). De plus, pour faciliter la saisie et le suivi de masse, l'application a besoin d'une fonctionnalité d'importation/exportation (Excel/CSV) avec des mappings configurables, ainsi que de KPIs dynamiques sur le tableau de bord pour piloter l'inventaire en temps réel.

## What Changes

- Ajout d'un système d'affectation polymorphique : un équipement peut être affecté à un utilisateur, un département ou un poste (création de l'entité Poste).
- Ajout d'un système d'import/export Excel et CSV dans `equipment-service` permettant l'intégration de multiples colonnes (Code bar, Emplacement, Modèle, etc.).
- Ajout de la décomposition des imports : une ligne avec une quantité N générera N lignes d'équipements distinctes.
- Ajout d'une diffusion d'événements (RabbitMQ) depuis `equipment-service` et `assignment-service` pour construire des KPIs en temps réel pour le Dashboard.
- **BREAKING**: Le modèle d'affectation (`Assignment`) de `assignment-service` ne reposera plus uniquement sur `userId` mais sur `assigneeId` et `assigneeType`.

## Capabilities

### New Capabilities
- `equipment-assignment`: Gestion des affectations polymorphiques (Utilisateur, Département, Poste).
- `equipment-import-export`: Import/export dynamique par fichier Excel/CSV avec génération unitaire des équipements selon les quantités.
- `equipment-dashboard`: Génération de KPIs dynamiques alimentés par des événements temps réel (RabbitMQ).

### Modified Capabilities
- Aucune (premier ajout de spécifications).

## Impact

- **Bases de données (Prisma)** : Modifications dans `user-service` (nouvelle table Position), `assignment-service` (table Assignment modifiée), et `equipment-service` (enrichissement table Equipment).
- **APIs** : Création des endpoints d'importation dans `equipment-service` et de récupération des KPIs.
- **Infrastructure** : Utilisation intensive de RabbitMQ pour le découplage et l'agrégation des données d'analytique.
