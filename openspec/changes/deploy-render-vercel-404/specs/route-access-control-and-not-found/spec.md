# Spec Delta

## Purpose

Assure la protection de la navigation côté client, en interceptant les routes inconnues par une page 404 personnalisée et en restreignant l'accès aux routes protégées selon le rôle de l'utilisateur avec redirection ou affichage d'un écran 403 non autorisé.

## ADDED Requirements

### Requirement: Custom 404 Not Found Page
Le frontend SHALL afficher une page 404 personnalisée et responsive respectant la charte graphique sombre lorsqu'un utilisateur navigue vers une URL inexistante.

#### Scenario: Ingestion d'une URL inexistante
- **WHEN** un utilisateur saisit ou clique sur un lien vers une route non reconnue comme `/page-introuvable`
- **THEN** l'application affiche la page 404 personnalisée contenant un message d'erreur explicite et un bouton permettant de retourner au tableau de bord ou à la page précédente

### Requirement: Role-Based Route Guards
Le frontend SHALL restreindre l'accès aux routes protégées en vérifiant le jeton d'authentification et le rôle attribué à l'utilisateur connecté.

#### Scenario: Accès à une route protégée sans authentification
- **WHEN** un visiteur non authentifié tente d'accéder à une route interne telle que `/dashboard`, `/equipments`, ou `/users`
- **THEN** l'application le redirige immédiatement vers la page de connexion `/login` avec conservation de l'URL cible

#### Scenario: Accès à une route réservée sans privilège suffisant
- **WHEN** un utilisateur authentifié avec le rôle `EMPLOYE` tente d'accéder via la barre d'adresse à une page d'administration telle que `/users`, `/departments` ou `/audit`
- **THEN** l'application bloque l'accès et affiche une vue d'erreur 403 / accès refusé personnalisée avec option de retour au tableau de bord
