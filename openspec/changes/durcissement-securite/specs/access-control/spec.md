# Spec Delta

## Purpose
Garantir que l'identité et les droits d'un appelant sont vérifiés côté serveur par chaque service, qu'aucune inscription ne permet de s'attribuer des privilèges, et que les erreurs et fichiers téléversés ne divulguent ni n'introduisent de contenu dangereux.

## ADDED Requirements

### Requirement: Inscription sans élévation de privilèges
L'inscription publique SHALL toujours créer un compte avec le rôle le plus bas (`EMPLOYE`), quelles que soient les données envoyées. Un rôle supérieur MUST être attribué uniquement par un administrateur authentifié.

#### Scenario: Inscription avec un rôle ADMIN dans la requête
- **WHEN** un visiteur non connecté s'inscrit en envoyant `role: "ADMIN"`
- **THEN** le compte est créé avec le rôle `EMPLOYE`

#### Scenario: Attribution d'un rôle par un administrateur
- **WHEN** un administrateur authentifié change le rôle d'un utilisateur vers `RESPONSABLE`
- **THEN** le changement est enregistré et un audit est émis

### Requirement: Jeton vérifié par chaque service
Les services utilisateurs et équipements SHALL vérifier eux-mêmes la signature et l'expiration du jeton d'accès pour toute route privée, sans se fier uniquement aux en-têtes transmis par le gateway. Les routes publiques explicitement déclarées (fiche publique d'équipement, fichiers statiques d'images) MUST rester accessibles sans jeton.

#### Scenario: Appel direct sans jeton
- **WHEN** un client appelle directement une route privée du service utilisateurs ou équipements sans en-tête `Authorization`
- **THEN** la réponse est un refus d'authentification (401)

#### Scenario: Jeton falsifié ou expiré
- **WHEN** un client présente un jeton à signature invalide ou expiré
- **THEN** la réponse est un refus d'authentification (401)

#### Scenario: En-tête d'identité usurpé
- **WHEN** un client envoie un jeton valide d'`EMPLOYE` avec un en-tête `x-user-role: ADMIN`
- **THEN** le rôle retenu est celui du jeton (`EMPLOYE`)

#### Scenario: Fiche publique d'équipement
- **WHEN** un visiteur non connecté ouvre la fiche publique d'un équipement
- **THEN** la fiche est renvoyée sans demande d'authentification

### Requirement: Gestion des comptes réservée aux administrateurs
La création, la désactivation, la réactivation, la suppression d'un utilisateur et la modification de rôle SHALL être réservées au rôle `ADMIN`. La lecture de la liste des utilisateurs reste ouverte aux utilisateurs authentifiés et un utilisateur SHALL pouvoir modifier uniquement son propre profil et son propre avatar.

#### Scenario: Changement de rôle par un non-administrateur
- **WHEN** un utilisateur `EMPLOYE` appelle le changement de rôle d'un compte, y compris le sien
- **THEN** la réponse est un refus d'autorisation (403) et rien n'est modifié

#### Scenario: Suppression d'un compte par un non-administrateur
- **WHEN** un utilisateur non `ADMIN` supprime un compte
- **THEN** la réponse est un refus d'autorisation (403)

#### Scenario: Modification de son propre profil
- **WHEN** un utilisateur authentifié modifie son propre profil
- **THEN** la modification est acceptée

#### Scenario: Modification du profil d'un autre utilisateur
- **WHEN** un utilisateur non `ADMIN` modifie le profil d'un autre utilisateur
- **THEN** la réponse est un refus d'autorisation (403)

### Requirement: Appels de service à service authentifiés
Les routes accessibles aux services entre eux et les routes d'écriture du journal d'audit SHALL exiger le secret interne partagé et MUST refuser tout appel sans ce secret, y compris lorsqu'aucun secret n'est configuré.

#### Scenario: Écriture dans le journal d'audit sans secret
- **WHEN** un client envoie `POST /audit-logs` sans secret interne valide
- **THEN** la réponse est un refus d'autorisation (403) et aucune entrée n'est créée

#### Scenario: Publication d'audit par un service légitime
- **WHEN** un service envoie un événement d'audit avec le secret interne valide
- **THEN** l'entrée est enregistrée

#### Scenario: Secret interne non configuré
- **WHEN** aucun secret interne n'est configuré sur le service d'audit
- **THEN** toute écriture dans le journal est refusée

### Requirement: Aucun secret de repli
Chaque service SHALL refuser de démarrer si le secret de signature des jetons ou, pour les services qui l'utilisent, le secret interne est absent. Aucune valeur par défaut codée dans le code ne MUST être utilisée.

#### Scenario: Démarrage sans secret de jeton
- **WHEN** un service démarre sans `JWT_SECRET`
- **THEN** le processus s'arrête avec un message d'erreur explicite

### Requirement: Connexion sans fuite d'information
La connexion SHALL renvoyer la même réponse d'échec pour un identifiant inconnu, un mot de passe incorrect et un compte désactivé, sans indiquer lequel de ces cas s'applique. La cause réelle SHALL rester consignée dans le journal d'audit.

#### Scenario: Identifiant inconnu
- **WHEN** un client se connecte avec un e-mail inexistant
- **THEN** la réponse est « identifiants invalides » (401)

#### Scenario: Compte désactivé avec le bon mot de passe
- **WHEN** un client se connecte avec le bon mot de passe sur un compte désactivé
- **THEN** la réponse est identique à celle d'un mot de passe incorrect (401)

### Requirement: Erreurs serveur sans détail interne
Une erreur interne inattendue SHALL renvoyer au client un message générique sans trace d'appel ni message technique. Les erreurs de validation et d'autorisation SHALL conserver leur message explicite.

#### Scenario: Exception inattendue
- **WHEN** une exception non prévue survient dans un service
- **THEN** le client reçoit un statut 500 avec un message générique, et le détail n'est présent que dans les journaux serveur

### Requirement: Validation du contenu des fichiers téléversés
Un fichier image téléversé SHALL être accepté uniquement si son contenu réel correspond à un format autorisé (JPEG, PNG ou WebP), indépendamment du type MIME ou de l'extension déclarés, et dans la limite de taille existante.

#### Scenario: Fichier exécutable renommé en image
- **WHEN** un utilisateur téléverse un fichier dont le contenu n'est pas une image mais dont le nom finit par `.png` avec le type `image/png`
- **THEN** le téléversement est rejeté (400) et aucun fichier n'est conservé

#### Scenario: Image valide
- **WHEN** un utilisateur téléverse un vrai JPEG de moins de 5 Mo
- **THEN** le téléversement est accepté

### Requirement: Journaux sans données sensibles
Les journaux applicatifs MUST NOT contenir de mots de passe, de jetons ni de secrets, et les messages de débogage verbeux SHALL être retirés du code de production.

#### Scenario: Connexion réussie
- **WHEN** un utilisateur se connecte avec succès
- **THEN** aucun mot de passe ni jeton n'apparaît dans les journaux
