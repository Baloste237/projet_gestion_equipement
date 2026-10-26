# Spec Delta

## Purpose

Permet l'importation et l'exportation en masse des équipements via des fichiers Excel ou CSV avec un mapping dynamique.

## ADDED Requirements

### Requirement: Importation dynamique
Le système DOIT permettre d'importer un fichier CSV ou Excel et d'associer dynamiquement ses colonnes aux attributs d'un équipement.

#### Scenario: Importation avec quantité
- **WHEN** l'utilisateur importe une ligne avec la colonne 'QUANTITE' fixée à N (ex: 10)
- **THEN** le système génère N équipements distincts avec le statut "A COMPLETER" si certains champs obligatoires (ex: Serial Number) manquent

### Requirement: Exportation dynamique
Le système DOIT exporter la liste des équipements dans un fichier structuré (Excel/CSV) incluant toutes les colonnes personnalisées.

#### Scenario: Export standard
- **WHEN** l'utilisateur demande l'exportation de l'inventaire
- **THEN** un fichier contenant les équipements et leurs métadonnées est téléchargé
