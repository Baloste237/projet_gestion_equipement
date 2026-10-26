# Proposal

## Why

Le backend sait déjà importer/exporter les équipements, affecter à un utilisateur, un département ou un poste, et servir des KPIs matérialisés. Le frontend n'expose rien de cela : aucun bouton d'import/export, une affectation limitée aux utilisateurs, aucune gestion des postes (lecture seule côté API) et un tableau de bord qui recalcule ses chiffres côté navigateur à partir de listes complètes. Les fonctionnalités existent mais sont invisibles et, pour les postes, incomplètes.

## What Changes

- **Postes** : ajout de `POST /positions`, `PATCH /positions/:id`, `DELETE /positions/:id` dans user-service (aujourd'hui `GET` uniquement), sur le modèle des départements ; nouvelle page frontend « Postes » (liste, création, modification, suppression, filtre par département) et entrée dans la navigation.
- **Affectation** : `AssignmentModal` permet de choisir le type de bénéficiaire (Utilisateur / Département / Poste) puis un bénéficiaire actif ; le formulaire envoie `assigneeType` + `assigneeId`. La colonne « Bénéficiaire » de la page Affectations affiche le bénéficiaire réel (utilisateur, département ou poste) avec un filtre par type. Les types frontend `Assignment` / `CreateAssignmentDTO` sont alignés sur le backend.
- **Import / export des équipements** : boutons « Importer » et « Exporter » (CSV / Excel) sur la page Équipements. L'import est une modale en trois étapes : choix du fichier, mapping des colonnes (lecture des en-têtes côté client, pré-remplissage des colonnes reconnues), rapport de résultat (`createdCount`, `toCompleteCount`, erreurs par ligne). Le statut `A_COMPLETER` devient visible (badge et filtre).
- **KPIs et diagrammes d'analyse** : le tableau de bord consomme `GET /dashboard/kpis` (inventory-service) pour ses indicateurs au lieu de les recalculer côté client, et présente des diagrammes pour faciliter l'analyse : répartition par statut, par catégorie, affectations actives par type de bénéficiaire (USER / DEPARTMENT / POSITION), équipements affectés par département et évolution des affectations sur la période choisie. Les diagrammes sont lisibles (légende, valeurs et pourcentages au survol, pas de couleur seule) et permettent d'ouvrir la liste filtrée correspondante. Le tableau de bord indique la fraîcheur des KPIs (`synchronized`, `updatedAt`) et offre une action de reconstruction.
- **Droits identiques pour tous les rôles (temporaire)** : tout utilisateur authentifié peut tout faire (postes, affectations, import/export, reconstruction des KPIs). Aucun bouton n'est masqué selon le rôle et les contrôles de rôle existants qui bloqueraient un employé sont assouplis. La séparation des fonctionnalités par rôle sera traitée dans un change ultérieur.
- **Versionnement Git / GitHub** : le dossier `frontend/` est entièrement non suivi et de nombreuses modifications backend sont non commitées. Le travail est livré par branches de fonctionnalité et commits conventionnels (convention déjà utilisée dans l'historique), poussés sur `origin`, avec pull requests vers `develop`.

## Capabilities

### New Capabilities
- `position-management`: gestion des postes de travail (création, modification, suppression, consultation, rattachement à un département) côté API et interface.

### Modified Capabilities
- `equipment-assignment`: l'interface permet d'affecter à un utilisateur, un département ou un poste et affiche le bénéficiaire réel de chaque affectation ; la création, le transfert et la restitution sont ouverts à tous les rôles.
- `equipment-import-export`: l'import (avec mapping visuel et rapport) et l'export (CSV / Excel) sont accessibles depuis l'interface ; le statut « à compléter » est visible et filtrable.
- `equipment-dashboard`: le tableau de bord affiche les KPIs matérialisés du backend et des diagrammes d'analyse interactifs (statut, catégorie, type de bénéficiaire, département, évolution dans le temps) ; la reconstruction des KPIs est ouverte à tout utilisateur authentifié.

## Impact

- **user-service** : `position.routes`, controller, service, repository, validators ; événement d'audit pour les opérations sur les postes.
- **auth-service** : `permissions.config.ts` donne la même liste de permissions à tous les rôles (les JWT déjà émis gardent leurs anciennes permissions jusqu'à la reconnexion).
- **inventory-service** : la route `POST /dashboard/kpis/rebuild` n'exige plus le rôle ADMIN (authentification seule).
- **frontend** : `services/api.ts` (positionService, import/export, dashboard, types), `AppLayout` (navigation), pages Équipements (lecture d'un filtre de statut passé dans l'URL), Affectations, Dashboard, nouvelle page Postes, nouvelles modales, composants de diagrammes.
- **gateway** : la route `/positions` existe déjà ; à vérifier que les méthodes `POST/PATCH/DELETE` et le multipart de l'import traversent le proxy.
- **Git / CI** : création de branches et pull requests ; le pipeline GitHub Actions existant doit passer.
- Aucun changement cassant : le backend garde la compatibilité avec l'ancien payload `{ userId }`.
- **Hors périmètre** : séparation des fonctionnalités par rôle (reportée), transfert d'une affectation vers un département ou un poste (le transfert reste vers un utilisateur), nouveau service de statistiques.
