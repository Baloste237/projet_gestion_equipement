# Conception

## Contexte

Voir proposal.md (Pourquoi). État observé dans le code :

- `Credential` (auth-service) : `id`, `email` unique, `role`, `isActive`. Le jeton porte `{ id, role, permissions }` ; le rôle est relu dans le compte à chaque connexion et à chaque rafraîchissement (`authService.refresh`), donc un changement de rôle du compte atteint les jetons suivants sans autre mécanisme. `refreshTokenRepository.revokeAllForCredential` existe déjà.
- `User` (user-service) : `authUserId` obligatoire et unique, `email` unique, `role`, `isActive`, `status`. L'interface le remplit avec `crypto.randomUUID()` (`UserModal.tsx`). `userRepository.findByAuthUserId` existe mais n'est jamais appelé.
- Les deux services ont des bases séparées : aucune jointure possible, seuls des appels HTTP.
- Le gateway ne proxifie que les préfixes de `services.config.ts` ; `/auth` est public. Une route interne placée sous `/auth` serait atteignable de l'extérieur (protégée seulement par le secret) ; placée sous `/internal`, elle n'est routée nulle part.
- `INTERNAL_SERVICE_TOKEN` et `internalOnly` existent déjà (livrés par `durcissement-securite`).

## Objectifs / Hors périmètre

**Objectifs :**
- Une seule source de vérité pour le rôle et l'état actif : le compte.
- Qu'une action d'administration sur une fiche ait un effet réel sur l'accès.
- Aucune dérive silencieuse entre les deux services.

**Hors périmètre :**
- Création automatique du compte avec la fiche, invitation, réinitialisation de mot de passe.
- Fusion des deux services ou des deux bases.
- Révocation immédiate des jetons d'accès (15 minutes de validité).

## Décisions

### D1. Faire les deux : lien d'abord, synchronisation ensuite

La synchronisation seule est impossible (la clé de rapprochement n'existe pas) ; le lien seul laisserait deux rôles indépendants. On relie, puis on fait du compte la source de vérité.

*Alternative écartée* : n'utiliser que le rôle de la fiche et le mettre dans le jeton. Cela obligerait auth-service à lire user-service à chaque connexion (couplage inverse, panne en cascade du login).

### D2. Le lien se fait par e-mail, côté serveur

À la création d'une fiche, `user-service` demande à auth-service le compte portant l'e-mail et stocke `authUserId = Credential.id`. Le champ disparaît du schéma Zod de création (le client ne le fournit plus). L'e-mail est déjà unique dans les deux bases, c'est la clé naturelle.

`authUserId` devient **nullable** (migration Prisma) : une fiche peut exister avant que la personne s'inscrive. L'unicité reste (plusieurs `NULL` sont permis par PostgreSQL).

### D3. Liaison tardive à la demande

Pas de rappel de user-service à l'inscription. Quand un administrateur change le rôle ou l'état d'une fiche non reliée, `user-service` retente de la relier par e-mail avant d'appliquer la modification. Une fiche sans compte reste modifiable localement et la réponse porte un indicateur `linked: false` ; l'interface l'affiche.

*Alternative écartée* : auth-service notifie user-service à chaque inscription (appel supplémentaire, panne à gérer, aucun besoin tant que l'administrateur agit lui-même).

### D4. Routes internes d'auth-service sous `/internal/credentials`

Protégées par `internalOnly` et absentes de `services.config.ts` du gateway :

- `GET /internal/credentials/by-email/:email` → `{ id, email, role, isActive }` ou 404.
- `PATCH /internal/credentials/:id` avec `{ role?, isActive? }`.

La route de modification applique la garde « dernier administrateur » (D6) et, quand `isActive` passe à `false`, appelle `revokeAllForCredential`. L'e-mail est encodé dans l'URL ; il n'est jamais journalisé avec un secret.

### D5. Ordre des opérations et échec fermé

Pour un changement de rôle ou d'état d'une fiche reliée : appeler d'abord auth-service ; si la réponse n'est pas un succès, **ne pas toucher la fiche** et répondre 409 (garde administrateur) ou 502 (panne). Si l'appel réussit puis que l'écriture de la fiche échoue, le compte est déjà à jour : l'opération est rejouable sans dommage (idempotente), et l'erreur est journalisée.

La **suppression** d'une fiche reliée désactive le compte avant de supprimer la fiche ; si auth-service est indisponible, la suppression est refusée (502).

*Alternative écartée* : transaction distribuée ou file de rejeu. Disproportionné pour une action d'administration rare et rejouable à la main.

### D6. Dernier administrateur protégé dans auth-service

La garde vit là où est la vérité : avant d'appliquer une rétrogradation, une désactivation, ou une suppression, auth-service compte les comptes `ADMIN` actifs autres que celui visé ; s'il n'y en a pas, il répond 409 `LAST_ADMIN`. Une vérification sans verrou peut laisser passer deux rétrogradations simultanées : on fait le décompte et la mise à jour dans une transaction Prisma (niveau sérialisable) pour l'éviter.

### D7. `GET /users/me`

Route déclarée **avant** `/:id` dans le routeur : lit `req.user.id` du jeton, appelle `findByAuthUserId`. Sert la page Paramètres (qui échoue aujourd'hui car elle passe l'identifiant du compte à `GET /users/:id`) et rend vraie la règle « propriétaire ou admin » existante, qui compare déjà `authUserId` à l'identifiant du jeton.

### D8. Reprise des données

Script `npm run relink:profiles` dans user-service (idempotent) : pour chaque fiche, demander à auth-service le compte par e-mail ; s'il existe, écrire `authUserId = id`, `role` et `isActive` du compte dans la fiche ; sinon mettre `authUserId = NULL`. Mode `--dry-run` qui n'écrit rien et affiche ce qui changerait. Le rôle affiché dans la fiche s'aligne ainsi sur la vérité.

Migration en deux temps : (1) rendre `authUserId` nullable ; (2) exécuter le script. Aucune fiche n'est supprimée.

## Risques / Compromis

- **auth-service indisponible → l'administration des rôles est bloquée** (502) → choix assumé : mieux vaut refuser que diverger ; les lectures et le reste de l'application ne sont pas touchés.
- **Fiche sans compte, rôle affiché sans effet** → l'indicateur `linked: false` rend la situation visible ; le rôle est appliqué à la liaison tardive.
- **Rôle d'un jeton déjà émis inchangé 15 minutes** → documenté ; la désactivation révoque en revanche le rafraîchissement, donc l'accès prend fin au plus tard à l'expiration du jeton d'accès.
- **Deux fiches de même e-mail dans des casses différentes** → normaliser l'e-mail en minuscules à la comparaison côté liaison ; vérifier que l'inscription fait de même (à contrôler en tâche 2.1).
- **Perte d'administrateur par erreur** → garde D6 + `seed:admin` reste le recours de dernier niveau.
- **Fuite d'e-mails par la route interne** → protégée par secret, non routée par le gateway, réponse minimale (pas de hash).

## Plan de migration

1. Livrer auth-service (routes internes, garde, révocation) ; vérifier que le gateway ne les expose pas.
2. Livrer user-service avec la migration `authUserId` nullable ; l'ancien comportement continue (aucun appel tant que les fiches ne sont pas reliées).
3. Lancer `relink:profiles --dry-run`, relire, puis l'exécuter.
4. Livrer le frontend (plus d'`authUserId` aléatoire, `/users/me`, indicateur de liaison).
5. Retour arrière : la migration est réversible (remettre `NOT NULL` après avoir rempli les `NULL`) ; auth-service garde ses routes inutilisées sans effet.

## Questions ouvertes

- Faut-il pré-remplir le rôle à la création d'une fiche reliée depuis le compte (hypothèse retenue : oui, la fiche reprend le rôle du compte et ignore le rôle saisi à la création) ? Sans conséquence sur la structure si l'on choisit autrement.
