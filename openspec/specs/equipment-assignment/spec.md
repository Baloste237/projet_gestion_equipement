# equipment-assignment Specification

## Purpose

Permet la gestion des affectations d'équipements de manière polymorphique vers des utilisateurs, des départements ou des postes de travail.

## Requirements

### Requirement: Affectation polymorphique
Le système DOIT permettre l'affectation d'un équipement à un assigné défini par un `assigneeType` (USER, DEPARTMENT, POSITION) et un `assigneeId`.

#### Scenario: Affectation à un département
- **WHEN** un équipement est affecté avec le type 'DEPARTMENT' et un identifiant de département valide
- **THEN** l'équipement est enregistré comme affecté à ce département et son statut devient ASSIGNED

#### Scenario: Rejet d'affectation invalide
- **WHEN** un équipement est affecté à un département ou poste inexistant
- **THEN** le système retourne une erreur de validation et l'affectation échoue
