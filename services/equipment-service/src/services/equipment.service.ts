import { equipmentRepository } from "../repositories/equipment.repository";
import { CreateEquipmentDTO, UpdateEquipmentDTO, TransferEquipmentDTO } from "../types/equipment.type";
import { auditPublisher } from "../clients/audit-publisher.client";
import { eventPublisher, toEquipmentSnapshot } from "../clients/event-publisher.client";

export const equipmentService = {
  create: async (data: CreateEquipmentDTO, performedBy: string = "system") => {
    const equipment = await equipmentRepository.create(data);
    auditPublisher.publish({
      action: "EQUIPMENT_CREATED",
      routingKey: "equipment.created",
      entityType: "Equipment",
      entityId: equipment.id,
      performedBy,
      metadata: { name: equipment.name, serialNumber: equipment.serialNumber },
    });
    eventPublisher.publish("equipment.created", {
      equipmentId: equipment.id,
      after: toEquipmentSnapshot(equipment),
    });
    return equipment;
  },
  getAll: () => equipmentRepository.findAll(),
  getById: async (id: string) => {
    const equipment = await equipmentRepository.findById(id);
    if (!equipment) throw new Error("EQUIPMENT_NOT_FOUND");
    return equipment;
  },
  update: async (id: string, data: UpdateEquipmentDTO, performedBy: string = "system") => {
    const previous = await equipmentRepository.findById(id);
    const equipment = await equipmentRepository.update(id, data);
    auditPublisher.publish({
      action: "EQUIPMENT_UPDATED",
      routingKey: "equipment.updated",
      entityType: "Equipment",
      entityId: equipment.id,
      performedBy,
      metadata: { modifiedFields: Object.keys(data) },
    });
    if (previous && (previous.status !== equipment.status || previous.categoryId !== equipment.categoryId)) {
      eventPublisher.publish("equipment.updated", {
        equipmentId: equipment.id,
        before: toEquipmentSnapshot(previous),
        after: toEquipmentSnapshot(equipment),
      });
    }
    return equipment;
  },
  transfer: async (id: string, data: TransferEquipmentDTO, performedBy: string = "system") => {
    const equipment = await equipmentRepository.findById(id);
    if (!equipment) throw new Error("EQUIPMENT_NOT_FOUND");
    auditPublisher.publish({
      action: "EQUIPMENT_TRANSFERRED",
      routingKey: "equipment.transferred",
      entityType: "Equipment",
      entityId: id,
      performedBy,
      metadata: {
        toUserId: data.toUserId,
        toDepartmentId: data.toDepartmentId,
        reason: data.reason,
      },
    });
    return equipment;
  },
  delete: async (id: string, performedBy: string = "system") => {
    const previous = await equipmentRepository.findById(id);
    const equipment = await equipmentRepository.delete(id);
    auditPublisher.publish({
      action: "EQUIPMENT_DELETED",
      routingKey: "equipment.deleted",
      entityType: "Equipment",
      entityId: id,
      performedBy,
    });
    if (previous) {
      eventPublisher.publish("equipment.deleted", {
        equipmentId: id,
        before: toEquipmentSnapshot(previous),
      });
    }
    return equipment;
  },
};
