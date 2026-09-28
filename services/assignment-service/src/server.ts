import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectRabbitMQ } from "./config/rabbitmq";

const PORT = process.env.PORT || 4004;

connectRabbitMQ().catch(() => {
  console.warn("Démarrage sans RabbitMQ, les événements d'affectation seront ignorés jusqu'à reconnexion");
});

app.listen(PORT, () => {
  console.log(`Assignment service is running on port ${PORT}`);
});
// reload 3

