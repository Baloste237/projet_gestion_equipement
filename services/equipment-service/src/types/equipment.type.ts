export interface CreateEquipmentDTO {
  name: string;
  serialNumber: string;
  categoryId: string;
  supplierId?: string;
}

export interface UpdateEquipmentDTO {
  name?: string;
  status?: string;
  categoryId?: string;
  supplierId?: string;
}

export interface EquipmentResponseDTO {
  id: string;
  name: string;
  serialNumber: string;
  status: string;
  categoryId: string;
  supplierId: string | null;
  createdAt: Date;
}
