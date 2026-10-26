# Proposition

## Pourquoi

Un administrateur ne peut pas gérer les catégories d'équipements : aucune page, aucune route et aucune entrée de menu n'existent pour les lister, les ajouter, les modifier ou les supprimer. Le service frontend ne sait que lire et créer, et les catégories n'apparaissent que comme liste déroulante dans le formulaire d'un équipement. L'API d'equipment-service, elle, expose déjà les opérations, mais avec des défauts :

- l'écriture est ouverte à tout utilisateur authentifié, y compris un `EMPLOYE`, alors que `durcissement-securite` a réservé l'écriture des départements et des postes à l'administrateur ;
- supprimer une catégorie utilisée par des équipements échoue sur la contrainte de la base et renvoie un 500 générique ; une catégorie introuvable renvoie aussi un 500 ;
- l'unicité du nom est sensible à la casse en base (« Laptop » et « LAPTOP » coexistent), alors que l'import des équipements compare les noms sans tenir compte de la casse ; un nom déjà pris renvoie un 500.

Il n'existe pas non plus de moyen de charger une liste de catégories avant d'importer des équipements : elles ne sont créées qu'au fil de l'import des équipements.

## Ce qui change

- **Page « Catégories »** (frontend) : liste (nom, description, nombre d'équipements), recherche, ajout, modification et suppression avec confirmation, route `/categories` et entrée de menu. La liste est visible par tous les utilisateurs connectés ; les actions d'écriture et l'import ne sont proposés qu'à un administrateur.
- **Droits** (equipment-service) : créer, modifier, supprimer et importer des catégories est réservé au rôle `ADMIN` (403 sinon) ; la lecture reste ouverte à tout utilisateur authentifié. Un contrôle de rôle `requireRole` est ajouté à equipment-service, sur le modèle de user-service.
- **Règles de gestion** :
  - le nom est unique sans tenir compte de la casse ni des espaces en début et fin ; un doublon est refusé (409) ;
  - une catégorie introuvable renvoie 404 ;
  - une catégorie attribuée à au moins un équipement ne peut pas être supprimée (409, avec le nombre d'équipements) ;
  - la liste renvoie le nombre d'équipements de chaque catégorie.
- **Import séparé des catégories** : `POST /api/categories/import` (fichier CSV ou Excel, colonnes nom et description). Les catégories déjà existantes sont laissées **inchangées** et comptées comme « déjà existantes » ; les nouvelles sont créées ; un rapport indique les créées, les déjà existantes, les doublons du fichier ignorés et les erreurs par ligne. Une ligne invalide fait refuser tout l'import, comme pour les équipements. Le frontend propose un bouton « Importer » avec une fenêtre de rapport.
- L'import des équipements reste inchangé : il réutilise déjà les catégories existantes par nom, sans tenir compte de la casse, et crée celles qui manquent. Charger les catégories d'abord le rend donc prévisible.
- **Documentation** : le README décrit la page et l'import.

## Capacités

### Nouvelles capacités

- `category-management`: gestion des catégories d'équipements (consultation, création, modification, suppression, contrôle des droits, règles d'unicité et de suppression) et import séparé d'une liste de catégories.

### Capacités modifiées

Aucune. Le comportement de l'import des équipements ne change pas : ses adaptations au format d'inventaire font l'objet d'un changement distinct.

## Impact

- **equipment-service** : `middlewares/security.ts` (`requireRole`), `routes/category.routes.ts`, controller, service, repository, validators, nouvelle logique d'import des catégories (réutilise `readSpreadsheet`, `normalizeHeader` et `uploadImportFile`), documentation Swagger, tests.
- **frontend** : `services/api.ts` (`categoryService` : modifier, supprimer, importer ; type `Category` avec le nombre d'équipements), nouvelles pages `pages/categories`, `App.tsx`, `AppLayout.tsx`, tests de l'utilitaire d'import.
- **gateway** : aucun changement, la route `/categories` existe et transmet déjà les fichiers.
- **Données** : aucune migration. L'unicité insensible à la casse est appliquée par le service, la contrainte d'unicité existante couvre les écritures concurrentes.
- **Hors périmètre** : adaptation de l'import des équipements au fichier d'inventaire (en-tête sur une autre ligne, lignes parasites, nom de repli, montants en FCFA) ; événements d'audit sur les catégories ; mise à jour automatique des KPIs après un renommage (voir design).
