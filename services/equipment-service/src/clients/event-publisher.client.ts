import { randomUUID } from "crypto";
import { getChannel, DOMAIN_EXCHANGE } from "../config/rabbitmq";

// État d'un équipement utile aux KPIs : les consommateurs calculent les écarts entre `before` et `after`
export interface EquipmentSnapshot {
  status: string;
  categoryId: string;
  categoryName: string | null;
  condition: string;
  commissionedAt: string | null;
  decommissionedAt: string | null;
}

export const toEquipmentSnapshot = (equipment: {
  status: string;
  categoryId: string;
  category?: { name: string } | null;
  condition?: string;
  commissionedAt?: Date | null;
  decommissionedAt?: Date | null;
}): EquipmentSnapshot => ({
  status: equipment.status,
  categoryId: equipment.categoryId,
  categoryName: equipment.category?.name ?? null,
  condition: equipment.condition ?? "FONCTIONNEL",
  commissionedAt: equipment.commissionedAt?.toISOString() ?? null,
  decommissionedAt: equipment.decommissionedAt?.toISOString() ?? null,
});

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
      source: process.env.SERVICE_NAME || "equipment-service",
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
