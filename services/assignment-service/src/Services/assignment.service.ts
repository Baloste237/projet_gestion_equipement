import { assignmentRepository } from "../repositories/assignment.repository";
import { transferRepository } from "../repositories/transfer.repository";
import { returnRepository } from "../repositories/return.repository";
import { userServiceClient } from "../clients/user-service.client";
import { equipmentServiceClient } from "../clients/equipment-service.client";
import { throwError } from "../errors/throw-error";
import { CreateAssignmentDTO, CreateTransferDTO, CreateReturnDTO } from "../types/assignment.type";

export const assignmentService = {
  create: async (data: CreateAssignmentDTO) => {
    // 1. Vérifier que l'utilisateur existe et est actif
    const user = await userServiceClient.getUserById(data.userId);
    if (!user.isActive) throwError("USER_DEACTIVATED_CANNOT_ASSIGN");

    // 2. Vérifier que l'équipement existe et est disponible
    const equipment = await equipmentServiceClient.getEquipmentById(data.equipmentId);
    if (equipment.status !== "AVAILABLE") throwError("EQUIPMENT_NOT_AVAILABLE");

    // 3. Créer l'affectation
    const assignment = await assignmentRepository.create({ ...data, status: "ACTIVE" });

    // 4. Mettre à jour le statut de l'équipement
    await equipmentServiceClient.updateEquipmentStatus(data.equipmentId, "ASSIGNED");

    return assignment;
  },

  getAll: () => assignmentRepository.findAll(),

  getById: async (id: string) => {
    const assignment = await assignmentRepository.findById(id);
    if (!assignment) throwError("ASSIGNMENT_NOT_FOUND");
    return assignment;
  },

  transfer: async (assignmentId: string, data: CreateTransferDTO) => {
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) throwError("ASSIGNMENT_NOT_FOUND");
    if (assignment.status !== "ACTIVE") throwError("ASSIGNMENT_NOT_ACTIVE");

    const newUser = await userServiceClient.getUserById(data.toUserId);
    if (!newUser.isActive) throwError("USER_DEACTIVATED_CANNOT_ASSIGN");

    const transfer = await transferRepository.create({
      assignmentId,
      fromUserId: assignment.userId,
      toUserId: data.toUserId,
      reason: data.reason,
    });

    await assignmentRepository.updateStatus(assignmentId, "TRANSFERRED");

    // Créer une nouvelle affectation active vers le nouvel utilisateur
    const newAssignment = await assignmentRepository.create({
      equipmentId: assignment.equipmentId,
      userId: data.toUserId,
      status: "ACTIVE",
    });

    return { transfer, newAssignment };
  },

  return: async (assignmentId: string, data: CreateReturnDTO) => {
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) throwError("ASSIGNMENT_NOT_FOUND");
    if (assignment.status === "RETURNED") throwError("ASSIGNMENT_ALREADY_RETURNED");

    const returnRecord = await returnRepository.create({
      assignmentId,
      condition: data.condition,
      note: data.note,
    });

    await assignmentRepository.updateStatus(assignmentId, "RETURNED");

    // Remettre l'équipement disponible (sauf si perdu/endommagé)
    const newStatus = data.condition === "GOOD" ? "AVAILABLE" : "IN_MAINTENANCE";
    await equipmentServiceClient.updateEquipmentStatus(assignment.equipmentId, newStatus);

    return returnRecord;
  },
};
