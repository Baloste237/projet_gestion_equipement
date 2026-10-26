# Spec Delta

## Purpose

Permet d'identifier physiquement un équipement par un code QR imprimable et de retrouver sa fiche par scan, avec l'appareil photo d'un téléphone ou avec le scanner de l'application.

## ADDED Requirements

### Requirement: Code QR d'un équipement
Le système MUST générer pour chaque équipement un code QR qui encode l'adresse absolue de sa fiche publique, construite à partir de l'adresse publique configurée de l'application. Le code QR MUST s'afficher sur la fiche de l'équipement et pouvoir être téléchargé en image.

#### Scenario: Affichage sur la fiche
- **WHEN** un utilisateur ouvre la fiche d'un équipement
- **THEN** un code QR scannable est affiché à la place de l'icône décorative

#### Scenario: Scan avec l'appareil photo
- **WHEN** une personne scanne le code QR avec l'appareil photo d'un téléphone
- **THEN** le téléphone propose d'ouvrir la fiche publique de cet équipement

#### Scenario: Téléchargement
- **WHEN** l'utilisateur demande le téléchargement du code QR
- **THEN** une image du code est enregistrée, nommée d'après le numéro de série de l'équipement

### Requirement: Impression d'étiquettes
Le système MUST permettre d'imprimer des étiquettes contenant le code QR, le nom et le numéro de série pour un ou plusieurs équipements sélectionnés.

#### Scenario: Planche pour une sélection
- **WHEN** l'utilisateur sélectionne plusieurs équipements et demande l'impression d'étiquettes
- **THEN** une page imprimable présente une étiquette par équipement sélectionné, et seulement le contenu des étiquettes est imprimé

#### Scenario: Équipements d'un import
- **WHEN** l'utilisateur vient d'importer des équipements et demande leurs étiquettes
- **THEN** les équipements créés par cet import sont proposés à l'impression

#### Scenario: Aucun équipement sélectionné
- **WHEN** aucune sélection n'existe
- **THEN** l'action d'impression n'est pas disponible

### Requirement: Scanner intégré
L'application MUST fournir aux utilisateurs connectés un scanner qui utilise la caméra de l'appareil pour lire un code QR d'équipement et ouvrir la fiche complète correspondante.

#### Scenario: Scan réussi
- **WHEN** un utilisateur connecté scanne le code QR d'un équipement existant
- **THEN** l'application ouvre la fiche complète de cet équipement

#### Scenario: Code étranger
- **WHEN** le code scanné n'est pas celui d'un équipement de l'application
- **THEN** l'application affiche un message indiquant que le code n'est pas reconnu et reste sur le scanner

#### Scenario: Caméra refusée ou absente
- **WHEN** l'accès à la caméra est refusé ou impossible
- **THEN** l'application explique la cause et propose de saisir le numéro de série à la main
