import amqp, { Channel } from "amqplib";
import { auditLogService } from "../services/audit-log.service";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://admin:admin@localhost:5672";
const EXCHANGE_NAME = "audit_events";
const QUEUE_NAME = "audit_service_queue";

interface AuditEventPayload {
  action: string;
  entityType: string;
  entityId: string;
  performedBy: string;
  serviceName: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export const startAuditConsumer = async (): Promise<void> => {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel: Channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, "#");

    channel.prefetch(1);

    console.log("[audit-consumer] En écoute sur", QUEUE_NAME);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (!msg) return;

      try {
        const payload: AuditEventPayload = JSON.parse(msg.content.toString());

        await auditLogService.create({
          action: payload.action,
          entityType: payload.entityType,
          entityId: payload.entityId,
          performedBy: payload.performedBy,
          serviceName: payload.serviceName,
          metadata: payload.metadata,
        });

        channel.ack(msg);
      } catch (err) {
        console.error("[audit-consumer] Erreur de traitement:", err);
        channel.nack(msg, false, false);
      }
    });

    connection.on("close", () => {
      console.warn("[audit-consumer] Connexion fermée, reconnexion dans 5s...");
      setTimeout(startAuditConsumer, 5000);
    });
  } catch (err) {
    console.error("[audit-consumer] Échec de connexion, nouvelle tentative dans 5s...", err);
    setTimeout(startAuditConsumer, 5000);
  }
};
