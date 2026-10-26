## ADDED Requirements

### Requirement: Affectation groupée
Le système DOIT permettre d'affecter en une seule opération de 1 à 200 équipements à un même bénéficiaire (utilisateur, département ou poste). Les paramètres facultatifs (date de retour prévue, état à la remise, notes) DOIVENT s'appliquer à chacune des affectations créées.

#### Scenario: Affectation de plusieurs équipements à un département
- **WHEN** un utilisateur affecte 3 équipements disponibles à un département actif en une seule opération
- **THEN** 3 affectations actives sont créées pour ce département, les 3 équipements passent au statut ASSIGNED et la réponse indique 3 affectations créées

#### Scenario: Affectation groupée à un poste
- **WHEN** un utilisateur affecte plusieurs équipements disponibles à un poste actif
- **THEN** chaque équipement est affecté au poste avec le type de bénéficiaire POSITION

#### Scenario: Paramètres communs
- **WHEN** une date de retour prévue et des notes sont fournies pour l'opération groupée
- **THEN** chaque affectation créée porte cette date de retour prévue et ces notes

#### Scenario: Liste vide, trop longue ou avec doublon
- **WHEN** la liste d'équipements est vide, contient plus de 200 équipements ou cite deux fois le même équipement
- **THEN** le système refuse la demande avec une erreur de validation et n'affecte rien

### Requirement: Validation tout ou rien
Le système DOIT valider l'ensemble de la demande d'affectation groupée avant de créer quoi que ce soit : le bénéficiaire DOIT exister et être actif, et chaque équipement DOIT exister et être disponible. Si une seule vérification échoue, le système NE DOIT créer aucune affectation et DOIT indiquer, pour chaque équipement en cause, la raison du refus.

#### Scenario: Un équipement n'est pas disponible
- **WHEN** parmi 5 équipements demandés, un est déjà affecté
- **THEN** aucune affectation n'est créée, aucun statut n'est modifié et la réponse identifie cet équipement avec la raison « déjà affecté ou indisponible »

#### Scenario: Un équipement n'existe pas
- **WHEN** la liste contient l'identifiant d'un équipement inconnu
- **THEN** aucune affectation n'est créée et la réponse identifie cet identifiant avec la raison « équipement introuvable »

#### Scenario: Bénéficiaire inactif ou inexistant
- **WHEN** le bénéficiaire indiqué n'existe pas ou est inactif
- **THEN** le système refuse l'opération sans créer d'affectation, avec la même erreur que pour une affectation unitaire

#### Scenario: Plusieurs raisons de refus
- **WHEN** plusieurs équipements de la demande sont refusés pour des raisons différentes
- **THEN** la réponse liste tous les équipements refusés avec leur raison, sans s'arrêter au premier

### Requirement: Cohérence des affectations et des statuts
Le système DOIT garantir qu'à l'issue d'une opération d'affectation, soit toutes les affectations demandées existent et tous les équipements concernés sont au statut ASSIGNED, soit aucune affectation n'a été conservée et aucun statut n'a changé. Les affectations d'une opération DOIVENT être enregistrées ensemble.

#### Scenario: Échec de la mise à jour des statuts
- **WHEN** la mise à jour des statuts des équipements échoue après plusieurs tentatives
- **THEN** les affectations créées par cette opération sont supprimées, aucun équipement ne change de statut et le système retourne une erreur de service indisponible

#### Scenario: Service équipement indisponible dès la validation
- **WHEN** le service des équipements ne répond pas pendant la vérification
- **THEN** l'opération échoue avec une erreur de service indisponible et rien n'est créé

### Requirement: Une seule affectation active par équipement
Le système DOIT garantir, y compris en cas de demandes simultanées, qu'un équipement n'a jamais plus d'une affectation active. Cette garantie DOIT s'appliquer aux créations groupées et unitaires.

#### Scenario: Deux demandes simultanées sur le même équipement
- **WHEN** deux utilisateurs affectent au même moment le même équipement à des bénéficiaires différents
- **THEN** une seule affectation est créée et l'autre demande est refusée avec une erreur de conflit indiquant que l'équipement est déjà affecté

#### Scenario: Demande groupée en conflit
- **WHEN** l'un des équipements d'une demande groupée est affecté par une autre opération entre la validation et l'enregistrement
- **THEN** aucune affectation de la demande groupée n'est conservée et la réponse est une erreur de conflit

#### Scenario: Création unitaire
- **WHEN** une affectation unitaire est demandée pour un équipement déjà affecté
- **THEN** elle est refusée avec la même erreur de conflit

### Requirement: Événements et indicateurs
Le système DOIT publier, pour chaque affectation créée, l'événement de création d'affectation, et les équipements dont le statut change DOIVENT donner lieu aux événements de changement de statut, de sorte que les indicateurs du tableau de bord reflètent l'opération.

#### Scenario: Indicateurs après une affectation groupée
- **WHEN** 4 équipements disponibles sont affectés à un poste en une opération
- **THEN** les indicateurs affichent 4 affectations actives de plus de type POSITION et 4 équipements de moins au statut disponible

#### Scenario: Aucun événement en cas de refus
- **WHEN** l'opération est refusée ou annulée
- **THEN** aucun événement d'affectation n'est publié

### Requirement: Traçabilité des affectations
Le système DOIT enregistrer dans le journal d'audit, pour chaque opération d'affectation réussie, groupée ou unitaire, l'auteur, le bénéficiaire (type et identifiant) et la liste des équipements et des affectations créés.

#### Scenario: Audit d'une affectation groupée
- **WHEN** 12 équipements sont affectés à un département en une opération
- **THEN** une entrée d'audit identifie l'auteur, le département et les 12 équipements

#### Scenario: Audit indisponible
- **WHEN** le service d'audit ne répond pas
- **THEN** l'affectation reste valide et le système ne renvoie pas d'erreur à l'utilisateur

### Requirement: Sélection multiple dans la liste des équipements
L'interface DOIT permettre de sélectionner plusieurs équipements dans la liste des équipements pour les affecter en une fois. Seuls les équipements disponibles DOIVENT être sélectionnables. L'interface DOIT proposer de sélectionner tous les équipements disponibles correspondant aux filtres actifs, afficher le nombre d'équipements sélectionnés et une action « Affecter la sélection ».

#### Scenario: Équipement non disponible
- **WHEN** l'utilisateur consulte la liste des équipements
- **THEN** la case à cocher d'un équipement affecté, en maintenance, hors service ou à compléter est désactivée

#### Scenario: Tout sélectionner sur les résultats filtrés
- **WHEN** l'utilisateur filtre la liste sur une catégorie puis choisit « tout sélectionner »
- **THEN** seuls les équipements disponibles de cette catégorie sont sélectionnés et le compteur reflète leur nombre

#### Scenario: Affecter la sélection
- **WHEN** l'utilisateur choisit « Affecter la sélection » avec 6 équipements sélectionnés
- **THEN** la fenêtre d'affectation s'ouvre avec ces 6 équipements déjà retenus et modifiables

### Requirement: Choix de plusieurs équipements dans la fenêtre d'affectation
La fenêtre d'affectation DOIT permettre de choisir un ou plusieurs équipements disponibles avec une recherche par nom ou numéro de série, ainsi que de retirer un équipement retenu, puis de choisir le type de bénéficiaire et le bénéficiaire comme pour une affectation unitaire.

#### Scenario: Recherche et sélection
- **WHEN** l'utilisateur recherche « portable » puis coche 3 résultats
- **THEN** les 3 équipements sont retenus pour l'affectation même si la recherche est ensuite modifiée

#### Scenario: Affectation unitaire inchangée
- **WHEN** l'utilisateur retient un seul équipement
- **THEN** l'affectation est créée comme une affectation unitaire, avec le même résultat que précédemment

### Requirement: Rapport de résultat de l'affectation groupée
L'interface DOIT indiquer à l'issue d'une opération le nombre d'équipements affectés, ou, en cas de refus, la liste des équipements refusés avec leur raison et le fait qu'aucune affectation n'a été créée. La liste des équipements et des affectations DOIT être rafraîchie après une réussite.

#### Scenario: Réussite
- **WHEN** 12 équipements sont affectés à un poste
- **THEN** l'interface affiche « 12 équipements affectés » et la liste reflète les nouveaux statuts

#### Scenario: Refus
- **WHEN** l'opération est refusée parce que 2 équipements sont indisponibles
- **THEN** l'interface affiche ces 2 équipements avec leur raison, indique qu'aucune affectation n'a été créée et permet de les retirer de la sélection pour réessayer

### Requirement: Droits identiques pour l'affectation groupée
Le système DOIT autoriser l'affectation groupée à tout utilisateur authentifié, quel que soit son rôle, et l'interface NE DOIT masquer la sélection multiple ni l'action « Affecter la sélection » selon le rôle. Une demande non authentifiée DOIT rester refusée.

#### Scenario: Affectation groupée par un employé
- **WHEN** un utilisateur de rôle EMPLOYE affecte plusieurs équipements disponibles à un département
- **THEN** l'opération réussit dans les mêmes conditions que pour un administrateur

#### Scenario: Sans authentification
- **WHEN** une demande d'affectation groupée est envoyée sans jeton valide
- **THEN** le système la refuse comme non authentifiée
