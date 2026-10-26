# Tasks

## 1. Correctif — Ajout de l'intercepteur `x-internal-token`

- [x] 1.1 Dans `services/assignment-service/src/clients/user-service.client.ts`, ajouter un `userServiceApi.interceptors.request.use` qui injecte `process.env.INTERNAL_SERVICE_TOKEN ?? ""` dans `config.headers["x-internal-token"]` avant chaque requête — même pattern que dans `equipment-service.client.ts`. Vérifier que le fichier compile sans erreur TypeScript (`npx tsc --noEmit` dans `services/assignment-service`).

## 2. Vérification manuelle

- [x] 2.1 Démarrer tous les services (Gateway + 6 microservices) et créer une affectation depuis le frontend : la requête `POST /assignments` doit aboutir avec `201` (plus de `503`). Vérifier aussi les affectations groupées (`POST /assignments/bulk`).

- [x] 2.2 Vérifier que le retour d'affectation (`PATCH /assignments/:id/return`) et le transfert (`PATCH /assignments/:id/transfer`) fonctionnent toujours — ces opérations lisent aussi le bénéficiaire via `userServiceClient`.

## 3. Tests unitaires

- [x] 3.1 Dans `services/assignment-service/tests/user-client-token.unit.test.ts`, vérifier qu'un appel à `getUserById` (ou `getDepartmentById`, `getPositionById`) envoie bien l'en-tête `x-internal-token` : intercepter la requête sortante avec le fake user-service et asserter la présence du header. Le test passe avec `npm test` dans `services/assignment-service`.

## Workflow follow-up

- Archiver le changement une fois la PR fusionnée et les vérifications de la section 2 confirmées en environnement réel.
