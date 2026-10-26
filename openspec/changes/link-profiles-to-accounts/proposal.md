# Proposition

## Pourquoi

Après le changement `durcissement-securite`, seul un compte dont l'identifiant d'authentification porte le rôle `ADMIN` peut gérer les utilisateurs. Or les rôles et l'état actif vivent à deux endroits **sans lien** :

- Le rôle du jeton vient de la table des identifiants d'`auth-service` (`Credential.role`). Seul `seed:admin` peut y créer un `ADMIN`.
- L'écran « Utilisateurs » modifie la fiche de `user-service` (`User.role`, `isActive`), qui ne touche jamais l'identifiant de connexion. Ces fiches sont créées avec un `authUserId` généré au hasard par le navigateur, qui ne correspond à aucun compte.

Conséquences observées : attribuer « ADMIN » dans l'interface ne donne aucun droit réel ; désactiver une fiche n'empêche pas la personne de se connecter ni de rafraîchir son jeton ; la page Paramètres cherche la fiche avec l'identifiant du compte et échoue silencieusement ; la règle « un utilisateur modifie son propre profil » ne peut jamais être vraie.

## Ce qui change

Les deux options envisagées (synchroniser le rôle, ou relier les fiches aux comptes) ne s'excluent pas : la synchronisation exige un lien fiable, et le lien seul laisserait deux rôles dériver. Le changement fait donc les deux, dans cet ordre.

- **Lier** chaque fiche à son compte : `authUserId` devient l'identifiant réel du compte, retrouvé par l'e-mail, ou vide tant que la personne n'a pas de compte.
- **Source de vérité unique** : le rôle et l'état actif du compte sont dans `auth-service`. `user-service` les commande via une route interne, puis conserve une copie dans la fiche pour l'affichage.
- Une **désactivation** ou une **suppression** de fiche désactive le compte lié et révoque ses jetons de rafraîchissement ; une réactivation le réactive.
- Garde **dernier administrateur** : impossible de rétrograder, désactiver ou supprimer le dernier `ADMIN` actif.
- `GET /users/me` renvoie la fiche de l'utilisateur connecté ; la page Paramètres l'utilise (corrige son échec actuel).
- Script de **reprise des données** : relie les fiches existantes à leur compte par e-mail et vide les `authUserId` aléatoires sans correspondance.
- **BREAKING** : `POST /users` n'accepte plus de `authUserId` fourni par le client ; `authUserId` devient optionnel en base ; changer un rôle ou l'état d'une fiche reliée échoue (502) si `auth-service` est injoignable, plutôt que de diverger en silence.

## Capacités

### Nouvelles capacités

- `account-identity`: lien entre fiche utilisateur et compte de connexion, source de vérité du rôle et de l'état actif, protection du dernier administrateur.

### Capacités modifiées

<!-- Aucune capacité existante n'est modifiée. -->

## Impact

- **auth-service** : nouvelles routes internes (hors préfixe `/auth`, donc non exposées par le gateway), protégées par le secret interne : lecture d'un compte par e-mail ou identifiant, changement de rôle, changement d'état actif.
- **user-service** : migration Prisma (`authUserId` nullable), client HTTP vers auth-service, logique de liaison dans la création, le rôle, la désactivation/réactivation et la suppression, route `GET /users/me`, script de reprise.
- **Frontend** : le formulaire de création n'envoie plus d'`authUserId` aléatoire ; message clair si la synchronisation échoue ; la page Paramètres lit `/users/me`.
- **Données** : migration et reprise sur les fiches existantes (voir design).
- **Hors périmètre** : création automatique d'un compte à la création d'une fiche, invitation par e-mail, réinitialisation de mot de passe, révocation immédiate des jetons d'accès déjà émis (ils expirent en 15 minutes).
