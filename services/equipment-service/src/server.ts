import "dotenv/config";
import app from "./app";
import { connectRabbitMQ } from "./config/rabbitmq";

const PORT = process.env.PORT || 4003;

connectRabbitMQ().catch(() => {
  console.warn("Démarrage sans RabbitMQ, les événements d'audit seront ignorés jusqu'à reconnexion");
});

app.listen(PORT, () => {
  console.log(`Equipment service is running on port ${PORT}`);
});
