# Proposition

## Pourquoi

Le projet ne tourne aujourd'hui qu'en local via `docker-compose`. L'objectif est une démo accessible en permanence sur Internet, sans serveur ni budget. Vercel ne peut héberger que le frontend : les 6 microservices, RabbitMQ et les 6 bases PostgreSQL doivent aller sur des offres gratuites, avec une exposition réduite au strict nécessaire (le compose actuel publie les ports 4001 à 4006 et la console RabbitMQ).

## Ce qui change

- Frontend déployé sur **Vercel**, avec un `vercel.json` (réécriture SPA vers `index.html`, requise par les routes profondes comme la fiche publique du QR code) et `VITE_API_URL` pointant vers l'API publique.
- Backend regroupé dans **une seule image Docker** (gateway + 6 services lancés par un superviseur de processus) déployée sur un hébergeur gratuit de conteneurs. Seul le gateway écoute sur le port public ; les services communiquent en `localhost`. Un conteneur unique évite la cascade de réveils de 7 services gratuits.
- Bases PostgreSQL **managées gratuites** (une base ou un schéma par service), RabbitMQ **managé gratuit**, remplaçant les conteneurs `postgres-*` et `rabbitmq` du compose.
- Maintien en ligne : l'hébergeur gratuit s'endort après inactivité, donc un ping planifié (workflow GitHub Actions `cron`) sur `/health` garde le service éveillé.
- Migrations Prisma appliquées automatiquement au démarrage (`prisma migrate deploy`) pour chaque service.
- Fichiers uploadés (photos d'équipements, avatars) : le disque d'un conteneur gratuit est éphémère, ils passent donc sur un stockage objet gratuit.
- Sauvegarde automatique des bases : workflow GitHub Actions planifié exécutant `pg_dump` et conservant les archives chiffrées.
- Secrets exigés au démarrage : `JWT_SECRET` n'a plus de valeur de repli ; CORS limité à l'origine Vercel ; `trust proxy` activé pour que le rate limiting voie la vraie IP client.
- **BREAKING** : `JWT_SECRET` devient obligatoire dans le gateway (le service refuse de démarrer sans lui) ; CORS du gateway restreint à l'origine déclarée.

## Capacités

### Nouvelles capacités

- `production-deployment`: exigences de mise en ligne : accessibilité HTTPS permanente, exposition limitée au gateway, secrets obligatoires, persistance des données et des fichiers, sauvegardes.

### Capacités modifiées

<!-- Aucune : le comportement fonctionnel existant (équipements, affectations, tableau de bord, import/export) ne change pas. -->

## Impact

- **Code** : `gateway/src/config/env.ts` et `gateway/src/app.ts` (secret obligatoire, `trust proxy`), `services/equipment-service/src/config/upload.ts` et `services/user-service/src/Config/upload.ts` (stockage objet), Dockerfile de production à la racine, script de démarrage/superviseur, `frontend/vercel.json`.
- **CI/CD** : nouveaux workflows `.github/workflows` (ping de maintien en ligne, sauvegarde `pg_dump`).
- **Infrastructure** : comptes gratuits à créer (Vercel, hébergeur de conteneurs, PostgreSQL managé, RabbitMQ managé, stockage objet). Le `docker-compose.yml` reste utilisable pour le développement local.
- **Hors périmètre** : le durcissement applicatif identifié à l'exploration (garde de rôle côté serveur dans user-service et equipment-service, rôle imposé à `/auth/register`, protection de `POST /audit-logs`) fait l'objet d'un changement distinct. **Il doit être livré avant d'ouvrir la démo au public**, car ces failles deviendraient exploitables sur Internet.
- **Risque connu** : les offres gratuites changent régulièrement de quotas ; les limites exactes (RAM, heures, stockage) sont à vérifier au moment du choix de l'hébergeur.
