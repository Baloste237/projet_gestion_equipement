import { inventoryRepository } from "../repositories/inventory.repository";
import { inventoryItemRepository } from "../repositories/inventory-item.repository";
import { equipmentServiceClient } from "../clients/equipment-service.client";
import { throwError } from "../errors/throw-error";
import { CreateInventoryDTO, AddInventoryItemDTO, CheckInventoryItemDTO } from "../types/inventory.type";

export const inventoryService = {
  create: (data: CreateInventoryDTO) => inventoryRepository.create(data),

  getAll: () => inventoryRepository.findAll(),

  getById: async (id: string) => {
    const inventory = await inventoryRepository.findById(id);
    if (!inventory) throwError("INVENTORY_NOT_FOUND");
    return inventory;
  },

  addItem: async (inventoryId: string, data: AddInventoryItemDTO) => {
    const inventory = await inventoryRepository.findById(inventoryId);
    if (!inventory) throwError("INVENTORY_NOT_FOUND");
    if (inventory!.status === "COMPLETED") throwError("INVENTORY_ALREADY_COMPLETED");

    // Vérifie que l'équipement existe réellement
    await equipmentServiceClient.getEquipmentById(data.equipmentId);

    const existing = await inventoryItemRepository.findOne(inventoryId, data.equipmentId);
    if (existing) throwError("INVENTORY_ITEM_ALREADY_EXISTS");

    return inventoryItemRepository.create({ inventoryId, equipmentId: data.equipmentId });
  },

  checkItem: async (itemId: string, data: CheckInventoryItemDTO) => {
    const item = await inventoryItemRepository.findById(itemId);
    if (!item) throwError("INVENTORY_ITEM_NOT_FOUND");

    return inventoryItemRepository.markChecked(itemId, data.found, data.note);
  },

  complete: async (id: string) => {
    const inventory = await inventoryRepository.findById(id);
    if (!inventory) throwError("INVENTORY_NOT_FOUND");
    if (inventory!.status === "COMPLETED") throwError("INVENTORY_ALREADY_COMPLETED");

    return inventoryRepository.complete(id);
  },
};
