# Spec Delta

## Purpose

Permet à l'administrateur de gérer les catégories d'équipements (consulter, créer, modifier, supprimer) et de charger une liste de catégories depuis un fichier, tandis que tous les utilisateurs connectés peuvent les consulter.

## ADDED Requirements

### Requirement: Consultation des catégories
Le système DOIT permettre à tout utilisateur authentifié de consulter la liste des catégories, avec pour chacune son nom, sa description et le nombre d'équipements qui lui sont rattachés. Un appel sans jeton valide DOIT être refusé (401).

#### Scenario: Liste visible par un employé
- **WHEN** un utilisateur authentifié avec le rôle `EMPLOYE` demande la liste des catégories
- **THEN** le système renvoie toutes les catégories avec leur nombre d'équipements

#### Scenario: Appel sans jeton
- **WHEN** la liste des catégories est demandée sans jeton valide
- **THEN** le système répond 401

### Requirement: Écriture réservée à l'administrateur
Le système DOIT réserver la création, la modification, la suppression et l'import de catégories au rôle `ADMIN`. Tout autre utilisateur authentifié DOIT recevoir un refus (403) et aucune donnée ne DOIT être modifiée.

#### Scenario: Création par un employé
- **WHEN** un utilisateur avec le rôle `EMPLOYE` crée une catégorie
- **THEN** le système répond 403 et la catégorie n'est pas créée

#### Scenario: Suppression ou import par un non-administrateur
- **WHEN** un utilisateur avec le rôle `RESPONSABLE` supprime une catégorie ou importe un fichier de catégories
- **THEN** le système répond 403 et rien n'est modifié

#### Scenario: Création par un administrateur
- **WHEN** un `ADMIN` crée une catégorie avec un nom valide
- **THEN** le système crée la catégorie et répond 201

### Requirement: Unicité du nom d'une catégorie
Le système DOIT refuser (409) la création ou le renommage d'une catégorie dont le nom, sans tenir compte de la casse ni des espaces en début et fin, est déjà porté par une autre catégorie. Un nom de moins de 2 caractères après suppression des espaces DOIT être refusé (400).

#### Scenario: Doublon à casse différente
- **WHEN** un administrateur crée « LAPTOP » alors que « Laptop » existe
- **THEN** le système répond 409 et ne crée rien

#### Scenario: Renommage vers un nom existant
- **WHEN** un administrateur renomme une catégorie avec le nom d'une autre
- **THEN** le système répond 409 et le nom d'origine est conservé

#### Scenario: Conserver son propre nom
- **WHEN** un administrateur modifie uniquement la description d'une catégorie en renvoyant son nom actuel
- **THEN** le système accepte la modification

#### Scenario: Catégorie introuvable
- **WHEN** une catégorie inexistante est lue, modifiée ou supprimée
- **THEN** le système répond 404

### Requirement: Suppression d'une catégorie
Le système DOIT permettre à un administrateur de supprimer une catégorie qui n'est rattachée à aucun équipement. Une catégorie rattachée à au moins un équipement DOIT être conservée et la suppression refusée (409) avec le nombre d'équipements concernés.

#### Scenario: Suppression d'une catégorie vide
- **WHEN** un administrateur supprime une catégorie sans équipement
- **THEN** le système la supprime et répond 204

#### Scenario: Suppression d'une catégorie utilisée
- **WHEN** un administrateur supprime une catégorie rattachée à 3 équipements
- **THEN** le système répond 409 en indiquant 3 équipements, et la catégorie ainsi que les équipements restent inchangés

### Requirement: Import séparé d'une liste de catégories
Le système DOIT permettre à un administrateur d'importer un fichier CSV ou Excel (.xlsx) de catégories, dont la première ligne contient les en-têtes. La colonne du nom (en-têtes reconnus sans tenir compte de la casse ni des accents : `NOM`, `CATEGORIE`, `CATEGORY`, `NAME`, `LIBELLE`) est obligatoire ; la colonne `DESCRIPTION` est facultative. Le système DOIT créer les catégories nouvelles et laisser inchangées celles qui existent déjà (nom comparé sans tenir compte de la casse ni des espaces), sans jamais en supprimer ni en renommer. Le rapport DOIT indiquer le nombre de catégories créées, le nombre de catégories déjà existantes, le nombre de doublons ignorés dans le fichier et les erreurs par ligne.

#### Scenario: Import de catégories nouvelles
- **WHEN** un administrateur importe un fichier de 10 catégories dont aucune n'existe
- **THEN** le système crée les 10 catégories avec leur description et indique 10 créées, 0 déjà existante

#### Scenario: Catégorie déjà existante laissée inchangée
- **WHEN** le fichier contient « Laptop » avec une nouvelle description alors que « Laptop » existe déjà, avec ou sans équipements
- **THEN** la catégorie existante garde son nom, sa description et ses équipements, et le rapport la compte comme déjà existante

#### Scenario: Doublon dans le fichier
- **WHEN** le fichier contient deux lignes dont les noms ne diffèrent que par la casse
- **THEN** une seule catégorie est créée, avec la première ligne, et le doublon est compté comme ignoré

#### Scenario: Ligne invalide
- **WHEN** une ligne du fichier a un nom vide ou de moins de 2 caractères
- **THEN** le système refuse tout l'import (400), ne crée aucune catégorie et liste la ligne en erreur avec son numéro

#### Scenario: Fichier sans colonne de nom
- **WHEN** le fichier ne contient aucune colonne de nom reconnue
- **THEN** le système refuse l'import (400) avec un message qui nomme les en-têtes attendus

#### Scenario: Format de fichier non pris en charge
- **WHEN** un fichier d'un autre format que CSV ou .xlsx est envoyé
- **THEN** le système refuse l'import (400)

### Requirement: Page de gestion des catégories
L'application DOIT proposer une page « Catégories », accessible depuis le menu à tout utilisateur connecté, qui affiche la liste des catégories avec leur nombre d'équipements. Les actions d'ajout, de modification, de suppression et d'import DOIVENT n'être proposées qu'à un administrateur. Un refus du serveur DOIT être affiché avec un message clair.

#### Scenario: Vue d'un administrateur
- **WHEN** un administrateur ouvre la page Catégories
- **THEN** la liste s'affiche avec les boutons Ajouter, Modifier, Supprimer et Importer

#### Scenario: Vue d'un employé
- **WHEN** un utilisateur non administrateur ouvre la page Catégories
- **THEN** la liste s'affiche sans aucune action d'écriture

#### Scenario: Suppression refusée
- **WHEN** un administrateur confirme la suppression d'une catégorie utilisée
- **THEN** la page affiche que la catégorie est utilisée par N équipements et la garde dans la liste

#### Scenario: Rapport d'import
- **WHEN** un administrateur importe un fichier de catégories
- **THEN** la page affiche le nombre de catégories créées, déjà existantes et ignorées, ou la liste des lignes en erreur, puis actualise la liste
