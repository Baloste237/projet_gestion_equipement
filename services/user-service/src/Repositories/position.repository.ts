import { prisma } from "../Config/prisma";
import { CreatePositionDTO, UpdatePositionDTO } from "../Types/position.type";

export const positionRepository = {
  findAll: (departmentId?: string) =>
    prisma.position.findMany({
      where: departmentId ? { departmentId } : undefined,
      include: { department: true },
    }),

  findById: (id: string) =>
    prisma.position.findUnique({
      where: { id },
      include: { department: true },
    }),

  // Recherche insensible à la casse : « Technicien » et « technicien » sont le même poste
  findByNameInDepartment: (name: string, departmentId: string) =>
    prisma.position.findFirst({
      where: { departmentId, name: { equals: name, mode: "insensitive" } },
    }),

  create: (data: CreatePositionDTO) =>
    prisma.position.create({ data, include: { department: true } }),

  update: (id: string, data: UpdatePositionDTO) =>
    prisma.position.update({ where: { id }, data, include: { department: true } }),

  // Les utilisateurs rattachés passent à positionId = null (onDelete: SetNull)
  delete: (id: string) => prisma.position.delete({ where: { id } }),

  // Supprime tous les postes ; les utilisateurs rattachés sont détachés automatiquement (SetNull)
  purgeAll: (): Promise<{ count: number }> => prisma.position.deleteMany({}),
};
