export interface CreatePositionDTO {
  name: string;
  description?: string | null;
  departmentId: string;
  status?: "ACTIF" | "INACTIF";
  isActive?: boolean;
}

export interface UpdatePositionDTO {
  name?: string;
  description?: string | null;
  departmentId?: string;
  status?: "ACTIF" | "INACTIF";
  isActive?: boolean;
}
