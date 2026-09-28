import { equipmentRepository } from "../repositories/equipment.repository";
import { CreateEquipmentDTO, UpdateEquipmentDTO, TransferEquipmentDTO } from "../types/equipment.type";
import { auditPublisher } from "../clients/audit-publisher.client";
import { eventPublisher, toEquipmentSnapshot } from "../clients/event-publisher.client";
import { HttpError } from "../errors/http-error";

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
  // Lecture de plusieurs équipements en un appel ; les identifiants absents sont simplement omis
  lookup: async (ids: string[]) => {
    const equipments = await equipmentRepository.findManyByIds(ids);
    return equipments.map((e) => ({ id: e.id, name: e.name, serialNumber: e.serialNumber, status: e.status }));
  },
  // Changement de statut atomique : tout ou rien, avec l'audit et les événements par équipement
  updateStatusBatch: async (ids: string[], from: string, to: string, performedBy: string = "system") => {
    const result = await equipmentRepository.updateStatusIfAll(ids, from, to);
    if (!result.ok) {
      throw new HttpError(409, `Certains équipements ne sont pas au statut ${from} : aucun n'a été modifié`, result.conflicts);
    }
    const beforeById = new Map<string, any>(result.before.map((e: any) => [e.id, e]));
    for (const equipment of result.after) {
      auditPublisher.publish({
        action: "EQUIPMENT_UPDATED",
        routingKey: "equipment.updated",
        entityType: "Equipment",
        entityId: equipment.id,
        performedBy,
        metadata: { modifiedFields: ["status"], from, to },
      });
      eventPublisher.publish("equipment.updated", {
        equipmentId: equipment.id,
        before: toEquipmentSnapshot(beforeById.get(equipment.id)),
        after: toEquipmentSnapshot(equipment),
      });
    }
    return { updatedCount: result.after.length, ids: result.after.map((e: any) => e.id) };
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
