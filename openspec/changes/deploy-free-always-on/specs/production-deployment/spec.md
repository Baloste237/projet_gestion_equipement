# Spec Delta

## Purpose
Définir le comportement attendu de l'application mise en ligne : accessibilité permanente en HTTPS, exposition minimale, secrets obligatoires, persistance des données et sauvegardes, le tout sans coût d'hébergement.

## ADDED Requirements

### Requirement: Accès public permanent en HTTPS
L'application SHALL être accessible depuis Internet en HTTPS uniquement, à une adresse stable pour le frontend et une adresse stable pour l'API, sans intervention manuelle après une période d'inactivité.

#### Scenario: Ouverture après une longue inactivité
- **WHEN** un visiteur ouvre l'application après plusieurs heures sans trafic
- **THEN** la page de connexion s'affiche et l'API répond sans action manuelle de l'équipe

#### Scenario: Requête en HTTP clair
- **WHEN** un client appelle l'adresse de l'application en HTTP non chiffré
- **THEN** il est redirigé vers HTTPS ou la connexion est refusée

#### Scenario: Navigation directe vers une route profonde
- **WHEN** un visiteur ouvre directement l'adresse de la fiche publique d'un équipement (scan d'un QR code)
- **THEN** l'application affiche cette fiche et non une erreur 404

### Requirement: Maintien en éveil du backend
Le système SHALL empêcher la mise en veille du backend par un contrôle de santé planifié, et ce contrôle SHALL signaler un échec visible lorsque l'API ne répond pas.

#### Scenario: Contrôle de santé réussi
- **WHEN** le contrôle planifié appelle le point de santé de l'API
- **THEN** l'API répond avec un statut de succès et reste éveillée

#### Scenario: API injoignable
- **WHEN** le contrôle planifié ne reçoit pas de réponse de succès
- **THEN** l'exécution est marquée en échec afin que l'équipe soit alertée

### Requirement: Exposition limitée au point d'entrée
Seul le gateway SHALL être joignable depuis Internet. Les microservices, les bases de données et le courtier de messages MUST NOT être accessibles publiquement sans passer par le gateway.

#### Scenario: Appel direct à un microservice
- **WHEN** un client externe tente de joindre directement l'adresse d'un microservice (utilisateurs, équipements, audit)
- **THEN** la connexion échoue car ce service n'est pas exposé

#### Scenario: Appel à une route privée sans jeton
- **WHEN** un client appelle via le gateway une route privée sans jeton valide
- **THEN** la réponse est un refus d'authentification

### Requirement: Secrets obligatoires et origine autorisée
Le système SHALL refuser de démarrer lorsque le secret de signature des jetons est absent, et MUST NOT utiliser de valeur de repli. Le gateway SHALL n'autoriser en CORS que l'origine du frontend déployé.

#### Scenario: Démarrage sans secret
- **WHEN** le gateway démarre sans secret de signature de jetons défini
- **THEN** le processus s'arrête avec un message d'erreur explicite et n'écoute aucun port

#### Scenario: Requête depuis une origine non autorisée
- **WHEN** un navigateur envoie une requête depuis une origine différente de celle du frontend déployé
- **THEN** la réponse n'autorise pas cette origine

### Requirement: Identification correcte du client derrière le proxy
Le limiteur de débit SHALL se baser sur l'adresse IP réelle du client et non sur celle du proxy de l'hébergeur.

#### Scenario: Deux clients distincts
- **WHEN** deux clients ayant des adresses IP différentes appellent le login depuis l'extérieur
- **THEN** chacun dispose de son propre quota de tentatives

### Requirement: Persistance des données et des fichiers
Les données métier et les fichiers téléversés (photos d'équipements, avatars) SHALL survivre à un redémarrage ou à un redéploiement du backend.

#### Scenario: Redéploiement du backend
- **WHEN** le backend est redéployé ou redémarré
- **THEN** les équipements, affectations, utilisateurs et images précédemment enregistrés sont toujours disponibles

#### Scenario: Image d'équipement après redémarrage
- **WHEN** un équipement dont la photo a été téléversée avant un redémarrage est consulté
- **THEN** sa photo s'affiche correctement

### Requirement: Migrations de base de données automatiques
Le déploiement SHALL appliquer les migrations de schéma en attente de chaque service avant que celui-ci accepte du trafic.

#### Scenario: Nouvelle migration livrée
- **WHEN** une version contenant une nouvelle migration est déployée
- **THEN** la migration est appliquée au démarrage et le service répond avec le schéma à jour

#### Scenario: Échec de migration
- **WHEN** une migration échoue au démarrage
- **THEN** le service concerné n'accepte pas de trafic et l'erreur est visible dans les journaux

### Requirement: Sauvegarde automatique des bases
Le système SHALL produire automatiquement et régulièrement une sauvegarde de chaque base de données, conservée hors du fournisseur de la base, avec une durée de conservation définie.

#### Scenario: Sauvegarde planifiée
- **WHEN** l'échéance de sauvegarde est atteinte
- **THEN** une archive de chaque base est créée et conservée

#### Scenario: Échec de sauvegarde
- **WHEN** la sauvegarde d'une base échoue
- **THEN** l'exécution est marquée en échec afin que l'équipe soit alertée

### Requirement: Coût d'hébergement nul
La mise en ligne SHALL reposer uniquement sur des offres gratuites et ne MUST NOT nécessiter de carte de paiement active pour fonctionner en régime normal.

#### Scenario: Fonctionnement mensuel normal
- **WHEN** l'application est utilisée à un volume de démonstration
- **THEN** aucune facturation n'est générée par les services d'hébergement utilisés
