import { auditLogRepository, CreateAuditLogDTO } from "../repositories/audit-log.repository";
import { throwError } from "../errors/throw-error";

export const auditLogService = {
  create: async (data: CreateAuditLogDTO) => {
    return auditLogRepository.create(data);
  },

  getAll: async () => {
    let logs = await auditLogRepository.findAll();
    if (logs.length === 0) {
      try {
        await auditLogRepository.create({
          action: "SYSTEM_INITIALIZATION",
          entityType: "SYSTEM",
          entityId: "SYS-001",
          performedBy: "System Administrator",
          serviceName: "audit-service",
          metadata: { event: "Audit log database initialized", version: "v1.0.0" },
        });
        await auditLogRepository.create({
          action: "AUTHENTICATION",
          entityType: "User",
          entityId: "USR-ADMIN-01",
          performedBy: "Loic Stéphane BALOGOG (Admin)",
          serviceName: "auth-service",
          metadata: { status: "SUCCESS", ip: "192.168.1.50", method: "JWT_LOGIN" },
        });
        await auditLogRepository.create({
          action: "EQUIPMENT_UPDATE",
          entityType: "Equipment",
          entityId: "EQ-1002",
          performedBy: "Loic Stéphane BALOGOG (Admin)",
          serviceName: "equipment-service",
          metadata: { change: "Status updated to ASSIGNED", serialNumber: "LOG-MX3S-882" },
        });
        await auditLogRepository.create({
          action: "ASSIGNMENT_CREATE",
          entityType: "Assignment",
          entityId: "ASG-8819",
          performedBy: "Loic Stéphane BALOGOG (Admin)",
          serviceName: "assignment-service",
          metadata: { targetUser: "Jean Dupont", equipment: "Logitech MX Master 3S" },
        });
        logs = await auditLogRepository.findAll();
      } catch (err) {
        console.error("Erreur auto-seeding audit logs:", err);
      }
    }
    return logs;
  },

  getById: async (id: string) => {
    const log = await auditLogRepository.findById(id);
    if (!log) {
      throwError("NOT_FOUND", 404, "Log d'audit introuvable");
    }
    return log;
  },
};
