import { HttpError } from "../errors/http-error";
import { categoryRepository } from "../repositories/category.repository";
import { equipmentRepository } from "../repositories/equipment.repository";
import { auditPublisher } from "../clients/audit-publisher.client";
import { CreateCategoryDTO, UpdateCategoryDTO } from "../types/category.type";

type WithCount<T> = T & { _count: { equipments: number } };

// Code d'erreur Prisma : P2002 = nom déjà pris, P2003 = clé étrangère (équipements rattachés)
const hasPrismaCode = (err: unknown, code: string) => (err as { code?: string } | null)?.code === code;

const toResponse = <T extends object>(category: WithCount<T>) => {
  const { _count, ...rest } = category;
  return { ...rest, equipmentCount: _count.equipments };
};

const nameTaken = (name: string) => new HttpError(409, `Une catégorie nommée « ${name} » existe déjà`);
const notFound = () => new HttpError(404, "Catégorie introuvable");
const inUse = (count: number) =>
  new HttpError(
    409,
    `Cette catégorie est utilisée par ${count} équipement${count > 1 ? "s" : ""} et ne peut pas être supprimée`,
    { equipmentCount: count }
  );

// Une description vide est enregistrée comme absente
const cleanDescription = (description: string | undefined | null) => description?.trim() || null;

export const categoryService = {
  create: async (data: CreateCategoryDTO) => {
    const name = data.name.trim();
    if (await categoryRepository.findByName(name)) throw nameTaken(name);
    try {
      return toResponse(await categoryRepository.create({ name, description: cleanDescription(data.description) }));
    } catch (err) {
      if (hasPrismaCode(err, "P2002")) throw nameTaken(name);
      throw err;
    }
  },

  getAll: async () => (await categoryRepository.findAll()).map(toResponse),

  getById: async (id: string) => {
    const category = await categoryRepository.findById(id);
    if (!category) throw notFound();
    return toResponse(category);
  },

  update: async (id: string, data: UpdateCategoryDTO) => {
    if (!(await categoryRepository.findById(id))) throw notFound();
    const changes: { name?: string; description?: string | null } = {};
    if (data.name !== undefined) {
      changes.name = data.name.trim();
      // Garder son propre nom est permis : la catégorie modifiée est exclue de la recherche
      if (await categoryRepository.findByName(changes.name, id)) throw nameTaken(changes.name);
    }
    if (data.description !== undefined) changes.description = cleanDescription(data.description);
    try {
      return toResponse(await categoryRepository.update(id, changes));
    } catch (err) {
      if (hasPrismaCode(err, "P2002")) throw nameTaken(changes.name ?? "");
      throw err;
    }
  },

  delete: async (id: string) => {
    const category = await categoryRepository.findById(id);
    if (!category) throw notFound();
    if (category._count.equipments > 0) throw inUse(category._count.equipments);
    try {
      await categoryRepository.delete(id);
    } catch (err) {
      // Un équipement a été rattaché entre le comptage et la suppression
      if (hasPrismaCode(err, "P2003")) throw inUse(await categoryRepository.countEquipments(id));
      throw err;
    }
  },

  purgeAll: async (performedBy: string = "system") => {
    const equipmentCount = await equipmentRepository.count();
    if (equipmentCount > 0) {
      throw new HttpError(
        400,
        `Impossible de vider les catégories : ${equipmentCount} équipement(s) y sont encore rattaché(s). Veuillez d'abord vider les équipements.`
      );
    }
    const result = await categoryRepository.purgeAll();
    auditPublisher.publish({
      action: "CATEGORY_LIST_PURGED",
      routingKey: "category.purged",
      entityType: "Category",
      entityId: "all",
      performedBy,
      metadata: { deletedCount: result.count },
    });
    return result;
  },
};
