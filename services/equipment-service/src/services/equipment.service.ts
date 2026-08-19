import { equipmentRepository } from "../repositories/equipment.repository";
import { CreateEquipmentDTO, UpdateEquipmentDTO } from "../types/equipment.type";
import { auditPublisher } from "../clients/audit-publisher.client";

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
    return equipment;
  },
  getAll: () => equipmentRepository.findAll(),
  getById: async (id: string) => {
    const equipment = await equipmentRepository.findById(id);
    if (!equipment) throw new Error("EQUIPMENT_NOT_FOUND");
    return equipment;
  },
  update: async (id: string, data: UpdateEquipmentDTO, performedBy: string = "system") => {
    const equipment = await equipmentRepository.update(id, data);
    auditPublisher.publish({
      action: "EQUIPMENT_UPDATED",
      routingKey: "equipment.updated",
      entityType: "Equipment",
      entityId: equipment.id,
      performedBy,
      metadata: { modifiedFields: Object.keys(data) },
    });
    return equipment;
  },
  delete: async (id: string, performedBy: string = "system") => {
    const equipment = await equipmentRepository.delete(id);
    auditPublisher.publish({
      action: "EQUIPMENT_DELETED",
      routingKey: "equipment.deleted",
      entityType: "Equipment",
      entityId: id,
      performedBy,
    });
    return equipment;
  },
};
