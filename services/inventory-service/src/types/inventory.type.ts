export interface CreateInventoryDTO {
  title: string;
  createdBy: string;
}

export interface AddInventoryItemDTO {
  equipmentId: string;
}

export interface CheckInventoryItemDTO {
  found: boolean;
  note?: string;
}
