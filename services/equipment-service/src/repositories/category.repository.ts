import { prisma } from "../config/prisma";
import { CreateCategoryDTO, UpdateCategoryDTO } from "../Types/category.type";

export const categoryRepository = {
  create: (data: CreateCategoryDTO) => prisma.category.create({ data }),
  findAll: () => prisma.category.findMany(),
  findById: (id: string) => prisma.category.findUnique({ where: { id } }),
  update: (id: string, data: UpdateCategoryDTO) =>
    prisma.category.update({ where: { id }, data }),
  delete: (id: string) => prisma.category.delete({ where: { id } }),
};
