## Purpose

Permet de gérer les postes de travail rattachés aux départements (création, modification, suppression, consultation) afin de pouvoir leur affecter des équipements.

## ADDED Requirements

### Requirement: Création d'un poste
Le système DOIT permettre à tout utilisateur authentifié de créer un poste défini par un nom d'au moins 2 caractères et un département existant. Un poste PEUT avoir une description et un statut (ACTIF par défaut). Le nom d'un poste DOIT être unique au sein de son département.

#### Scenario: Création valide
- **WHEN** un utilisateur authentifié crée le poste « Technicien réseau » dans un département existant
- **THEN** le poste est enregistré, actif, et apparaît dans la liste des postes de ce département

#### Scenario: Nom en doublon dans le département
- **WHEN** un utilisateur authentifié crée un poste dont le nom existe déjà dans le même département
- **THEN** le système refuse la création avec une erreur explicite et aucun poste n'est ajouté

#### Scenario: Département inexistant
- **WHEN** un utilisateur authentifié crée un poste avec un identifiant de département inconnu
- **THEN** le système refuse la création avec une erreur de validation

### Requirement: Modification d'un poste
Le système DOIT permettre à tout utilisateur authentifié de modifier le nom, la description, le statut et le département d'un poste, avec les mêmes contraintes de validité et d'unicité qu'à la création.

#### Scenario: Désactivation d'un poste
- **WHEN** un utilisateur authentifié passe un poste au statut INACTIF
- **THEN** le poste n'est plus proposé comme bénéficiaire d'une nouvelle affectation, mais ses affectations existantes restent consultables

### Requirement: Suppression d'un poste
Le système DOIT permettre à tout utilisateur authentifié de supprimer un poste, sauf s'il fait l'objet d'au moins une affectation active.

#### Scenario: Suppression d'un poste sans affectation active
- **WHEN** un utilisateur authentifié supprime un poste sans affectation active
- **THEN** le poste est supprimé et les utilisateurs qui y étaient rattachés n'ont plus de poste

#### Scenario: Suppression d'un poste avec affectation active
- **WHEN** un utilisateur authentifié supprime un poste qui a une affectation active
- **THEN** le système refuse la suppression et indique que des équipements sont encore affectés à ce poste

### Requirement: Consultation des postes
Le système DOIT permettre à tout utilisateur authentifié de lister les postes, avec possibilité de filtrer par département, et de consulter un poste avec son département.

#### Scenario: Filtre par département
- **WHEN** un utilisateur liste les postes d'un département donné
- **THEN** seuls les postes de ce département sont retournés

### Requirement: Accès identique pour tous les utilisateurs authentifiés
Le système DOIT autoriser la création, la modification et la suppression des postes à tout utilisateur authentifié, quel que soit son rôle, et l'interface NE DOIT masquer aucune de ces actions selon le rôle. Un appel non authentifié DOIT rester refusé.

#### Scenario: Écriture par un employé
- **WHEN** un utilisateur de rôle EMPLOYE crée, modifie ou supprime un poste
- **THEN** l'opération est acceptée dans les mêmes conditions que pour un administrateur

#### Scenario: Appel non authentifié
- **WHEN** une requête de création de poste est envoyée sans jeton valide
- **THEN** le système la refuse comme non authentifiée

### Requirement: Page de gestion des postes
L'interface DOIT proposer une page « Postes » accessible depuis la navigation, listant les postes avec leur département et leur statut, filtrable par département, et offrant la création, la modification et la suppression.

#### Scenario: Création depuis l'interface
- **WHEN** un utilisateur authentifié renseigne le formulaire de création et le valide
- **THEN** le nouveau poste apparaît dans la liste sans rechargement manuel de la page

### Requirement: Traçabilité des opérations sur les postes
Le système DOIT enregistrer dans le journal d'audit la création, la modification et la suppression d'un poste.

#### Scenario: Audit d'une modification
- **WHEN** un poste est modifié
- **THEN** une entrée d'audit identifie l'auteur, le poste concerné et l'action réalisée
