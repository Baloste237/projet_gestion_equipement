export interface CreateEquipmentDTO {
  name: string;
  serialNumber: string;
  categoryId: string;
  supplierId?: string | null;
  status?: string;
  imageUrl?: string | null;
  barcode?: string | null;
  brand?: string | null;
  model?: string | null;
  location?: string | null;
  purchaseDate?: string | Date | null;
  purchasePrice?: number | null;
  warrantyEndDate?: string | Date | null;
  notes?: string | null;
}

export interface UpdateEquipmentDTO {
  name?: string;
  serialNumber?: string;
  status?: string;
  categoryId?: string;
  supplierId?: string | null;
  imageUrl?: string | null;
  barcode?: string | null;
  brand?: string | null;
  model?: string | null;
  location?: string | null;
  purchaseDate?: string | Date | null;
  purchasePrice?: number | null;
  warrantyEndDate?: string | Date | null;
  notes?: string | null;
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
  imageUrl?: string | null;
  barcode?: string | null;
  brand?: string | null;
  model?: string | null;
  location?: string | null;
  purchaseDate?: string | Date | null;
  purchasePrice?: number | null;
  warrantyEndDate?: string | Date | null;
  notes?: string | null;
  createdAt: Date;
}
