## ADDED Requirements

### Requirement: Tableau de bord alimenté par les KPIs matérialisés
Le tableau de bord DOIT afficher les indicateurs fournis par le service de KPIs (total d'équipements, répartition par statut, répartition par catégorie, affectations actives, inventaires en cours) sans recalculer ces valeurs à partir des listes complètes d'équipements et d'affectations.

#### Scenario: Chargement du tableau de bord
- **WHEN** l'utilisateur ouvre le tableau de bord
- **THEN** les indicateurs sont issus d'une seule requête de KPIs et s'affichent sans télécharger la liste complète des équipements

#### Scenario: Service de KPIs indisponible
- **WHEN** la requête de KPIs échoue
- **THEN** le tableau de bord affiche un message d'erreur avec une action « Réessayer » et ne présente pas de valeurs à zéro comme si elles étaient exactes

### Requirement: Diagrammes d'analyse des données
Le tableau de bord DOIT présenter des diagrammes qui facilitent l'analyse du parc, au minimum : la répartition des équipements par statut, la répartition des équipements par catégorie (total et disponibles), la répartition des affectations actives par type de bénéficiaire (Utilisateur, Département, Poste), le nombre d'équipements affectés par département (les départements les plus dotés en premier) et l'évolution du nombre d'affectations créées et restituées sur la période sélectionnée.

#### Scenario: Répartition par type de bénéficiaire
- **WHEN** il existe 5 affectations actives à des utilisateurs, 2 à des départements et 1 à un poste
- **THEN** le diagramme affiche ces trois valeurs avec leurs proportions

#### Scenario: Équipements par département
- **WHEN** plusieurs départements ont des équipements affectés
- **THEN** le diagramme classe les départements par nombre d'équipements affectés, du plus élevé au plus faible

#### Scenario: Évolution sur la période
- **WHEN** l'utilisateur choisit une période de 30 jours
- **THEN** le diagramme d'évolution montre, par jour ou par semaine, les affectations créées et les restitutions sur ces 30 jours, et il se met à jour quand la période change

#### Scenario: Aucune donnée
- **WHEN** un diagramme n'a aucune donnée à représenter
- **THEN** il affiche un état vide explicite au lieu d'un graphique vide

### Requirement: Lisibilité et interaction des diagrammes
Chaque diagramme DOIT avoir un titre, une légende et l'affichage des valeurs et des pourcentages. Le détail d'un élément DOIT apparaître au survol ou au focus clavier. L'information NE DOIT PAS reposer sur la couleur seule. Un élément d'un diagramme d'équipements DOIT permettre d'ouvrir la liste correspondante filtrée. Les diagrammes DOIVENT rester lisibles sur un écran étroit.

#### Scenario: Détail au survol
- **WHEN** l'utilisateur survole ou met le focus sur le segment « Disponible » du diagramme des statuts
- **THEN** une infobulle affiche le libellé, le nombre d'équipements et le pourcentage du total

#### Scenario: Ouverture de la liste filtrée
- **WHEN** l'utilisateur clique sur le segment « En maintenance » du diagramme des statuts
- **THEN** la page Équipements s'ouvre avec le filtre de statut « En maintenance » déjà appliqué

#### Scenario: Lecture sans couleur
- **WHEN** deux segments ont des couleurs proches ou que l'écran est en niveaux de gris
- **THEN** chaque segment reste identifiable par son libellé ou sa légende et sa valeur affichée

### Requirement: Indicateur de fraîcheur des KPIs
Le tableau de bord DOIT indiquer la date de dernière mise à jour des KPIs et signaler lorsque les KPIs ne sont pas encore synchronisés.

#### Scenario: KPIs non synchronisés
- **WHEN** le service indique que les KPIs ne sont pas synchronisés
- **THEN** le tableau de bord affiche un avertissement et une action de reconstruction des KPIs

### Requirement: Reconstruction des KPIs ouverte à tous les utilisateurs authentifiés
L'interface DOIT permettre à tout utilisateur authentifié, quel que soit son rôle, de demander la reconstruction des KPIs, puis de rafraîchir l'affichage à la fin de l'opération. Le système DOIT accepter cette demande de tout utilisateur authentifié.

#### Scenario: Reconstruction par un utilisateur authentifié
- **WHEN** un utilisateur, quel que soit son rôle, déclenche la reconstruction
- **THEN** l'interface indique l'opération en cours puis affiche les KPIs recalculés

#### Scenario: Reconstruction sans authentification
- **WHEN** une demande de reconstruction est envoyée sans jeton valide
- **THEN** le système la refuse comme non authentifiée
