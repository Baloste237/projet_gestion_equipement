# Proposition

## Pourquoi

Lancer la pile avec `docker compose up -d` met en échec cinq services sur sept : auth, user, equipment, audit et assignment redémarrent en boucle avec `Cannot find module '/app/dist/server.js'`. Leur `tsconfig.json` déclare `rootDir: "./"`, donc `tsc` produit `dist/src/server.js`, alors que le `CMD` de leur Dockerfile lance `dist/server.js`. Inventory et le gateway, compilés avec `rootDir: "./src"`, ne sont pas touchés. Le décalage date de la création des Dockerfiles (19 août) et n'était pas visible tant que les services tournaient hors Docker avec `tsx`.

Une fois ce point corrigé, un second problème apparaît : les bases PostgreSQL des conteneurs sont vides (`user_service_db` et `audit_service_db` n'ont aucune table) et aucune étape ne leur applique les migrations Prisma. Les services démarreraient, mais leurs requêtes échoueraient. Cela concerne aussi inventory-service, qui démarre déjà mais dont la base est vide.

## Ce qui change

- Le `CMD` des Dockerfiles de auth, user, equipment, audit et assignment applique les migrations puis lance le serveur : `sh -c "npx prisma migrate deploy && exec node dist/src/server.js"`.
- Le `CMD` du Dockerfile d'inventory-service applique de même les migrations, puis lance `dist/server.js` (son point d'entrée compilé est déjà correct).
- `prisma.config.ts` est copié dans l'image finale des six services : la CLI Prisma 7 y lit `DATABASE_URL`. La CLI `prisma` et `dotenv` sont déjà dans les `dependencies` des six services, donc présents dans l'image finale.
- audit-service n'a aucun dossier `prisma/migrations/` : une migration initiale est créée à partir de son schéma (table `AuditLog`) pour que `migrate deploy` fonctionne comme pour les autres services.
- Aucun changement de `tsconfig.json`, de code applicatif, de `package.json` ni de `docker-compose.yml`.
- Les images doivent être reconstruites (`docker compose up -d --build`) pour que la correction prenne effet.

## Capacités

### Nouvelles capacités

Aucune. Correctif d'outillage sans effet sur le comportement fonctionnel : le changement déclare `skip_specs: true`.

### Capacités modifiées

Aucune.

## Impact

- **Code** : les `Dockerfile` de auth-service, user-service, equipment-service, audit-service, assignment-service et inventory-service ; nouveau dossier `services/audit-service/prisma/migrations/`.
- **Non touchés** : `gateway`, `frontend`, `infrastructure/docker-compose.yml`.
- **Risque** : faible pour le chemin d'entrée (aucun usage de `__dirname`, `process.cwd()` ni `path.join/resolve`, client Prisma chargé par nom de module). Les migrations ajoutent une dépendance au démarrage : voir design.md.
- **Recoupement** : le changement `deploy-free-always-on` prévoit aussi `prisma migrate deploy` au démarrage et un Dockerfile de production à la racine. Il ne concerne pas ces Dockerfiles de développement.
