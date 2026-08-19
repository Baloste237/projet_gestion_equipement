export interface CreateSupplierDTO {
  name: string;
  contactInfo?: string;
}

export interface UpdateSupplierDTO {
  name?: string;
  contactInfo?: string;
}

export interface SupplierResponseDTO {
  id: string;
  name: string;
  contactInfo: string | null;
  createdAt: Date;
}
