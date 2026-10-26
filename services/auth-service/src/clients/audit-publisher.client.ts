import { getChannel, EXCHANGE } from "../config/rabbitmq";

interface AuditEventParams {
  action: string;
  routingKey: string;
  entityType: string;
  entityId: string;
  performedBy: string;
  metadata?: Record<string, unknown>;
}

const AUDIT_SERVICE_HTTP_URL = process.env.AUDIT_SERVICE_URL || "http://localhost:4006";

export const auditPublisher = {
  publish: async (params: AuditEventParams) => {
    const payload = {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      performedBy: params.performedBy,
      serviceName: process.env.SERVICE_NAME || "auth-service",
      metadata: params.metadata,
    };

    const channel = getChannel();

    if (channel) {
      try {
        channel.publish(
          EXCHANGE,
          params.routingKey,
          Buffer.from(JSON.stringify({ ...payload, timestamp: new Date().toISOString() })),
          { persistent: true }
        );
        return;
      } catch (err) {
        console.error(`[audit-publisher] Échec publication RabbitMQ, fallback HTTP...`);
      }
    }

    // HTTP Fallback direct vers audit-service via fetch natif
    try {
      await fetch(`${AUDIT_SERVICE_HTTP_URL}/audit-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-token": process.env.INTERNAL_SERVICE_TOKEN || "" },
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      console.warn(`[audit-publisher] Échec fallback HTTP:`, err.message);
    }
  },
};
