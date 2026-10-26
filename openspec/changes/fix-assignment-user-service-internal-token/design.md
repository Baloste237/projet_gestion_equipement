# Design

## Context

Voir `proposal.md - Why` pour la motivation.

Dans `assignment-service`, deux clients HTTP axios existent pour appeler des microservices tiers :

| Client | Fichier | Intercepteur `x-internal-token` |
|---|---|---|
| `equipmentServiceClient` | `clients/equipment-service.client.ts` | ✅ présent |
| `userServiceClient` | `clients/user-service.client.ts` | ❌ **manquant** |

`user-service` protège toutes ses routes avec le middleware `authenticateOrInternal` : il accepte soit un JWT Bearer valide, soit l'en-tête `x-internal-token` égal à `INTERNAL_SERVICE_TOKEN`. Sans l'un ou l'autre, il répond `401`.

Quand `userServiceClient.fetchResource()` reçoit un `401`, la branche `catch` ne trouve pas `err.response.status === 404`, donc elle appelle `throwError("USER_SERVICE_UNAVAILABLE")` — ce qui lève une `AppError` avec `statusCode: 503`.

## Goals / Non-Goals

**Goals:**
- Faire en sorte que `assignment-service` envoie `x-internal-token` sur chaque appel à `user-service`, identiquement à ce que fait `equipment-service.client.ts`.
- Résoudre l'erreur `503 Service Unavailable` lors des créations d'affectations (unitaires et groupées).

**Non-Goals:**
- Ne pas toucher à la logique d'authentification de `user-service`.
- Ne pas modifier les routes, les validateurs, ni les autres clients HTTP.
- Ne pas refactoriser l'architecture commune des clients (pourrait être un changement distinct).

## Decisions

### D1 — Intercepteur Axios, même pattern que `equipment-service.client.ts`

**Choix** : Ajouter un `interceptors.request.use` sur l'instance `userServiceApi` pour injecter `x-internal-token` à chaque requête.

**Rationale** : C'est exactement le pattern déjà utilisé dans [`equipment-service.client.ts`](../../../services/assignment-service/src/clients/equipment-service.client.ts) du même service. Copier ce pattern garantit la cohérence, facilite la revue de code et ne nécessite aucune abstraction supplémentaire.

**Alternative écartée** : Passer le header manuellement dans chaque appel (`getUserById`, `getDepartmentById`, `getPositionById`) — plus verbeux, facile à oublier sur un futur appel.

### D2 — Lire `INTERNAL_SERVICE_TOKEN` depuis `process.env` à l'envoi, pas au démarrage

**Choix** : `process.env.INTERNAL_SERVICE_TOKEN ?? ""` dans l'intercepteur (lecture dynamique).

**Rationale** : Cohérent avec `equipment-service.client.ts` ; permet les tests unitaires qui surchargent la variable d'environnement sans rechargement de module.

## Risks / Trade-offs

- **[Risque] `INTERNAL_SERVICE_TOKEN` vide ou absent** → L'intercepteur enverra un header vide, `user-service` refusera avec `401`, et le `catch` relancera `USER_SERVICE_UNAVAILABLE (503)` — comportement inchangé par rapport à l'état actuel. Ce n'est pas un risque introduit par ce fix. La variable est déjà vérifiée au démarrage de `user-service` via `assertSecurityConfig()`.
- **[Trade-off] Pas d'abstraction partagée** → Les deux clients dupliquent légèrement ce pattern. Acceptable pour l'instant ; un refactor transverse resterait un changement distinct.
