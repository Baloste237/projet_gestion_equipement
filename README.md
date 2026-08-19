# Projet Gestion Équipement - Microservices

Ce projet est composé de 6 microservices communicant entre eux de façon synchrone (HTTP/REST via Axios) et asynchrone (RabbitMQ).

## 🚀 Lancement des Microservices

Avant de lancer les tests, assurez-vous que tous les microservices et leurs dépendances (PostgreSQL, RabbitMQ) sont démarrés.

### 1. Démarrer l'infrastructure (RabbitMQ)
Rendez-vous dans le dossier `infrastructure` et démarrez RabbitMQ via Docker Compose :
```bash
docker-compose up -d
```

### 2. Démarrer chaque service
Rendez-vous dans chacun des dossiers de services sous `/services` et lancez le serveur de développement :
```bash
# Pour chaque microservice (auth, user, equipment, assignment, inventory, audit)
npm run dev
```
Les services écouteront sur les ports locaux suivants :
- **Auth Service** : `http://localhost:4001`
- **User Service** : `http://localhost:4002`
- **Equipment Service** : `http://localhost:4003`
- **Assignment Service** : `http://localhost:4004`
- **Inventory Service** : `http://localhost:4005`
- **Audit Service** : `http://localhost:4006`

### 3. Démarrer l'API Gateway
Rendez-vous dans le dossier `gateway` et lancez le serveur :
```bash
npm run dev
```
La Gateway écoute sur le port global `http://localhost:4000`.

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

