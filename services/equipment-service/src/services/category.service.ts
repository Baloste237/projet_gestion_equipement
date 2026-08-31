import { categoryRepository } from "../repositories/category.repository";
import { CreateCategoryDTO, UpdateCategoryDTO } from "../types/category.type";

export const categoryService = {
  create: (data: CreateCategoryDTO) => categoryRepository.create(data),
  getAll: () => categoryRepository.findAll(),
  getById: async (id: string) => {
    const category = await categoryRepository.findById(id);
    if (!category) throw new Error("CATEGORY_NOT_FOUND");
    return category;
  },
  update: (id: string, data: UpdateCategoryDTO) => categoryRepository.update(id, data),
  delete: (id: string) => categoryRepository.delete(id),
};
