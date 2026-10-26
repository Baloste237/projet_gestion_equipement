## ADDED Requirements

### Requirement: Choix du type de bénéficiaire dans l'interface
L'interface DOIT permettre, lors de la création d'une affectation, de choisir le type de bénéficiaire (Utilisateur, Département ou Poste) puis un bénéficiaire actif de ce type. Seuls les équipements disponibles et les bénéficiaires actifs DOIVENT être proposés.

#### Scenario: Affectation à un poste
- **WHEN** un utilisateur authentifié choisit le type « Poste », sélectionne un poste actif et un équipement disponible, puis valide
- **THEN** l'affectation est créée avec le type POSITION, l'équipement passe au statut ASSIGNED et l'affectation apparaît dans la liste

#### Scenario: Affectation à un département
- **WHEN** un utilisateur authentifié choisit le type « Département » et sélectionne un département actif
- **THEN** l'affectation est créée avec le type DEPARTMENT

#### Scenario: Bénéficiaires inactifs exclus
- **WHEN** l'utilisateur ouvre la liste des postes, départements ou utilisateurs pour une nouvelle affectation
- **THEN** les bénéficiaires inactifs ne sont pas sélectionnables

#### Scenario: Changement de type de bénéficiaire
- **WHEN** l'utilisateur change le type de bénéficiaire après avoir choisi un bénéficiaire
- **THEN** le bénéficiaire précédemment choisi est effacé et la liste correspond au nouveau type

### Requirement: Affichage du bénéficiaire réel
La liste des affectations DOIT afficher, pour chaque affectation, le type et le nom du bénéficiaire réel (utilisateur, département ou poste avec son département) et DOIT permettre de filtrer par type de bénéficiaire.

#### Scenario: Affectation à un département dans la liste
- **WHEN** une affectation concerne un département
- **THEN** la ligne affiche le nom du département avec le type « Département » et non un nom d'utilisateur générique

#### Scenario: Bénéficiaire introuvable
- **WHEN** le bénéficiaire d'une affectation n'a pas pu être résolu
- **THEN** la ligne affiche son type et un libellé « Bénéficiaire indisponible » sans faire échouer l'affichage de la liste

#### Scenario: Filtre par type
- **WHEN** l'utilisateur filtre la liste sur le type « Poste »
- **THEN** seules les affectations de type POSITION sont affichées

### Requirement: Transfert limité aux utilisateurs
Le transfert d'une affectation DOIT rester possible uniquement vers un utilisateur. L'interface DOIT indiquer clairement qu'une affectation à un département ou à un poste ne se transfère pas et se restitue puis se recrée.

#### Scenario: Transfert d'une affectation à un poste
- **WHEN** l'utilisateur consulte les actions d'une affectation de type POSITION active
- **THEN** l'action de transfert n'est pas proposée et l'action de restitution reste disponible

### Requirement: Droits d'affectation identiques pour tous les rôles
Le système DOIT autoriser à tout utilisateur authentifié, quel que soit son rôle, la création, le transfert et la restitution d'une affectation, et l'interface NE DOIT masquer aucune de ces actions selon le rôle.

#### Scenario: Affectation par un employé
- **WHEN** un utilisateur de rôle EMPLOYE crée une affectation
- **THEN** l'affectation est créée et le système ne renvoie pas d'erreur de permission

#### Scenario: Restitution par un employé
- **WHEN** un utilisateur de rôle EMPLOYE restitue une affectation active
- **THEN** la restitution est enregistrée dans les mêmes conditions que pour un administrateur
