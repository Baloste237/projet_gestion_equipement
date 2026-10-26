# Tasks

## 1. Page 404 & Contrôle d'Accès (Frontend)

- [x] 1.1 Créer le composant `frontend/src/pages/errors/NotFoundPage.tsx` avec le thème sombre, Material Symbols et les boutons de navigation, et vérifier son affichage
- [x] 1.2 Créer le composant `frontend/src/pages/errors/UnauthorizedPage.tsx` (403) affichant le rôle requis et un bouton de redirection, et vérifier son affichage
- [x] 1.3 Créer le composant de garde de route `frontend/src/components/auth/ProtectedRoute.tsx` vérifiant le jeton et les rôles autorisés (`allowedRoles`)
- [x] 1.4 Mettre à jour `frontend/src/App.tsx` pour envelopper les routes privées avec `ProtectedRoute` et ajouter la route d'échappement `<Route path="*" element={<NotFoundPage />} />`
- [x] 1.5 Créer les tests unitaires pour `ProtectedRoute` et les pages d'erreur dans `frontend/tests/` et vérifier qu'ils réussissent via `npm test`

## 2. Configuration pour Déploiement Vercel (Frontend)

- [x] 2.1 Créer le fichier `frontend/vercel.json` avec la réécriture universelle vers `/index.html` pour la gestion des routes SPA
- [x] 2.2 Vérifier la configuration de `VITE_API_URL` dans `frontend/src/services/api.ts` et le fichier d'exemple `frontend/.env.example`
- [x] 2.3 Exécuter `npm run build` dans le répertoire `frontend` et vérifier que le bundle de production est généré sans erreur

## 3. Configuration pour Déploiement Render (Backend Supervisé)

- [x] 3.1 Créer le `Dockerfile.render` multi-étapes pour compiler et packager le Gateway et les 6 microservices
- [x] 3.2 Créer le script de supervision et de démarrage `scripts/start-render.sh` appliquant les migrations Prisma puis lançant les microservices et le Gateway
- [x] 3.3 Créer le fichier `render.yaml` (Blueprint Render) déclarant le Web Service, les variables d'environnement (`DATABASE_URL`, `JWT_SECRET`, `INTERNAL_SERVICE_TOKEN`, `CORS_ORIGIN`) et le healthcheck
- [x] 3.4 Vérifier la syntaxe du Dockerfile et l'exécutabilité du script de démarrage

## 4. Gestion Git & Pull Request GitHub

- [ ] 4.1 Créer la branche Git de fonctionnalité `feat/deploy-and-custom-404` à partir de l'état de travail actuel
- [ ] 4.2 Indexer et committer tous les fichiers (purge administrative, tokens de sécurité, tests, page 404, configs Render et Vercel) avec des messages de commit explicites
- [ ] 4.3 Pousser la branche `feat/deploy-and-custom-404` vers le dépôt distant GitHub `origin`
- [ ] 4.4 Rédiger et initier la Pull Request GitHub avec la documentation détaillée des changements apportés
