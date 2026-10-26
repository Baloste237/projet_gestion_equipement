#!/bin/bash
set -e

echo "=== Démarrage du système unifié sur Render ==="

# Gestion propre de l'arrêt des processus enfants
PIDS=()
cleanup() {
  echo "Arrêt des services..."
  for pid in "${PIDS[@]}"; do
    kill -TERM "$pid" 2>/dev/null || true
  done
  exit 0
}
trap cleanup SIGINT SIGTERM

# Définition des secrets partagés et URLs internes par défaut
export JWT_SECRET="${JWT_SECRET:-super-secret-jwt-key-equip-core}"
export INTERNAL_SERVICE_TOKEN="${INTERNAL_SERVICE_TOKEN:-internal-service-secret-token}"

export AUTH_SERVICE_URL="${AUTH_SERVICE_URL:-http://localhost:4001}"
export USER_SERVICE_URL="${USER_SERVICE_URL:-http://localhost:4002}"
export EQUIPMENT_SERVICE_URL="${EQUIPMENT_SERVICE_URL:-http://localhost:4003}"
export ASSIGNMENT_SERVICE_URL="${ASSIGNMENT_SERVICE_URL:-http://localhost:4004}"
export INVENTORY_SERVICE_URL="${INVENTORY_SERVICE_URL:-http://localhost:4005}"
export AUDIT_SERVICE_URL="${AUDIT_SERVICE_URL:-http://localhost:4006}"

# Configuration des URLs de base de données (séparées ou base unique avec schémas)
export AUTH_DATABASE_URL="${AUTH_DATABASE_URL:-${DATABASE_URL}}"
export USER_DATABASE_URL="${USER_DATABASE_URL:-${DATABASE_URL}}"
export EQUIPMENT_DATABASE_URL="${EQUIPMENT_DATABASE_URL:-${DATABASE_URL}}"
export ASSIGNMENT_DATABASE_URL="${ASSIGNMENT_DATABASE_URL:-${DATABASE_URL}}"
export INVENTORY_DATABASE_URL="${INVENTORY_DATABASE_URL:-${DATABASE_URL}}"
export AUDIT_DATABASE_URL="${AUDIT_DATABASE_URL:-${DATABASE_URL}}"

# Helper pour lancer un service node
start_service() {
  local service_name="$1"
  local service_dir="$2"
  local port="$3"
  local db_url="$4"

  echo "--> Démarrage de $service_name sur le port $port..."
  (
    cd "$service_dir"
    export PORT="$port"
    if [ -n "$db_url" ]; then
      export DATABASE_URL="$db_url"
      echo "Application des migrations Prisma pour $service_name..."
      npx prisma migrate deploy || echo "Avertissement: Les migrations pour $service_name ont été ignorées ou ont échoué."
    fi

    if [ -f dist/server.js ]; then
      exec node dist/server.js
    elif [ -f dist/src/server.js ]; then
      exec node dist/src/server.js
    else
      echo "Erreur: Aucun point d'entrée trouvé pour $service_name"
      exit 1
    fi
  ) &
  PIDS+=($!)
}

# 1. Démarrer les 6 microservices internes en arrière-plan
start_service "auth-service" "/app/services/auth-service" 4001 "$AUTH_DATABASE_URL"
start_service "user-service" "/app/services/user-service" 4002 "$USER_DATABASE_URL"
start_service "equipment-service" "/app/services/equipment-service" 4003 "$EQUIPMENT_DATABASE_URL"
start_service "assignment-service" "/app/services/assignment-service" 4004 "$ASSIGNMENT_DATABASE_URL"
start_service "inventory-service" "/app/services/inventory-service" 4005 "$INVENTORY_DATABASE_URL"
start_service "audit-service" "/app/services/audit-service" 4006 "$AUDIT_DATABASE_URL"

# Attendre 2 secondes que les microservices s'initialisent
sleep 2

# 2. Démarrer le Gateway au premier plan sur le port exposé par Render ($PORT ou 4000)
export PORT="${PORT:-4000}"
export TRUST_PROXY_HOPS="${TRUST_PROXY_HOPS:-1}"
echo "--> Démarrage du Gateway public sur le port $PORT..."
cd /app/gateway
if [ -f dist/server.js ]; then
  exec node dist/server.js
elif [ -f dist/src/server.js ]; then
  exec node dist/src/server.js
else
  echo "Erreur: Point d'entrée introuvable pour le Gateway"
  exit 1
fi
