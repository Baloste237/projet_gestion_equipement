# Projet Gestion Équipement - Microservices & Frontend

Ce projet est composé de 6 microservices communicant entre eux de façon synchrone (HTTP/REST via Axios) et asynchrone (RabbitMQ), ainsi que d'une interface frontend React.

## 🚀 Lancement Complet du Projet (Étape par Étape)

Avant de pouvoir utiliser l'application avec l'interface graphique, vous devez démarrer l'infrastructure, les microservices, l'API Gateway et enfin le Frontend React.

### 1. Démarrer l'infrastructure (RabbitMQ & Base de Données)
Rendez-vous dans le dossier `infrastructure` et démarrez les dépendances via Docker Compose :
```bash
cd infrastructure
docker-compose up -d
```

### 2. Démarrer chaque service backend
Rendez-vous dans chacun des dossiers de services sous `/services` et lancez le serveur de développement :
```bash
# Ouvrez un terminal pour chaque microservice (auth, user, equipment, assignment, inventory, audit)
cd services/<nom-du-service>
npm install  # (si pas déjà fait)
npm run dev
```
Les services écouteront sur les ports locaux suivants :
- **Auth Service** : `http://localhost:4001`
- **User Service** : `http://localhost:4002`
- **Equipment Service** : `http://localhost:4003`
- **Assignment Service** : `http://localhost:4004`
- **Inventory Service** : `http://localhost:4005`
- **Audit Service** : `http://localhost:4006`

### 3. Démarrer l'API Gateway (Point d'entrée backend)
La Gateway centralise les requêtes du frontend vers les microservices.
Rendez-vous dans le dossier `gateway` et lancez le serveur :
```bash
cd gateway
npm install  # (si pas déjà fait)
npm run dev
```
La Gateway écoutera sur le port global `http://localhost:4000`.

### 4. Démarrer le Frontend (Interface Utilisateur)
Une fois que l'API Gateway est en ligne, vous pouvez démarrer l'interface React. L'interface communique avec la Gateway sur le port `4000`.
Rendez-vous dans le dossier `frontend` :
```bash
cd frontend
npm install  # (si pas déjà fait)
npm run dev
```
L'application s'ouvrira dans votre navigateur, par défaut à l'adresse **`http://localhost:3000`**.

> **Droits d'accès (état temporaire)** : tous les utilisateurs authentifiés ont les mêmes droits, quel que soit leur rôle. La séparation par rôle sera réintroduite dans un changement ultérieur. Les permissions étant portées par le jeton, il faut se **reconnecter** après une mise à jour pour les recevoir.

**Fonctionnalités récentes** (détails dans `frontend/README.md` et les README des services) :
- **Postes** : `POST/PATCH/DELETE /positions` (user-service), page « Postes » ; suppression refusée si une affectation est active.
- **Affectations** à un utilisateur, un département ou un poste ; filtres `assigneeType`, `assigneeId`, `status` sur `GET /assignments`.
- **Affectation groupée** : `POST /assignments/bulk` (1 à 200 équipements, tout ou rien) et sélection multiple dans la liste des équipements ; un équipement n'a qu'une affectation active (index partiel : appliquer les migrations avec `prisma migrate deploy`, voir `services/assignment-service/README.md`).
- **Import / export des équipements** (CSV, Excel) avec aperçu `POST /equipments/import/preview`.
- **Fichier d'inventaire** : l'import accepte un titre au-dessus des en-têtes (la ligne d'en-tête est détectée parmi les 20 premières ; `headerRow` et `ignoredRowCount` sont renvoyés par l'aperçu et l'import), ignore les lignes vides ou réduites à `()` et s'arrête à la ligne « LISTE DES VALEURS… ». Sans nom, marque ni modèle, la catégorie sert de nom. Un montant suivi de `F`, `FCFA`, `XAF` ou `CFA` est lu avec `.`, `,` ou l'espace comme séparateur de milliers (`19.500 F` = 19 500) et vaut **prix unitaire** (chaque équipement d'une ligne de quantité N le porte) ; sans monnaie, `19.5` reste 19,5. Colonnes reconnues en plus : `MONTANT` (prix d'achat), `DATE D'ACQUISITION` (date d'achat), `CARACTERISTIQUES` et `OBSERVATIONS / HISTORIQUE` (réunies dans les notes avec « | »). Le code-barres perd ses parenthèses (`(Equ-Cli-001)` devient `Equ-Cli-001`) ; `IDENTIFIANT`, qui n'est pas unique, n'est pas importé. Les équipements sans numéro de série restent « à compléter », et une ligne mal saisie refuse tout l'import avec son numéro de ligne.
- **Pagination, tri et période** : `GET /equipments` et `GET /audit-logs` se paginent avec `page` et `pageSize` (1 à 100, 25 par défaut) ; la réponse ajoute `meta` (`total`, `page`, `pageSize`, `totalPages`) et, pour l'audit, `summary` (compteurs de tout le journal, sans filtre). **Sans `page` ni `pageSize`, la liste complète est renvoyée comme avant** (inventory-service, scanner et fenêtres d'affectation ne changent pas). Équipements : `sort` (`createdAt` par défaut, `purchaseDate`, `commissionedAt`, `updatedAt`), `order` (`asc` ou `desc`), `q` (nom, n° de série, catégorie), `categoryId`, `status`, et une période `from` / `to` sur la date de tri (`AAAA-MM-JJ` = journée UTC entière, ou date-heure ISO) ; les équipements sans date en fin de liste et exclus quand une période est active ; l'identifiant départage les dates égales. Audit : `q`, `category` (`AUTHENTICATION`, `DATA_MUTATION`, `SYSTEM_EVENT`) et `date` (`AAAA-MM-JJ`) ; les journaux d'exemple ne sont jamais créés par un appel paginé ou filtré. Une migration ajoute un index sur `AuditLog.createdAt` (`npx prisma migrate deploy` dans `services/audit-service`).
  - **Interface** : barre de pagination commune (10, 25, 50 ou 100 par page, choix mémorisé) sur les équipements et l'audit (serveur) et sur les affectations, catégories, utilisateurs et postes (navigateur). Équipements : un seul sélecteur de date pour le tri et la période, saisie en `jj/mm/AAAA`, colonne « Ajouté le » ; « tout sélectionner » concerne la page courante et la sélection (limite 200) est conservée entre les pages.
- **Catégories** : page « Catégories » (menu), visible de tous les utilisateurs connectés avec le nombre d'équipements de chaque catégorie. Créer, modifier, supprimer et importer sont réservés au rôle `ADMIN` (403 sinon). Le nom est unique sans tenir compte de la casse (409 si déjà pris) ; une catégorie rattachée à des équipements ne peut pas être supprimée (409, avec le nombre d'équipements). L'import `POST /categories/import` (CSV ou Excel, première ligne = en-têtes) lit la colonne `NOM` (ou `CATEGORIE`, `CATEGORY`, `NAME`, `LIBELLE`) et, facultativement, `DESCRIPTION`. Les catégories déjà existantes sont laissées **inchangées** et comptées comme « déjà existantes » ; une ligne invalide fait refuser tout le fichier. À lancer avant l'import des équipements, qui réutilise les catégories par nom (casse ignorée) et crée celles qui manquent. Un renommage n'est répercuté sur le tableau de bord qu'après « Reconstruire » les KPIs.
- **État et dates de service** : chaque équipement a un état `FONCTIONNEL` / `NON_FONCTIONNEL` (distinct du statut) et des dates de mise en service et de mise hors service facultatives. Appliquer la migration avec `prisma migrate deploy` dans `services/equipment-service`.
- **Import avec affectation automatique** : l'import reconnaît les colonnes `ETAT`, `DATE DE MISE EN SERVICE`, `DATE DE MISE HORS SERVICE` et `MIS A LA DISPOSITION DE`. Le nom est comparé aux utilisateurs sans tenir compte de la casse, des accents ni de l'ordre prénom / nom, puis les équipements sont affectés via `POST /assignments/bulk` avec le jeton de l'appelant (droit `assignment:create` requis). L'affectation n'annule jamais l'import : les équipements sont créés, et le rapport (`assignedCount`, `unassigned`) liste les lignes non affectées avec leur raison :
  - `USER_NOT_FOUND` : aucun utilisateur ne porte ce nom ;
  - `USER_AMBIGUOUS` : plusieurs utilisateurs portent ce nom ;
  - `USER_INACTIVE` : l'utilisateur est désactivé ;
  - `EQUIPMENT_TO_COMPLETE` : équipement sans numéro de série ou sans catégorie, à compléter avant affectation ;
  - `ASSIGNMENT_REFUSED` / `ASSIGNMENT_UNAVAILABLE` : refus (droits, équipement indisponible) ou service injoignable.
  L'export contient les mêmes colonnes (`ETAT`, dates de service, `MIS A LA DISPOSITION DE` avec le nom de l'utilisateur, du département ou du poste), lues via `GET /assignments/active-summary` ; si assignment-service ou user-service est injoignable, seule la colonne bénéficiaire reste vide.
  Le service équipement doit joindre `USER_SERVICE_URL` et `ASSIGNMENT_SERVICE_URL` (déjà renseignés dans `infrastructure/docker-compose.yml`).
- **QR code et fiche publique** : chaque équipement a un QR code qui encode l'adresse `<adresse publique>/e/<id>`. Scanné avec l'appareil photo d'un téléphone, il ouvre une **fiche publique, sans connexion** (`GET /public/equipments/:id` via la passerelle). Elle montre l'identification, le statut, l'état de fonctionnement, l'emplacement, les dates de service, la fin de garantie et le bénéficiaire actuel. Le prix d'achat, le fournisseur, les notes internes et la date d'achat ne sont **jamais** exposés ; un identifiant inconnu ou mal formé reçoit la même réponse 404, et la route est limitée en débit par IP (`PUBLIC_RATE_LIMIT_MAX` dans la passerelle, 120 requêtes par 5 minutes par défaut).
  - **QR et étiquettes** : le QR s'affiche et se télécharge sur la fiche d'un équipement ; « Imprimer les étiquettes » (barre de sélection de la liste, ou fin d'un import) ouvre `/equipments/labels`. La sélection de la liste ne concerne que les équipements disponibles ; pour les autres, télécharger le QR depuis leur fiche.
  - **Scanner intégré** : page « Scanner » (`/scan`), qui ouvre la fiche complète d'un équipement. La caméra du navigateur exige **HTTPS** (ou `localhost`) ; sinon, un message l'explique et la saisie du numéro de série reste possible.
  - **Configuration** : `VITE_PUBLIC_APP_URL` (frontend) fixe l'adresse encodée dans les QR, à défaut l'origine courante. Changer cette adresse **invalide les étiquettes déjà imprimées** : gardez l'ancien domaine en redirection.
  - **Secret interne** : la fiche publique lit le bénéficiaire via une route interne d'assignment-service, protégée par le secret partagé `INTERNAL_SERVICE_TOKEN` (le même dans equipment-service et assignment-service ; voir `docker-compose.yml` et les `.env.example`). Sans secret configuré, la route refuse tout et la fiche affiche « bénéficiaire indisponible ».
- **Tableau de bord** alimenté par les KPIs (`GET /dashboard/kpis`) avec diagrammes d'analyse.

### Comptes, rôles et fiches utilisateurs

Deux notions distinctes : le **compte de connexion** (auth-service : e-mail, mot de passe, rôle, état actif) et la **fiche** de l'annuaire (user-service : nom, département, téléphone…). Elles sont reliées par l'e-mail, et le **compte fait foi** pour le rôle et l'état actif.

- **Premier administrateur** : l'inscription crée toujours un compte `EMPLOYE`. Créez l'administrateur avec `ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run seed:admin` dans `services/auth-service` (idempotent, mot de passe de 12 caractères minimum, aucune route HTTP).
- **Création d'une fiche** : l'administrateur saisit l'e-mail ; le serveur retrouve le compte de même e-mail (casse ignorée) et reprend son rôle et son état. Sans compte, la fiche est créée « non reliée » (badge **Sans compte**) : son rôle et son état n'ont alors aucun effet sur l'accès. Elle est reliée automatiquement la prochaine fois qu'un administrateur change son rôle ou son état, une fois la personne inscrite.
- **Rôle et état** : changer le rôle, désactiver, réactiver ou supprimer une fiche reliée agit d'abord sur le compte, puis sur la fiche. La désactivation et la suppression **désactivent le compte** (conservé pour l'audit) et révoquent ses jetons de rafraîchissement : l'accès prend fin au plus tard à l'expiration du jeton d'accès (15 minutes). Le dernier administrateur actif ne peut être ni rétrogradé, ni désactivé, ni supprimé (409).
- **Si auth-service est injoignable**, ces actions échouent avec une erreur 502 et **rien n'est modifié** (ni le compte, ni la fiche) ; le reste de l'application n'est pas touché.
- **Routes internes** : auth-service expose `GET /internal/credentials/by-email/:email` et `PATCH /internal/credentials/:id`, protégées par `INTERNAL_SERVICE_TOKEN` et **absentes du gateway**. user-service les joint via `AUTH_SERVICE_URL` (déjà renseigné dans `docker-compose.yml`).
- **`GET /users/me`** renvoie la fiche de l'utilisateur connecté (utilisée par la page Paramètres).
- **Secrets partagés** : `JWT_SECRET` identique dans tous les services (dans chaque `.env.docker`) ; `INTERNAL_SERVICE_TOKEN` identique dans auth, user, equipment, assignment et audit, à exporter avant `docker compose up` (voir `infrastructure/.env.example`).

**Mise à niveau d'une installation existante** (fiches créées avec l'ancien formulaire, dont l'identifiant de compte était aléatoire) :
1. Appliquer la migration de user-service : `npx prisma migrate deploy` (`authUserId` devient facultatif).
2. Démarrer auth-service, puis simuler : `npm run relink:profiles -- --dry-run` dans `services/user-service` (variables `AUTH_SERVICE_URL`, `INTERNAL_SERVICE_TOKEN`, `DATABASE_URL`). Il affiche le nombre de fiches reliées, réalignées, d'identifiants retirés, inchangées et les conflits, sans rien écrire.
3. Relire le résumé, puis lancer `npm run relink:profiles`. Le script est idempotent et ne supprime aucune fiche ; une fiche dont l'e-mail n'a pas de compte garde ses données mais perd son identifiant de compte factice.

Exemple de résumé (jeu de test : 4 fiches dont 1 sans compte) : `reliées : 3 · réalignées : 0 · identifiants retirés : 1 · inchangées : 0 · conflits : 0` ; rejoué : `inchangées : 4`.

---

## 🧪 Exécution des Tests d'Intégration (Postman / Newman)

Deux suites de tests d'intégration complètes et idempotentes sont disponibles sous le dossier `/tests`.

### Option A : Tester l'API Gateway (Point d'entrée unique - Port 4000)
Cette suite valide le bon routage, le Rate Limiting, et l'authentification centralisée de la Gateway :
- **Newman (CLI)** :
  ```bash
  node tests/run-gateway-tests.js
  ```
- **Postman (GUI)** : Importer `tests/postman/gateway.postman_collection.json` et `tests/postman/gateway.postman_environment.json`.

### Option B : Tester les microservices individuellement (Ports 4001 à 4006)
Cette suite valide le comportement direct de chaque microservice :
- **Newman (CLI)** :
  ```bash
  node tests/run-tests.js
  ```
- **Postman (GUI)** : Importer `tests/postman/microservices.postman_collection.json` and `tests/postman/local.postman_environment.json`.

---

## 📁 Structure des fichiers de test
- `tests/postman/gateway.*` : Fichiers Postman pour les tests via la Gateway.
- `tests/postman/microservices.*` et `tests/postman/local.*` : Fichiers Postman pour les tests directs par microservice.
- `tests/run-gateway-tests.js` : Script de test Newman pour la Gateway.
- `tests/run-tests.js` : Script de test Newman direct des microservices.
