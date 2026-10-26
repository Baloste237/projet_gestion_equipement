# Tasks

## 1. Migration initiale d'audit-service

- [x] 1.1 Créer `services/audit-service/prisma/migrations/<horodatage>_init/migration.sql` avec `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`, ajouter `migration_lock.toml` (provider `postgresql`), et vérifier que le SQL crée la table `AuditLog` avec ses colonnes

## 2. Dockerfiles : point d'entrée et migrations

- [x] 2.1 Dans les Dockerfiles de auth-service, user-service, equipment-service, audit-service et assignment-service, ajouter `COPY --from=builder /app/prisma.config.ts ./` et remplacer le `CMD` par `["sh", "-c", "npx prisma migrate deploy && exec node dist/src/server.js"]`, puis vérifier avec `git grep -n "CMD\|prisma.config" services/*/Dockerfile`
- [x] 2.2 Dans le Dockerfile d'inventory-service, ajouter la même copie de `prisma.config.ts` et un `CMD` `["sh", "-c", "npx prisma migrate deploy && exec node dist/server.js"]`, et vérifier avec `git grep -n "CMD" services/inventory-service/Dockerfile`
- [x] 2.3 Vérifier que `gateway/Dockerfile` est inchangé avec `git diff --stat -- gateway`

## 3. Vérification dans Docker

- [ ] 3.1 Reconstruire et relancer depuis `infrastructure/` avec `docker compose up -d --build`, puis vérifier que la commande se termine sans erreur de build
- [ ] 3.2 Vérifier avec `docker ps` que les six services (auth, user, equipment, audit, assignment, inventory) sont `Up` et ne sont plus `Restarting`, y compris après une minute
- [ ] 3.3 Vérifier avec `docker exec postgres-<service> psql -U postgres -d <base> -c '\dt'` que les tables métier et `_prisma_migrations` existent dans les six bases
- [ ] 3.4 Vérifier avec `docker logs <service>` pour chacun des six services qu'aucune erreur `MODULE_NOT_FOUND` ni échec de migration n'apparaît et que le message de démarrage du serveur est présent ; noter toute autre erreur comme sujet distinct
