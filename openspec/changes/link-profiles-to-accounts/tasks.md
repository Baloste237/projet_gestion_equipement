# Tâches

## 1. auth-service : routes internes sur les comptes

- [x] 1.1 Ajouter `GET /internal/credentials/by-email/:email` (réponse `{ id, email, role, isActive }`, sans hash) protégée par `internalOnly`, avec recherche insensible à la casse ; vérifier par test : 200 avec le secret, 404 si inconnu, 403 sans secret
- [x] 1.2 Ajouter `PATCH /internal/credentials/:id` (`{ role?, isActive? }`, validation Zod) ; vérifier par test qu'un changement de rôle est visible au login suivant et au rafraîchissement suivant
- [x] 1.3 Révoquer tous les jetons de rafraîchissement quand `isActive` passe à `false` (`revokeAllForCredential`) ; vérifier par test qu'un rafraîchissement échoue et qu'un login renvoie la réponse d'identifiants invalides
- [x] 1.4 Appliquer la garde dernier administrateur (409 `LAST_ADMIN`) dans une transaction sérialisable pour la rétrogradation et la désactivation ; vérifier par test : refus pour le seul admin, accepté avec deux admins, et deux rétrogradations simultanées ne laissent pas zéro admin
- [x] 1.5 Vérifier que le gateway n'expose pas `/internal/*` (aucune entrée dans `services.config.ts`) avec un test gateway renvoyant 404

## 2. user-service : lien et migration

- [x] 2.1 Normaliser l'e-mail (minuscules) à l'inscription et à la liaison ; vérifier par test qu'une fiche `Alice@X.fr` se relie au compte `alice@x.fr`
- [x] 2.2 Migration Prisma rendant `authUserId` nullable (conserver l'unicité) ; vérifier avec `prisma migrate deploy` sur une base vide puis sur une base contenant des fiches
- [x] 2.3 Écrire le client HTTP vers auth-service (lecture par e-mail, modification, secret interne, délai court, échec explicite) ; vérifier par test avec un faux auth-service : en-tête de secret présent, 404 distingué d'une panne
- [x] 2.4 Retirer `authUserId` du schéma de création et relier par e-mail à la création (fiche non reliée si aucun compte) ; vérifier par tests : compte existant relié, compte absent non relié, `authUserId` fourni par le client ignoré
- [x] 2.5 Reprendre le rôle et l'état actif du compte à la création d'une fiche reliée ; vérifier par test que le rôle saisi est ignoré au profit de celui du compte

## 3. user-service : synchronisation du rôle et de l'état

- [x] 3.1 Changement de rôle : liaison tardive si besoin, appel à auth-service d'abord, fiche ensuite ; vérifier par tests : promotion appliquée aux deux, panne → 502 et rien modifié, 409 du dernier admin relayé, fiche sans compte modifiée seule avec `linked: false`
- [x] 3.2 Désactivation et réactivation : même flux (compte puis fiche) ; vérifier par tests, y compris la désactivation qui coupe le rafraîchissement
- [x] 3.3 Suppression d'une fiche reliée : désactiver le compte avant la suppression, refuser (502) si auth-service est injoignable ; vérifier par tests
- [x] 3.4 Ajouter `GET /users/me` déclaré avant `/:id` (lecture par `req.user.id`) ; vérifier par tests : fiche reliée renvoyée, 404 sans fiche, et que `/me` n'est pas pris pour un identifiant
- [x] 3.5 Journaliser dans l'audit chaque synchronisation (rôle, état, liaison) avec l'identifiant de l'administrateur auteur ; vérifier qu'un événement est reçu par un faux audit-service

## 4. Reprise des données

- [x] 4.1 Écrire le script `relink:profiles` (idempotent, option `--dry-run`, aucune suppression) ; vérifier sur une base de test : fiche avec compte reliée avec rôle et état alignés, fiche sans compte avec `authUserId` vidé, 2e exécution sans modification
- [x] 4.2 Exécuter le script en mode `--dry-run` sur un jeu de données réaliste et consigner le résumé (nombre de fiches reliées, non reliées) dans le README

## 5. Frontend

- [x] 5.1 Ne plus envoyer `authUserId: crypto.randomUUID()` à la création (`UserModal.tsx`) et retirer le champ des types de création ; vérifier avec `tsc -b`
- [x] 5.2 Afficher l'état « non relié à un compte » dans la liste et dans la fenêtre de détail, et un message clair pour les erreurs 409 (dernier administrateur) et 502 (synchronisation impossible) ; vérifier par test des utilitaires de message et à la main
- [x] 5.3 Faire lire la page Paramètres via `GET /users/me` ; vérifier que les champs du profil se remplissent pour un utilisateur relié et que l'absence de fiche n'affiche pas d'erreur

## 6. Vérification d'ensemble

- [x] 6.1 Test de bout en bout sur de vrais PostgreSQL (conteneurs jetables) : inscription, création de fiche reliée, promotion en `RESPONSABLE`, nouveau login avec le bon rôle, désactivation puis échec de login et de rafraîchissement, protection du dernier admin ; vérifier que tout passe
- [x] 6.2 Mettre à jour les `.env.example` et le README (nouvelles routes internes, ordre de migration, script de reprise, comportement en cas de panne d'auth-service) ; vérifier l'absence de secret dans `git diff`
- [x] 6.3 Étendre la CI aux tests ajoutés et vérifier que l'ensemble des suites passe
