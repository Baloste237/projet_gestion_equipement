# Proposal

## Why

Dans le cadre de la gestion du cycle de vie des données, des phases de test ou de réinitialisation de l'environnement, l'administrateur système doit pouvoir vider rapidement et sélectivement les listes principales de l'application (équipements, catégories, utilisateurs, départements, postes). Actuellement, aucune action groupée de purge n'existe, ce qui oblige à supprimer les éléments manuellement un par un ou directement en base de données. 

Cette opération étant hautement destructrice et irréversible, elle doit être strictement réservée au rôle `ADMIN`, protégée par une modale de confirmation renforcée avec saisie obligatoire du mot de passe de l'administrateur, exécutée dans le respect de l'intégrité référentielle inter-services (clôture des affectations actives, protection du compte administrateur connecté) et intégralement journalisée dans `audit-service`.

## What Changes

- **Frontend - Contrôles de purge par liste** :
  - Ajout d'un bouton d'action critique « Vider la liste » sur les pages `/equipments`, `/categories`, `/users`, `/departments` et `/positions`.
  - Condition d'affichage : visible et accessible exclusivement aux utilisateurs dont le rôle est `ADMIN`.
  - Intégration d'une modale réutilisable de confirmation renforcée (`ConfirmPasswordPurgeModal`) exigeant la saisie du mot de passe actuel de l'administrateur avant de débloquer le bouton d'exécution.

- **Backend - Endpoints sécurisés de purge sélective** :
  - `POST /api/equipments/purge` (dans `equipment-service`) : clôture/purge préalable des affectations actives dans `assignment-service`, puis suppression de l'ensemble des équipements.
  - `POST /api/categories/purge` (dans `equipment-service`) : suppression des catégories si aucun équipement n'y est rattaché (rejet avec message d'explication si la liste des équipements n'est pas vide).
  - `POST /api/users/purge` (dans `user-service`) : purge des utilisateurs ordinaires avec préservation stricte du compte connecté et de tous les comptes `ADMIN`, et synchronisation avec `auth-service` pour la révocation des identifiants et sessions associées.
  - `POST /api/departments/purge` & `POST /api/positions/purge` (dans `user-service`) : purge des départements ou des postes avec détachement automatique des utilisateurs rattachés (`SetNull`).

- **Vérification du mot de passe admin** :
  - Vérification cryptographique du mot de passe auprès d'`auth-service` via le jeton de l'admin authentifié avant d'exécuter toute action de purge.

- **Traçabilité & Audit** :
  - Envoi systématique d'un événement d'audit vers `audit-service` pour chaque purge exécutée (`EQUIPMENT_LIST_PURGED`, `CATEGORY_LIST_PURGED`, `USER_LIST_PURGED`, etc.) incluant l'identifiant de l'administrateur, le nombre d'éléments supprimés et l'horodatage.

## Capabilities

### New Capabilities

- `data-purge`: Permet à un administrateur authentifié de vider sélectivement les listes de données d'un domaine (équipements, catégories, utilisateurs, départements, postes) après validation de son mot de passe, avec gestion des dépendances inter-services et journalisation d'audit.

### Modified Capabilities

<!-- Aucune modification de contrat sur les spécifications existantes equipment-assignment, equipment-dashboard, ou equipment-import-export. -->

## Impact

- **Services backend impactés** :
  - `auth-service` : endpoint interne ou public authentifié de vérification du mot de passe administrateur (`POST /auth/verify-password`).
  - `equipment-service` : endpoints de purge `/api/equipments/purge` et `/api/categories/purge`, communication avec `assignment-service` pour clôturer les affectations.
  - `user-service` : endpoints de purge `/api/users/purge`, `/api/departments/purge`, `/api/positions/purge`, avec exclusion des comptes admin et appel à `auth-service`.
  - `assignment-service` : endpoint de clôture/purge groupée des affectations appelé par `equipment-service`.
  - `audit-service` : enregistrement des nouveaux types d'actions d'audit liés aux purges.
- **Frontend** :
  - Composant modale réutilisable `ConfirmPasswordPurgeModal`.
  - Mises à jour des vues de listes d'équipements, catégories, utilisateurs, départements et postes avec restriction d'accès basée sur `user.role === 'ADMIN'`.
- **Données & Sécurité** :
  - Risque d'incohérence évité grâce au respect des contraintes de clés étrangères et à la préservation des comptes administrateurs.
