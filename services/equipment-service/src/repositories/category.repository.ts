import { prisma } from "../config/prisma";

// Nombre d'équipements rattachés, renvoyé avec chaque catégorie
const withCount = { _count: { select: { equipments: true } } } as const;

interface CategoryData {
  name?: string;
  description?: string | null;
}

export const categoryRepository = {
  create: (data: { name: string; description?: string | null }) => prisma.category.create({ data, include: withCount }),
  findAll: () => prisma.category.findMany({ orderBy: { name: "asc" }, include: withCount }),
  findById: (id: string) => prisma.category.findUnique({ where: { id }, include: withCount }),
  // Nom comparé sans tenir compte de la casse ; `excludeId` écarte la catégorie en cours de modification
  findByName: (name: string, excludeId?: string) =>
    prisma.category.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    }),
  findAllNames: () => prisma.category.findMany({ select: { id: true, name: true } }),
  countEquipments: (id: string) => prisma.equipment.count({ where: { categoryId: id } }),
  update: (id: string, data: CategoryData) => prisma.category.update({ where: { id }, data, include: withCount }),
  delete: (id: string) => prisma.category.delete({ where: { id } }),
  // `skipDuplicates` absorbe une création simultanée du même nom ; renvoie le nombre de lignes créées
  createMany: (data: { name: string; description: string | null }[]) =>
    prisma.category.createMany({ data, skipDuplicates: true }),
  purgeAll: async () => {
    const result = await prisma.category.deleteMany({});
    return { count: result.count };
  },
};
