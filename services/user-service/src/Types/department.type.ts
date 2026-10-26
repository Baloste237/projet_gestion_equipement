export interface CreateDepartmentDTO {
  name: string;
  description?: string;
  status?: string;
  isActive?: boolean;
}

export interface UpdateDepartmentDTO {
  name?: string;
  description?: string;
  status?: string;
  isActive?: boolean;
}
