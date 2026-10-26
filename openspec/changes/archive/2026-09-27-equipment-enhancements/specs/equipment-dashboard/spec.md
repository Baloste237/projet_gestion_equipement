# Spec Delta

## Purpose

Fournit des indicateurs clés de performance (KPIs) dynamiques et temps réel pour le tableau de bord de l'application.

## ADDED Requirements

### Requirement: Diffusion des événements d'inventaire
Les services de gestion d'équipements et d'affectations DOIVENT émettre des événements lors de modifications d'état (création, changement de statut, affectation) sur un bus de messages.

#### Scenario: Émission lors d'une nouvelle affectation
- **WHEN** une affectation est créée
- **THEN** un événement est publié sur le bus de messages pour notification

### Requirement: Agrégation des statistiques
Le système DOIT agréger les événements d'inventaire pour maintenir des vues matérialisées (KPIs) à destination du tableau de bord.

#### Scenario: Affichage du tableau de bord
- **WHEN** le frontend requête les statistiques
- **THEN** le système retourne les KPIs temps réel sans recalculer l'intégralité de la base de données
