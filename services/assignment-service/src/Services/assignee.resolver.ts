import { userServiceClient } from "../clients/user-service.client";
import { throwError } from "../errors/throw-error";
import { ErrorCode } from "../errors/error-codes";
import { AssigneeType } from "../types/assignment.type";

const lookups: Record<AssigneeType, { fetch: (id: string) => Promise<any>; inactiveCode: ErrorCode }> = {
  USER: { fetch: (id) => userServiceClient.getUserById(id), inactiveCode: "USER_DEACTIVATED_CANNOT_ASSIGN" },
  DEPARTMENT: { fetch: (id) => userServiceClient.getDepartmentById(id), inactiveCode: "DEPARTMENT_INACTIVE_CANNOT_ASSIGN" },
  POSITION: { fetch: (id) => userServiceClient.getPositionById(id), inactiveCode: "POSITION_INACTIVE_CANNOT_ASSIGN" },
};

export const assigneeResolver = {
  // Vérifie auprès de user-service que l'assigné existe et est actif (lève une AppError sinon)
  validate: async (type: AssigneeType, id: string) => {
    const lookup = lookups[type];
    const assignee = await lookup.fetch(id);
    if (!assignee || assignee.isActive === false) throwError(lookup.inactiveCode);
    return assignee;
  },

  // Enrichissement best-effort pour l'affichage : null si l'assigné est introuvable
  find: async (type: AssigneeType, id: string) => {
    try {
      return await lookups[type].fetch(id);
    } catch (_) {
      return null;
    }
  },
};
