import { inventoryRepository } from "../repositories/inventory.repository";
import { inventoryItemRepository } from "../repositories/inventory-item.repository";
import { equipmentServiceClient } from "../clients/equipment-service.client";
import { throwError } from "../errors/throw-error";
import { CreateInventoryDTO, AddInventoryItemDTO, CheckInventoryItemDTO } from "../types/inventory.type";

export const inventoryService = {
  create: async (data: CreateInventoryDTO & { autoPopulate?: boolean }) => {
    const inventory = await inventoryRepository.create({
      title: data.title,
      createdBy: data.createdBy,
    });

    if (data.autoPopulate !== false) {
      try {
        const equipments = await equipmentServiceClient.getAllEquipments();
        if (Array.isArray(equipments)) {
          await Promise.all(
            equipments.map(async (eq: any) => {
              try {
                await inventoryItemRepository.create({
                  inventoryId: inventory.id,
                  equipmentId: eq.id,
                });
              } catch (_) {}
            })
          );
        }
      } catch (err) {
        console.error("Impossible d'importer automatiquement le parc d'équipements:", err);
      }
    }

    return inventoryRepository.findById(inventory.id);
  },

  getAll: async () => {
    const inventories = await inventoryRepository.findAll();
    return Promise.all(
      inventories.map(async (inv) => {
        const itemsWithDetails = await Promise.all(
          (inv.items || []).map(async (item) => {
            let equipment = null;
            try {
              equipment = await equipmentServiceClient.getEquipmentById(item.equipmentId);
            } catch (_) {}
            return { ...item, equipment };
          })
        );
        return { ...inv, items: itemsWithDetails };
      })
    );
  },

  getById: async (id: string) => {
    const inventory = await inventoryRepository.findById(id);
    if (!inventory) throwError("INVENTORY_NOT_FOUND");
    const itemsWithDetails = await Promise.all(
      (inventory!.items || []).map(async (item) => {
        let equipment = null;
        try {
          equipment = await equipmentServiceClient.getEquipmentById(item.equipmentId);
        } catch (_) {}
        return { ...item, equipment };
      })
    );
    return { ...inventory, items: itemsWithDetails };
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
