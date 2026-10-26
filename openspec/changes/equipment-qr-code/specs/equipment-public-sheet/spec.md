# Spec Delta

## Purpose

Permet à toute personne qui scanne le code QR d'un équipement de consulter sa fiche d'identification sans se connecter, sans exposer les informations financières.

## ADDED Requirements

### Requirement: Fiche publique d'un équipement
Le système MUST fournir, sans authentification, une fiche en lecture seule d'un équipement identifié par son identifiant. La fiche MUST contenir : nom, catégorie, marque, modèle, numéro de série, code-barres, statut, état de fonctionnement, emplacement, image, dates de mise en service et de mise hors service, date de fin de garantie et bénéficiaire actuel.

#### Scenario: Consultation sans connexion
- **WHEN** une personne non connectée ouvre l'adresse de la fiche d'un équipement existant
- **THEN** la fiche s'affiche avec les informations d'identification et de service

#### Scenario: Bénéficiaire actuel
- **WHEN** l'équipement a une affectation active à un utilisateur
- **THEN** la fiche indique le nom de cet utilisateur

#### Scenario: Équipement non affecté
- **WHEN** l'équipement n'a aucune affectation active
- **THEN** la fiche indique qu'il n'est pas affecté

### Requirement: Informations masquées
La fiche publique MUST NOT contenir le prix d'achat, le fournisseur, les notes internes ni les identifiants techniques des affectations.

#### Scenario: Prix et fournisseur absents
- **WHEN** la fiche publique d'un équipement ayant un prix d'achat et un fournisseur est demandée
- **THEN** ni le prix ni le fournisseur ne figurent dans la réponse

### Requirement: Équipement inconnu
Le système MUST répondre de la même façon pour un identifiant inexistant et pour un identifiant mal formé, sans révéler lequel des deux cas se présente.

#### Scenario: Identifiant inexistant
- **WHEN** l'adresse d'une fiche contient un identifiant bien formé qui ne correspond à aucun équipement
- **THEN** le système répond « équipement introuvable » et la page l'affiche clairement

#### Scenario: Identifiant mal formé
- **WHEN** l'adresse contient un identifiant qui n'a pas le format attendu
- **THEN** la réponse est identique à celle d'un équipement inexistant

### Requirement: Limitation du débit
Le service public MUST limiter le nombre de requêtes par client pour empêcher l'énumération.

#### Scenario: Trop de requêtes
- **WHEN** un même client dépasse la limite de requêtes autorisée sur la fiche publique
- **THEN** le système refuse les requêtes suivantes avec une erreur de limitation jusqu'à la fin de la période

### Requirement: Accès aux détails complets pour les connectés
Lorsque la personne qui consulte la fiche est connectée, la page MUST proposer l'accès à la fiche complète de l'équipement.

#### Scenario: Utilisateur connecté
- **WHEN** un utilisateur connecté ouvre la fiche publique
- **THEN** un lien vers la fiche complète de l'équipement est affiché

#### Scenario: Visiteur non connecté
- **WHEN** un visiteur non connecté ouvre la fiche publique
- **THEN** aucun lien vers la fiche complète n'est proposé, seulement l'invitation à se connecter
