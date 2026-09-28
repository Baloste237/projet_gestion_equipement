# Equipment Service

Ce service gère le domaine des équipements au sein du Projet Gestion d'Équipement. Il est responsable des opérations CRUD (Création, Lecture, Mise à jour, Suppression) pour les entités principales : `Equipment`, `Category`, et `Supplier`.

## Technologies Utilisées

- **Node.js** avec **Express** pour le serveur web.
- **TypeScript** pour le typage fort et la sécurité du code.
- **Prisma** comme ORM pour l'accès aux données avec **PostgreSQL**.
- **Zod** pour la validation des données entrantes.
- **Architecture en Couches** (Routes, Controllers, Services, Repositories) pour une meilleure maintenabilité.

## Configuration et Démarrage

1. **Base de données** :
   - Assurez-vous d'avoir une instance PostgreSQL en cours d'exécution.
   - Créez la base de données.
   - Configurez vos informations de connexion dans le fichier `.env` (à la racine de `equipment-service`) :
     ```env
     DATABASE_URL="postgresql://user:password@localhost:5432/equipement_db?schema=public"
     ```

2. **Installation et Initialisation** :
   ```bash
   npm install
   npx prisma db push
   ```

3. **Démarrer le serveur** :
   - En mode développement (avec rechargement automatique via `tsx watch`) :
     ```bash
     npm run dev
     ```
   - En mode normal :
     ```bash
     npm start
     ```

Le serveur sera alors accessible par défaut sur `http://localhost:4003`.

## Structure du Projet

L'architecture suit un modèle strict de séparation des préoccupations :

```text
services/equipment-service/
├── src/
│   ├── app.ts                 # Configuration Express (middlewares, montage des routes)
│   ├── server.ts              # Point d'entrée de l'application (écoute du port)
│   ├── controllers/           # Gestion des requêtes/réponses HTTP
│   ├── services/              # Logique métier et orchestrations
│   ├── repositories/          # Accès direct à la base de données via Prisma
│   ├── routes/                # Définition des endpoints API
│   ├── middlewares/           # Middlewares (validation, gestion des erreurs)
│   ├── validators/            # Schémas de validation Zod
│   ├── Types/                 # Types et DTOs TypeScript
│   └── config/                # Configuration (ex: instance Prisma)
├── prisma/
│   └── schema.prisma          # Définition du modèle de données de la DB
```

## Ce qui a été réalisé

1. **Modèle de Données (Prisma)** :
   - Création des modèles `Equipment`, `Category` et `Supplier`.
   - Ajout des relations entre eux (un équipement appartient à une catégorie et peut avoir un fournisseur).

2. **Système de Validation et Typage (Zod & DTOs)** :
   - `Types/*` : Création des DTOs pour chaque entité.
   - `validators/*` : Création des schémas de validation avec `zod` pour s'assurer que les données reçues via les routes sont valides avant d'atteindre les contrôleurs.

3. **Couche d'Accès aux Données (Repositories)** :
   - Implémentation de `equipment.repository.ts`, `category.repository.ts`, `supplier.repository.ts` pour abstraire les requêtes Prisma.

4. **Couche Logique Métier (Services)** :
   - Implémentation des services pour gérer les opérations CRUD sans se soucier des requêtes HTTP.

5. **Couche Présentation (Controllers & Routes)** :
   - Mise en place des contrôleurs pour gérer les statuts HTTP et appeler les services appropriés.
   - Création de `equipment.routes.ts`, `category.routes.ts`, `supplier.routes.ts` avec l'intégration du middleware de validation Zod.

6. **Configuration Globale** :
   - `app.ts` : Centralisation des routes et des middlewares globaux (CORS, Helmet, Error Handler).
   - `server.ts` : Démarrage du serveur sur le port spécifié (4003 par défaut).

## Import et export des équipements

| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/api/equipments/import/preview` | Lit un fichier `.csv` (séparateur `,` ou `;`) ou `.xlsx` (5 Mo max) **sans rien créer** et renvoie `headers`, `rowCount`, `sampleRows` (5 premières lignes), `suggestedMapping` et la liste des `fields` |
| `POST` | `/api/equipments/import` | Importe le fichier (`file`, multipart) avec un `mapping` JSON facultatif `{ "En-tête du fichier": "champ" }` ; atomique : rien n'est enregistré si une ligne est invalide |
| `GET` | `/api/equipments/export?format=csv\|xlsx` | Exporte l'inventaire avec les en-têtes reconnus par l'import (le fichier est ré-importable) |

- `suggestedMapping` a exactement le format attendu par le champ `mapping` de l'import : l'interface l'affiche pré-rempli, l'utilisateur corrige les colonnes non reconnues, puis envoie le résultat.
- Une ligne de `QUANTITE` N crée N équipements ; sans numéro de série ou sans catégorie, un numéro `TMP-…` est généré et le statut est `A_COMPLETER`.
- L'aperçu et l'import partagent la même lecture du fichier (mêmes règles, mêmes erreurs). Le fichier est envoyé deux fois (aperçu, puis import) et n'est jamais conservé sur le serveur.
- Tests : `npm test` (`tests/import-export.unit.test.ts`).

## Prochaines Étapes

- **Authentification et RBAC** : Implémenter les middlewares `authenticate.ts` et `check-permission.ts` lorsque le service d'authentification sera prêt.
- **Tests** : Compléter `server.test.ts` et ajouter des tests unitaires et d'intégration pour les différents composants.
