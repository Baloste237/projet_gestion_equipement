import { randomUUID } from "crypto";
import { getChannel, DOMAIN_EXCHANGE } from "../config/rabbitmq";

export const eventPublisher = {
  publish: (type: string, data: Record<string, unknown>) => {
    const channel = getChannel();

    if (!channel) {
      console.warn(`[event-publisher] Canal RabbitMQ indisponible, événement perdu: ${type}`);
      return;
    }

    const event = {
      eventId: randomUUID(),
      type,
      occurredAt: new Date().toISOString(),
      source: process.env.SERVICE_NAME || "assignment-service",
      data,
    };

    try {
      channel.publish(DOMAIN_EXCHANGE, type, Buffer.from(JSON.stringify(event)), {
        persistent: true,
        contentType: "application/json",
        messageId: event.eventId,
      });
    } catch (err) {
      console.error(`[event-publisher] Échec de publication:`, err);
    }
  },
};
