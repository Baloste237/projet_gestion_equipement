export interface CreateEquipmentDTO {
  name: string;
  serialNumber: string;
  categoryId: string;
  supplierId?: string | null;
  status?: string;
}

export interface UpdateEquipmentDTO {
  name?: string;
  serialNumber?: string;
  status?: string;
  categoryId?: string;
  supplierId?: string | null;
}

export interface TransferEquipmentDTO {
  toUserId?: string;
  toDepartmentId?: string;
  reason?: string;
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
