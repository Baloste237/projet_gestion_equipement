# Spec Delta

## Purpose

Permet de consulter un journal d'audit qui grossit sans limite, page par page, avec ses filtres et ses compteurs globaux calculés par le serveur.

## ADDED Requirements

### Requirement: Journal d'audit paginé
Le système DOIT paginer `GET /audit-logs` lorsque la requête contient `page` ou `pageSize`, avec les règles et le bloc `meta` de la pagination serveur, et DOIT trier les journaux par date décroissante puis par identifiant. L'accès DOIT rester réservé aux utilisateurs disposant du droit `audit:read`.

#### Scenario: Première page
- **WHEN** un utilisateur autorisé demande `GET /audit-logs?page=1&pageSize=25`
- **THEN** il reçoit les 25 journaux les plus récents et `meta.total` donne le nombre total de journaux

#### Scenario: Accès refusé
- **WHEN** un utilisateur sans le droit `audit:read` demande une page du journal
- **THEN** la réponse est un refus d'accès et aucun journal n'est renvoyé

### Requirement: Filtres du journal côté serveur
Le système DOIT appliquer côté serveur, avant la pagination : la recherche `q` (acteur, identifiant d'entité ou identifiant du journal, sans tenir compte de la casse), la catégorie d'action `category` (`AUTHENTICATION`, `DATA_MUTATION` ou `SYSTEM_EVENT`, avec les mêmes correspondances d'actions qu'actuellement) et le jour `date` (`AAAA-MM-JJ`, journée UTC). `meta.total` DOIT compter les journaux correspondant aux filtres. Une catégorie inconnue ou une date invalide DOIT être refusée par une erreur 400.

#### Scenario: Catégorie et jour
- **WHEN** un utilisateur demande `category=AUTHENTICATION&date=2026-10-02&page=1`
- **THEN** seuls les journaux d'authentification de cette journée sont paginés

#### Scenario: Catégorie inconnue
- **WHEN** un utilisateur demande `category=AUTRE`
- **THEN** la réponse est une erreur 400

### Requirement: Compteurs globaux du journal
Le système DOIT inclure, dans toute réponse paginée du journal, un bloc `summary` portant sur **tout** le journal, sans tenir compte des filtres : `total`, `authCount` (actions d'authentification), `mutationCount` (créations, modifications, suppressions, transferts, retours) et `failedCount` (actions ou métadonnées en échec). L'interface DOIT afficher ces compteurs et le taux de réussite qui en découle.

#### Scenario: Compteurs indépendants du filtre
- **WHEN** un utilisateur filtre sur un seul jour
- **THEN** les compteurs affichés restent ceux de tout le journal

### Requirement: Journaux d'exemple jamais créés par une page ou un filtre
Le système NE DOIT PAS créer de journaux d'exemple lorsqu'un appel paginé ou filtré renvoie une liste vide : seule la lecture complète sans paramètre d'une table totalement vide conserve ce comportement existant.

#### Scenario: Filtre sans résultat
- **WHEN** un utilisateur filtre sur un jour sans journal
- **THEN** la réponse est vide et aucun journal n'est créé

### Requirement: Page d'audit paginée
L'interface DOIT présenter le journal page par page avec la barre de pagination commune, appliquer ses filtres par le serveur et conserver son actualisation périodique sur la page courante sans changer de page.

#### Scenario: Actualisation sur la page 2
- **WHEN** l'utilisateur est en page 2 avec l'actualisation automatique active
- **THEN** l'actualisation recharge la page 2 sans revenir à la page 1
