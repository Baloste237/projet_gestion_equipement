# Spec Delta

## Purpose

Permet de suivre l'état de fonctionnement d'un équipement et ses dates de mise en service et de mise hors service, indépendamment de son statut de disponibilité.

## ADDED Requirements

### Requirement: État de fonctionnement
Le système MUST enregistrer pour chaque équipement un état de fonctionnement `FONCTIONNEL` ou `NON_FONCTIONNEL`, distinct du statut (AVAILABLE, ASSIGNED, A_COMPLETER). L'état vaut `FONCTIONNEL` par défaut.

#### Scenario: État par défaut
- **WHEN** un équipement est créé sans état
- **THEN** son état de fonctionnement est `FONCTIONNEL`

#### Scenario: État indépendant du statut
- **WHEN** un équipement affecté est déclaré `NON_FONCTIONNEL`
- **THEN** son statut reste ASSIGNED et seul son état change

#### Scenario: Valeur refusée
- **WHEN** un état autre que `FONCTIONNEL` ou `NON_FONCTIONNEL` est fourni
- **THEN** le système refuse la requête avec une erreur de validation

### Requirement: Dates de service
Le système MUST permettre d'enregistrer une date de mise en service et une date de mise hors service, toutes deux facultatives. La date de mise hors service MUST NOT précéder la date de mise en service.

#### Scenario: Dates cohérentes
- **WHEN** un équipement est enregistré avec une mise en service le 2024-01-10 et une mise hors service le 2025-06-30
- **THEN** les deux dates sont conservées et affichées sur la fiche

#### Scenario: Dates incohérentes
- **WHEN** la date de mise hors service précède la date de mise en service
- **THEN** le système refuse l'enregistrement avec une erreur de validation

#### Scenario: Mise hors service sans changement de statut
- **WHEN** une date de mise hors service est renseignée
- **THEN** le statut de l'équipement n'est pas modifié automatiquement
