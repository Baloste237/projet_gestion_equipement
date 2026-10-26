# Spec Delta

## Purpose

Permet de retrouver un équipement par ses dates (ajout, achat, mise en service, dernière modification) grâce à un tri et à un filtre par période, dans un ordre stable compatible avec la pagination.

## ADDED Requirements

### Requirement: Tri par date
Le système DOIT permettre de trier la liste des équipements par `createdAt` (date d'ajout), `purchaseDate` (date d'achat), `commissionedAt` (date de mise en service) ou `updatedAt` (dernière modification), dans l'ordre `asc` ou `desc`. Sans paramètre de tri, la liste DOIT être triée par `createdAt` décroissant. Un champ de tri ou un sens inconnu DOIT être refusé par une erreur 400.

#### Scenario: Tri par défaut
- **WHEN** un client demande les équipements sans paramètre de tri mais avec `page=1`
- **THEN** les équipements les plus récemment ajoutés viennent en premier

#### Scenario: Tri par date d'achat
- **WHEN** un client demande `sort=purchaseDate&order=asc`
- **THEN** les équipements dont l'achat est le plus ancien viennent en premier

#### Scenario: Champ de tri inconnu
- **WHEN** un client demande `sort=name`
- **THEN** la réponse est une erreur 400

### Requirement: Ordre stable
Le système DOIT départager les équipements de même date par leur identifiant, afin qu'un équipement n'apparaisse ni deux fois ni jamais d'une page à l'autre. Cet ordre DOIT aussi s'appliquer à la liste non paginée.

#### Scenario: Équipements importés en même temps
- **WHEN** 612 équipements ont été créés par un même import (même date d'ajout) et qu'un client lit les 25 pages
- **THEN** chaque équipement apparaît exactement une fois sur l'ensemble des pages

### Requirement: Équipements sans date
Le système DOIT placer en fin de liste les équipements dont la date de tri est absente, quel que soit le sens du tri.

#### Scenario: Date d'achat absente
- **WHEN** un client trie par `purchaseDate` en ordre décroissant et que certains équipements n'ont pas de date d'achat
- **THEN** ces équipements viennent après tous ceux qui en ont une

### Requirement: Filtre par période
Le système DOIT permettre de ne garder que les équipements dont la date de tri est comprise, bornes incluses, entre `from` et `to` (formats `AAAA-MM-JJ` ou date-heure ISO ; une date seule couvre toute la journée UTC). Chaque borne DOIT être facultative. `from` postérieur à `to` DOIT être refusé par une erreur 400. Lorsqu'une période est active, les équipements sans date de tri DOIVENT être exclus.

#### Scenario: Période sur la date d'ajout
- **WHEN** un client demande `sort=createdAt&from=2026-10-01&to=2026-10-31`
- **THEN** seuls les équipements ajoutés en octobre 2026 sont renvoyés, et `meta.total` les compte

#### Scenario: Borne manquante
- **WHEN** un client demande `from=2026-10-01` sans `to`
- **THEN** tous les équipements à partir du 1er octobre 2026 sont renvoyés

#### Scenario: Dates incohérentes
- **WHEN** un client demande `from=2026-10-31&to=2026-10-01`
- **THEN** la réponse est une erreur 400

#### Scenario: Équipement sans date
- **WHEN** une période est active sur la date d'achat et qu'un équipement n'a pas de date d'achat
- **THEN** cet équipement n'est pas renvoyé

### Requirement: Filtres de la liste côté serveur
Le système DOIT appliquer côté serveur, avant la pagination, la recherche `q` (nom, numéro de série ou nom de catégorie, sans tenir compte de la casse), la catégorie `categoryId` et le statut `status`, combinables avec le tri et la période. `meta.total` DOIT compter les équipements correspondant à tous les filtres.

#### Scenario: Recherche et statut combinés
- **WHEN** un client demande `q=chaise&status=A_COMPLETER&page=1`
- **THEN** seuls les équipements « à compléter » dont le nom, le numéro de série ou la catégorie contient « chaise » sont paginés

### Requirement: Saisie des dates en jj/mm/AAAA
L'interface DOIT afficher et faire saisir toutes les dates de ce tri au format `jj/mm/AAAA`, par un champ texte à masque, indépendamment de la langue du navigateur. Elle DOIT refuser un jour ou un mois impossible (par exemple 31/02/2026) et une période dont « au » précède « du », en l'indiquant à l'utilisateur sans interroger le serveur. Le tri et la période DOIVENT partager la même date, choisie dans un seul sélecteur.

#### Scenario: Date impossible
- **WHEN** l'utilisateur saisit « 31/02/2026 » dans le champ « du »
- **THEN** un message indique que la date est invalide et la liste n'est pas rechargée

#### Scenario: Période valide
- **WHEN** l'utilisateur choisit « Date d'achat », saisit « 01/01/2009 » et « 31/12/2009 »
- **THEN** la liste est triée par date d'achat et limitée à l'année 2009, avec retour à la page 1

#### Scenario: Effacer la période
- **WHEN** l'utilisateur clique sur « Effacer »
- **THEN** les deux champs sont vidés et la liste n'est plus limitée par une période

### Requirement: Colonne « Ajouté le » et sélection par page
Le tableau des équipements DOIT afficher la date d'ajout au format `jj/mm/AAAA`. Les en-têtes de colonnes de date DOIVENT permettre de changer le tri. La case « tout sélectionner » DOIT ne concerner que les équipements disponibles de la page courante ; la sélection DOIT être conservée en changeant de page, avec la limite de 200 équipements déjà en vigueur, et son compteur DOIT indiquer le total sélectionné, toutes pages confondues.

#### Scenario: Sélection sur deux pages
- **WHEN** l'utilisateur coche trois équipements en page 1 puis deux en page 2
- **THEN** le compteur indique 5 équipements sélectionnés

#### Scenario: Tout sélectionner
- **WHEN** l'utilisateur coche « tout sélectionner » sur une page de 25 équipements dont 20 sont disponibles
- **THEN** 20 équipements sont ajoutés à la sélection

#### Scenario: Lien depuis le tableau de bord
- **WHEN** l'utilisateur ouvre `/equipments?status=AVAILABLE` depuis le tableau de bord
- **THEN** la liste s'affiche filtrée sur ce statut, en page 1
