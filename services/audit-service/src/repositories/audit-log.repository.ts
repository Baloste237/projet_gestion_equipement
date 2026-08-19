import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";

export interface CreateAuditLogDTO {
  action: string;
  entityType: string;
  entityId: string;
  performedBy: string;
  serviceName: string;
  metadata?: unknown;
}

export const auditLogRepository = {
  create: (data: CreateAuditLogDTO) =>
    prisma.auditLog.create({
      data: {
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        performedBy: data.performedBy,
        serviceName: data.serviceName,
        metadata: (data.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    }),

  findAll: () =>
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
    }),

  findById: (id: string) =>
    prisma.auditLog.findUnique({
      where: { id },
    }),
};
