# Spec Delta

## Purpose

Permet de parcourir par pages les listes volumineuses de l'application sans charger tous les éléments, avec un comportement identique d'une liste à l'autre et sans casser les appels qui ont besoin de la liste complète.

## ADDED Requirements

### Requirement: Pagination serveur optionnelle
Pour les listes d'équipements et du journal d'audit, le système DOIT paginer la réponse lorsque la requête contient `page` ou `pageSize`. `page` DOIT être un entier supérieur ou égal à 1 (1 par défaut) et `pageSize` un entier de 1 à 100 (25 par défaut). La réponse DOIT conserver `data` et ajouter `meta` avec `total` (nombre d'éléments correspondant aux filtres), `page`, `pageSize` et `totalPages`. Une valeur hors limites DOIT être refusée par une erreur 400 sans effet de bord.

#### Scenario: Deuxième page
- **WHEN** un client demande `GET /equipments?page=2&pageSize=25` et que 620 équipements existent
- **THEN** la réponse contient les équipements 26 à 50 et `meta` vaut `total: 620`, `page: 2`, `pageSize: 25`, `totalPages: 25`

#### Scenario: Taille de page trop grande
- **WHEN** un client demande `pageSize=500`
- **THEN** la réponse est une erreur 400 et rien n'est lu ni modifié

#### Scenario: Page au-delà de la fin
- **WHEN** un client demande la page 99 alors que `totalPages` vaut 25
- **THEN** la réponse contient `data` vide et le même `meta`, sans erreur

### Requirement: Liste complète sans paramètre
Le système DOIT renvoyer la liste complète, au format actuel (`data` seul), lorsqu'une requête de liste ne contient ni `page` ni `pageSize`, afin que les services et écrans qui lisent toute la liste continuent de fonctionner.

#### Scenario: Lecture complète par un autre service
- **WHEN** inventory-service lit `GET /equipments` sans paramètre
- **THEN** il reçoit tous les équipements dans `data`, comme avant ce changement

### Requirement: Composant de pagination commun
L'interface DOIT présenter la même barre de pagination sur chaque liste paginée : pages précédente et suivante, numéros de page (avec des points de suspension quand il y en a beaucoup), le libellé « x à y sur N », et le choix de la taille de page parmi 10, 25, 50 et 100 (25 par défaut). Le choix de taille DOIT être mémorisé pour l'utilisateur. La barre DOIT être masquée lorsque la liste est vide.

#### Scenario: Navigation
- **WHEN** l'utilisateur est sur la page 1 d'une liste de 612 éléments à 25 par page et clique sur « Suivant »
- **THEN** la page 2 s'affiche, avec le libellé « 26 à 50 sur 612 »

#### Scenario: Taille mémorisée
- **WHEN** l'utilisateur choisit 50 par page puis ouvre une autre liste paginée
- **THEN** cette liste utilise aussi 50 par page

#### Scenario: Liste vide
- **WHEN** une liste ne contient aucun élément
- **THEN** la barre de pagination n'est pas affichée

### Requirement: Retour à la première page
L'interface DOIT revenir à la page 1 à chaque modification d'un filtre, d'une recherche ou du tri, et DOIT ramener la page courante dans les limites lorsque la liste rétrécit (suppression, filtre).

#### Scenario: Nouveau filtre
- **WHEN** l'utilisateur est en page 5 et saisit un terme de recherche
- **THEN** la page 1 des résultats s'affiche

#### Scenario: Dernière page vidée
- **WHEN** l'utilisateur supprime le dernier élément de la dernière page
- **THEN** la page précédente s'affiche

### Requirement: Listes concernées
Le système DOIT paginer les listes suivantes : équipements et journal d'audit (côté serveur), affectations, catégories, utilisateurs et postes (dans le navigateur, sur la liste filtrée). Les compteurs et statistiques affichés par ces pages DOIVENT continuer de porter sur l'ensemble des éléments, et non sur la page affichée. Les départements, le tableau de bord, les étiquettes et les inventaires DOIVENT rester sans pagination.

#### Scenario: Statistiques inchangées
- **WHEN** la page des utilisateurs affiche 4 administrateurs au total et que la page courante n'en contient que 2
- **THEN** le compteur d'administrateurs affiche 4
