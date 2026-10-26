# Tasks

## 1. Pagination et tri des équipements (equipment-service)

- [x] 1.1 Créer `src/utils/pagination.ts` (lecture de `page` et `pageSize`, `null` sans paramètre, 400 hors limites, calcul de `skip`, `take` et `meta`) et `src/validators/equipment-list.validator.ts` (`sort` parmi `createdAt`, `purchaseDate`, `commissionedAt`, `updatedAt`, `order`, `q`, `categoryId`, `status`, `from`, `to`, refus de `from > to`) ; vérifier par tests unitaires : valeurs limites de `pageSize` (0, 1, 100, 101), page 0, champ de tri inconnu, dates invalides, `from` postérieur à `to`
- [x] 1.2 Dans `equipment.repository.ts`, construire `where` (recherche insensible à la casse sur nom, numéro de série et nom de catégorie, catégorie, statut, période sur le champ de tri avec exclusion des valeurs nulles) et `orderBy` `[{ champ: { sort, nulls: "last" } }, { id: "asc" }]` ; ajouter `findPage` (`findMany` et `count` dans une même transaction de lecture) et appliquer le tri par défaut `createdAt` décroissant à `findAll` ; vérifier par tests avec base simulée que les arguments Prisma attendus sont produits (bornes d'une date seule : journée UTC entière, `to` inclus)
- [x] 1.3 Vérifier sur une base jetable (même méthode que pour les catégories) que `nulls: "last"` fonctionne dans les deux sens, que 612 équipements de même `createdAt` lus en 25 pages apparaissent exactement une fois chacun, que la période exclut les dates nulles et que `meta.total` suit les filtres ; en cas d'échec de `nulls`, appliquer le repli décrit dans le design
- [x] 1.4 Dans le service et le contrôleur, renvoyer `{ success, data, meta }` pour une requête paginée et `{ success, data }` inchangé sans `page` ni `pageSize` ; vérifier par test HTTP : sans paramètre (liste complète, ordre `createdAt` décroissant), page 2, page au-delà de la fin (`data` vide), `pageSize=500` (400), `sort=name` (400), 401 sans jeton, accès par secret interne toujours possible pour la lecture complète
- [x] 1.5 Mettre à jour Swagger (`GET /api/equipments` : paramètres, `meta`, erreurs 400) ; vérifier avec `/api-docs.json` et `npx tsc --noEmit`
- [x] 1.6 Vérifier avec `npm test` dans `equipment-service` et `inventory-service` qu'aucun test existant ne régresse, et ajouter un test d'inventory-service confirmant que la lecture complète sans paramètre fonctionne toujours

## 2. Journal d'audit paginé (audit-service)

- [x] 2.1 Créer la migration d'index `AuditLog(createdAt)` (`@@index([createdAt])` dans `schema.prisma`, `prisma migrate dev --create-only` ou SQL équivalent) ; vérifier qu'elle s'applique sur une base jetable avec `prisma migrate deploy` et que l'index existe (`\d "AuditLog"`)
- [x] 2.2 Créer `src/utils/pagination.ts` (même contrat qu'en 1.1) et le validateur des filtres (`q`, `category` parmi `AUTHENTICATION`, `DATA_MUTATION`, `SYSTEM_EVENT`, `date` en `AAAA-MM-JJ` valide) ; vérifier par tests unitaires les cas limites et les refus 400
- [x] 2.3 Dans `audit-log.repository.ts`, ajouter `findPage(filters, pagination)` (mêmes règles de correspondance que la page actuelle, tri `createdAt` décroissant puis `id` décroissant, `count` de même `where`) et `summary()` (`total`, `authCount`, `mutationCount`, `failedCount` sur tout le journal, calculés en parallèle) ; vérifier par tests avec base simulée
- [x] 2.4 Dans le service et le contrôleur, renvoyer `{ success, data, meta, summary }` pour une requête paginée, conserver la réponse actuelle sans paramètre, et ne créer les journaux d'exemple que pour l'appel sans paramètre sur une table vide ; vérifier par test HTTP : 403 sans `audit:read`, filtre sans résultat (aucun journal créé), appel sans paramètre sur table vide (comportement conservé), `category=AUTRE` (400)
- [x] 2.5 Vérifier sur une base jetable : 120 journaux répartis sur plusieurs jours et catégories, pagination sans doublon, filtres combinés, compteurs `summary` égaux aux comptes directs (dont `failedCount` via `metadata`), puis supprimer la base d'essai ; mettre à jour Swagger

## 3. Gateway et contrat commun

- [x] 3.1 Vérifier de bout en bout par le gateway (jeton signé) que `GET /equipments?page=2&pageSize=25&sort=createdAt&order=desc` et `GET /audit-logs?page=1&pageSize=25` arrivent avec leurs paramètres et renvoient `meta` ; ne modifier le gateway que si les paramètres sont perdus

## 4. Frontend : utilitaires et composants communs

- [x] 4.1 Créer `utils/pagination.ts` (fenêtre de numéros avec points de suspension, bornage de la page, plage « x à y sur N », découpe d'une liste, lecture et écriture sécurisées de la taille de page mémorisée, valeurs 10/25/50/100) avec `tests/pagination.test.ts` ; vérifier les cas : 1 page, 7 pages, 25 pages (début, milieu, fin), liste vide, page hors limites, valeur mémorisée corrompue
- [x] 4.2 Créer `utils/dateFr.ts` (masque `jj/mm/AAAA` à la frappe, analyse avec jours, mois et années bissextiles, conversion en `AAAA-MM-JJ`, en début et fin de journée locale en date-heure ISO, formatage d'une date ISO en jj/mm/AAAA, validation d'une période) avec `tests/dateFr.test.ts` ; vérifier : 31/02/2026 invalide, 29/02/2028 valide, 29/02/2026 invalide, « au » avant « du », saisie partielle, collage avec séparateurs différents, formatage d'une date ISO UTC proche de minuit
- [x] 4.3 Créer `components/ui/Pagination.tsx` (précédent, suivant, numéros, libellé, taille de page, masquée si la liste est vide) et `components/ui/DateFrInput.tsx` (champ texte à masque, message d'erreur) ; vérifier avec `npx tsc -b` et `npx oxlint`
- [x] 4.4 Dans `services/api.ts`, accepter des paramètres facultatifs pour `equipmentService.getAll` et `auditLogService.getAll`, typer la réponse paginée (`meta`, `summary`) et conserver la réponse actuelle sans paramètre ; vérifier avec `npx tsc -b` et un test du constructeur de paramètres (valeurs vides omises, dates converties)

## 5. Frontend : page des équipements

- [x] 5.1 Faire charger la page des équipements par le serveur (page, taille, `q` avec attente de 300 ms, catégorie, statut lu dans l'URL, tri et période) en ignorant les réponses périmées, avec retour à la page 1 à chaque changement de filtre ou de tri et page ramenée dans les limites ; vérifier avec le lien `/equipments?status=AVAILABLE` du tableau de bord, une recherche rapide (dernier résultat affiché) et la suppression du dernier élément d'une page
- [x] 5.2 Ajouter le sélecteur de date (ajout, achat, mise en service, dernière modification), le sens du tri, les champs « du » et « au » en jj/mm/AAAA avec message d'erreur et bouton « Effacer », la colonne « Ajouté le » et des en-têtes de date qui changent le tri ; vérifier à la main : 31/02/2026 refusé sans appel serveur, période 2009 sur la date d'achat, équipements sans date en fin de liste
- [ ] 5.3 Adapter la sélection multiple : « tout sélectionner » limité aux équipements disponibles de la page, sélection conservée entre les pages (`pruneSelection` ne vide plus la sélection à chaque chargement), compteur total, limite de 200 conservée ; mettre à jour `equipmentSelection` et ses tests (`tests/equipmentSelection.test.ts`) ; vérifier : 3 cochés en page 1 et 2 en page 2 donnent 5, le refus du serveur sur un équipement devenu indisponible est affiché

## 6. Frontend : audit et listes du navigateur

- [x] 6.1 Faire charger la page d'audit par le serveur (page, taille, `q`, catégorie, jour) avec les compteurs issus de `summary`, conserver l'actualisation de 5 secondes sur la page et les filtres courants sans revenir à la page 1 et sans interrompre la saisie ; vérifier à la main : page 2 avec l'actualisation active, filtre sur un jour, compteurs inchangés par le filtre
- [x] 6.2 Paginer dans le navigateur les affectations, les catégories, les utilisateurs et les postes avec `Pagination` (liste filtrée découpée, statistiques toujours calculées sur la liste entière, page ramenée dans les limites après suppression ou filtre) ; vérifier à la main sur chaque page avec 10 et 25 par page, et que la taille choisie est partagée entre les pages
- [x] 6.3 Vérifier avec `npx tsc -b`, `npm test`, `npx oxlint` (aucun nouvel avertissement par rapport à l'existant) et `npm run build` dans `frontend`

## 7. Documentation et vérification d'ensemble

- [x] 7.1 Mettre à jour le README (paramètres `page`, `pageSize`, `sort`, `order`, `q`, `from`, `to`, `meta`, `summary`, compatibilité sans paramètre, listes concernées) et la section Swagger ; vérifier par relecture
- [ ] 7.2 Parcours manuel avec les données réelles (620 équipements) : naviguer dans les pages, trier par chacune des quatre dates, filtrer une période en jj/mm/AAAA, combiner recherche et statut, sélectionner sur deux pages et lancer une affectation groupée, parcourir l'audit paginé avec ses compteurs, vérifier que le tableau de bord, le scanner et la reconstruction des KPIs fonctionnent toujours
