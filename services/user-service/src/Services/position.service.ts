import { positionRepository } from "../Repositories/position.repository";
import { departmentRepository } from "../Repositories/departmentRepository";
import { assignmentServiceClient } from "../clients/assignment-service.client";
import { auditPublisher } from "../clients/audit-publisher.client";
import { AppError } from "../errors/app-error";
import { CreatePositionDTO, UpdatePositionDTO } from "../Types/position.type";

// `status` et `isActive` décrivent le même état : on renseigne toujours les deux, comme pour les départements
const withConsistentState = <T extends { status?: "ACTIF" | "INACTIF"; isActive?: boolean }>(data: T): T => {
  if (data.status !== undefined && data.isActive === undefined) {
    return { ...data, isActive: data.status === "ACTIF" };
  }
  if (data.isActive !== undefined && data.status === undefined) {
    return { ...data, status: data.isActive ? "ACTIF" : "INACTIF" };
  }
  return data;
};

const assertDepartmentExists = async (departmentId: string) => {
  const department = await departmentRepository.findById(departmentId);
  if (!department) throw new AppError("DEPARTMENT_NOT_FOUND", 400, "Le département indiqué n'existe pas");
};

const assertNameAvailable = async (name: string, departmentId: string, exceptId?: string) => {
  const existing = await positionRepository.findByNameInDepartment(name, departmentId);
  if (existing && existing.id !== exceptId) {
    throw new AppError("POSITION_NAME_CONFLICT", 409, "Un poste portant ce nom existe déjà dans ce département");
  }
};

export const positionService = {
  getAll: (departmentId?: string) => positionRepository.findAll(departmentId),

  getById: async (id: string) => {
    const position = await positionRepository.findById(id);
    if (!position) throw new Error("POSITION_NOT_FOUND");
    return position;
  },

  create: async (data: CreatePositionDTO) => {
    const name = data.name.trim();
    await assertDepartmentExists(data.departmentId);
    await assertNameAvailable(name, data.departmentId);
    return positionRepository.create(withConsistentState({ ...data, name }));
  },

  update: async (id: string, data: UpdatePositionDTO) => {
    const position = await positionRepository.findById(id);
    if (!position) throw new Error("POSITION_NOT_FOUND");

    const name = data.name?.trim();
    const departmentId = data.departmentId ?? position.departmentId;
    if (data.departmentId !== undefined && data.departmentId !== position.departmentId) {
      await assertDepartmentExists(data.departmentId);
    }
    if (data.name !== undefined || data.departmentId !== undefined) {
      await assertNameAvailable(name ?? position.name, departmentId, id);
    }
    return positionRepository.update(id, withConsistentState(name === undefined ? data : { ...data, name }));
  },

  delete: async (id: string, authorization?: string) => {
    const position = await positionRepository.findById(id);
    if (!position) throw new Error("POSITION_NOT_FOUND");

    // Échec fermé : si les affectations ne peuvent pas être vérifiées, on ne supprime pas
    const activeAssignments = await assignmentServiceClient.countActiveForPosition(id, authorization);
    if (activeAssignments > 0) {
      throw new AppError(
        "POSITION_HAS_ACTIVE_ASSIGNMENTS",
        409,
        "Des équipements sont encore affectés à ce poste"
      );
    }
    return positionRepository.delete(id);
  },

  // Supprime tous les postes ; les utilisateurs rattachés sont détachés automatiquement (SetNull Prisma)
  purgeAll: async (performedBy: string) => {
    const result = await positionRepository.purgeAll();
    void auditPublisher.publish({
      action: "POSITION_LIST_PURGED",
      entityType: "Position",
      entityId: "all",
      performedBy,
      metadata: { deletedCount: result.count },
    });
    return result;
  },
};
