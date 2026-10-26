import "dotenv/config";
import app from "./app";
import { assertSecurityConfig } from "./config/security-config";

// Refuse de démarrer sans secret : aucune valeur de repli
assertSecurityConfig("JWT_SECRET", "INTERNAL_SERVICE_TOKEN");

import { connectRabbitMQ } from "./config/rabbitmq";

const PORT = process.env.PORT || 4001;

connectRabbitMQ().catch(() => {
  console.warn("Démarrage sans RabbitMQ, les événements d'audit seront ignorés jusqu'à reconnexion");
});

app.listen(PORT, () => {
  console.log(`auth-service running on port ${PORT}`);
});
