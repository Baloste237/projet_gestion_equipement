import { auditLogRepository, CreateAuditLogDTO } from "../repositories/audit-log.repository";
import { throwError } from "../errors/throw-error";

export const auditLogService = {
  create: async (data: CreateAuditLogDTO) => {
    return auditLogRepository.create(data);
  },

  getAll: async () => {
    return auditLogRepository.findAll();
  },

  getById: async (id: string) => {
    const log = await auditLogRepository.findById(id);
    if (!log) {
      throwError("NOT_FOUND", 404, "Log d'audit introuvable");
    }
    return log;
  },
};
