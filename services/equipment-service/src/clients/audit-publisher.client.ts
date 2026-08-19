import { getChannel, EXCHANGE } from "../config/rabbitmq";

interface AuditEventParams {
  action: string;
  routingKey: string;
  entityType: string;
  entityId: string;
  performedBy: string;
  metadata?: Record<string, unknown>;
}

export const auditPublisher = {
  publish: (params: AuditEventParams) => {
    const channel = getChannel();

    if (!channel) {
      console.warn(`[audit-publisher] Canal RabbitMQ indisponible, événement perdu: ${params.routingKey}`);
      return;
    }

    const payload = {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      performedBy: params.performedBy,
      serviceName: process.env.SERVICE_NAME,
      metadata: params.metadata,
      timestamp: new Date().toISOString(),
    };

    try {
      channel.publish(
        EXCHANGE,
        params.routingKey,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true }
      );
    } catch (err) {
      console.error(`[audit-publisher] Échec de publication:`, err);
    }
  },
};
