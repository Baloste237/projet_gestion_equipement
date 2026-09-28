import { assignmentRepository } from "../Repositories/assignment.repository";
import { transferRepository } from "../Repositories/transfer.repository";
import { returnRepository } from "../Repositories/return.repository";
import { equipmentServiceClient } from "../clients/equipment-service.client";
import { assigneeResolver } from "./assignee.resolver";
import { eventPublisher } from "../clients/event-publisher.client";
import { throwError } from "../errors/throw-error";
import { AssigneeType, AssignmentFilters, CreateAssignmentDTO, CreateTransferDTO, CreateReturnDTO } from "../types/assignment.type";

type AssignmentRecord = { assigneeType: AssigneeType; assigneeId: string; equipmentId: string };

// Ajoute l'assigné (utilisateur, département ou poste) et l'équipement à une affectation
const withDetails = async <T extends AssignmentRecord>(assignment: T) => {
  const assignee = await assigneeResolver.find(assignment.assigneeType, assignment.assigneeId);
  let equipment = null;
  try {
    equipment = await equipmentServiceClient.getEquipmentById(assignment.equipmentId);
  } catch (_) {}
  return {
    ...assignment,
    assignee,
    user: assignment.assigneeType === "USER" ? assignee : null,
    equipment,
  };
};

// assignment.created, ou fin d'une affectation active : assignment.transferred / assignment.returned
const publishAssignmentEvent = (type: string, assignment: AssignmentRecord & { id: string }) =>
  eventPublisher.publish(type, {
    assignmentId: assignment.id,
    equipmentId: assignment.equipmentId,
    assigneeType: assignment.assigneeType,
    assigneeId: assignment.assigneeId,
  });

export const assignmentService = {
  create: async (data: CreateAssignmentDTO) => {
    // 1. Vérifier que l'assigné (utilisateur, département ou poste) existe et est actif
    await assigneeResolver.validate(data.assigneeType, data.assigneeId);

    // 2. Vérifier que l'équipement existe et est disponible
    const equipment = await equipmentServiceClient.getEquipmentById(data.equipmentId);
    if (equipment.status !== "AVAILABLE") throwError("EQUIPMENT_NOT_AVAILABLE");

    // 3. Créer l'affectation
    const assignment = await assignmentRepository.create({
      ...data,
      expectedReturnDate: data.expectedReturnDate ? new Date(data.expectedReturnDate) : undefined,
      status: "ACTIVE",
    });

    // 4. Mettre à jour le statut de l'équipement
    await equipmentServiceClient.updateEquipmentStatus(data.equipmentId, "ASSIGNED");

    publishAssignmentEvent("assignment.created", assignment);
    return assignment;
  },

  getAll: async (filters: AssignmentFilters = {}) => {
    const assignments = await assignmentRepository.findAll(filters);
    return Promise.all(assignments.map(withDetails));
  },

  getById: async (id: string) => {
    const assignment = await assignmentRepository.findById(id);
    if (!assignment) throw throwError("ASSIGNMENT_NOT_FOUND");
    return withDetails(assignment);
  },

  transfer: async (assignmentId: string, data: CreateTransferDTO) => {
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) throw throwError("ASSIGNMENT_NOT_FOUND");
    if (assignment.status !== "ACTIVE") throw throwError("ASSIGNMENT_NOT_ACTIVE");

    await assigneeResolver.validate("USER", data.toUserId);

    const transfer = await transferRepository.create({
      assignmentId,
      fromUserId: assignment.assigneeId,
      toUserId: data.toUserId,
      reason: data.reason,
    });

    await assignmentRepository.updateStatus(assignmentId, "TRANSFERRED");
    publishAssignmentEvent("assignment.transferred", assignment);

    // Créer une nouvelle affectation active vers le nouvel utilisateur
    const newAssignment = await assignmentRepository.create({
      equipmentId: assignment.equipmentId,
      assigneeType: "USER",
      assigneeId: data.toUserId,
      status: "ACTIVE",
    });
    publishAssignmentEvent("assignment.created", newAssignment);

    return { transfer, newAssignment };
  },

  return: async (assignmentId: string, data: CreateReturnDTO) => {
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) throw throwError("ASSIGNMENT_NOT_FOUND");
    if (assignment.status === "RETURNED") throw throwError("ASSIGNMENT_ALREADY_RETURNED");

    const returnRecord = await returnRepository.create({
      assignmentId,
      condition: data.condition,
      note: data.note,
    });

    await assignmentRepository.updateStatus(assignmentId, "RETURNED");
    publishAssignmentEvent("assignment.returned", assignment);

    // Remettre l'équipement disponible (sauf si perdu/endommagé)
    const newStatus = data.condition === "GOOD" ? "AVAILABLE" : "IN_MAINTENANCE";
    await equipmentServiceClient.updateEquipmentStatus(assignment.equipmentId, newStatus);

    return returnRecord;
  },
};
