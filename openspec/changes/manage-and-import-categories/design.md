# Design

## Contexte

Voir proposal.md pour la motivation. État observé :

- **equipment-service** : `/api/categories` est monté avec `authenticate` seul. Le service (`category.service.ts`) et le dépôt (`category.repository.ts`) sont de simples passe-plats vers Prisma. `getById` lève une `Error("CATEGORY_NOT_FOUND")` ordinaire, que le gestionnaire d'erreurs traduit en 500 : seules les erreurs portant un `statusCode` inférieur à 500 (par exemple `HttpError`) sortent avec leur code.
- **Modèle** : `Category { id, name @unique, description?, equipments[] }`. `Equipment.category` est obligatoire, sans suppression en cascade : supprimer une catégorie utilisée échoue sur la clé étrangère (Prisma P2003).
- **Import des équipements** (`equipment-import.service.ts`) : retrouve les catégories par nom sans tenir compte de la casse (`resolveIdsByName`) et crée celles qui manquent. Il lit les noms avec un simple `trim`, sans autre normalisation. Il dispose de `readSpreadsheet` (en-têtes en ligne 1, séparateur `;` ou `,` détecté, BOM retiré), de `normalizeHeader` (insensible à la casse, aux accents et à la ponctuation) et de `uploadImportFile` (CSV ou .xlsx, 5 Mo, en mémoire).
- **Droits** : equipment-service n'a pas de contrôle de rôle ; le jeton vérifié donne `req.user.role`. user-service a déjà un `requireRole(...roles)` à imiter. Le gateway route `/categories` vers `/api/categories` et transmet déjà les envois de fichiers.
- **Frontend** : `categoryService` ne sait que lire et créer. Le rôle de l'utilisateur est lu dans `localStorage` (`user.role`), comme dans `UsersPage`. `DepartmentsPage` et `PositionsPage` sont des modèles de liste avec modale et confirmation, et `ImportEquipmentsModal` un modèle d'import.
- **KPIs** : inventory-service enregistre le nom de la catégorie au moment de l'événement `equipment.created`, pas par jointure.

## Objectifs / Non-objectifs

**Objectifs :**
- Un administrateur gère les catégories depuis l'interface ; tous les utilisateurs connectés les consultent.
- Les règles (droits, unicité insensible à la casse, suppression refusée si utilisée) sont appliquées côté serveur avec des codes d'erreur précis.
- Un import séparé charge une liste de catégories sans jamais toucher à celles qui existent.

**Non-objectifs :**
- Adapter l'import des équipements au fichier d'inventaire (changement distinct).
- Réaffecter les équipements d'une catégorie à une autre, ou fusionner des catégories.
- Événements d'audit sur les catégories, et mise à jour automatique des KPIs après un renommage.
- Contrainte d'unicité insensible à la casse dans la base.

## Décisions

**Contrôle de rôle `requireRole` ajouté à equipment-service**, branché sur les routes d'écriture des catégories (`POST /`, `PATCH /:id`, `DELETE /:id`, `POST /import`). Le montage `authenticate` reste en place pour la lecture. Le secret interne n'ouvre pas les catégories : seul un jeton utilisateur est accepté. Alternative écartée : un contrôle dans chaque contrôleur, plus facile à oublier qu'un middleware visible dans la déclaration des routes.

**Unicité insensible à la casse appliquée par le service**, avec une recherche `equals` en mode `insensitive` sur le nom nettoyé (`trim`), en excluant la catégorie modifiée. Le nom est enregistré tel que saisi, nettoyé des espaces en début et fin. La contrainte d'unicité existante de la base reste le filet contre les écritures simultanées : sa violation (P2002) est traduite en 409. Alternative écartée : un index unique sur `lower(name)` par migration SQL, car Prisma ne l'exprime pas dans le schéma (dérive), et une base contenant déjà « Laptop » et « LAPTOP » ferait échouer la migration.

**Suppression en deux temps** : le service compte les équipements de la catégorie, refuse avec un 409 portant ce nombre s'il est positif, puis supprime. Si un équipement est rattaché entre le comptage et la suppression, la violation de clé étrangère (P2003) est elle aussi traduite en 409. Le nombre d'équipements est aussi renvoyé par la liste, pour que l'interface désactive le bouton.

**Liste enrichie sans nouveau point d'accès** : `GET /api/categories` renvoie chaque catégorie avec `equipmentCount` (relation `_count`), triée par nom. Le champ s'ajoute sans retirer d'existant, donc les listes déroulantes actuelles ne sont pas affectées.

**Erreurs explicites** : une catégorie introuvable lève `HttpError(404)`, un doublon `HttpError(409)`, un nom invalide est refusé par le validateur (400). Le gestionnaire d'erreurs existant les renvoie tels quels. Les validateurs nettoient le nom (`trim`), exigent 2 à 100 caractères et limitent la description à 500.

**Import séparé : `POST /api/categories/import`**, un seul appel (pas d'aperçu ni de mapping : le format est fixe et simple).
- Lecture avec `readSpreadsheet` ; le nom est lu dans la première colonne dont `normalizeHeader` vaut `NOM`, `CATEGORIE`, `CATEGORY`, `NAME` ou `LIBELLE`, la description dans `DESCRIPTION`. Sans colonne de nom : 400.
- La construction des lignes est une fonction pure (`buildCategoryDrafts`) : nom nettoyé (`trim` uniquement, comme l'import des équipements, pour que les deux comparent les mêmes noms), contrôle de longueur, détection des doublons du fichier à casse égale (la première ligne l'emporte), erreurs par ligne. Une ligne invalide fait refuser tout l'import (400 avec la liste), comme pour les équipements.
- Les noms déjà présents en base (comparaison insensible à la casse) sont comptés comme « déjà existants » et ne sont ni modifiés ni mis à jour. Les autres sont insérés d'un coup (`createMany` avec `skipDuplicates`, qui absorbe aussi une course avec une création concurrente).
- Réponse : `rowCount`, `createdCount`, `existingCount`, `duplicateInFileCount` et `existingNames`. Limite : 1 000 lignes par fichier, et 5 Mo (limite existante).
- La route est déclarée avant `/:id`.

**Frontend** : nouvelle page `pages/categories` (`CategoriesPage`, `CategoryModal`, `ImportCategoriesModal`) construite sur les modèles Départements et Équipements. Un petit utilitaire lit le rôle dans `localStorage` pour n'afficher les actions d'écriture qu'à un administrateur ; le serveur reste l'autorité. Les erreurs du serveur (409, 403) affichent leur `message`. `categoryService` gagne `update`, `delete` et `import`, et `Category` le champ `equipmentCount`. Route `/categories` et entrée de menu « Catégories » visible de tous.

**Documentation** : le README décrit la page, les droits et le format du fichier d'import ; les routes sont ajoutées à la documentation Swagger.

## Risques / Compromis

- [Renommage et KPIs : le tableau de bord garde l'ancien nom jusqu'à la reconstruction] → Limite acceptée et documentée ; l'action « reconstruire » du tableau de bord rafraîchit les noms. Une republication d'événement serait un changement distinct.
- [Doublons de casse déjà présents en base] → Ils ne sont pas corrigés ; l'unicité s'applique aux nouvelles écritures. Si un fichier d'import cible un nom présent en deux casses, il est compté comme existant.
- [Normalisation différente entre les deux imports] → Les deux n'utilisent que `trim` et une comparaison insensible à la casse ; des espaces internes différents (« UNITE  CENTRALE ») produiraient deux catégories. Constaté, non traité ici.
- [Un administrateur importe un fichier non prévu (par exemple l'inventaire complet)] → Sans colonne de nom reconnue, le fichier est refusé ; avec une colonne `CATEGORIE`, ses valeurs répétées sont fusionnées en doublons ignorés.
- [Rôle lu dans `localStorage` : un utilisateur peut afficher des boutons d'administration] → Sans effet : toutes les écritures sont refusées (403) par le serveur.
- [JWT émis avant la bascule des droits] → Les jetons existants portent déjà le rôle ; aucune migration de jeton n'est nécessaire.

## Plan de déploiement

1. Déployer equipment-service (droits, règles, import), puis le frontend.
2. Pas de migration de données.
3. Retour arrière : revenir à la version précédente des deux services ; les catégories créées par l'import restent valides.

## Questions ouvertes

- Faut-il fournir un modèle de fichier téléchargeable depuis la fenêtre d'import ? Ce n'est pas nécessaire au fonctionnement ; la fenêtre décrit les colonnes attendues.
