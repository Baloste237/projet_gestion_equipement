# Design

## Context

L'application de gestion d'équipements gère l'affectation par le biais de `assignment-service` (couplé à un `userId` en dur), les équipements par `equipment-service` et les utilisateurs par `user-service`. Pour supporter des affectations de type "Département" ou "Poste", et pour fournir un mécanisme d'import/export dynamique avec des KPIs, l'architecture doit évoluer.

## Goals / Non-Goals

**Goals:**
- Permettre une relation d'affectation polymorphique (`assigneeType`, `assigneeId`).
- Fournir un point d'entrée API (`/api/equipments/import` et `/api/equipments/export`) gérant le format CSV/Excel.
- Propager les événements de cycle de vie (création, affectation) via RabbitMQ.
- Agréger ces événements pour exposer des vues matérialisées au Frontend.

**Non-Goals:**
- Nous ne modifions pas l'authentification (gérée par `auth-service`).
- L'import de données ne gère pas la mise à jour massive (uniquement l'insertion pour l'instant).

## Decisions

1. **Base de données - Affectations Polymorphiques :**
   Dans le modèle `Assignment` de Prisma (`assignment-service`), les colonnes `assigneeType` (enum: USER, DEPARTMENT, POSITION) et `assigneeId` (UUID) remplaceront `userId`. 
   *Alternative rejetée :* Avoir 3 colonnes nullables (`userId`, `departmentId`, `positionId`). L'approche polymorphique est choisie pour être plus évolutive, même si elle sacrifie les clés étrangères strictes inter-services (ce qui est déjà le cas vu l'architecture microservices).

2. **Génération Unitaires à l'Import :**
   Si la colonne `QUANTITE` = N lors d'un import, `equipment-service` va boucler pour générer N enregistrements. Le champ `serialNumber` étant requis et unique, il sera autogénéré avec un préfixe (ex: `TMP-UUID`) et le `status` sera positionné à `A_COMPLETER`.
   *Alternative rejetée :* Ajouter une colonne `quantity` dans la table Equipment. Rejeté car le métier actuel est orienté tracking unitaire via numéro de série.

3. **Analytics (KPIs) :**
   Mise en place d'une approche Event-Sourcing asynchrone : `equipment-service` et `assignment-service` publient des messages sur RabbitMQ (ex: exchange `equipment.events`). `inventory-service` consomme ces messages et met à jour des vues agrégées (ex: compteurs en base).

## Risks / Trade-offs

- **[Risk] Cohérence inter-services lors de l'affectation :** L'affectation à un `departmentId` qui viendrait d'être supprimé dans `user-service`.
  → *Mitigation :* `user-service` doit également publier des événements de suppression, et `assignment-service` (ou l'agrégateur) doit gérer les compensations. Ou l'API Gateway doit valider l'existence avant d'appeler `assignment-service`.
- **[Risk] Conflits d'unicité lors d'imports massifs :**
  → *Mitigation :* Utilisation de transactions Prisma et génération d'uniques aléatoires robustes pour les numéros de série temporaires.
