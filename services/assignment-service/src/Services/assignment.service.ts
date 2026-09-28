import { assignmentRepository } from "../Repositories/assignment.repository";
import { transferRepository } from "../Repositories/transfer.repository";
import { returnRepository } from "../Repositories/return.repository";
import { equipmentServiceClient } from "../clients/equipment-service.client";
import { assigneeResolver } from "./assignee.resolver";
import { eventPublisher } from "../clients/event-publisher.client";
import { auditPublisher } from "../clients/audit-publisher.client";
import { throwError } from "../errors/throw-error";
import { AppError } from "../errors/app-error";
import {
  AssigneeType,
  AssignmentFilters,
  BulkRefusal,
  BulkRefusalReason,
  CreateAssignmentDTO,
  CreateBulkAssignmentDTO,
  CreateTransferDTO,
  CreateReturnDTO,
} from "../types/assignment.type";
import { randomUUID } from "crypto";

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

// Violation de l'index unique « une seule affectation ACTIVE par équipement » (Prisma P2002)
const isUniqueViolation = (err: any) =>
  err?.code === "P2002" || /unique constraint/i.test(String(err?.message ?? ""));

const STATUS_CONFLICT_TO_REFUSAL: Record<string, BulkRefusalReason> = {
  NOT_FOUND: "NOT_FOUND",
  STATUS_MISMATCH: "NOT_AVAILABLE",
};

export const assignmentService = {
  /**
   * Affecte N équipements à un même bénéficiaire, tout ou rien :
   * 1. valider le bénéficiaire ; 2. valider tous les équipements (existent et disponibles) ;
   * 3. enregistrer toutes les affectations dans une transaction (l'index unique protège de la concurrence) ;
   * 4. passer les équipements à ASSIGNED en un appel groupé, sinon supprimer les affectations créées ;
   * 5. seulement après succès : événements et audit.
   */
  createMany: async (input: CreateBulkAssignmentDTO, performedBy: string = "inconnu") => {
    const { equipmentIds, assigneeType, assigneeId, expectedReturnDate, ...common } = input;

    // 1. Le bénéficiaire (utilisateur, département ou poste) existe et est actif
    await assigneeResolver.validate(assigneeType, assigneeId);

    // 2. Chaque équipement existe et est disponible ; tous les refus sont listés
    const found = new Map((await equipmentServiceClient.lookup(equipmentIds)).map((e) => [e.id, e]));
    const refusals: BulkRefusal[] = equipmentIds.flatMap((id): BulkRefusal[] => {
      const equipment = found.get(id);
      if (!equipment) return [{ equipmentId: id, reason: "NOT_FOUND" }];
      if (equipment.status === "AVAILABLE") return [];
      return [{ equipmentId: id, name: equipment.name, serialNumber: equipment.serialNumber, reason: "NOT_AVAILABLE" }];
    });
    if (refusals.length) throwError("BULK_ASSIGNMENT_REFUSED", undefined, refusals);

    // 3. Enregistrement en une transaction
    let created: Awaited<ReturnType<typeof assignmentRepository.createMany>>;
    try {
      created = await assignmentRepository.createMany(
        equipmentIds.map((equipmentId) => ({
          ...common,
          equipmentId,
          assigneeType,
          assigneeId,
          expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : undefined,
          status: "ACTIVE",
        }))
      );
    } catch (err) {
      if (isUniqueViolation(err)) throwError("EQUIPMENT_ALREADY_ASSIGNED");
      throw err;
    }

    // 4. Changement de statut groupé ; en cas d'échec ou de refus, on retire ce qui vient d'être créé
    const createdIds = created.map((a) => a.id);
    const rollback = async () => {
      try {
        await assignmentRepository.deleteByIds(createdIds);
      } catch (err) {
        console.error("[assignment] Échec de la compensation, affectations à supprimer:", createdIds, err);
      }
    };
    try {
      const result = await equipmentServiceClient.updateStatusBatch(equipmentIds, "AVAILABLE", "ASSIGNED", performedBy);
      if (!result.ok) {
        await rollback();
        const details: BulkRefusal[] = result.conflicts.map((c) => ({
          equipmentId: c.id,
          reason: STATUS_CONFLICT_TO_REFUSAL[c.reason] ?? "NOT_AVAILABLE",
        }));
        throwError("BULK_ASSIGNMENT_REFUSED", undefined, details);
      }
    } catch (err) {
      if (!(err instanceof AppError && err.code === "BULK_ASSIGNMENT_REFUSED")) await rollback();
      throw err;
    }

    // 5. Succès : événements (un par affectation) et audit (un par opération)
    created.forEach((assignment) => publishAssignmentEvent("assignment.created", assignment));
    const single = created.length === 1;
    auditPublisher.publish({
      action: "ASSIGNMENTS_CREATED",
      entityType: single ? "Assignment" : "AssignmentBatch",
      entityId: single ? created[0].id : randomUUID(),
      performedBy,
      metadata: {
        assigneeType,
        assigneeId,
        count: created.length,
        items: created.map((a) => ({ equipmentId: a.equipmentId, assignmentId: a.id })),
      },
    });
    return created;
  },

  // Affectation unitaire : cas particulier de l'affectation groupée, avec les codes d'erreur historiques
  create: async (data: CreateAssignmentDTO, performedBy?: string) => {
    const { equipmentId, ...rest } = data;
    try {
      const [assignment] = await assignmentService.createMany({ ...rest, equipmentIds: [equipmentId] }, performedBy);
      return assignment;
    } catch (err) {
      if (err instanceof AppError && err.code === "BULK_ASSIGNMENT_REFUSED") {
        const reason = (err.details as BulkRefusal[] | undefined)?.[0]?.reason;
        throwError(reason === "NOT_FOUND" ? "EQUIPMENT_NOT_FOUND" : "EQUIPMENT_NOT_AVAILABLE");
      }
      throw err;
    }
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
