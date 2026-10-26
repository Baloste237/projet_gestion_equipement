# Tâches

## 1. Garde-fous partagés et secrets obligatoires

- [x] 1.1 Écrire le module commun (chargement strict des secrets, `authenticate`, `requireRole`, `requireOwnerOrAdmin`, `internalOnly`) dans `user-service` avec ses tests unitaires (jeton absent, invalide, expiré, rôle refusé, secret interne absent) ; vérifier que les tests passent
- [x] 1.2 Copier la même version dans `equipment-service` et vérifier que ses tests unitaires passent
- [x] 1.3 Aligner `audit-service`, `assignment-service` et `inventory-service` : retirer les secrets de repli (`votre_secret_partage_entre_services`, `default_jwt_secret`, `default_jwt_secret` côté client d'inventaire) ; vérifier avec `grep` qu'aucune valeur de repli ne subsiste et que chaque service refuse de démarrer sans `JWT_SECRET`
- [x] 1.4 Retirer le secret de repli du gateway (`gateway/src/config/env.ts`) ; vérifier que le gateway s'arrête sans `JWT_SECRET`
- [x] 1.5 Ajouter `JWT_SECRET` et `INTERNAL_SERVICE_TOKEN` aux `.env.example` de tous les services et au `docker-compose.yml` ; vérifier que `docker compose config` ne signale aucune variable manquante

## 2. Inscription et connexion (auth-service)

- [x] 2.1 Forcer le rôle `EMPLOYE` dans `authService.register` et retirer `role` du schéma public ; vérifier par un test qu'une inscription avec `role: "ADMIN"` produit un compte `EMPLOYE`
- [x] 2.2 Ajouter le script idempotent `seed:admin` (e-mail et mot de passe lus dans l'environnement, hash bcrypt, aucune route HTTP) ; vérifier qu'une 2e exécution ne crée pas de doublon et que la connexion de l'admin fonctionne
- [x] 2.3 Rendre le login uniforme (comparaison bcrypt factice si compte inconnu, compte désactivé et mot de passe faux renvoient la même réponse 401, cause réelle conservée dans l'audit) ; vérifier par tests sur les trois cas et sur l'égalité des corps de réponse
- [x] 2.4 Adapter la page d'inscription du frontend pour ne plus envoyer de rôle ; vérifier qu'une inscription depuis l'interface crée un compte `EMPLOYE`

## 3. Autorisation dans user-service

- [x] 3.1 Brancher `authenticate` sur toutes les routes de `user-service` sauf `/uploads` et `/health`, et remplacer la lecture de `x-user-id` (position controller) par `req.user.id` ; vérifier qu'un appel direct sans jeton renvoie 401
- [x] 3.2 Appliquer `requireRole("ADMIN")` à `POST /users`, `PATCH /:id/role`, `deactivate`, `reactivate` et `DELETE /:id`, et `requireOwnerOrAdmin` à `PATCH /:id` et `POST /:id/avatar` ; vérifier par tests qu'un `EMPLOYE` reçoit 403 sur chaque route et qu'un `ADMIN` réussit
- [x] 3.3 Réserver l'écriture des départements et des postes à `ADMIN` (lecture ouverte) ; vérifier par tests 403 pour `EMPLOYE` et succès pour `ADMIN`
- [x] 3.4 Accepter `x-internal-token` en alternative au jeton sur `GET /users` et `GET /users/:id` ; vérifier qu'un appel avec le secret réussit et qu'un secret faux est refusé

## 4. Authentification dans equipment-service

- [x] 4.1 Brancher `authenticate` sur `/api/equipments`, `/api/categories`, `/api/suppliers` en laissant `/api/public` et `/uploads` publics ; remplacer `x-user-id` (`equipment.controller.ts`) par `req.user.id` ; vérifier qu'un appel sans jeton renvoie 401 et que la fiche publique répond toujours sans jeton
- [x] 4.2 Faire envoyer `x-internal-token` par `equipment-service` vers `user-service` (`user-service.client.ts`) et transmettre l'`Authorization` de l'appelant vers `assignment-service` pour les routes qui l'exigent ; vérifier avec un test d'import qui affecte automatiquement des équipements

## 5. Journal d'audit

- [x] 5.1 Protéger `POST /audit-logs` par `internalOnly` ; vérifier que l'appel sans secret renvoie 403 et qu'aucune entrée n'est créée
- [x] 5.2 Faire envoyer `x-internal-token` par tous les clients d'audit (auth, user, assignment, equipment) ; vérifier qu'une connexion et une affectation créent bien leurs entrées d'audit

## 6. Erreurs, uploads, hygiène

- [x] 6.1 Rendre générique le message des erreurs 500 dans tous les `error-handler` (détail et pile seulement dans `console.error`) ; vérifier par test qu'une exception forcée ne renvoie ni message technique ni pile
- [x] 6.2 Ajouter le contrôle des octets magiques (JPEG, PNG, WebP) sur les uploads d'équipements et d'avatars, avec extension dérivée du type détecté et suppression du fichier rejeté ; vérifier avec un faux `.png` (texte) rejeté en 400 et un vrai JPEG accepté
- [x] 6.3 Supprimer les `console.log` de débogage des 7 projets et du frontend (conserver logs de démarrage et `console.error` serveur) ; vérifier avec `grep` et qu'aucun log n'imprime mot de passe, jeton ou corps d'auth
- [x] 6.4 Lancer `npm audit` sur le frontend, le gateway et les 6 services, appliquer `npm audit fix` sans montée de version majeure et consigner les vulnérabilités restantes ; vérifier que les builds et les tests passent encore — fait : 0 vulnérabilité gateway et frontend ; restent 4 « high » par service dans la chaîne CLI Prisma (`prisma` → `@prisma/config` → `deepmerge-ts`, `mysql2` inutilisé car PostgreSQL) corrigeables seulement par `npm audit fix --force` (rétrogradation majeure de Prisma), non appliqué ; `uuid` modéré côté equipment-service

## 7. Frontend et vérification d'ensemble

- [x] 7.1 Gérer le refus 403 dans l'écran de gestion des utilisateurs (masquer ou désactiver les actions réservées à l'administrateur, message clair) ; vérifier avec un compte `EMPLOYE` et un compte `ADMIN`
- [x] 7.2 Ajouter un test d'intégration des scénarios critiques (inscription ADMIN ignorée, changement de rôle par EMPLOYE refusé, appel direct sans jeton refusé, audit forgé refusé) ; vérifier qu'il échoue sur l'ancien code et passe sur le nouveau
- [x] 7.3 Étendre `.github/workflows/ci.yml` pour lancer les tests de `user-service`, `equipment-service` et `gateway` ; vérifier que le pipeline passe
- [ ] 7.4 Parcours manuel complet avec les deux rôles via le gateway (connexion, gestion d'équipements, import avec affectation, fiche QR publique, audit) ; vérifier qu'aucune fonctionnalité existante n'est cassée
