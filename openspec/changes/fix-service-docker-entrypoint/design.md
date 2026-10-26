# Design

## Contexte

Voir proposal.md pour la motivation. État observé :

- auth, user, equipment, audit et assignment ont `rootDir: "./"` dans `tsconfig.json`. `tsc` y reproduit l'arborescence du projet : le point d'entrée sort en `dist/src/server.js`, et `prisma.config.ts` (inclus pour assignment, equipment et user) en `dist/prisma.config.js`.
- inventory et le gateway ont `rootDir: "./src"` et sortent `dist/server.js`.
- Les Dockerfiles des services partagent le même schéma : build multi-étapes, `COPY --from=builder /app/dist ./dist`, `COPY --from=builder /app/prisma ./prisma`, puis `CMD ["node", "dist/server.js"]`.
- Les images construites ont été inspectées : `dist/` des cinq services ne contient que `src/` (et `prisma.config.js`), jamais `server.js`.
- Chaque service a sa base PostgreSQL, vide au premier lancement. `DATABASE_URL` vient du `.env.docker` du service. Les migrations existent pour auth (2), user (4), equipment (4), assignment (4) et inventory ; audit-service n'a aucun dossier `prisma/migrations/`.
- `prisma` et `dotenv` sont dans les `dependencies` des six services : l'image finale (`npm install --omit=dev`) les contient. `prisma.config.ts` n'est en revanche pas copié dans l'image finale, et la CLI Prisma 7 en a besoin pour lire `DATABASE_URL`.
- Le compose n'a pas de healthcheck PostgreSQL ; `depends_on` est simple et tous les services ont `restart: unless-stopped`.

## Objectifs / Non-objectifs

**Objectifs :**
- Les cinq conteneurs lancent leur point d'entrée compilé et ne s'arrêtent plus avec `MODULE_NOT_FOUND`.
- Au démarrage, chacun des six services applique les migrations de sa base avant de lancer le serveur.

**Non-objectifs :**
- Uniformiser la structure de `dist/` entre tous les services.
- Ajouter des healthchecks PostgreSQL ou changer `docker-compose.yml`.
- Toucher au code applicatif, aux `tsconfig.json` ou aux `package.json`.

## Décisions

**Corriger le `CMD` (`node dist/src/server.js`) plutôt que le `tsconfig.json`.**
Le `CMD` est la seule ligne fausse, et la corriger ne change ni le build ni les artefacts. L'alternative, passer ces services à `rootDir: "./src"` comme inventory, donne une sortie uniforme mais oblige à sortir `prisma.config.ts` du `include` pour trois services, et touche le build de services qui compilent correctement. Elle reste un bon candidat pour un changement d'uniformisation.

**Appliquer les migrations au démarrage du conteneur** : `CMD ["sh", "-c", "npx prisma migrate deploy && exec node <point d'entrée>"]`. Alternatives écartées : un service de migration dédié par base (5 à 6 conteneurs de plus dans le compose) et une commande manuelle documentée (étape oubliée après chaque reconstruction). `migrate deploy` est idempotent et ne génère jamais de migration, ce qui le rend sûr à chaque démarrage ; `exec` laisse Node en PID 1 pour recevoir les signaux d'arrêt.

**Copier `prisma.config.ts` dans l'image finale** (`COPY --from=builder /app/prisma.config.ts ./`) pour les six services. Sans lui, `migrate deploy` ne trouve pas `DATABASE_URL`. Ni `package.json` ni le lockfile ne changent, car `prisma` et `dotenv` sont déjà des dépendances de production.

**Créer une migration initiale pour audit-service** plutôt que `prisma db push` : même mécanisme et même historique que les autres services. Elle est générée hors ligne avec `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`, et doit créer la table `AuditLog`.

**Ne pas modifier `COPY dist`.** `dist/` est déjà copié en entier ; seul le chemin lancé est faux. Le gateway n'est pas concerné.

## Risques / Compromis

- [Chemins relatifs à l'exécution qui bougeraient avec `dist/src/`] → Vérifié : aucun usage de `__dirname`, `process.cwd()` ni `path.join/resolve` ; imports internes relatifs entre fichiers de `dist/src/`.
- [PostgreSQL pas encore prêt quand `migrate deploy` démarre] → Le conteneur s'arrête, puis `restart: unless-stopped` le relance jusqu'à ce que la base réponde. Pas de healthcheck ajouté, par choix de périmètre.
- [Base déjà peuplée sans historique de migrations (créée par `db push`)] → `migrate deploy` échoue (P3005). Ne concerne pas les bases Docker neuves ; sinon, baseliner avec `prisma migrate resolve --applied <migration>`.
- [Démarrage plus lent] → Négligeable : `migrate deploy` sans migration en attente est quasi immédiat.
- [Nouvelle erreur après démarrage (variables, droits)] → Distincte de ce correctif ; à traiter à part.
- [Image périmée] → Un `docker compose up` sans `--build` réutilise l'ancienne image ; la procédure impose `--build`.

## Plan de déploiement

1. Créer la migration initiale d'audit-service.
2. Modifier les six Dockerfiles (copie de `prisma.config.ts`, nouveau `CMD`).
3. Reconstruire et relancer : `docker compose up -d --build` depuis `infrastructure/`.
4. Vérifier que les six conteneurs restent `Up`, que les tables et `_prisma_migrations` existent dans les six bases, et que les logs montrent le démarrage du serveur.

Retour arrière : rétablir les Dockerfiles (revert du commit) et reconstruire. La migration initiale d'audit-service peut rester sans effet sur le reste.
