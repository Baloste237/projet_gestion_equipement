# Spec Delta

## Purpose

Permet aux administrateurs autorisés de vider sélectivement les listes de données de l'application (équipements, catégories, utilisateurs, départements, postes) sous contrôle d'une authentification par mot de passe et d'une traçabilité d'audit.

## ADDED Requirements

### Requirement: Contrôle d'accès exclusif au rôle Administrateur
Le système MUST restreindre l'affichage des boutons de purge et l'exécution des endpoints de vidage de liste exclusivement aux utilisateurs authentifiés possédant le rôle ADMIN.

#### Scenario: Accès refusé pour un utilisateur non administrateur
- **WHEN** un utilisateur avec un rôle autre que ADMIN tente d'accéder à l'action ou d'appeler l'API de purge
- **THEN** le système n'affiche aucun bouton de purge côté frontend et répond avec un code HTTP 403 Forbidden côté API

#### Scenario: Accès autorisé pour un administrateur
- **WHEN** un utilisateur avec le rôle ADMIN consulte les pages de liste (équipements, catégories, utilisateurs, départements, postes)
- **THEN** le système affiche le bouton d'action critique permettant de déclencher la procédure de vidage

### Requirement: Confirmation renforcée par mot de passe administrateur
Le système MUST exiger la saisie et la validation du mot de passe actuel de l'administrateur avant toute exécution de suppression de liste.

#### Scenario: Mot de passe incorrect
- **WHEN** l'administrateur confirme le vidage avec un mot de passe erroné
- **THEN** le système refuse l'opération avec une erreur 401/403, affiche un message d'erreur et ne supprime aucune donnée

#### Scenario: Mot de passe valide
- **WHEN** l'administrateur confirme le vidage avec son mot de passe actuel valide
- **THEN** le système valide l'opération et lance la procédure de purge ciblée

### Requirement: Purge de la liste des équipements avec clôture des affectations
Le système MUST clôturer ou purger les affectations actives associées avant de supprimer l'ensemble des équipements afin de garantir la cohérence inter-services.

#### Scenario: Vidage réussi des équipements
- **WHEN** l'administrateur valide la purge de la liste des équipements
- **THEN** les affectations actives dans assignment-service sont clôturées ou purgées, tous les équipements sont supprimés d'equipment-service, et la liste devient vide

### Requirement: Purge sous condition de la liste des catégories
Le système MUST interdire la purge des catégories si des équipements y sont encore rattachés, et autoriser la purge uniquement si aucun équipement n'existe.

#### Scenario: Blocage si des équipements existent
- **WHEN** l'administrateur demande le vidage des catégories alors que des équipements existent encore
- **THEN** le système rejette la requête avec un code HTTP 400 et indique à l'utilisateur de vider d'abord les équipements

#### Scenario: Vidage réussi si aucun équipement n'existe
- **WHEN** l'administrateur demande le vidage des catégories et qu'aucun équipement n'est enregistré
- **THEN** le système supprime l'ensemble des catégories avec succès

### Requirement: Purge de la liste des utilisateurs avec protection des administrateurs
Le système MUST supprimer les utilisateurs ordinaires tout en préservant obligatoirement le compte administrateur connecté ainsi que tous les comptes dotés du rôle ADMIN.

#### Scenario: Préservation des comptes administrateurs
- **WHEN** l'administrateur valide le vidage de la liste des utilisateurs
- **THEN** tous les utilisateurs ayant un rôle autre qu'ADMIN sont supprimés de user-service et leurs identifiants révoqués dans auth-service, tandis que les comptes ADMIN et le compte connecté restent intacts et fonctionnels

### Requirement: Purge des listes de départements et de postes
Le système MUST autoriser la purge des départements et des postes en détachant proprement les utilisateurs qui y étaient rattachés sans supprimer ces derniers.

#### Scenario: Détachement des utilisateurs lors du vidage des départements ou postes
- **WHEN** l'administrateur valide la purge des départements ou des postes
- **THEN** les entités sélectionnées sont supprimées et les références département/poste des utilisateurs concernés sont passées à null

### Requirement: Journalisation obligatoire des purges dans le service d'audit
Le système MUST enregistrer un événement d'audit détaillé dans audit-service pour chaque purge de liste exécutée avec succès.

#### Scenario: Enregistrement d'audit après purge
- **WHEN** une opération de purge est effectuée avec succès
- **THEN** une entrée d'audit est créée avec le type d'action correspondant, l'identifiant de l'administrateur auteur, le nombre d'éléments supprimés et l'horodatage
