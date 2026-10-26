# Tâches

## 1. Comptes et ressources gratuites

- [ ] 1.1 Créer les six bases PostgreSQL managées et noter leurs URL en `sslmode=require` ; vérifier la connexion avec `psql` ou `npx prisma db pull` sur chacune
- [ ] 1.2 Créer l'instance RabbitMQ managée gratuite ; vérifier la connexion `amqps://` avec un script de test local
- [ ] 1.3 Créer le compte hébergeur du backend et confirmer que l'offre gratuite ne demande pas de carte et couvre un service 24/7 ; consigner les limites réelles (RAM, heures) dans le README
- [ ] 1.4 Générer un `JWT_SECRET` aléatoire fort (≥ 32 octets) et préparer la liste des variables d'environnement de production ; vérifier qu'aucune valeur n'est commitée (`git status`, `.gitignore`)

## 2. Configuration sécurisée du gateway

- [ ] 2.1 Supprimer le repli de `JWT_SECRET` dans `gateway/src/config/env.ts` : arrêt du processus avec message explicite si absent ; vérifier par un test unitaire de démarrage sans secret
- [ ] 2.2 Activer `trust proxy` dans `gateway/src/app.ts` et restreindre le CORS à `CORS_ORIGIN` ; vérifier avec un test d'en-tête `Origin` autorisé puis non autorisé
- [ ] 2.3 Vérifier que le limiteur de débit du login distingue deux IP via `X-Forwarded-For` (test avec supertest ou curl local)
- [ ] 2.4 Retirer les valeurs de repli sensibles équivalentes dans les services qui vérifient des jetons (audit-service, assignment-service, inventory-service) ; vérifier que chacun refuse de démarrer sans secret

## 3. Image backend unique

- [ ] 3.1 Écrire le Dockerfile de production à la racine (build des 7 projets, génération Prisma, image finale allégée) et vérifier que `docker build` réussit
- [ ] 3.2 Ajouter le superviseur de processus avec `PORT` propre à chaque service (4001 à 4006) et le gateway sur `$PORT` ; vérifier en local que les 7 processus démarrent et que `GET /health` répond
- [ ] 3.3 Écrire le script d'entrée qui lance `prisma migrate deploy` par service avant le superviseur et s'arrête en cas d'échec ; vérifier sur une base vide puis sur une base à jour
- [ ] 3.4 Générer la migration initiale d'`audit-service` (absente) ; vérifier qu'`migrate deploy` crée la table sur une base vide
- [ ] 3.5 Mesurer la RAM du conteneur en local sous charge légère (`docker stats`) et la comparer à la limite de l'hébergeur ; ajuster `--max-old-space-size` si besoin

## 4. Déploiement backend

- [ ] 4.1 Créer le service web sur l'hébergeur depuis le dépôt, avec les variables de production (bases, RabbitMQ, secrets, `CORS_ORIGIN`) ; vérifier que le déploiement passe au vert
- [ ] 4.2 Vérifier de l'extérieur : `GET https://<api>/health` répond, une route privée sans jeton renvoie 401, un port de microservice n'est pas joignable
- [ ] 4.3 Créer le premier administrateur par un moyen contrôlé (script ou seed non exposé) ; vérifier la connexion via l'API

## 5. Fichiers uploadés

- [ ] 5.1 Choisir le stockage objet gratuit (R2 ou Supabase Storage), créer le bucket public en lecture et noter les variables d'accès
- [ ] 5.2 Adapter `services/equipment-service/src/config/upload.ts` pour envoyer les images au stockage objet et enregistrer l'URL publique ; vérifier par un test d'upload puis d'affichage
- [ ] 5.3 Adapter `services/user-service/src/Config/upload.ts` de la même façon pour les avatars ; vérifier idem
- [ ] 5.4 Conserver les limites existantes (5 Mo, types d'image) et vérifier qu'un fichier trop gros ou d'un autre type est toujours rejeté
- [ ] 5.5 Redémarrer le conteneur et vérifier que les images téléversées restent affichées

## 6. Frontend sur Vercel

- [ ] 6.1 Ajouter `frontend/vercel.json` avec la réécriture SPA ; vérifier qu'ouvrir directement une route profonde en local avec `vercel dev` (ou prévisualisation) ne donne pas de 404
- [ ] 6.2 Créer le projet Vercel (racine `frontend/`, build `npm run build`, sortie `dist`) et définir `VITE_API_URL` et `VITE_PUBLIC_APP_URL` ; vérifier que le build passe
- [ ] 6.3 Mettre à jour `CORS_ORIGIN` côté backend avec l'URL Vercel définitive ; vérifier qu'une connexion depuis le site déployé réussit sans erreur CORS

## 7. Maintien en ligne et sauvegardes

- [ ] 7.1 Ajouter le workflow `.github/workflows/keep-alive.yml` (cron toutes les 10 minutes, échec si statut non 2xx) ; vérifier une exécution manuelle puis une exécution planifiée
- [ ] 7.2 Ajouter le workflow de sauvegarde hebdomadaire (`pg_dump` des six bases, compression, dépôt hors Neon, rétention définie) avec les secrets du dépôt ; vérifier qu'une exécution manuelle produit six archives
- [ ] 7.3 Restaurer une archive dans une base vide et vérifier que les données sont lisibles (test de restauration documenté)

## 8. Documentation et contrôle final

- [ ] 8.1 Documenter dans le README l'architecture de production, la liste des variables et la procédure de redéploiement et de restauration
- [ ] 8.2 Mettre à jour `.env.example` (gateway et services) avec les nouvelles variables sans valeur réelle ; vérifier qu'aucun secret n'apparaît (`git diff`)
- [ ] 8.3 Parcours de bout en bout sur l'URL publique : connexion, création d'équipement avec photo, scan d'une fiche QR, après une période d'inactivité ; vérifier que tout fonctionne et qu'aucune requête HTTP non chiffrée n'est émise
- [ ] 8.4 Confirmer que le changement de durcissement applicatif est livré avant de partager l'adresse publique
