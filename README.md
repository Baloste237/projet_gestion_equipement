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
L'application s'ouvrira dans votre navigateur, par défaut à l'adresse **`http://localhost:5173`**.

> **Droits d'accès (état temporaire)** : tous les utilisateurs authentifiés ont les mêmes droits, quel que soit leur rôle. La séparation par rôle sera réintroduite dans un changement ultérieur. Les permissions étant portées par le jeton, il faut se **reconnecter** après une mise à jour pour les recevoir.

**Fonctionnalités récentes** (détails dans `frontend/README.md` et les README des services) :
- **Postes** : `POST/PATCH/DELETE /positions` (user-service), page « Postes » ; suppression refusée si une affectation est active.
- **Affectations** à un utilisateur, un département ou un poste ; filtres `assigneeType`, `assigneeId`, `status` sur `GET /assignments`.
- **Affectation groupée** : `POST /assignments/bulk` (1 à 200 équipements, tout ou rien) et sélection multiple dans la liste des équipements ; un équipement n'a qu'une affectation active (index partiel : appliquer les migrations avec `prisma migrate deploy`, voir `services/assignment-service/README.md`).
- **Import / export des équipements** (CSV, Excel) avec aperçu `POST /equipments/import/preview`.
- **Tableau de bord** alimenté par les KPIs (`GET /dashboard/kpis`) avec diagrammes d'analyse.

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
