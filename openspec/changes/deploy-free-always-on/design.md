# Conception

## Contexte

Voir proposal.md (Pourquoi). État actuel observé :

- 6 microservices Express/Prisma + gateway ; chacun lit `PORT` et les URL des autres services dans son environnement, avec des valeurs de repli en `localhost` (`gateway/src/config/env.ts`).
- Le compose publie les ports 4001 à 4006 et RabbitMQ (5672 et console 15672) avec des identifiants par défaut (`postgres/postgres`, `admin/admin`).
- Un service gratuit de conteneur offre peu de RAM (de l'ordre de 512 Mo) et s'endort après inactivité ; son disque est éphémère.
- Les migrations Prisma existent pour 5 services ; `audit-service` n'a pas de dossier `migrations` (à confirmer).
- Le frontend est servi par nginx (réécriture SPA) et lit `VITE_API_URL` au build.

## Objectifs / Hors périmètre

**Objectifs :**
- Démo en ligne en permanence, HTTPS, coût nul.
- Réduire la surface exposée à un seul point d'entrée (le gateway).
- Reproductibilité : tout est décrit dans le dépôt (Dockerfile, workflows, `vercel.json`).

**Hors périmètre :**
- Le durcissement applicatif (rôles côté serveur, `/auth/register`, `POST /audit-logs`), traité dans un autre changement et **bloquant pour l'ouverture publique**.
- Haute disponibilité, montée en charge, domaine personnalisé payant.
- Ansible : aucun serveur à provisionner.

## Décisions

### D1. Un seul conteneur backend (gateway + 6 services)

Le conteneur lance 7 processus Node via un superviseur (pm2 ou équivalent léger). Le gateway écoute sur le port fourni par l'hébergeur ; chaque service reçoit son propre `PORT` (4001 à 4006), valeur définie **par processus** car tous lisent la même variable. Les URL inter-services restent en `http://localhost:400x`.

- *Pourquoi* : une seule instance gratuite 24/7, un seul réveil, aucun service interne exposé (réponse directe à la faille « contournement du gateway »).
- *Alternatives* : 7 services gratuits séparés (réveils en cascade, quotas multipliés, 7 jeux de secrets) ; réécriture en monolithe (hors périmètre, coûteux).
- *Contrepartie* : pas de mise à l'échelle indépendante, redémarrage groupé, RAM partagée (voir Risques).

### D2. Hébergeur du backend : Render (offre gratuite) 

Service web Docker, HTTPS fourni, déploiement depuis GitHub. Le quota d'heures mensuel d'une seule instance couvre un mois complet. *Alternatives* : Koyeb, Fly.io (la carte bancaire peut être exigée à l'inscription). Choix à reconfirmer à l'exécution selon les conditions du moment.

### D3. Bases : PostgreSQL managé gratuit (Neon), une base par service

Un projet, six bases (`auth`, `user`, `equipment`, `assignment`, `inventory`, `audit`) pour conserver l'isolation des données du compose actuel. Connexion avec l'URL poolée, `sslmode=require`. *Alternative* : Supabase (utile surtout si on veut son stockage ; la RLS n'apporte rien car l'accès passe par Prisma).

### D4. RabbitMQ : CloudAMQP (plan gratuit)

Remplace le conteneur `rabbitmq`. L'URL `amqps://` est injectée dans `RABBITMQ_URL`. Les services publient/consomment déjà via cette variable (`config/rabbitmq.ts`).

### D5. Maintien en éveil : GitHub Actions `cron`

Un workflow appelle `GET /health` du gateway toutes les 10 minutes (la mise en veille survient après 15 minutes d'inactivité). Un échec fait échouer l'exécution, donc une notification GitHub. *Alternative* : service tiers de supervision d'URL (même effet, dépendance externe supplémentaire). Le cron GitHub peut dériver de quelques minutes ; la marge de 10 contre 15 minutes le tolère.

### D6. Fichiers uploadés sur stockage objet gratuit

Le stockage des deux services d'upload passe de `diskStorage` à un stockage objet (Cloudflare R2 ou Supabase Storage). Les URL publiques des images sont stockées/servies à la place des chemins `/uploads/...`. Le choix du fournisseur est tranché en tâche 5.1. *Alternative écartée* : disque persistant (payant chez les hébergeurs retenus).

### D7. Démarrage : migrations puis services

Le script d'entrée exécute `prisma migrate deploy` pour chaque service avant de lancer le superviseur ; un échec arrête le conteneur. `audit-service` sans dossier de migrations : générer une migration initiale avant le premier déploiement.

### D8. Frontend sur Vercel

Projet Vercel pointant sur `frontend/`, commande `npm run build`, sortie `dist`, `vercel.json` avec réécriture `/(.*)` vers `/index.html`. Variables : `VITE_API_URL` (URL du gateway) et `VITE_PUBLIC_APP_URL` (adresse encodée dans les QR codes, à fixer à l'URL Vercel définitive).

### D9. Sauvegardes : `pg_dump` planifié depuis GitHub Actions

Workflow hebdomadaire (cron) : `pg_dump` des six bases, compression, puis dépôt dans un stockage distinct de Neon (artefact GitHub avec rétention, ou le bucket du D6). Le chiffrement et les identifiants passent par les secrets du dépôt. Restauration testée une fois (tâche dédiée).

### D10. Durcissement minimal de configuration

- `JWT_SECRET` obligatoire dans le gateway (suppression du repli) et dans chaque service qui vérifie des jetons.
- CORS du gateway limité à `CORS_ORIGIN` = origine Vercel ; `app.set("trust proxy", 1)` pour le limiteur de débit derrière le proxy de l'hébergeur.
- Aucun port public hors gateway ; plus d'identifiants par défaut en production.

## Risques / Compromis

- **RAM insuffisante pour 7 processus Node** → mesurer au premier déploiement ; limiter `--max-old-space-size` par processus ; repli : fusionner des services ou passer sur un autre hébergeur.
- **Réveil à froid / ping qui dérive** → marge 10 min contre 15 min ; documenter qu'un premier appel peut être lent après un incident.
- **Quotas et conditions des offres gratuites changeants** → vérifier avant de s'engager, garder les variables d'environnement portables (aucun code lié à un fournisseur hors stockage objet).
- **Démo publique avant durcissement applicatif** → ne pas communiquer l'adresse tant que le changement de durcissement n'est pas livré.
- **Perte de données si Neon ou le quota expire** → sauvegardes hebdomadaires hors fournisseur (D9).
- **Un seul point de défaillance** (une instance) → accepté pour une démo.

## Plan de migration

1. Créer les comptes et les ressources gratuites (bases, RabbitMQ, stockage).
2. Construire et tester l'image de production en local avec les variables de production.
3. Déployer le backend, vérifier `/health`, puis déployer le frontend.
4. Activer les workflows de ping et de sauvegarde.
5. Retour arrière : redéployer la version précédente depuis l'hébergeur ; les migrations ne sont pas détruites automatiquement (revue manuelle pour toute migration destructive).
