# Conception

## Contexte

Voir proposal.md (Pourquoi). État observé dans le code :

- Le gateway vérifie le JWT et ajoute `x-user-id` / `x-user-role`, puis proxifie vers les services en conservant l'en-tête `Authorization`. `user-service` et `equipment-service` n'ont aucun middleware d'authentification ; `assignment`, `audit` et `inventory` ont chacun une copie de `authenticate` avec un secret de repli codé en dur et `checkPermission` / `requireRole`.
- `assignment-service` possède déjà `internalOnly` (secret partagé `INTERNAL_SERVICE_TOKEN`, comparaison en temps constant, refuse si non configuré). `equipment-service` reçoit déjà ce secret via le compose.
- `permissions.config.ts` donne **toutes** les permissions à **tous** les rôles (état temporaire assumé). Les permissions ne peuvent donc pas servir de barrière pour les opérations sensibles ; seul le rôle `ADMIN` du jeton le peut.
- Des appels de service à service existent sans jeton : `equipment-service` lit `GET /users` du `user-service` et appelle `assignment-service` ; les clients d'audit (auth, user, assignment) font `POST /audit-logs` sans en-tête d'authentification.
- Routes à garder publiques : `/api/public/*` (fiche QR), `/uploads/*` (images), `/health`, `/auth/login|refresh|logout|register`.

## Objectifs / Hors périmètre

**Objectifs :**
- Fermer les failles d'élévation de privilèges, d'accès sans jeton et de journal forgeable.
- Une seule implémentation partagée des garde-fous, pour éviter la 4e et 5e copie divergente.
- Aucun changement de comportement pour un administrateur ni pour les opérations non sensibles.

**Hors périmètre :**
- Réintroduire une matrice de droits par rôle (changement dédié annoncé dans `permissions.config.ts`).
- Confirmation d'e-mail, MFA, rotation des secrets, WAF.
- Stockage des jetons côté client (`localStorage`) : compromis conservé, noté en risque.

## Décisions

### D1. Chaque service vérifie le JWT lui-même

`user-service` et `equipment-service` reçoivent un middleware `authenticate` (même logique que celui d'assignment : `Bearer`, `jwt.verify` avec `JWT_SECRET` obligatoire, `req.user = { id, role, permissions }`). L'identité retenue vient **uniquement du jeton**, jamais des en-têtes `x-user-*` (qui sont usurpables sur un appel direct). Le code existant qui lit `x-user-id` (`equipment.controller.ts:39`, `position.controller.ts:7`) est remplacé par `req.user.id`.

*Alternatives* : faire confiance au gateway et fermer les ports (insuffisant : en local et en cas de mauvaise configuration, les ports restent joignables) ; mTLS (disproportionné).

### D2. Garde de rôle `requireRole("ADMIN")` pour les opérations de gestion des comptes

Appliquée à `POST /users`, `PATCH /users/:id/role`, `PATCH /users/:id/deactivate|reactivate`, `DELETE /users/:id`. `PATCH /users/:id` et `POST /users/:id/avatar` autorisés si `req.user.id === :id` ou rôle `ADMIN` (garde « propriétaire ou admin »). Lecture (`GET`) ouverte aux authentifiés. Les routes départements/postes : lecture ouverte, écriture réservée à `ADMIN` (hypothèse, voir questions).

Les équipements, catégories et fournisseurs gardent leur comportement actuel (tout utilisateur authentifié) tant que la matrice de droits n'est pas réintroduite ; ils gagnent seulement l'authentification (D1).

*Pourquoi `requireRole` et non `checkPermission`* : toutes les permissions sont données à tous (voir Contexte), `checkPermission` ne protégerait rien.

### D3. Module de garde-fous partagé

Un petit module commun (authenticate, requireRole, requireOwnerOrAdmin, internalOnly, chargement strict des secrets) copié dans chaque service plutôt qu'un paquet npm partagé : les services ont des `package.json` et des builds Docker indépendants, un paquet partagé imposerait un workflow de publication ou de workspaces. Les copies existantes (assignment, audit, inventory) sont alignées sur cette version unique et perdent leurs secrets de repli. *Alternative* : monorepo npm workspaces (refonte de build, hors périmètre).

### D4. Appels de service à service : secret interne

Les routes appelées par d'autres services (`GET /users`, `GET /users/:id` côté user-service ; `POST /audit-logs`) acceptent soit un jeton utilisateur valide, soit `x-internal-token` valide. Les clients d'audit (auth, user, assignment, equipment) et `equipment-service → user-service` envoient `x-internal-token`. Variable `INTERNAL_SERVICE_TOKEN` obligatoire au démarrage des services concernés, ajoutée aux `.env.example` et au compose. `POST /audit-logs` n'accepte **que** le secret interne.

### D5. Inscription : rôle imposé côté serveur

`authService.register` ignore `data.role` et force `EMPLOYE` ; le champ est retiré du schéma Zod public (ou ignoré silencieusement). Le premier administrateur est créé par un **script d'amorçage** (`npm run seed:admin` dans auth-service, lisant e-mail et mot de passe depuis l'environnement) qui n'est pas exposé par HTTP et est idempotent. L'attribution d'un rôle ensuite passe par `PATCH /users/:id/role` (ADMIN).

*Alternative* : première inscription = admin (race condition et risque d'usurpation sur un déploiement public).

### D6. Login uniforme

L'ordre devient : utilisateur inexistant → comparaison factice bcrypt (pour égaliser le temps de réponse) → `INVALID_CREDENTIALS` ; sinon comparaison du mot de passe ; mot de passe faux **ou** compte désactivé → même erreur `INVALID_CREDENTIALS` (401). Les événements d'audit conservent la cause réelle (compte désactivé, mot de passe incorrect) ; `refresh` d'un compte désactivé reste refusé.

### D7. Erreurs 500 génériques

Dans chaque `error-handler`, le cas non géré renvoie `Une erreur interne est survenue` ; `err.stack` et `err.message` vont seulement dans `console.error`. Les erreurs avec `statusCode < 500` gardent leur message.

### D8. Validation du contenu des images

Après `multer`, un contrôle des octets magiques (JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WebP `RIFF....WEBP`) sur le fichier reçu. Le nom enregistré utilise une extension dérivée du type détecté, pas de `file.originalname`. Un fichier invalide est supprimé et la réponse est 400. Fonction utilitaire partagée entre equipment et user. Si `deploy-free-always-on` passe les uploads en stockage objet (mémoire), le même contrôle s'applique au buffer ; la fonction travaille donc sur un `Buffer`.

*Alternative* : bibliothèque `file-type` (plus complète, dépendance ESM à vérifier avec le build CommonJS).

### D9. Hygiène : logs et dépendances

Suppression des `console.log` de débogage (garder `console.error` pour les erreurs serveur et un log de démarrage par service) ; vérification qu'aucun log n'imprime mot de passe, jeton ou corps de requête d'auth. `npm audit` sur le frontend, le gateway et les 6 services : corriger par `npm audit fix` sans changement majeur, consigner le reste.

## Risques / Compromis

- **Régression sur les appels de service à service** (un appel oublié sans secret serait refusé) → recenser tous les clients HTTP (`clients/*.ts`) et couvrir par des tests ; un test d'intégration équipement → utilisateurs.
- **Le frontend appelait des routes d'admin pour tous** (la gestion des utilisateurs était ouverte) → vérifier l'écran de gestion et masquer les actions non permises ; le 403 doit s'afficher proprement.
- **Jetons en `localStorage`** (exposés à une faille XSS) → conservé ; l'en-tête `helmet` et l'absence de HTML non échappé limitent le risque. Une migration vers des cookies HttpOnly est un autre changement.
- **Démarrage refusé si un secret manque** (un environnement local peut casser) → `.env.example` à jour et message d'erreur qui nomme la variable.
- **Jetons déjà émis** → inchangés ; seul le secret de repli supprimé ne change rien tant que `JWT_SECRET` réel est le même partout. Documenter qu'un changement du secret déconnecte tous les utilisateurs.

## Plan de migration

1. Livrer le module de garde-fous et les secrets obligatoires, avec `.env` mis à jour partout (compose compris).
2. Déployer `auth-service` (register + login) et amorcer l'administrateur avant de durcir `user-service`, afin de ne pas se retrouver sans administrateur.
3. Déployer `user-service`, `equipment-service` et `audit-service` ensemble avec les clients d'audit mis à jour.
4. Retour arrière : redéployer les images précédentes ; aucune donnée n'est modifiée.

## Questions ouvertes

- Les écritures sur départements et postes sont-elles réservées à `ADMIN` ? Hypothèse retenue : oui ; sans impact sur le reste du plan si l'on choisit autrement.
