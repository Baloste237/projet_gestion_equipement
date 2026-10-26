## ADDED Requirements

### Requirement: Import depuis l'interface avec mapping des colonnes
L'interface DOIT permettre d'importer un fichier CSV ou Excel depuis la page Équipements, en présentant les en-têtes lus dans le fichier, en pré-associant ceux reconnus automatiquement et en laissant l'utilisateur associer les autres aux champs d'un équipement avant de lancer l'import.

#### Scenario: Colonnes reconnues automatiquement
- **WHEN** l'utilisateur choisit un fichier dont les en-têtes correspondent aux champs connus
- **THEN** l'étape de mapping les affiche déjà associés et l'import peut être lancé sans configuration

#### Scenario: Colonne personnalisée associée manuellement
- **WHEN** l'utilisateur associe l'en-tête « Réf. constructeur » au champ « Numéro de série »
- **THEN** l'import utilise cette association pour toutes les lignes du fichier

#### Scenario: Fichier non supporté ou trop volumineux
- **WHEN** l'utilisateur choisit un fichier qui n'est ni CSV ni Excel, ou qui dépasse la taille maximale acceptée
- **THEN** l'interface refuse le fichier avec un message explicite avant tout envoi

### Requirement: Rapport de résultat d'import
Après un import, l'interface DOIT afficher le nombre d'équipements créés, le nombre d'équipements à compléter et, en cas d'échec, les erreurs ligne par ligne. Un import en erreur ne DOIT créer aucun équipement.

#### Scenario: Import réussi avec lignes incomplètes
- **WHEN** l'import d'un fichier valide crée 12 équipements dont 3 sans numéro de série
- **THEN** le rapport indique 12 équipements créés dont 3 à compléter, et la liste des équipements est rafraîchie

#### Scenario: Import refusé
- **WHEN** au moins une ligne du fichier est invalide
- **THEN** le rapport liste chaque ligne en erreur avec sa cause, aucun équipement n'est créé et l'utilisateur peut corriger son fichier puis recommencer

### Requirement: Export depuis l'interface
L'interface DOIT proposer sur la page Équipements l'export de l'inventaire au format CSV ou Excel, dont le fichier téléchargé est réimportable.

#### Scenario: Export Excel
- **WHEN** l'utilisateur choisit « Excel » dans le menu d'export
- **THEN** un fichier .xlsx contenant tous les équipements est téléchargé

#### Scenario: Échec d'export
- **WHEN** le serveur ne peut pas produire le fichier
- **THEN** l'interface affiche un message d'erreur et aucun fichier vide n'est téléchargé

### Requirement: Visibilité du statut à compléter
L'interface DOIT afficher les équipements au statut « à compléter » avec un indicateur distinct et DOIT permettre de les filtrer, afin que les équipements importés incomplets soient identifiables et corrigeables.

#### Scenario: Filtrer les équipements à compléter
- **WHEN** l'utilisateur sélectionne le statut « À compléter » dans le filtre
- **THEN** seuls les équipements à ce statut sont affichés

### Requirement: Accès identique à l'import et à l'export
L'interface DOIT proposer l'import et l'export des équipements à tout utilisateur authentifié, quel que soit son rôle, sans masquer ces actions selon le rôle.

#### Scenario: Import par un employé
- **WHEN** un utilisateur de rôle EMPLOYE ouvre la page Équipements
- **THEN** les boutons d'import et d'export sont affichés et l'import aboutit dans les mêmes conditions que pour un administrateur
