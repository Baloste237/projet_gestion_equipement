# Spec Delta

## Purpose
Garantir qu'une fiche utilisateur correspond à un compte de connexion identifié, que le rôle et l'état actif d'une personne ont une seule source de vérité, et qu'une action d'administration sur la fiche a un effet réel sur l'accès.

## ADDED Requirements

### Requirement: Fiche reliée à son compte par l'e-mail
À la création d'une fiche, le système SHALL relier la fiche au compte de connexion portant le même e-mail, et MUST NOT accepter d'identifiant de compte fourni par le client. Lorsqu'aucun compte n'existe pour cet e-mail, la fiche SHALL être créée non reliée.

#### Scenario: Fiche créée pour une personne ayant un compte
- **WHEN** un administrateur crée une fiche avec l'e-mail d'un compte existant
- **THEN** la fiche est reliée à ce compte et reprend son rôle et son état actif

#### Scenario: Fiche créée pour une personne sans compte
- **WHEN** un administrateur crée une fiche dont l'e-mail ne correspond à aucun compte
- **THEN** la fiche est créée sans lien et peut être reliée plus tard

#### Scenario: Identifiant de compte imposé par le client
- **WHEN** une requête de création contient un identifiant de compte
- **THEN** cet identifiant est ignoré et seul le lien par e-mail est utilisé

### Requirement: Liaison tardive
Lorsqu'un administrateur modifie le rôle ou l'état d'une fiche non reliée dont un compte existe désormais pour son e-mail, le système SHALL relier la fiche avant d'appliquer la modification.

#### Scenario: La personne s'est inscrite après la création de sa fiche
- **WHEN** un administrateur change le rôle d'une fiche non reliée et qu'un compte existe pour son e-mail
- **THEN** la fiche est reliée et le rôle du compte est modifié

#### Scenario: Aucun compte pour une fiche non reliée
- **WHEN** un administrateur change le rôle d'une fiche non reliée sans compte correspondant
- **THEN** seule la fiche est modifiée et la réponse indique qu'elle n'est pas reliée à un compte

### Requirement: Rôle du compte comme source de vérité
Le changement de rôle d'une fiche reliée SHALL modifier d'abord le rôle du compte de connexion, puis la fiche. Le rôle porté par les prochains jetons émis pour cette personne SHALL être le nouveau rôle.

#### Scenario: Promotion d'un employé
- **WHEN** un administrateur passe une fiche reliée de `EMPLOYE` à `RESPONSABLE`
- **THEN** la prochaine connexion ou le prochain rafraîchissement de cette personne produit un jeton de rôle `RESPONSABLE`

#### Scenario: Service d'authentification injoignable
- **WHEN** un administrateur change un rôle alors que le service d'authentification est indisponible
- **THEN** la réponse est une erreur 502 et ni le compte ni la fiche ne sont modifiés

### Requirement: Désactivation effective
La désactivation ou la suppression d'une fiche reliée SHALL désactiver le compte, révoquer tous ses jetons de rafraîchissement, et empêcher toute nouvelle connexion. La réactivation de la fiche SHALL réactiver le compte.

#### Scenario: Désactivation d'un utilisateur connecté
- **WHEN** un administrateur désactive la fiche d'une personne connectée
- **THEN** son jeton de rafraîchissement est refusé et sa prochaine connexion échoue avec la réponse d'identifiants invalides

#### Scenario: Suppression d'une fiche
- **WHEN** un administrateur supprime une fiche reliée
- **THEN** le compte lié est désactivé et conservé pour la traçabilité de l'audit

#### Scenario: Réactivation
- **WHEN** un administrateur réactive une fiche reliée
- **THEN** la personne peut de nouveau se connecter

### Requirement: Protection du dernier administrateur
Le système MUST NOT permettre de rétrograder, désactiver ou supprimer le dernier compte `ADMIN` actif.

#### Scenario: Rétrogradation du dernier administrateur
- **WHEN** un administrateur tente de rétrograder le seul administrateur actif
- **THEN** la réponse est un conflit (409) et rien n'est modifié

#### Scenario: Plusieurs administrateurs
- **WHEN** il existe deux administrateurs actifs et qu'un administrateur en rétrograde un
- **THEN** la modification est acceptée

### Requirement: Routes internes non exposées
Les opérations de lecture et de modification des comptes utilisées par les services SHALL exiger le secret interne partagé et MUST NOT être accessibles par le gateway public.

#### Scenario: Appel sans secret interne
- **WHEN** un client appelle une route interne de comptes sans secret valide
- **THEN** la réponse est un refus (403) et aucun compte n'est lu ni modifié

#### Scenario: Appel via le gateway
- **WHEN** un client appelle l'adresse publique du gateway vers une route interne de comptes
- **THEN** la réponse est « route introuvable » (404)

### Requirement: Fiche de l'utilisateur connecté
Un utilisateur authentifié SHALL pouvoir lire sa propre fiche, retrouvée par l'identifiant de son compte, sans en connaître l'identifiant de fiche.

#### Scenario: Utilisateur relié
- **WHEN** un utilisateur connecté dont la fiche est reliée appelle `GET /users/me`
- **THEN** sa fiche est renvoyée

#### Scenario: Utilisateur sans fiche
- **WHEN** un utilisateur connecté sans fiche reliée appelle `GET /users/me`
- **THEN** la réponse est « fiche introuvable » (404)

### Requirement: Reprise des fiches existantes
Une opération de reprise SHALL relier les fiches existantes à leur compte par e-mail et SHALL retirer les identifiants de compte qui ne correspondent à aucun compte, sans supprimer de fiche.

#### Scenario: Fiche avec identifiant aléatoire et compte de même e-mail
- **WHEN** la reprise traite une fiche dont l'identifiant de compte est inconnu et dont l'e-mail correspond à un compte
- **THEN** la fiche est reliée à ce compte

#### Scenario: Fiche sans compte correspondant
- **WHEN** la reprise traite une fiche dont l'e-mail ne correspond à aucun compte
- **THEN** son identifiant de compte est retiré et la fiche est conservée

#### Scenario: Reprise rejouée
- **WHEN** la reprise est exécutée une seconde fois
- **THEN** aucune fiche n'est modifiée
