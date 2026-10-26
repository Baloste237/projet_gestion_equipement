# Tasks

## 1. Droits et règles de gestion (equipment-service)

- [x] 1.1 Ajouter `requireRole(...roles)` à `src/middlewares/security.ts` (401 sans utilisateur, 403 si le rôle n'est pas autorisé) et vérifier avec un test unitaire : jeton `EMPLOYE` refusé, jeton `ADMIN` accepté
- [x] 1.2 Renforcer `category.validator.ts` (nom nettoyé par `trim`, 2 à 100 caractères ; description limitée à 500) et vérifier avec des tests : nom d'un caractère refusé, espaces autour retirés, description trop longue refusée
- [x] 1.3 Dans le dépôt et le service des catégories : recherche de nom insensible à la casse (en excluant la catégorie modifiée), liste triée par nom avec `equipmentCount`, comptage des équipements d'une catégorie ; vérifier avec des tests qui remplacent les méthodes du dépôt : la liste contient `equipmentCount`
- [x] 1.4 Appliquer les règles dans le service : doublon à la création ou au renommage → `HttpError(409)`, catégorie introuvable → `HttpError(404)`, suppression d'une catégorie utilisée → `HttpError(409)` avec le nombre d'équipements, violations P2002 et P2003 traduites en 409 ; vérifier par tests : « LAPTOP » refusé si « Laptop » existe, conserver son propre nom accepté, 404 sur identifiant inconnu, suppression refusée avec 3 équipements puis acceptée avec 0
- [x] 1.5 Brancher `requireRole("ADMIN")` sur `POST /`, `PATCH /:id` et `DELETE /:id` dans `category.routes.ts` (lecture inchangée) et vérifier par tests HTTP : `EMPLOYE` reçoit 403 sur chacune, appel sans jeton 401, `GET /api/categories` avec un jeton `EMPLOYE` n'est pas refusé

## 2. Import séparé des catégories (equipment-service)

- [x] 2.1 Écrire `buildCategoryDrafts` (fonction pure : détection de la colonne de nom parmi `NOM`, `CATEGORIE`, `CATEGORY`, `NAME`, `LIBELLE` via `normalizeHeader`, colonne `DESCRIPTION`, `trim`, longueurs, doublons du fichier à casse égale avec la première ligne gagnante, erreurs par ligne, limite de 1 000 lignes) et vérifier avec des tests : fichier valide, doublon de casse ignoré et compté, nom vide ou d'un caractère en erreur avec son numéro de ligne, absence de colonne de nom refusée
- [x] 2.2 Écrire le service d'import : lecture avec `readSpreadsheet`, refus de tout l'import si une ligne est invalide, classement existantes (insensible à la casse, jamais modifiées) et nouvelles, insertion par `createMany` avec `skipDuplicates`, réponse `rowCount`, `createdCount`, `existingCount`, `duplicateInFileCount`, `existingNames` ; vérifier avec des tests qui remplacent le dépôt : une catégorie existante avec une autre description reste inchangée et est comptée comme existante, rien n'est créé si une ligne est invalide
- [x] 2.3 Ajouter la route `POST /api/categories/import` (déclarée avant `/:id`, `uploadImportFile.single("file")`, `requireRole("ADMIN")`) et la documentation Swagger des catégories (liste enrichie, 403, 404, 409, import) ; vérifier par tests HTTP : 401 sans jeton, 403 pour un `EMPLOYE`, 400 pour un fichier d'un autre format
- [x] 2.4 Lancer la suite complète d'equipment-service (`npm test`) et `npx tsc --noEmit` ; vérifier qu'aucun test existant ne casse

## 3. Interface (frontend)

- [x] 3.1 Dans `services/api.ts` : `Category` avec `equipmentCount`, et `categoryService.update`, `delete` et `import` (envoi de fichier comme `importFile` des équipements) ; ajouter un utilitaire de lecture du rôle depuis `localStorage` avec un test ; vérifier avec `npm test` dans `frontend` et `npm run build`
- [x] 3.2 Créer `pages/categories/CategoriesPage.tsx` et `CategoryModal.tsx` sur le modèle des départements : liste avec nom, description et nombre d'équipements, recherche, ajout, modification et suppression avec confirmation, actions d'écriture visibles pour un administrateur seulement, affichage du `message` du serveur en cas de 409 ou 403 ; vérifier au navigateur avec un compte `ADMIN` (toutes les actions) et un compte `EMPLOYE` (liste seule)
- [x] 3.3 Créer `ImportCategoriesModal.tsx` (choix du fichier CSV ou .xlsx, colonnes attendues expliquées, rapport créées / déjà existantes / ignorées ou liste des lignes en erreur, rafraîchissement de la liste) et l'ouvrir depuis un bouton « Importer » réservé à l'administrateur ; vérifier au navigateur avec un fichier valide, un fichier avec une ligne invalide et un fichier d'un mauvais format
- [x] 3.4 Ajouter la route `/categories` dans `App.tsx` et l'entrée « Catégories » dans `AppLayout.tsx` (visible de tous) ; vérifier que la page s'ouvre depuis le menu et que `npm run build` et `npm run lint` passent

## 4. Documentation et vérification d'ensemble

- [x] 4.1 Décrire dans le README la page Catégories, les droits (lecture pour tous, écriture et import pour l'administrateur), le format du fichier d'import et la règle « catégorie existante laissée inchangée » ; vérifier que le texte correspond au comportement constaté
- [x] 4.2 Parcours manuel complet via le gateway avec un `ADMIN` puis un `EMPLOYE` : importer un fichier de catégories, relancer le même import (tout « déjà existant »), créer, renommer, supprimer une catégorie vide, tenter de supprimer une catégorie utilisée (refus 409), puis importer des équipements qui réutilisent ces catégories ; vérifier qu'aucune catégorie en double n'est créée
