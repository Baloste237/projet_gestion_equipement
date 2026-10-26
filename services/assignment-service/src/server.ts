import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { assertSecurityConfig } from "./config/security-config";

// Refuse de démarrer sans secret : aucune valeur de repli
assertSecurityConfig("JWT_SECRET", "INTERNAL_SERVICE_TOKEN");

import { connectRabbitMQ } from "./config/rabbitmq";

const PORT = process.env.PORT || 4004;

connectRabbitMQ().catch(() => {
  console.warn("Démarrage sans RabbitMQ, les événements d'affectation seront ignorés jusqu'à reconnexion");
});

app.listen(PORT, () => {
  console.log(`Assignment service is running on port ${PORT}`);
});
// reload 3

