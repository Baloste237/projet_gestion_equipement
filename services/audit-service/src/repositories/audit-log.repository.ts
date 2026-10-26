import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";
import { AuditCategory, AuditListQuery, dayBounds } from "../validators/audit-list.validator";

export interface CreateAuditLogDTO {
  action: string;
  entityType: string;
  entityId: string;
  performedBy: string;
  serviceName: string;
  metadata?: unknown;
}

// Mêmes correspondances d'actions que celles qu'appliquait la page d'audit dans le navigateur
const AUTH_ACTIONS = ["AUTH", "LOGIN", "LOGOUT"];
const MUTATION_ACTIONS = ["CREATE", "UPDATE", "DELETE", "TRANSFER", "RETURN"];
const SYSTEM_ACTIONS = ["SYSTEM", "MAINTENANCE", "INVENTORY"];

const actionContains = (words: string[]): Prisma.AuditLogWhereInput => ({
  OR: words.map((word) => ({ action: { contains: word } })),
});

const CATEGORY_WHERE: Record<AuditCategory, Prisma.AuditLogWhereInput> = {
  AUTHENTICATION: actionContains(AUTH_ACTIONS),
  DATA_MUTATION: actionContains(MUTATION_ACTIONS),
  SYSTEM_EVENT: actionContains(SYSTEM_ACTIONS),
};

// Échec : action en échec, ou métadonnées « status = FAILED » / « success = false »
const FAILED_WHERE: Prisma.AuditLogWhereInput = {
  OR: [
    { action: { contains: "FAILED" } },
    { metadata: { path: ["status"], equals: "FAILED" } },
    { metadata: { path: ["success"], equals: false } },
  ],
};

// Acteur, identifiant d'entité ou identifiant du journal (casse ignorée), catégorie d'action et jour UTC
export const buildAuditWhere = (query: AuditListQuery): Prisma.AuditLogWhereInput => {
  const clauses: Prisma.AuditLogWhereInput[] = [];
  if (query.q) {
    clauses.push({
      OR: [
        { performedBy: { contains: query.q, mode: "insensitive" } },
        { entityId: { contains: query.q, mode: "insensitive" } },
        { id: { contains: query.q, mode: "insensitive" } },
      ],
    });
  }
  if (query.category) clauses.push(CATEGORY_WHERE[query.category]);
  if (query.date) {
    const { from, to } = dayBounds(query.date);
    clauses.push({ createdAt: { gte: from, lte: to } });
  }
  return clauses.length ? { AND: clauses } : {};
};

// Les plus récents d'abord ; l'identifiant départage les journaux de même date
const ORDER_BY: Prisma.AuditLogOrderByWithRelationInput[] = [{ createdAt: "desc" }, { id: "desc" }];

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

  findAll: (query: AuditListQuery = { pagination: null }) =>
    prisma.auditLog.findMany({
      where: buildAuditWhere(query),
      orderBy: ORDER_BY,
    }),

  // Une page et le nombre total de journaux correspondant aux filtres, lus dans la même transaction
  findPage: async (query: AuditListQuery) => {
    const { skip, take } = query.pagination!;
    const where = buildAuditWhere(query);
    const [rows, total] = await prisma.$transaction([
      prisma.auditLog.findMany({ where, orderBy: ORDER_BY, skip, take }),
      prisma.auditLog.count({ where }),
    ]);
    return { rows, total };
  },

  // Compteurs sur tout le journal, sans filtre
  summary: async () => {
    const [total, authCount, mutationCount, failedCount] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: CATEGORY_WHERE.AUTHENTICATION }),
      prisma.auditLog.count({ where: CATEGORY_WHERE.DATA_MUTATION }),
      prisma.auditLog.count({ where: FAILED_WHERE }),
    ]);
    return { total, authCount, mutationCount, failedCount };
  },

  findById: (id: string) =>
    prisma.auditLog.findUnique({
      where: { id },
    }),
};
