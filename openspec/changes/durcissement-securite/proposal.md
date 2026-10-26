# Proposition

## Pourquoi

L'audit de sécurité fait avant la mise en ligne (voir le changement `deploy-free-always-on`) a trouvé des failles exploitables par n'importe quel visiteur une fois l'application publique :

- `POST /auth/register` est public et accepte un champ `role` : on peut se créer un compte **ADMIN** sans être connecté.
- `user-service` (10 routes) et `equipment-service` (~20 routes) ne vérifient ni jeton ni rôle : ils font confiance au gateway. Un utilisateur connecté, quel que soit son rôle, peut changer le rôle de n'importe qui (`PATCH /users/:id/role`), supprimer des utilisateurs ou des équipements ; un appel direct à un service, sans passer par le gateway, ne demande aucune authentification.
- `POST /audit-logs` est ouvert : on peut forger le journal d'audit.
- Quatre services ont un secret JWT de repli codé en dur : un jeton ADMIN peut être forgé si la variable manque.
- Les réponses d'erreur 500 renvoient le message interne, le login distingue un compte désactivé d'un identifiant inconnu, et les uploads ne vérifient que le type MIME déclaré par le client.

Ce changement doit être livré **avant** d'ouvrir la démo au public.

## Ce qui change

- `/auth/register` ignore le `role` fourni et crée toujours un compte `EMPLOYE` ; l'attribution d'un rôle plus élevé passe uniquement par un administrateur authentifié.
- `user-service` et `equipment-service` **vérifient eux-mêmes le jeton JWT** (défense en profondeur, ne plus se reposer sur le seul gateway) et appliquent une autorisation côté serveur.
- Les opérations sensibles de `user-service` (créer un utilisateur, changer un rôle, désactiver/réactiver, supprimer) sont réservées au rôle `ADMIN`.
- `POST /audit-logs` est réservé aux appels de service à service (secret partagé `x-internal-token`, mécanisme déjà présent dans assignment-service) ; les clients d'audit (auth, user, assignment, equipment) envoient ce secret.
- Plus de secret JWT de repli dans aucun service : le service refuse de démarrer sans lui.
- Les erreurs 500 renvoient un message générique ; le détail reste dans les journaux serveur.
- Le login renvoie la même réponse pour un identifiant inconnu, un mauvais mot de passe et un compte désactivé (pas de fuite sur l'existence du compte).
- Les uploads d'images vérifient le contenu réel du fichier (signature binaire), pas seulement l'en-tête MIME.
- Nettoyage des `console.log` de débogage et mise à jour des dépendances vulnérables (`npm audit`).
- **BREAKING** : l'inscription ne permet plus de choisir son rôle ; les appels aux services `user` et `equipment` sans jeton valide sont refusés ; un utilisateur non `ADMIN` ne peut plus gérer les comptes ; les services exigent `JWT_SECRET` et `INTERNAL_SERVICE_TOKEN` au démarrage.

## Capacités

### Nouvelles capacités

- `access-control`: authentification vérifiée par chaque service, autorisation par rôle côté serveur, inscription sans élévation de privilèges, journal d'audit réservé aux services, erreurs et connexion sans fuite d'information, validation du contenu des fichiers téléversés.

### Capacités modifiées

<!-- Aucune capacité existante (équipements, affectations, tableau de bord, import/export) ne change de comportement fonctionnel pour un utilisateur autorisé. -->

## Impact

- **Code** : `services/auth-service` (register, login, erreurs), `services/user-service` et `services/equipment-service` (nouveau middleware d'authentification et de rôle, routes), `services/audit-service` (route `POST /`), clients d'audit des services, `authenticate` d'audit/assignment/inventory (retrait des secrets de repli), gestionnaires d'erreurs, configuration d'upload (équipements et avatars), nettoyage de logs.
- **Frontend** : la page d'inscription n'envoie plus de rôle ; l'écran de gestion des utilisateurs doit gérer le refus 403 pour un non-administrateur.
- **Configuration** : nouvelles variables obligatoires (`JWT_SECRET` partout, `INTERNAL_SERVICE_TOKEN` partout) à ajouter aux `.env.example` et au compose.
- **Données** : aucun changement de schéma. Le premier administrateur ne peut plus être créé via l'inscription : un moyen contrôlé de l'amorcer est nécessaire (voir design).
- **Hors périmètre** : la séparation fine des droits fonctionnels par rôle. Aujourd'hui, `permissions.config.ts` donne volontairement toutes les permissions à tous les rôles (état temporaire annoncé dans le fichier) ; ce changement n'y touche pas, hormis les opérations sensibles listées ci-dessus. Confirmation d'e-mail, webhooks et RLS ne sont pas concernés (aucun webhook, pas de Supabase).
