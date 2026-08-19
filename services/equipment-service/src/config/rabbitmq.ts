import amqp, { Channel, Connection } from "amqplib";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://admin:admin@localhost:5672";
const EXCHANGE_NAME = "audit_events";

let connection: Connection | null = null;
let channel: Channel | null = null;

export const connectRabbitMQ = async (): Promise<Channel> => {
  if (channel) return channel;

  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });

    connection.on("error", (err: any) => {
      console.error("[RabbitMQ] Erreur de connexion:", err?.message || err);
      channel = null;
      connection = null;
    });

    connection.on("close", () => {
      console.warn("[RabbitMQ] Connexion fermée, reconnexion dans 5s...");
      channel = null;
      connection = null;
      setTimeout(connectRabbitMQ, 5000);
    });

    console.log("[RabbitMQ] Connecté avec succès");
    return channel;
  } catch (err) {
    console.error("[RabbitMQ] Échec de connexion, nouvelle tentative dans 5s...", err);
    setTimeout(connectRabbitMQ, 5000);
    throw err;
  }
};

export const getChannel = (): Channel | null => channel;
export const EXCHANGE = EXCHANGE_NAME;
